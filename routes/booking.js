

const express = require('express');
const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const nodemailer = require('nodemailer');

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
    } catch (e) { console.log('[DEBUG] Socket emit error (status update):', e); }
    res.json({ message: 'Booking status updated', booking });
  } catch (err) {
    console.log('[DEBUG] Error updating booking status:', err);
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

// Helper: send email notification
async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
}

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
    console.log('[DEBUG] Booking creation:', { guideId, touristId, startDateTime, endDateTime, destination, price });
    // Create booking
    const booking = new Booking({
      touristId,
      guideId,
      startDateTime,
      endDateTime,
      destination,
      price,
      status: 'pending',
      messages: []
    });
    await booking.save();
    // Add booking to guide profile
    const guideUpdate = await Guide.findOneAndUpdate(
      { userId: guideId },
      { $push: { bookings: booking._id } }
    );
    console.log('[DEBUG] Guide update result:', guideUpdate);
    // Emit real-time update to guide
    try {
      const setupSocket = require('../socket/chat');
      if (setupSocket && setupSocket.ioInstance && setupSocket.ioInstance.emitBookingUpdate) {
        setupSocket.ioInstance.emitBookingUpdate(guideId, booking);
        console.log('[DEBUG] Emitted bookingUpdate for guide:', guideId);
      }
    } catch (e) { console.log('[DEBUG] Socket emit error:', e); }
    res.status(201).json({ message: 'Booking created.', booking });
  } catch (err) {
    console.log('[DEBUG] Booking creation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all bookings for a specific guide
router.get('/guide/:userId', async (req, res) => {
  try {
    console.log('[DEBUG] Fetching bookings for guide:', req.params.userId);
    // Show all bookings for the guide dashboard (pending, confirmed, cancelled, completed)
    const bookings = await Booking.find({ guideId: req.params.userId })
      .populate('touristId', 'name email')
      .populate('guideId', 'name email');
    console.log('[DEBUG] Bookings found:', bookings);
    res.json({ bookings });
  } catch (err) {
    console.log('[DEBUG] Error fetching guide bookings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Guide marks tour as completed and sends review request
router.post('/complete/:id', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { message } = req.body;
    console.log('[BOOKING/COMPLETE] User:', { userId: req.user.userId, role: req.user.role, bookingId: req.params.id });
    
    const booking = await Booking.findById(req.params.id).populate('touristId').populate('guideId');
    
    if (!booking) {
      console.log('[BOOKING/COMPLETE] Booking not found:', req.params.id);
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    console.log('[BOOKING/COMPLETE] Booking found:', {
      guideId: booking.guideId?._id?.toString(),
      userId: req.user.userId
    });
    
    // Verify this is the guide's booking
    const bookingGuideId = booking.guideId?._id?.toString() || booking.guideId?.toString();
    if (bookingGuideId !== req.user.userId) {
      console.log('[BOOKING/COMPLETE] Authorization failed:', { bookingGuideId, userId: req.user.userId });
      return res.status(403).json({ message: 'Forbidden - You are not the guide for this booking' });
    }
    
    // Mark as completed
    booking.status = 'completed';
    booking.reviewRequestSent = true;
    booking.reviewRequestMessage = message || 'Thank you for completing this tour. Please leave a review!';
    booking.reviewRequestStatus = '';
    await booking.save();
    
    console.log('[BOOKING/COMPLETE] Booking marked as completed');
    
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
      console.log('[BOOKING] Created and sent notification:', notification);
    } catch (e) {
      console.log('[BOOKING] Could not create notification via module:', e.message);
    }
    
    res.json({ message: 'Tour marked as completed, review request sent', booking });
  } catch (err) {
    console.log('[DEBUG] Error completing tour:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
