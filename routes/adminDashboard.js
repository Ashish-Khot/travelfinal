const express = require('express');
const User = require('../models/User');
const Guide = require('../models/Guide');
const Travelogue = require('../models/Travelogue');
const Chat = require('../models/Chat');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const PERIOD_CONFIG = {
  day: {
    buckets: 12,
    unitMs: 2 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  week: {
    buckets: 7,
    unitMs: 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { weekday: 'short' }),
  },
  month: {
    buckets: 30,
    unitMs: 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  },
};

// Admin dashboard stats
router.get('/dashboard-stats', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [touristCount, guideCount, hotelCount, hospitalCount, travelogueCount, chatCount, pendingGuides] = await Promise.all([
      User.countDocuments({ role: 'tourist' }),
      User.countDocuments({ role: 'guide' }),
      User.countDocuments({ role: 'hotel' }),
      User.countDocuments({ role: 'hospital' }),
      Travelogue.countDocuments({}),
      Chat.countDocuments({ status: 'ACTIVE' }),
      Guide.countDocuments({ approved: false, rejected: false })
    ]);
    res.json({
      touristCount,
      guideCount,
      hotelCount,
      hospitalCount,
      travelogueCount,
      chatCount,
      pendingGuides
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/activity-trend', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const period = (req.query.period || 'week').toLowerCase();
    const config = PERIOD_CONFIG[period] || PERIOD_CONFIG.week;
    const now = Date.now();

    const buckets = Array.from({ length: config.buckets }, (_, idx) => {
      const fromEnd = config.buckets - idx;
      const from = new Date(now - fromEnd * config.unitMs);
      const to = new Date(now - (fromEnd - 1) * config.unitMs);
      return { from, to, label: config.labelFormatter(to) };
    });

    const points = await Promise.all(
      buckets.map(async (bucket) => {
        const [tourists, guides, hotels, hospitals, travelogues, activeChats] = await Promise.all([
          User.countDocuments({ role: 'tourist', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          User.countDocuments({ role: 'guide', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          User.countDocuments({ role: 'hotel', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          User.countDocuments({ role: 'hospital', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          Travelogue.countDocuments({ createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          Chat.countDocuments({ createdAt: { $gte: bucket.from, $lt: bucket.to }, status: 'ACTIVE' }),
        ]);

        return {
          label: bucket.label,
          usersTotal: tourists + guides,
          servicesTotal: hotels + hospitals,
          travelogues,
          chatActivity: activeChats,
        };
      })
    );

    res.json({ period, points });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
