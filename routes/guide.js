const express = require('express');
const Guide = require('../models/Guide');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { askGuide } = require('../controllers/guideAiController');

const router = express.Router();
const USER_PROFILE_FIELDS = 'name email phone country interests avatar role';

function toGuidePayload(guide) {
  const payload = guide.toObject();
  const user = payload.userId && typeof payload.userId === 'object' ? payload.userId : {};

  payload.name = user.name || payload.name || '';
  payload.email = user.email || payload.email || '';
  payload.phone = payload.phone || user.phone || '';
  payload.country = user.country || payload.country || '';
  payload.interests = user.interests || payload.interests || '';
  payload.avatar = user.avatar || payload.avatar || '';
  payload.currency = 'INR';

  return payload;
}

// Real-time virtual guide route (SSE streaming)
router.post('/ask', verifyToken, askGuide);

// Guide application route
router.post('/apply', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { bio, languages, experienceYears } = req.body;
    const userId = req.user.userId;
    // Save guide profile with approved=false
    const guide = new Guide({
      userId,
      bio,
      languages,
      experienceYears,
      currency: 'INR',
      approved: false
    });
    await guide.save();
    // Simulate notification to admin (replace with actual notification logic)
    // e.g., send email, push notification, or create a DB entry
    console.log(`Admin notification: New guide application from user ${userId}`);
    res.status(201).json({ message: 'Guide application submitted. Awaiting admin approval.', guide });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get guide profile by userId (for dashboard)
router.get('/profile/:userId', async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.params.userId })
      .populate('userId', USER_PROFILE_FIELDS)
      .populate('travelogues')
      .populate('bookings');
    if (!guide) {
      return res.status(404).json({ message: 'Guide profile not found' });
    }
    const payload = toGuidePayload(guide);
    res.json({ guide: payload, user: payload.userId });
  } catch (err) {
    console.log('[DEBUG] Error in /profile/:userId:', err);
    if (err && err.stack) console.log(err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all approved guides (for tourists to explore)
router.get('/', async (req, res) => {
  try {
    const guides = await Guide.find({ approved: true })
      .populate('userId', USER_PROFILE_FIELDS);
    res.json({
      guides: guides.map(toGuidePayload)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
