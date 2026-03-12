# Complete Tour with Notifications & Review System - Implementation Guide

## Overview
This document describes the complete implementation of the "Complete Tour" feature that allows guides to mark tours as completed, sends notifications to tourists, and enables tourists to leave reviews.

## Architecture & Flow

### 1. Guide Dashboard - Complete Tour Button
**Location**: [client/src/components/BookingsDataGrid.jsx](client/src/components/BookingsDataGrid.jsx)

**What's New**:
- Added "✓ Complete Tour" button to BookingCard component
- Button appears only for bookings with status: `confirmed` or `accepted`
- Clicking opens a dialog for the guide to write a completion message

**How It Works**:
```
Guide views booking → Clicks "Complete Tour" → Writes message → Submits
```

### 2. Tour Completion Dialog
**Component**: BookingsDataGrid - CompleteTourDialog

**Features**:
- Modal dialog for composing completion message
- Default message: "Thank you for booking my tour! I hope you enjoyed the experience. Please leave a review."
- Validates that message is not empty
- Shows loading state during submission

### 3. Backend - Two-Step Completion Process
**File**: [routes/booking.js](routes/booking.js) - POST `/booking/complete/:id`

**Step 1**: Mark Booking as Completed
```javascript
- Sets status: 'completed'
- Sets reviewRequestSent: true
- Stores completion message in reviewRequestMessage
- Resets reviewRequestStatus to empty string
```

**Step 2**: Create Notification
```javascript
- Accesses notifications array from notifications module
- Creates notification object with:
  - id: unique timestamp-based ID
  - touristId: recipient tourist's ID
  - guideName: guide's name
  - tourName: destination/tour name
  - message: completion message
  - bookingId: reference to booking
  - status: 'pending'
  - createdAt: timestamp
```

### 4. Notification API
**File**: [routes/notifications.js](routes/notifications.js)

**Endpoints**:
1. **POST `/notifications/guide/complete-tour`** - Guide sends completion notification
   - Input: bookingId, message
   - Creates in-memory notification
   - Returns notification object

2. **GET `/notifications/tourist`** - Tourist fetches pending notifications
   - Returns array of pending notifications
   - Filters by touristId and status='pending'

3. **POST `/notifications/tourist/respond`** - Tourist accepts or declines
   - Input: notificationId, action ('accept' or 'decline'), message
   - Updates notification status
   - Updates booking's reviewRequestStatus in database

### 5. Tourist Dashboard - Notifications Panel
**Location**: [client/src/dashboards/components/NotificationPanel.jsx](client/src/dashboards/components/NotificationPanel.jsx)

**Features**:
- Displays in AppBar as bell icon with badge showing count
- Shows all pending notifications in a popover
- Each notification displays:
  - Guide avatar and name
  - Tour/destination name
  - Completion message from guide
  - Action buttons: "✅ Confirm" and "❌ Decline"

**Flow**:
```
Tourist sees notification badge → Clicks bell icon → Views notification 
→ Clicks "Confirm" or "Decline" → Dialog opens → Responds
```

### 6. Notification Response Handling
**For "Confirm" (Accept)**:
- Sets booking.reviewRequestStatus = 'accepted'
- Updates booking.canLeaveReview = true
- Closes notification
- Shows success message
- Calls onActionComplete to refresh ReviewsPanel

**For "Decline" (Decline)**:
- Sets booking.reviewRequestStatus = 'declined'
- Stores decline message in booking.touristDeclineMessage
- Closes notification
- Shows info message
- Guide later sees decline notification

### 7. Review Submission
**Location**: [client/src/dashboards/components/ReviewsPanel.jsx](client/src/dashboards/components/ReviewsPanel.jsx)

**Prerequisites for Review to Appear**:
- Booking status = 'completed'
- reviewRequestSent = true
- reviewRequestStatus = 'accepted'
- reviewSubmitted = false

**Review Form Includes**:
- Guide selection (shows guides available for review)
- Star rating (1-5)
- Location/place name
- Review comment
- Submit button

**Review Submission**:
```javascript
POST /review
{
  guideId: guide's user ID,
  bookingId: booking ID,
  place: location/destination,
  rating: 1-5,
  comment: review text
}
```

### 8. Database Models

**Booking Model** (additions):
```javascript
{
  ...existing fields,
  
  // Review request system fields
  reviewRequestSent: { type: Boolean, default: false },
  reviewRequestMessage: { type: String, default: '' },
  reviewRequestStatus: { type: String, enum: ['accepted', 'declined', ''], default: '' },
  touristDeclineMessage: { type: String, default: '' },
  canLeaveReview: { type: Boolean, default: false },
  reviewSubmitted: { type: Boolean, default: false }
}
```

**Review Model**:
```javascript
{
  userId: ObjectId (tourist),
  guideId: ObjectId (guide),
  bookingId: ObjectId,
  place: String,
  rating: Number (1-5),
  comment: String,
  photo: String (optional),
  status: String enum ['pending', 'approved', 'rejected']
}
```

## Complete User Flow

