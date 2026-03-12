# 🧪 Voice Assistant Agent Mode - Testing Guide

## Pre-Testing Checklist

Before testing, ensure:
- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:5173`
- [ ] MongoDB is connected and accessible
- [ ] GEMINI_API_KEY is set in root `.env`
- [ ] All files saved and compiled (no console errors)
- [ ] Using Chrome/Firefox (best WebRTC compatibility)

---

## ✅ Test Suite 1: Microphone & Speech Recognition

### Test 1.1 - Microphone Permissions
**Steps:**
1. Open browser DevTools (F12)
2. Check Console for any permission errors
3. Click 🎤 button
4. Browser should ask for microphone permission
5. Click "Allow"
6. Mic button should show "Listening" state

**Expected Result:** ✅ Microphone accessible, no errors

---

### Test 1.2 - Speech Capture
**Steps:**
1. Click 🎤 button
2. Tap "🎤 Tap to Speak" button
3. Say clearly: "Book a guide"
4. Stop speaking (button shows transcript)
5. Check transcript box

**Expected Result:** ✅ Transcript shows what you said accurately

---

### Test 1.3 - Interim Results
**Steps:**
1. Click 🎤 button
2. Tap to speak
3. While speaking, check transcript
4. Should show grey text (interim)
5. After stopping, should show black text (final)

**Expected Result:** ✅ Interim & final results both display

---

## ✅ Test Suite 2: Backend Processing (Agent Mode)

### Test 2.1 - Booking Auto-Execution
**Steps:**
1. Open DevTools → Network tab
2. Click 🎤 button
3. Say: "Book a trekking guide"
4. Check Network tab: POST `/api/voiceAssistant/process-speech`
5. Response should show `"actionExecuted": true`
6. UI should show ✅ success badge

**Expected Result:** 
- ✅ Network request successful (200 status)
- ✅ Response includes `actionExecuted: true`
- ✅ UI shows "✅ Action Executed!"
- ✅ Dialog auto-closes in 3 seconds

---

### Test 2.2 - Navigation Auto-Execution
**Steps:**
1. Open DevTools → Console
2. Click 🎤 button
3. Say: "Open my bookings"
4. Check Console for: `🎤 Voice Navigation: MyBookings → My Bookings`
5. Check: Dashboard tab changes to "My Bookings"
6. Check: "My Bookings" section displays

**Expected Result:**
- ✅ Console shows navigation log
- ✅ Dashboard section changes instantly
- ✅ Correct component renders
- ✅ No page reload (smooth transition)

---

### Test 2.3 - Review Auto-Creation
**Steps:**
1. Click 🎤 button
2. Say: "Create a 5-star review"
3. Check Network tab response
4. Response should show: `"actionExecuted": true`
5. UI shows review creation success

**Expected Result:**
- ✅ Auto-execution without confirmation
- ✅ Success message shows rating
- ✅ Database record created

---

## ✅ Test Suite 3: Error Handling

### Test 3.1 - Invalid/Missing API Key
**Steps:**
1. Edit `.env` file - change GEMINI_API_KEY to invalid value
2. Restart backend: `npm start`
3. Click 🎤 button
4. Say: "Book a guide for trekking"
5. Check console for fallback activation
6. Command should still execute!

**Expected Result:**
- ✅ Console shows: "Gemini parsing failed, using fallback"
- ✅ System uses regex fallback automatically
- ✅ Action still executes
- ✅ Message shows "Using fast mode"

---

### Test 3.2 - Low Confidence Intent
**Steps:**
1. Click 🎤 button
2. Say something very unclear: "xyz xyz xyz"
3. System should show: "I'm not sure what you meant"
4. Should ask for clarification

**Expected Result:**
- ✅ Error message shown
- ✅ Request not processed
- ✅ Guidance message provided
- ✅ Can retry

---

### Test 3.3 - Empty Speech
**Steps:**
1. Click 🎤 button
2. Tap to speak
3. Don't say anything
4. Click "Send"

**Expected Result:**
- ✅ Error: "No speech detected"
- ✅ No API call made
- ✅ User can try again

---

## ✅ Test Suite 4: Database Verification

### Test 4.1 - Booking Created
**Steps:**
1. Say: "Book a trekking guide"
2. Get success response
3. Open MongoDB Compass or mongosh
4. Check: `bookings` collection
5. Find latest booking with matching tourist ID

```javascript
// In MongoDB
db.bookings.findOne({ touristId: ObjectId("...") }, { sort: { createdAt: -1 } })
```

**Expected Result:**
- ✅ Booking document exists
- ✅ Has correct guide ID
- ✅ Has tourist ID
- ✅ Status shows "pending"
- ✅ Created date is recent

---

### Test 4.2 - Review Created
**Steps:**
1. Say: "Great experience, 5 stars!"
2. Get success response
3. Check MongoDB `reviews` collection

```javascript
db.reviews.findOne({ touristId: ObjectId("...") }, { sort: { createdAt: -1 } })
```

**Expected Result:**
- ✅ Review document exists
- ✅ Rating is 5
- ✅ Has tourist ID
- ✅ Sentiment detected
- ✅ Created date is recent

---

### Test 4.3 - Travelogue Created
**Steps:**
1. Say: "Write about my Goa trip"
2. Check MongoDB `travelogues` collection

```javascript
db.travelogues.findOne({ userId: ObjectId("...") }, { sort: { createdAt: -1 } })
```

**Expected Result:**
- ✅ Travelogue document exists
- ✅ Has correct title (extracted from speech)
- ✅ Has user ID
- ✅ Status shows "draft"

---

## ✅ Test Suite 5: UI/UX

### Test 5.1 - Animation Flow
**Steps:**
1. Click 🎤 button
2. Observe: Dialog slides in smoothly
3. Say: "Book a guide"
4. Observe: Transcript appears with slide animation
5. Observe: Success badge appears with scale animation
6. Observe: Dialog auto-closes with fade
7. Observe: Floating button remains intact

**Expected Result:**
- ✅ All animations smooth
- ✅ No jerky transitions
- ✅ Z-index correct (dialog on top)
- ✅ Mobile responsive

---

### Test 5.2 - Conversation History
**Steps:**
1. Say multiple commands in sequence
2. Each should add to history
3. Check conversation history box
4. Should show: User message + Bot response pairs
5. Scrollable if many messages

**Expected Result:**
- ✅ History displays correctly
- ✅ Messages paired (user → bot)
- ✅ Scrollable if long
- ✅ Clean formatting

---

### Test 5.3 - Audio Feedback
**Steps:**
1. Click 🎤 button
2. Say: "Book a guide"
3. Should hear bot speak response
4. Click "Sound Off" button
5. Say: "Open bookings"
6. Should NOT hear response (muted)
7. Click "Sound On" - re-enable

**Expected Result:**
- ✅ Bot speaks responses
- ✅ Toggle works smoothly
- ✅ Setting persists
- ✅ Volume reasonable

---

## ✅ Test Suite 6: Navigation (Agent Mode)

### Test 6.1 - Dashboard Tab Navigation
**Steps:**
1. Start on "Dashboard" tab
2. Say: "Open explore destination"
3. Dashboard switches to "Explore Destinations" instantly
4. Sidebar on mobile closes

**Test All Sections:**
```
Command                    → Expected Tab
"Open my bookings"        → "My Bookings"
"Open my reviews"         → "Reviews"
"Open travelogues"        → "Travelogue"
"Open my profile"         → "Profile"
"Open explore"            → "Explore Destinations"
"Go to dashboard"         → "Dashboard"
```

**Expected Result:**
- ✅ All sections switch correctly
- ✅ No 404 errors
- ✅ Components render properly
- ✅ Smooth transitions

---

### Test 6.2 - Mobile Navigation
**Steps:**
1. Resize browser to mobile width (375px)
2. Say: "Open my bookings"
3. Check: Sidebar closes automatically
4. Check: MyBookings section displays
5. Section is readable on mobile

**Expected Result:**
- ✅ Responsive layout works
- ✅ Sidebar auto-closes
- ✅ Content readable
- ✅ No overflow/cutoff

---

## ✅ Test Suite 7: Concurrent Operations

### Test 7.1 - Rapid Fire Commands
**Steps:**
1. Say 3 commands in quick succession
2. Each should execute independently
3. UI should queue/process them
4. Database should have all entries

**Expected Result:**
- ✅ No lost commands
- ✅ All execute eventually
- ✅ No race conditions
- ✅ All saved to DB

---

## ✅ Test Suite 8: Edge Cases

### Test 8.1 - Special Characters
**Steps:**
1. Say: "Book a guide for @#$ adventure"
2. System should identify intent despite gibberish

**Expected Result:**
- ✅ Intent detected (booking)
- ✅ Gibberish ignored
- ✅ Proceeds with booking

---

### Test 8.2 - Case Sensitivity
**Steps:**
1. Say: "BOOK A GUIDE" (shouted)
2. System should still process

**Expected Result:**
- ✅ Works regardless of volume/tone
- ✅ Converts to lowercase internally
- ✅ Processes normally

---

### Test 8.3 - Typos in Speech (Accent)
**Steps:**
1. Say with different accent or unclear pronunciation
2. Might say: "Buk a gide" instead of "Book a guide"
3. System should still detect intent

**Expected Result:**
- ✅ Close matches detected
- ✅ Fallback parser handles
- ✅ Executes intended action

---

## ✅ Test Suite 9: Performance

### Test 9.1 - Response Time
**Setup: Network throttling → Fast 3G**

1. Open DevTools → Network tab
2. Set throttle to "Fast 3G"
3. Say command: "Book a guide"
4. Measure time from request to response

**Expected Result:**
- ✅ < 8 seconds total
- ✅ < 3 seconds for Gemini
- ✅ < 100ms for fallback
- ✅ Responsive UI during wait

---

### Test 9.2 - Memory Leaks
**Steps:**
1. Say 20 commands in rapid succession
2. Check DevTools → Memory tab
3. Memory usage should be stable
4. No memory continuously growing

**Expected Result:**
- ✅ Memory stable
- ✅ No memory growth
- ✅ Event listeners cleaned up
- ✅ No zombie dialogs

---

## 📋 Test Result Log Template

```markdown
## Test Session: [Date] [Time]

