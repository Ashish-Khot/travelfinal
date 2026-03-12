const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Guide = require("../models/Guide");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// =================== REGISTER ===================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      country,
      interests,
      role
    } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();

    // Validate
    if (!name || !email || !password || !phone || !country) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }



    // Create user, initialize hotel fields if role is hotel
    const userData = {
      name,
      email: normalizedEmail,
      password,
      phone,
      country,
      interests,
      role
    };
    if (role === 'hotel') {
      userData.address = '';
      userData.amenities = [];
      userData.hotelImages = [];
    }
    const user = await User.create(userData);

    // If registering as a hotel, create Hotel profile
    if (role === 'hotel') {
      const Hotel = require('../models/Hotel');
      await Hotel.create({
        user: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: '',
        amenities: [],
        images: []
      });
    }

    // If registering as a guide, also create Guide profile
    if (role === 'guide') {
      const rawLanguages = Array.isArray(req.body.languages) ? req.body.languages : [];
      const normalizedLanguages = rawLanguages
        .map((language) => {
          if (typeof language === 'string') {
            const trimmed = language.trim();
            return trimmed ? { name: trimmed, level: 'Fluent' } : null;
          }
          if (language && typeof language === 'object' && language.name) {
            const level = ['Fluent', 'Intermediate', 'Basic'].includes(language.level)
              ? language.level
              : 'Fluent';
            return { name: String(language.name).trim(), level };
          }
          return null;
        })
        .filter(Boolean);

      await Guide.create({
        userId: user._id,
        bio: req.body.bio || '',
        experienceYears: Number(req.body.experienceYears) || 0,
        languages: normalizedLanguages,
        phone: user.phone,
        approved: false
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        country: user.country,
        interests: user.interests
      }
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    if (err?.name === "ValidationError" || err?.name === "CastError") {
      return res.status(400).json({ message: "Invalid registration data", error: err.message });
    }
    if (err?.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});




// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (!user.password) {
      return res.status(400).json({ message: 'Password login not available for this user' });
    }
    const isBcryptHash = typeof user.password === 'string' && user.password.startsWith('$2');
    let isMatch = false;
    if (isBcryptHash) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plaintext passwords: allow once, then upgrade to bcrypt.
      isMatch = password === user.password;
      if (isMatch) {
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
        await user.save();
      }
    }
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      },
      token
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Change password (authenticated)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (!user.password) {
      return res.status(400).json({ message: 'Password change not available for this account.' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Let the User model pre-save hook hash the password once.
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
