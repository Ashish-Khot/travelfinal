# Review System - Testing & Verification Guide

## Pre-Testing Checklist

Before running tests, verify:
- [ ] MongoDB is running and connected
- [ ] All backend routes are properly implemented
- [ ] All frontend components are updated
- [ ] Socket.io is properly configured
- [ ] Both tourist and guide accounts exist
- [ ] At least one confirmed booking exists

---

## Test Scenario: Complete Review Flow

### Setup Test Data
```javascript
// Create test users (or use existing)
const guide = {
  id: 'guide123',
  email: 'guide@test.com',
  firstName: 'John',
  role: 'guide'
};

const tourist = {
  id: 'tourist123',
  email: 'tourist@test.com',
  firstName: 'Sarah',
  role: 'tourist'
};

// Create confirmed booking
const booking = {
  _id: 'booking123',
  guideId: 'guide123',
  touristId: 'tourist123',
  location: 'Jaipur Palace Tour',
  date: new Date(),
  status: 'confirmed', // Important: must be confirmed
  reviewRequestSent: false,
  reviewRequestStatus: '',
  reviewSubmitted: false
};
```

---

## Test 1: Guide Marks Tour as Complete

### Action
Guide clicks "Complete Tour" button on their booking:
```javascript
// From BookingsDataGrid component
POST /api/booking/complete/booking123
Authorization: Bearer <guide_token>
Content-Type: application/json

{
  "message": "Thank you Sarah! Great exploring Jaipur together."
}
```

### Expected Responses

**Success (200)**
```json
{
  "message": "Tour marked as complete. Review request sent to tourist.",
  "booking": {
    "status": "completed",
    "reviewRequestSent": true,
    "reviewRequestMessage": "Thank you Sarah! Great exploring Jaipur together.",
    "reviewRequestStatus": ""
  }
}
```

**Failure Cases to Test**

1. **Not a guide user**
   ```
   Status: 403
   Error: "Not authorized" (verifyToken + authorizeRoles('guide'))
   ```

2. **Booking not found**
   ```
   Status: 404
   Error: "Booking not found"
   ```

