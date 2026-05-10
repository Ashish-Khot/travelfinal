

const express = require('express');
const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Guide accepts or rejects a booking
router.patch('/status/:id', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    let { status } = req.body; // status should be 'accepted' or 'rejected'
    if (status === 'accepted') status = 'confirmed';
    if (status === 'rejected') status = 'cancelled';
    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    // Only allow guide to update their own bookings
    if (booking.guideId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    booking.status = status;
    await booking.save();
    // Emit real-time update to guide and tourist
    try {
      const setupSocket = require('../socket/chat');
      if (setupSocket && setupSocket.ioInstance && setupSocket.ioInstance.emitBookingUpdate) {
        setupSocket.ioInstance.emitBookingUpdate(booking.guideId.toString(), booking);
        // Also emit to tourist (room: tourist_<touristId>)
        if (setupSocket.ioInstance.to) {
          setupSocket.ioInstance.to(`tourist_${booking.touristId.toString()}`).emit('bookingUpdate', { touristId: booking.touristId.toString(), booking });
        }
      }
    } catch (e) { console.warn('Socket booking status update failed:', e.message); }
    res.json({ message: 'Booking status updated', booking });
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a booking (only by the tourist who created it, and only if pending/cancelled)
router.put('/:id', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.touristId.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    if (!['pending', 'cancelled'].includes(booking.status)) return res.status(400).json({ message: 'Cannot edit this booking' });
    const { destination, date, price } = req.body;
    booking.destination = destination;
    booking.date = date;
    booking.price = price;
    await booking.save();
    res.json({ message: 'Booking updated', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a booking (only by the tourist who created it, and only if pending/cancelled)
router.delete('/:id', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.touristId.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    if (!['pending', 'cancelled'].includes(booking.status)) return res.status(400).json({ message: 'Cannot delete this booking' });
    await Booking.deleteOne({ _id: req.params.id });
    // Remove booking from guide profile
    await Guide.findOneAndUpdate(
      { userId: booking.guideId },
      { $pull: { bookings: booking._id } }
    );
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Get all bookings for a specific tourist
router.get('/tourist/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ touristId: req.params.userId })
      .populate('guideId', 'name email country avatar price currency rateType');
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tourist creates a booking
// Socket emit helper
const getIO = () => {
  const setupSocket = require('../socket/chat');
  return setupSocket.ioInstance;
};

router.post('/book', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { guideId, startDateTime, endDateTime, destination, price } = req.body;
    const touristId = req.user.userId;

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (!guideId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Valid guide, start time, and end time are required.' });
    }

    const existingBooking = await Booking.findOne({
      guideId,
      status: { $in: ['pending', 'confirmed'] },
      startDateTime: { $lt: end },
      endDateTime: { $gt: start }
    });

    if (existingBooking) {
      return res.status(409).json({ message: 'This guide is already booked for the selected date and time.' });
    }

    // Create booking
    const booking = new Booking({
      touristId,
      guideId,
      startDateTime: start,
      endDateTime: end,
      destination,
      price,
      status: 'pending',
      messages: []
    });
    await booking.save();
    // Add booking to guide profile
    await Guide.findOneAndUpdate(
      { userId: guideId },
      { $push: { bookings: booking._id } }
    );
    // Emit real-time update to guide
    try {
      const setupSocket = require('../socket/chat');
      if (setupSocket && setupSocket.ioInstance && setupSocket.ioInstance.emitBookingUpdate) {
        setupSocket.ioInstance.emitBookingUpdate(guideId, booking);
      }
    } catch (e) { console.warn('Socket booking update failed:', e.message); }
    res.status(201).json({ message: 'Booking created.', booking });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all bookings for a specific guide
router.get('/guide/:userId', async (req, res) => {
  try {
    // Show all bookings for the guide dashboard (pending, confirmed, cancelled, completed)
    const bookings = await Booking.find({ guideId: req.params.userId })
      .populate('touristId', 'name email')
      .populate('guideId', 'name email');
    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching guide bookings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Guide marks tour as completed and sends review request
router.post('/complete/:id', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { message } = req.body;
    
    const booking = await Booking.findById(req.params.id).populate('touristId').populate('guideId');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Verify this is the guide's booking
    const bookingGuideId = booking.guideId?._id?.toString() || booking.guideId?.toString();
    if (bookingGuideId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden - You are not the guide for this booking' });
    }
    
    // Mark as completed
    booking.status = 'completed';
    booking.reviewRequestSent = true;
    booking.reviewRequestMessage = message || 'Thank you for completing this tour. Please leave a review!';
    booking.reviewRequestStatus = '';
    await booking.save();
    
    // Also send a notification using the notifications API
    try {
      const notificationsModule = require('./notifications');
      const notifications = notificationsModule.notifications || [];
      
      const guideName = booking.guideId?.name || 'Guide';
      const touristId = booking.touristId?._id?.toString() || booking.touristId?.toString();
      const guideId = booking.guideId?._id?.toString() || booking.guideId?.toString();
      
      const notification = {
        id: `${Date.now()}_${booking._id}`,
        touristId: touristId,
        guideName: guideName,
        tourName: booking.destination,
        message: message || 'Tour is completed. Please confirm and leave a review.',
        bookingId: booking._id.toString(),
        status: 'pending',
        guideId: guideId,
        createdAt: new Date()
      };
      
      notifications.push(notification);
    } catch (e) {
      console.warn('Could not create booking completion notification:', e.message);
    }
    
    res.json({ message: 'Tour marked as completed, review request sent', booking });
  } catch (err) {
    console.error('Error completing tour:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
