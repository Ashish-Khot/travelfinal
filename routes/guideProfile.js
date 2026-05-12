const express = require('express');
const Guide = require('../models/Guide');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const USER_PROFILE_FIELDS = 'name email phone country interests avatar role';

const guideMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/guide-media');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext || '.bin';
    cb(null, `guide_${req.user.userId}_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const guideMediaFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image and video files are allowed.'));
};

const uploadGuideMedia = multer({
  storage: guideMediaStorage,
  fileFilter: guideMediaFileFilter,
  limits: { fileSize: 60 * 1024 * 1024 }
});

const runGuideMediaUpload = (req, res, next) => {
  uploadGuideMedia.array('media', 12)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    res.status(400).json({ message: err.message || 'Media upload failed' });
  });
};

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

function normalizeLanguages(languages) {
  const rawLanguages = Array.isArray(languages)
    ? languages
    : String(languages || '')
        .split(/[\n,]+/)
        .map((language) => language.trim())
        .filter(Boolean);

  return rawLanguages
    .map((language) => {
      if (typeof language === 'string') {
        const name = language.trim();
        return name ? { name, level: 'Fluent' } : null;
      }
      if (language && typeof language === 'object') {
        const name = String(language.name || '').trim();
        if (!name) return null;
        return { name, level: language.level || 'Fluent' };
      }
      return null;
    })
    .filter(Boolean);
}

// View guide profile
router.get('/', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.userId })
      .populate('userId', USER_PROFILE_FIELDS)
      .populate('travelogues')
      .populate('bookings');
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });
    const payload = toGuidePayload(guide);
    res.json({ guide: payload, user: payload.userId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update guide profile
router.put('/', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const {
      name,
      bio,
      languages,
      experienceYears,
      earnings,
      ratings,
      phone,
      country,
      interests,
      price,
      rateType,
      guideVideo
    } = req.body;
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) return res.status(400).json({ message: 'Full name is required' });
      user.name = trimmedName;
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      if (!trimmedPhone) return res.status(400).json({ message: 'Phone number is required' });
      user.phone = trimmedPhone;
      guide.phone = trimmedPhone;
    }

    if (country !== undefined) {
      const trimmedCountry = String(country).trim();
      if (!trimmedCountry) return res.status(400).json({ message: 'Country is required' });
      user.country = trimmedCountry;
    }

    if (interests !== undefined) {
      user.interests = String(interests || '').trim();
    }
    
    if (bio !== undefined) guide.bio = bio;
    
    if (languages !== undefined) {
      const normalizedLanguages = normalizeLanguages(languages);
      if (!normalizedLanguages.length) {
        return res.status(400).json({ message: 'Please enter at least one language' });
      }
      guide.languages = normalizedLanguages;
    }
    
    if (experienceYears !== undefined) {
      const experienceNumber = Number(experienceYears);
      if (!Number.isFinite(experienceNumber) || experienceNumber < 0) {
        return res.status(400).json({ message: 'Enter valid years of experience' });
      }
      guide.experienceYears = experienceNumber;
    }
    if (earnings !== undefined) guide.earnings = earnings;
    if (ratings !== undefined) guide.ratings = ratings;
    if (price !== undefined) guide.price = Number(price);
    guide.currency = 'INR';
    if (rateType !== undefined) guide.rateType = rateType;
    if (guideVideo !== undefined) guide.guideVideo = String(guideVideo || '').trim();
    
    await user.save();
    await guide.save();
    await guide.populate('userId', USER_PROFILE_FIELDS);
    const payload = toGuidePayload(guide);
    res.json({ message: 'Profile updated', guide: payload, user: payload.userId });
  } catch (err) {
    console.error('Error updating guide profile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Upload completed-tour photos/videos for guide profile
router.post('/media', verifyToken, authorizeRoles('guide'), runGuideMediaUpload, async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image or video file.' });
    }

    const newMedia = req.files.map((file) => ({
      mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
      url: `/uploads/guide-media/${file.filename}`,
      caption: '',
      uploadedAt: new Date()
    }));

    const currentMedia = Array.isArray(guide.tourMedia) ? guide.tourMedia : [];
    guide.tourMedia = [...currentMedia, ...newMedia];

    if (!guide.guideVideo) {
      const firstVideo = newMedia.find((item) => item.mediaType === 'video');
      if (firstVideo) guide.guideVideo = firstVideo.url;
    }

    await guide.save();
    await guide.populate('userId', USER_PROFILE_FIELDS);
    const payload = toGuidePayload(guide);
    res.json({ message: 'Media uploaded successfully.', guide: payload, user: payload.userId });
  } catch (err) {
    console.error('Error uploading guide media:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove one completed-tour media item from guide profile
router.delete('/media/:mediaId', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.user.userId });
    if (!guide) return res.status(404).json({ message: 'Guide profile not found' });

    const mediaId = String(req.params.mediaId || '');
    const mediaList = Array.isArray(guide.tourMedia) ? guide.tourMedia : [];
    const mediaToRemove = mediaList.find((item) => item && String(item._id) === mediaId);
    if (!mediaToRemove) return res.status(404).json({ message: 'Media item not found' });

    const removeUrl = mediaToRemove.url || '';
    guide.tourMedia = mediaList.filter((item) => String(item._id) !== mediaId);

    if (removeUrl && guide.guideVideo === removeUrl) {
      const fallbackVideo = guide.tourMedia.find((item) => item.mediaType === 'video');
      guide.guideVideo = fallbackVideo ? fallbackVideo.url : '';
    }

    await guide.save();

    if (removeUrl.startsWith('/uploads/guide-media/')) {
      const filename = path.basename(removeUrl);
      const filePath = path.join(__dirname, '../uploads/guide-media', filename);
      fs.unlink(filePath, () => {});
    }

    await guide.populate('userId', USER_PROFILE_FIELDS);
    const payload = toGuidePayload(guide);
    res.json({ message: 'Media removed successfully.', guide: payload, user: payload.userId });
  } catch (err) {
    console.error('Error deleting guide media:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
