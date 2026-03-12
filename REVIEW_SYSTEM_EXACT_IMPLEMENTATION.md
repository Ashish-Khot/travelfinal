# Review System - Exact Implementation Details

## 1. Booking Model Changes (models/Booking.js)

### Added Fields
```javascript
reviewRequestSent: {
  type: Boolean,
  default: false
},
reviewRequestMessage: {
  type: String
},
reviewRequestStatus: {
  type: String,
  enum: ['', 'accepted', 'declined'],
  default: ''
},
touristDeclineMessage: {
  type: String
},
canLeaveReview: {
  type: Boolean,
  default: false
},
reviewSubmitted: {
  type: Boolean,
  default: false
}
```

### Why Each Field
- `reviewRequestSent`: Track if guide has sent review request
- `reviewRequestMessage`: Store optional message from guide
- `reviewRequestStatus`: Track if tourist accepted/declined
- `touristDeclineMessage`: Store reason if declined
- `canLeaveReview`: Permission check before review form
- `reviewSubmitted`: Prevent duplicate reviews

---

## 2. Review Route Enhancements (routes/review.js)

### POST /api/review - Complete Implementation
```javascript
router.post('/review', verifyToken, async (req, res) => {
  try {
    const { guideId, bookingId, place, rating, comment } = req.body;
    const userId = req.user.id; // Tourist ID
    
    // ✓ VALIDATION 1: Booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found' 
      });
    }
    
    // ✓ VALIDATION 2: Current user is the tourist who booked
    if (booking.touristId.toString() !== userId) {
      return res.status(403).json({ 
        message: "You don't have permission to review for this booking" 
      });
    }
    
    // ✓ VALIDATION 3: Tour must be completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Tour must be marked as complete before review' 
      });
    }
    
    // ✓ VALIDATION 4: Review request must have been sent
    if (!booking.reviewRequestSent) {
      return res.status(400).json({ 
        message: 'Guide has not sent a review request yet' 
      });
    }
    
    // ✓ VALIDATION 5: Tourist must have accepted request
    if (booking.reviewRequestStatus !== 'accepted') {
      return res.status(400).json({ 
        message: 'Review request was declined or pending' 
      });
    }
    
    // ✓ VALIDATION 6: Prevent duplicate reviews
    const existingReview = await Review.findOne({
      bookingId: bookingId,
      userId: userId
    });
    
    if (existingReview) {
      return res.status(400).json({ 
        message: 'You already submitted a review for this booking' 
      });
    }
    
    // Create review with pending status
    const newReview = new Review({
      userId,
      guideId,
      bookingId,
      place,
      rating: Math.min(5, Math.max(1, rating)), // Ensure 1-5
      comment: comment.trim(),
      status: 'pending' // Always pending, admin must approve
    });
    
    const review = await newReview.save();
    
    // Mark review as submitted in booking
    await Booking.findByIdAndUpdate(
      bookingId,
      { reviewSubmitted: true },
      { new: true }
    );
    
    res.status(201).json({
      message: 'Review submitted! Admin will review and publish it.',
      review
    });
    
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
```

