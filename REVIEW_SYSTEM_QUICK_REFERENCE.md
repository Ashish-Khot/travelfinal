# Review System - Quick Developer Reference

## What Was Changed

### 1. Database Schema (Booking)
```javascript
// Added these 4 fields to Booking model:
reviewRequestSent: { type: Boolean, default: false }
reviewRequestMessage: { type: String }
reviewRequestStatus: { 
  type: String, 
  enum: ['', 'accepted', 'declined'], 
  default: '' 
}
touristDeclineMessage: { type: String }
canLeaveReview: { type: Boolean, default: false }
reviewSubmitted: { type: Boolean, default: false }
```

### 2. New Backend Routes

#### POST /api/booking/complete/:id
**Purpose**: Guide marks tour as complete and sends review request
**Who**: Guide only
**Validation**: 
- User is guide
- Booking exists
- User is the guide in booking
- Booking status is 'confirmed'

**What it does**:
1. Updates booking: `status = "completed"`
2. Sets `reviewRequestSent = true`
3. Stores guide's message
4. Emits socket event to guide dashboard
5. Sends notification to tourist

#### POST /api/notifications/tourist/respond
**Purpose**: Tourist responds to tour completion notification
**Who**: Tourist only
**Actions**: "accept" or "decline"

**If accept**:
- Sets `canLeaveReview = true`
- Sets `reviewRequestStatus = "accepted"`
- Opens review form on frontend

**If decline**:
- Sets `reviewRequestStatus = "declined"`
- Saves explanation to `touristDeclineMessage`
- Notifies guide

### 3. Enhanced Review Route

#### POST /api/review
**5-Point Validation**:
```javascript
1. Booking exists? ✓
2. Belongs to current tourist? ✓
3. Status = "completed"? ✓
4. reviewRequestSent = true? ✓
5. reviewRequestStatus = "accepted"? ✓
6. reviewSubmitted = false? ✓
```

Only after all checks pass → Create review with `status = "pending"`

## How Frontend Works

### TouristNotifications Component
```
User sees notification
    ↓
Clicks "Yes, Tour Complete"
    ↓
Step 1: Confirmation dialog
    ↓
Clicks "Continue to Review"
    ↓
Step 2: Review form (rating + comment)
    ↓
Submits review
    ↓
Snackbar shows "Review submitted! Admin will review it."
```

**OR**

```
User clicks "Can't Review Now"
    ↓
Optional explanation dialog
    ↓
Decline notification sent to guide
    ↓
Snackbar shows "Guide has been notified"
```

### ReviewsPanel Component
```
Only shows guides where:
- Booking status = "completed"
- reviewRequestSent = true
- reviewRequestStatus = "accepted"
- reviewSubmitted = false

If no guides match → Shows alert
```

### BookingsDataGrid Component (Guide View)
```
For each booking:
- If status = "confirmed" AND reviewRequestSent = false
  → Show "Complete Tour" button
  
- If reviewRequestSent = true
  → Show status badge:
    ✅ Review Accepted (green)
    ❌ Review Declined (red)
    ⏳ Review Pending (orange)
```

## Control Flow Diagram

```
GUIDE ACTION
    ↓
[Guide clicks "Complete Tour"]
    ↓
POST /booking/complete/:id
    ↓
Update Booking: status=completed, reviewRequestSent=true
    ↓
[Tourist Dashboard]
    ↓
[Tourist sees notification]
    ↓
Tourist Action: Accept OR Decline
    ↓
POST /notifications/tourist/respond { action: "accept"|"decline" }
    ↓
IF ACCEPT:
  ├─ Update Booking: canLeaveReview=true, reviewRequestStatus=accepted
  └─ Show ReviewForm in TouristNotifications
     ├─ Rating (required)
     ├─ Comment (required)
     ├─ Place (required)
     └─ Submit
        ↓
        POST /review (with validation)
        ↓
        Create Review: status=pending
        ↓
        Update Booking: reviewSubmitted=true
        ↓
        Snackbar: "Review submitted!"

IF DECLINE:
  ├─ Update Booking: reviewRequestStatus=declined
  ├─ Save message to touristDeclineMessage
  └─ GET /notifications/guide
     ├─ Guide sees: "Tourist chose not to review"
     └─ Update BookingsDataGrid status badge to ❌
```

## Key Validation Points