3. **Wrong guide (not booking's guide)**
   ```
   Status: 403
   Error: "Not authorized to complete this booking"
   ```

4. **Wrong status (not confirmed)**
   ```
   Status: 400
   Error: "Only confirmed bookings can be completed"
   ```

### Verify in Database
```javascript
// Check booking was updated
db.bookings.findById('booking123')
// Should show:
{
  status: 'completed',
  reviewRequestSent: true,
  reviewRequestMessage: 'Thank you Sarah!...',
  reviewRequestStatus: ''
}

// Check notification was created
db.notifications.findOne({ bookingId: 'booking123' })
// Should show:
{
  type: 'tour-completion',
  recipientId: 'tourist123',
  senderId: 'guide123',
  viewed: false
}
```

### Verify in UI
- [ ] Guide sees status change in BookingsDataGrid
- [ ] Booking now shows "⏳ Review Pending" chip
- [ ] Tourist receives real-time notification

---

## Test 2: Tourist Receives Notification

### Check Frontend
```javascript
// TouristNotifications component should show:
- Notification card from John (guide)
- Location: Jaipur Palace Tour
- Message: "Thank you Sarah! Great exploring Jaipur together."
- Buttons: "✅ Yes, Tour is Complete" / "❌ Can't Review Now"
```

### Socket.io Event
```javascript
// Should receive in real-time
io.emit('tour-completion-notification', {
  bookingId: 'booking123',
  touristId: 'tourist123',
  guideId: 'guide123',
  guideName: 'John',
  location: 'Jaipur Palace Tour',
  message: 'Thank you Sarah!...'
})
```

---

## Test 3: Tourist Accepts Review Request

### Action
Tourist clicks "✅ Yes, Tour is Complete":
```javascript
POST /api/notifications/tourist/respond
Authorization: Bearer <tourist_token>
Content-Type: application/json

{
  "notificationId": "notification456",
  "action": "accept",
  "message": ""
}
```

### Expected Response (200)
```json
{
  "message": "Review request accepted. You can now leave a review.",
  "action": "review-form-ready"
}
```

### Verify in Database
```javascript
// Booking should be updated
db.bookings.findById('booking123')
// Should show:
{
  reviewRequestStatus: 'accepted',
  canLeaveReview: true
}

// Notification should be viewed
db.notifications.findOne({ _id: 'notification456' })
// Should show visible: true
```

### Verify in UI
- [ ] Notification disappears or marks as seen
- [ ] Step 0 dialog shows: "Confirm Completion"
- [ ] Step 1 dialog shows: "Write Review" ready
- [ ] Rating component visible
- [ ] Comment field visible
- [ ] Place field visible

---

## Test 4: Tourist Submits Review

### Action
Tourist fills form and submits:
```
Step 1: Confirmation
  "Jaipur Palace Tour with John was amazing!"
  Click "Continue to Review"

Step 2: Review Form
  Rating: 5 stars (⭐⭐⭐⭐⭐)
  Place: Jaipur
  Comment: "John was very knowledgeable about the history..."
  Click "Submit Review"
```

### API Call
```javascript
POST /api/review
Authorization: Bearer <tourist_token>
Content-Type: application/json

{
  "guideId": "guide123",
  "bookingId": "booking123",
  "place": "Jaipur",
  "rating": 5,
  "comment": "John was very knowledgeable..."
}
```

### Expected Response (201)
```json
{
  "message": "Review submitted! Admin will review and publish it.",
  "review": {
    "_id": "review789",
    "userId": "tourist123",
    "guideId": "guide123",
    "bookingId": "booking123",
    "rating": 5,
    "comment": "John was very knowledgeable...",
    "status": "pending"
  }
}
```

### Verify in Database
```javascript
// Review should be created
db.reviews.findOne({ bookingId: 'booking123' })
// Should show:
{
  userId: 'tourist123',
  guideId: 'guide123',
  status: 'pending', // Not public yet
  rating: 5
}

// Booking should be marked
db.bookings.findById('booking123')
// Should show:
{
  reviewSubmitted: true
}
```

### Verify in UI
- [ ] Snackbar shows: "Review submitted! Admin will review it."
- [ ] Form closes
- [ ] Notification list refreshes
- [ ] ReviewsPanel no longer shows this guide (already reviewed)

---

## Test 5: Test All Decline Scenarios

### Scenario A: Tourist Declines Immediately

```javascript
POST /api/notifications/tourist/respond
Authorization: Bearer <tourist_token>

{
  "notificationId": "notification456",
  "action": "decline",
  "message": "Not ready to review right now"
}
```

**Response**
```json
{
  "message": "Guide has been notified. Thank you for letting us know."
}
```

**Database Check**
```javascript
db.bookings.findById('booking123')
// Should show:
{
  reviewRequestStatus: 'declined',
  touristDeclineMessage: 'Not ready to review right now'
}
```

### Scenario B: Tourist Accepts then Declines Later

```javascript
// Step 1: Accept
POST /notifications/tourist/respond
{ action: 'accept' }

// Step 2: Tourist cancels review form and declines
POST /notifications/tourist/respond
{ action: 'decline' }
```

**Verify**
- [ ] Last action (decline) wins in `reviewRequestStatus`
- [ ] New decline notification sent to guide
- [ ] Can't submit review after declining

### Scenario C: Multiple Bookings with Same Guide

```javascript
// Create 2 bookings with John
booking1: { guideId: 'john', status: 'completed', reviewRequestStatus: 'accepted' }
booking2: { guideId: 'john', status: 'completed', reviewRequestStatus: 'accepted' }

// ReviewsPanel should show John TWICE
// Can review both separately
```

---

## Test 6: Test All Validation Errors

### Error 1: Try to Review Unbooked Guide
```javascript
POST /api/review
{
  "guideId": "random_guide",
  "bookingId": "doesnt_exist",
  ...
}
```
**Expected**: 404 "Booking not found"

### Error 2: Try to Review Before Completion
```javascript
// Booking status: 'confirmed' (not 'completed')
POST /api/review
```
**Expected**: 400 "Tour must be marked as complete before review"

### Error 3: Try to Review Before Request Sent
```javascript
// Booking status: 'completed'
// reviewRequestSent: false
POST /api/review
```
**Expected**: 400 "Guide has not sent a review request yet"

### Error 4: Try to Review After Declining
```javascript
// Booking status: 'completed'
// reviewRequestSent: true
// reviewRequestStatus: 'declined'
POST /api/review
```
**Expected**: 400 "Review request was declined or pending"

### Error 5: Try to Submit Duplicate Review
```javascript
// First review exists for this booking
POST /api/review
```
**Expected**: 400 "You already submitted a review for this booking"

### Error 6: Review Another Tourist's Booking
```javascript
// Booking belongs to touristId: 'other_tourist'
// Current user: 'current_tourist'
POST /api/review
```
**Expected**: 403 "You don't have permission..."

### Error 7: Incomplete Rating Form
```javascript
POST /api/review
{
  rating: 0,        // No rating
  place: 'Jaipur',  // Has place
  comment: ''       // No comment
}
```
**Expected**: Client should block submission (no backend call)

---

## Test 7: Guide Receives Decline Notification

### Tourist Declines Review
```javascript
POST /notifications/tourist/respond
{
  "action": "decline",
  "message": "Can't review yet"
}
```

### Guide Checks Notifications
```javascript
GET /api/notifications/guide
Authorization: Bearer <guide_token>
```

**Expected Response**
```json
[
  {
    "_id": "notif999",
    "type": "review-request-declined",
    "message": "Tourist Sarah has decided not to leave a review...",
    "senderId": {
      "firstName": "Sarah",
      "lastName": "Tourist"
    },
    "bookingId": {
      "location": "Jaipur Palace"
    },
    "data": {
      "reason": "Can't review yet"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Verify in UI
- [ ] BookingsDataGrid shows "❌ Review Declined" chip
- [ ] Guide can see the decline message (if provided)
- [ ] Can't request review again for same booking

---

## Test 8: Admin Moderation Flow

### Admin Sees Pending Reviews
```javascript
GET /api/review?status=pending
Authorization: Bearer <admin_token>
```

**Should Return**
```json
[
  {
    "_id": "review789",
    "userId": "tourist123",
    "guideId": "guide123",
    "rating": 5,
    "comment": "Great guide!",
    "status": "pending"
  }
]
```

### Admin Approves Review
```javascript
PUT /api/review/review789/moderate
Authorization: Bearer <admin_token>

{
  "status": "approved"
}
```

**Expected**
- [ ] Review status changes to "approved"
- [ ] Guide's average rating is recalculated
- [ ] Review becomes visible on guide's profile

### Admin Rejects Review
```javascript
PUT /api/review/review789/moderate
Authorization: Bearer <admin_token>

{
  "status": "rejected"
}
```

**Expected**
- [ ] Review status changes to "rejected"
- [ ] Review hidden from guide's profile
- [ ] Guide's rating not affected

---

## Performance Testing

### Load Test: Multiple Tourists Booking Same Guide

```javascript
// Create 10 bookings with same guide
// All marked as completed in sequence

// Expected: No slowdown
// Check:
- Query time for /booking/guide/:id < 200ms
- Query time for /review/guide/:id/reviews < 200ms
```

### Concurrent Review Submissions

```javascript
// 3 tourists submit reviews simultaneously for same guide

Promise.all([
  submitReview(tourist1, booking1),
  submitReview(tourist2, booking2),
  submitReview(tourist3, booking3)
])

// Expected:
- All succeed (201)
- Guide's avg rating = (r1 + r2 + r3) / 3
- No duplicates created
```

### Real-time Notification Updates

```javascript
// Guide marks tour complete
// Check: Tourist sees notification within 1 second
// Check: Status updates on guide's dashboard within 500ms
```

---

## Manual Testing Checklist

```
GUIDE PERSPECTIVE
- [ ] Can see all confirmed bookings
- [ ] "Complete Tour" button appears for confirmed bookings only
- [ ] Can send custom message with completion
- [ ] Sees "⏳ Review Pending" status initially
- [ ] Receives notification when tourist accepts review
- [ ] Sees "✅ Review Accepted" status after tourist accepts
- [ ] Sees "❌ Review Declined" status if tourist declines
- [ ] Can see decline reason if provided
- [ ] Can't complete tour twice

TOURIST PERSPECTIVE
- [ ] Receives notification when guide completes tour
- [ ] Can see guide's message in notification
- [ ] Can accept or decline review request
- [ ] Can't submit review if didn't accept
- [ ] Review form has rating, place, comment fields
- [ ] All fields required before submit
- [ ] Sees confirmation after submit
- [ ] ReviewsPanel only shows completed, accepted tours
- [ ] Can write review only once per booking
- [ ] Sees guide's name with location in notification
- [ ] Can provide explanation when declining

REVIEWER/ADMIN PERSPECTIVE
- [ ] Can see all pending reviews
- [ ] Can approve reviews (makes them public)
- [ ] Can reject reviews (hides them)
- [ ] Approving updates guide's average rating
- [ ] Can see all reviews (pending, approved, rejected)
- [ ] Filters work correctly

EDGE CASES
- [ ] Can't review unbooked guides
- [ ] Can't review before tour marked complete
- [ ] Can't review after declining request
- [ ] Can't submit duplicate reviews
- [ ] Multiple bookings with same guide work
- [ ] Works with multiple guides in profile
- [ ] Mobile responsive for review form
```

---

## Debugging Common Issues

### Issue: Tourist Doesn't See Notification

**Check**:
1. Is booking `status = 'completed'`?
2. Is `reviewRequestSent = true`?
3. Is socket.io connected?
4. Check browser console for errors
5. Check server logs: `io.emit('tour-completion-notification', ...)`

**Fix**:
```javascript
// In routes/booking.js POST /booking/complete/:id
console.log('Emitting notification to:', booking.touristId);
io.emit('tour-completion-notification', {...});
```

### Issue: Review Submission Shows Error

**Check**:
1. Is booking status `'completed'`?
2. Is `reviewRequestStatus = 'accepted'`?
3. Is rating > 0?
4. Is comment not empty?
5. Are all form fields filled?

**Debug**:
```javascript
// Test endpoint directly
POST /api/review
{
  "guideId": "guide123",
  "bookingId": "booking123",
  "place": "Jaipur",
  "rating": 5,
  "comment": "Test"
}
```

### Issue: Guide Doesn't See Decline Status

**Check**:
1. Did tourist actually decline? (Check database)
2. Is `reviewRequestStatus = 'declined'`?
3. Is BookingsDataGrid querying fresh data?
4. Try refresh page

**Fix**:
```javascript
// In BookingsDataGrid, force refresh after decline
setReload(!reload);
```

---

## Test Results Template

Use this template to document test results:

```
Test: [Name]
Date: [Date]
Tester: [Name]

Setup:
- Guide: [ID]
- Tourist: [ID]
- Booking: [ID]

Steps:
1. [Action] ✅/❌
2. [Action] ✅/❌
3. [Action] ✅/❌

Expected Results:
- [Check] ✅/❌
- [Check] ✅/❌

Database Verified:
- Booking updated ✅/❌
- Notification created ✅/❌
- Review created ✅/❌

Notes:
[Any issues or observations]
```