### Environment
- Browser: [Chrome/Firefox/etc]
- OS: [Windows/Mac/Linux]
- Backend: [Running/Error]
- Frontend: [Running/Error]
- DB: [Connected/Error]

### Test Results

#### Suite 1: Microphone & Speech
- Test 1.1: [PASS/FAIL] - [Notes]
- Test 1.2: [PASS/FAIL] - [Notes]
- Test 1.3: [PASS/FAIL] - [Notes]

#### Suite 2: Backend Processing
- Test 2.1: [PASS/FAIL] - [Notes]
- Test 2.2: [PASS/FAIL] - [Notes]
- Test 2.3: [PASS/FAIL] - [Notes]

[... continue for all suites ...]

### Summary
- ✅ Tests Passed: __/40
- ❌ Tests Failed: __/40
- ⏭️ Tests Skipped: __/40

### Issues Found
1. [Issue description]
2. [Issue description]

### Performance Notes
- Avg Response Time: __ms
- Slowest Operation: __ (___ms)
- Memory Stable: Yes/No

### Recommendation
[Ready for deployment / Needs fixes]
```

---

## 🚀 Sign-Off Criteria

✅ **Ready to use when:**
- [ ] All 40 tests passing
- [ ] No console errors
- [ ] All database operations working
- [ ] Navigation smooth
- [ ] Performance acceptable (< 8 seconds)
- [ ] Mobile responsive
- [ ] Error handling graceful

---

## 📞 Troubleshooting During Tests

| Error | Solution |
|-------|----------|
| "Cannot read property 'x' of undefined" | Check event listener registration |
| Blank response | Verify API key, check backend logs |
| No navigation | Check browser console for event logs |
| Slow response | Check network throttling, Gemini API status |
| Audio not playing | Check browser permissions, volume settings |

---

**Good luck with testing! Report any issues found.** 🎊