### On Backend (Critical Security)
```javascript
// routes/review.js - POST /review

// 1. Check booking exists
const booking = await Booking.findById(bookingId);
if (!booking) throw error;

// 2. Check tourist owns booking
if (booking.touristId !== userId) throw error;

// 3. Check tour is complete
if (booking.status !== 'completed') throw error;

// 4. Check request was sent
if (!booking.reviewRequestSent) throw error;

// 5. Check accepted request
if (booking.reviewRequestStatus !== 'accepted') throw error;

// 6. Prevent duplicate reviews
const existingReview = await Review.findOne({
  bookingId, 
  userId 
});
if (existingReview) throw error;
```

### On Frontend (UX Enhancement)
```javascript
// ReviewsPanel.jsx
const eligibleBookings = bookings.filter(b => 
  b.status === 'completed' &&
  b.reviewRequestSent &&
  b.reviewRequestStatus === 'accepted' &&
  !b.reviewSubmitted
);

// TouristNotifications.jsx
const handleSubmitReview = async (data) => {
  if (!data.rating || !data.comment || !data.place) {
    showError("All fields required");
    return;
  }
  // POST /review
};
```

## State Management in Components

### TouristNotifications
```javascript
const [selectedNotification, setSelectedNotification] = useState(null);
const [reviewStep, setReviewStep] = useState(0); // 0=confirm, 1=form
const [reviewData, setReviewData] = useState({
  rating: 0,
  comment: "",
  place: ""
});
const [declineOpen, setDeclineOpen] = useState(false);
const [declineMessage, setDeclineMessage] = useState("");
```

### ReviewsPanel
```javascript
const [bookings, setBookings] = useState([]);
const [selectedGuide, setSelectedGuide] = useState(null);
const [reviewData, setReviewData] = useState({
  rating: 0,
  place: "",
  comment: ""
});
const availableToReview = eligibleBookings.length > 0;
```

### BookingsDataGrid
```javascript
const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
const [customMessage, setCustomMessage] = useState("");
const [snackbar, setSnackbar] = useState({
  open: false,
  message: "",
  type: "success" // or "error"
});
```

## Error Handling

### What Can Go Wrong

1. **"Can't submit review - tour not marked complete"**
   - Guide forgot to click "Complete Tour"
   - Check BookingsDataGrid for "Complete Tour" button

2. **"Review request was declined"**
   - Tourist already declined
   - Shows in BookingsDataGrid as ❌ status
   - Can't recover - only new tour can be reviewed

3. **"You already submitted a review for this tour"**
   - Tourist submitted once, can't submit again
   - Shows in ReviewsPanel (guide won't appear if already reviewed)

4. **"You don't have permission to leave a review"**
   - Tourist trying to review unbooked guide
   - Tourist trying to review before completion
   - Check all backend validations passed

5. **"No guides available for review"**
   - No completed bookings with accepted requests
   - ReviewsPanel shows alert
   - Can also happen if all reviews already submitted

## Testing Script

```javascript
// Simulate complete flow:

// 1. Guide completes tour
const response1 = await fetch('/api/booking/complete/booking123', {
  method: 'POST',
  headers: { Authorization: 'Bearer guide_token' },
  body: JSON.stringify({ message: "Great tour!" })
});

// 2. Tourist accepts
const response2 = await fetch('/api/notifications/tourist/respond', {
  method: 'POST',
  headers: { Authorization: 'Bearer tourist_token' },
  body: JSON.stringify({
    notificationId: 'notif456',
    action: 'accept'
  })
});

// 3. Tourist submits review
const response3 = await fetch('/api/review', {
  method: 'POST',
  headers: { Authorization: 'Bearer tourist_token' },
  body: JSON.stringify({
    guideId: 'guide789',
    bookingId: 'booking123',
    place: 'Delhi',
    rating: 5,
    comment: 'Amazing!'
  })
});

// All should return 200/201 if flow is correct
```

## Important Notes

- **One review per booking ONLY** - Backend prevents duplicates
- **Status = "pending" always** - Admin must approve to go public
- **Decline is final** - Can't accept after declining same request
- **Socket events required** - Real-time updates depend on socket.io
- **Tourist must explicitly accept** - Passive acceptance not allowed
- **Guide message is optional** - But recommended for context

## Performance Considerations

- Bookings index on `touristId`, `guideId`, `status` for fast filtering
- Review index on `bookingId` for unique constraint check
- Socket events batched (not per action)
- Notifications paginated (10-20 per page)
- ReviewsPanel filters on client to reduce API calls