### GET /api/review/can-review/:bookingId (New)
```javascript
router.get('/can-review/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    
    if (!booking) {
      return res.status(404).json({ canReview: false });
    }
    
    const canReview = 
      booking.touristId.toString() === req.user.id &&
      booking.status === 'completed' &&
      booking.reviewRequestSent &&
      booking.reviewRequestStatus === 'accepted' &&
      !booking.reviewSubmitted;
    
    res.json({ canReview });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

---

## 3. Booking Route New Endpoint (routes/booking.js)

### POST /api/booking/complete/:id
```javascript
router.post('/booking/complete/:id', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const guideId = req.user.id;
    
    // Verify guide owns this booking
    const booking = await Booking.findById(id).populate('guideId');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.guideId._id.toString() !== guideId) {
      return res.status(403).json({ message: 'Not authorized to complete this booking' });
    }
    
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be completed' });
    }
    
    // Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        reviewRequestSent: true,
        reviewRequestMessage: message || ''
      },
      { new: true }
    );
    
    // Emit socket event to guide dashboard
    io.emit('booking-updated', {
      bookingId: id,
      status: 'completed',
      message: 'Tour marked as complete'
    });
    
    // Create notification for tourist
    const notification = new Notification({
      type: 'tour-completion',
      recipientType: 'tourist',
      recipientId: booking.touristId,
      senderId: guideId,
      bookingId: id,
      message: `Your guide ${booking.guideId.firstName} has marked the tour as complete. Would you like to leave a review?`,
      guideName: `${booking.guideId.firstName} ${booking.guideId.lastName}`,
      guide: booking.guideId._id,
      data: {
        location: booking.location,
        guideMessage: message
      }
    });
    
    await notification.save();
    
    // Emit notification to tourist
    io.emit('tour-completion-notification', {
      bookingId: id,
      touristId: booking.touristId,
      guideId: guideId,
      guideName: booking.guideId.firstName,
      location: booking.location,
      message: message
    });
    
    res.json({
      message: 'Tour marked as complete. Review request sent to tourist.',
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
```

---

## 4. Notifications Route Enhancements (routes/notifications.js)

### POST /api/notifications/tourist/respond (Enhanced)
```javascript
router.post('/notifications/tourist/respond', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { notificationId, action, message } = req.body;
    const touristId = req.user.id;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    if (notification.recipientId.toString() !== touristId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const booking = await Booking.findById(notification.bookingId);
    
    if (action === 'accept') {
      // Tourist accepts - enable review form
      await Booking.findByIdAndUpdate(
        notification.bookingId,
        {
          reviewRequestStatus: 'accepted',
          canLeaveReview: true
        },
        { new: true }
      );
      
      // Send notification to guide (optional)
      const guideNotif = new Notification({
        type: 'review-request-accepted',
        recipientType: 'guide',
        recipientId: booking.guideId,
        senderId: touristId,
        bookingId: notification.bookingId,
        message: `Tourist ${req.user.firstName} has accepted your review request!`
      });
      
      await guideNotif.save();
      
      res.json({
        message: 'Review request accepted. You can now leave a review.',
        action: 'review-form-ready'
      });
      
    } else if (action === 'decline') {
      // Tourist declines - save reason
      await Booking.findByIdAndUpdate(
        notification.bookingId,
        {
          reviewRequestStatus: 'declined',
          touristDeclineMessage: message || 'Tourist chose not to review'
        },
        { new: true }
      );
      
      // Notify guide about decline
      const guideNotif = new Notification({
        type: 'review-request-declined',
        recipientType: 'guide',
        recipientId: booking.guideId,
        senderId: touristId,
        bookingId: notification.bookingId,
        message: `Tourist ${req.user.firstName} has decided not to leave a review at this time.`,
        data: {
          reason: message || 'No reason provided'
        }
      });
      
      await guideNotif.save();
      
      res.json({
        message: 'Guide has been notified. Thank you for letting us know.'
      });
    }
    
    // Mark notification as viewed
    await Notification.findByIdAndUpdate(notificationId, { viewed: true });
    
  } catch (error) {
    console.error('Error responding to notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
```

### GET /api/notifications/guide (New)
```javascript
router.get('/notifications/guide', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const guideId = req.user.id;
    
    // Get all decline notifications for this guide
    const notifications = await Notification.find({
      recipientId: guideId,
      type: 'review-request-declined',
      recipientType: 'guide'
    })
    .populate('senderId', 'firstName lastName')
    .populate('bookingId', 'location date')
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.json(notifications);
    
  } catch (error) {
    console.error('Error fetching guide notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
```

---

## 5. Frontend: TouristNotifications.jsx (Complete Rewrite)

### Key State & Handlers
```javascript
const [selectedNotification, setSelectedNotification] = useState(null);
const [reviewStep, setReviewStep] = useState(0); // 0: confirmation, 1: review form
const [reviewData, setReviewData] = useState({
  rating: 0,
  comment: '',
  place: ''
});
const [declineOpen, setDeclineOpen] = useState(false);
const [declineMessage, setDeclineMessage] = useState('');
const [snackbar, setSnackbar] = useState({
  open: false,
  message: '',
  type: 'success'
});

// Handle accepting tour (Step 1)
const handleAcceptTour = async (notification) => {
  try {
    const response = await api.post('/notifications/tourist/respond', {
      notificationId: notification._id,
      action: 'accept'
    });
    
    setSelectedNotification(notification);
    setReviewStep(0); // Show confirmation
    setSnackbar({
      open: true,
      message: 'Tour accepted! Ready to write review.',
      type: 'success'
    });
    
  } catch (error) {
    setSnackbar({
      open: true,
      message: error.response?.data?.message || 'Error accepting tour',
      type: 'error'
    });
  }
};

// Handle continuing to review form (Step 2)
const handleContinueToReview = () => {
  setReviewStep(1);
};

// Handle submitting review
const handleSubmitReview = async () => {
  if (!reviewData.rating || !reviewData.comment || !reviewData.place) {
    setSnackbar({
      open: true,
      message: 'Please fill in all fields',
      type: 'error'
    });
    return;
  }
  
  try {
    const response = await api.post('/review', {
      guideId: selectedNotification.senderId,
      bookingId: selectedNotification.bookingId,
      ...reviewData
    });
    
    setSnackbar({
      open: true,
      message: 'Review submitted! Admin will review it.',
      type: 'success'
    });
    
    // Reset and refresh
    setSelectedNotification(null);
    setReviewStep(0);
    setReviewData({ rating: 0, comment: '', place: '' });
    
    // Refresh notifications
    fetchNotifications();
    
  } catch (error) {
    setSnackbar({
      open: true,
      message: error.response?.data?.message || 'Error submitting review',
      type: 'error'
    });
  }
};

// Handle declining tour
const handleDeclineClick = async () => {
  try {
    await api.post('/notifications/tourist/respond', {
      notificationId: selectedNotification._id,
      action: 'decline',
      message: declineMessage
    });
    
    setSnackbar({
      open: true,
      message: 'Guide has been notified',
      type: 'success'
    });
    
    setDeclineOpen(false);
    setDeclineMessage('');
    setSelectedNotification(null);
    fetchNotifications();
    
  } catch (error) {
    setSnackbar({
      open: true,
      message: 'Error declining review',
      type: 'error'
    });
  }
};
```

### JSX Structure
```javascript
// Main notification list
{notifications.map(notif => (
  <Card key={notif._id}>
    {/* Tour completion message */}
    <Button onClick={() => setSelectedNotification(notif)}>
      Review from {notif.guideName}
    </Button>
  </Card>
))}

// Dialog with 2-step process
<Dialog open={selectedNotification !== null} maxWidth="sm" fullWidth>
  <Stepper activeStep={reviewStep}>
    <Step><StepLabel>Confirm Completion</StepLabel></Step>
    <Step><StepLabel>Write Review</StepLabel></Step>
  </Stepper>
  
  {reviewStep === 0 && (
    // Step 1: Confirmation
    <DialogContent>
      <Typography>Tour Location: {selectedNotification?.location}</Typography>
      <Typography>Guide Message: {selectedNotification?.data?.guideMessage}</Typography>
      <Button color="primary" onClick={handleContinueToReview}>
        Continue to Review
      </Button>
    </DialogContent>
  )}
  
  {reviewStep === 1 && (
    // Step 2: Review form
    <DialogContent>
      <Rating 
        value={reviewData.rating}
        onChange={(e, val) => setReviewData({...reviewData, rating: val})}
      />
      <TextField 
        label="Location/Place"
        value={reviewData.place}
        onChange={(e) => setReviewData({...reviewData, place: e.target.value})}
      />
      <TextField 
        label="Your Review"
        multiline
        rows={4}
        value={reviewData.comment}
        onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
      />
      <Button onClick={handleSubmitReview} variant="contained" color="primary">
        Submit Review
      </Button>
    </DialogContent>
  )}
  
  <DialogActions>
    <Button onClick={() => setDeclineOpen(true)}>Can't Review Now</Button>
  </DialogActions>
</Dialog>

// Decline dialog
<Dialog open={declineOpen}>
  <DialogContent>
    <TextField 
      label="Why?" 
      placeholder="Tell us why (optional)"
      multiline
      rows={3}
      value={declineMessage}
      onChange={(e) => setDeclineMessage(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeclineOpen(false)}>Cancel</Button>
    <Button onClick={handleDeclineClick} color="primary">Send</Button>
  </DialogActions>
</Dialog>

// Snackbar for feedback
<Snackbar 
  open={snackbar.open}
  message={snackbar.message}
  severity={snackbar.type}
/>
```

---

## 6. Frontend: ReviewsPanel.jsx (Key Changes)

### Filter Logic
```javascript
// Only show guides from eligible bookings
const eligibleBookings = bookings.filter(booking => 
  booking.status === 'completed' &&
  booking.reviewRequestSent &&
  booking.reviewRequestStatus === 'accepted' &&
  !booking.reviewSubmitted
);

const availableToReview = eligibleBookings.length > 0;

if (!availableToReview) {
  return (
    <Alert severity="info">
      No guides available for review right now. 
      <br/>
      Complete a tour and accept the review request to review guides.
    </Alert>
  );
}
```

### Guide Selection & Form
```javascript
// Show guides from eligible bookings
{eligibleBookings.map(booking => (
  <Card 
    key={booking._id}
    onClick={() => setSelectedGuide(booking.guideId)}
    sx={{
      border: selectedGuide === booking.guideId._id ? '2px solid green' : '1px solid #ddd',
      backgroundColor: selectedGuide === booking.guideId._id ? '#f0f8f0' : 'white',
      cursor: 'pointer'
    }}
  >
    <Typography>{booking.guideId.firstName}</Typography>
  </Card>
))}

// Review form
{selectedGuide && (
  <Box>
    <Rating
      value={reviewData.rating}
      onChange={(e, val) => setReviewData({...reviewData, rating: val})}
    />
    <TextField
      label="Place"
      value={reviewData.place}
      onChange={(e) => setReviewData({...reviewData, place: e.target.value})}
    />
    <TextField
      label="Comment"
      multiline
      rows={4}
      value={reviewData.comment}
      onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
    />
    <Button 
      onClick={handleSubmit} 
      disabled={!reviewData.rating || !reviewData.comment}
      variant="contained"
    >
      Submit Review
    </Button>
  </Box>
)}
```

---

## 7. Frontend: BookingsDataGrid.jsx (Guide View)

### Complete Tour Handler
```javascript
const handleCompleteTour = async () => {
  try {
    const response = await api.post(`/booking/complete/${completeBookingId}`, {
      message: customMessage
    });
    
    setSnackbar({
      open: true,
      message: 'Tour marked complete! Review request sent to tourist.',
      type: 'success'
    });
    
    setCompleteDialogOpen(false);
    setCustomMessage('');
    setCompleteBookingId(null);
    
    // Refresh bookings
    fetchBookings();
    
  } catch (error) {
    setSnackbar({
      open: true,
      message: error.response?.data?.message || 'Error completing tour',
      type: 'error'
    });
  }
};

// In table rows:
{booking.status === 'confirmed' && !booking.reviewRequestSent && (
  <Button 
    onClick={() => {
      setCompleteBookingId(booking._id);
      setCompleteDialogOpen(true);
    }}
    variant="contained"
    color="success"
  >
    Complete Tour
  </Button>
)}

// Status badges:
{booking.reviewRequestSent && (
  <Chip
    label={
      booking.reviewRequestStatus === 'accepted' 
        ? '✅ Review Accepted'
        : booking.reviewRequestStatus === 'declined'
        ? '❌ Review Declined'
        : '⏳ Review Pending'
    }
    color={
      booking.reviewRequestStatus === 'accepted' ? 'success'
      : booking.reviewRequestStatus === 'declined' ? 'error'
      : 'warning'
    }
  />
)}
```

---

## Summary of What Validates

✅ **Prevents False Reviews**
- Checks `booking.touristId === currentUser` 
- Only own bookings can be reviewed

✅ **Requires Tour Completion**
- Checks `booking.status === 'completed'`
- Guide must mark tour complete first

✅ **Requires Tourist Acceptance**
- Checks `booking.reviewRequestStatus === 'accepted'`
- Tourist must explicitly accept in notification

✅ **Prevents Duplicates**
- Checks for existing review with same `bookingId` and `userId`
- Only one review per booking

✅ **Admin Moderation**
- Reviews start with `status = 'pending'`
- Only approved reviews are public
- Admin can control guide ratings