### For Guide:
1. Guide logs into dashboard → Views Bookings section
2. Filters for "Confirmed" or "Accepted" bookings
3. Clicks "✓ Complete Tour" button on a booking
4. Dialog opens with default message
5. Guide edits message (optional) and clicks "Complete"
6. System marks booking as completed and sends notification to tourist
7. Guide dashboard shows booking with "Completed" status

### For Tourist:
1. Tourist logs into dashboard → Sees notification badge in AppBar
2. Clicks bell icon to view notifications
3. Sees "Tour completion" notification from guide
4. Can click "✅ Confirm" to accept and leave review, or "❌ Decline"
5. If accepted, dialog shows two steps:
   - **Step 1**: Confirm tour completion
   - **Step 2**: Fill review form (rating, comment, location)
6. Submits review and notification is removed
7. Can view submitted review in Reviews section of dashboard

## Key Conditions & Validations

### Booking Status Transitions:
```
pending → confirmed (guide accepts) → completed (guide marks complete)
pending → cancelled (guide or tourist rejects)
confirmed → completed (guide clicks complete tour)
accepted → completed (guide clicks complete tour)
```

### Review Eligibility:
```javascript
// Guide Dashboard - ReviewsPanel shows guides where:
bookings.filter(b => 
  b.status === 'completed' && 
  b.reviewRequestSent && 
  b.reviewRequestStatus === 'accepted' &&
  !b.reviewSubmitted
)
```

### Notification Visibility:
```javascript
// Tourist notifications shows where:
notifications.filter(n => 
  n.touristId === currentUserId && 
  n.status === 'pending'
)
```

## API Endpoints Used

### Guide Operations:
- `POST /booking/complete/:id` - Mark tour as completed
- `POST /notifications/guide/complete-tour` - Send completion notification (called automatically)

### Tourist Operations:
- `GET /notifications/tourist` - Fetch pending notifications
- `POST /notifications/tourist/respond` - Accept/decline tour completion
- `GET /booking/tourist/:userId` - Fetch bookings (to check review eligibility)
- `POST /review` - Submit review
- `GET /review/guide/:guideId/reviews` - Fetch guide's reviews

## Frontend Components Architecture

```
GuideDashboard
  └─ BookingsPage
      └─ BookingsDataGrid
          ├─ BookingCard
          │   └─ "✓ Complete Tour" button
          │
          └─ Dialog: Complete Tour
              └─ TextField: Completion message

TouristDashboard
  └─ AppBarTop
      └─ NotificationPanel
          ├─ Notification cards
          └─ Dialog: Decline message / Review form
              └─ Stepper (Confirm step + Review form step)
  
  └─ Reviews Tab
      └─ ReviewsPanel
          ├─ Guide selection
          └─ Review form
```

## Testing Checklist

- [ ] Guide clicks "Complete Tour" button on confirmed booking
- [ ] Complete tour dialog opens with default message
- [ ] Guide can edit message and submit
- [ ] Booking status changes to "completed"
- [ ] Tourist receives notification in AppBar bell icon
- [ ] Tourist can click notification to view details
- [ ] Tourist can click "Confirm" to accept tour completion
- [ ] Tourist sees review form after accepting
- [ ] Tourist can submit review with rating and comment
- [ ] Review appears in guide's profile
- [ ] Tourist can decline, and message is stored
- [ ] Guide notification system shows declined reviews (if implemented)
- [ ] Notification is removed after tourist responds
- [ ] ReviewsPanel updates to show available guides for review

## Known Limitations & Notes

1. **In-Memory Notifications**: Notifications are stored in memory and will be lost if server restarts. For production, implement persistent storage (database).

2. **Notification Export**: Modified [routes/notifications.js](routes/notifications.js) to export notifications array so booking.js can access it.

3. **Review Database**: Reviews are properly stored in MongoDB, but notification history is not persisted.

4. **Real-time Updates**: Uses in-memory notifications with polling (10-second intervals). For real-time, consider WebSocket implementation.

## Improvement Opportunities

1. **Persistent Notifications**: Store notifications in database
2. **WebSocket Integration**: Real-time notification delivery
3. **Email Notifications**: Send email to tourist when tour is completed
4. **Notification History**: Keep track of all notifications, not just pending ones
5. **Guide Decline Acknowledgment**: Let guide know when tourist declines
6. **Review Moderation**: Admin panel to approve/reject reviews
7. **Two-Way Messages**: Allow guide to see decline message

## Files Modified

1. **[client/src/components/BookingsDataGrid.jsx](client/src/components/BookingsDataGrid.jsx)**
   - Added "Complete Tour" button to BookingCard
   - Added completeTourDialog state and handlers
   - Added handleCompleteTour function

2. **[routes/booking.js](routes/booking.js)**
   - Updated POST `/booking/complete/:id` to also create notifications
   - Added automatic notification creation when booking is marked complete

3. **[routes/notifications.js](routes/notifications.js)**
   - Exported notifications array for access from other modules
   - Already had tour completion notification endpoints

## Code Quality Notes

- All error handling includes console logging for debugging
- Proper validation on both frontend and backend
- Consistent naming conventions
- TypeScript-ready structure (if conversion needed)
- Proper loading states in UI
- User-friendly error messages

---

**Last Updated**: February 27, 2026
**Implementation Status**: ✅ Complete
