const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const Guide = require("../models/Guide");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\d{10}$/;
const PASSWORD_MIN_LENGTH = 6;
const IDENTITY_PROOF_MAX_SIZE = 8 * 1024 * 1024;
const IDENTITY_PROOF_UPLOAD_DIR = path.join(__dirname, "../uploads/identity-proofs");
const IDENTITY_PROOF_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);
const IDENTITY_PROOF_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"]);

fs.mkdirSync(IDENTITY_PROOF_UPLOAD_DIR, { recursive: true });

function normalizePhoneNumber(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeAmenities(amenities) {
  if (Array.isArray(amenities)) {
    return amenities
      .map((amenity) => String(amenity || "").trim())
      .filter(Boolean);
  }

  return String(amenities || "")
    .split(/[,\n]/)
    .map((amenity) => amenity.trim())
    .filter(Boolean);
}

function removeUploadedFile(file) {
  if (!file?.path) return;
  fs.promises.unlink(file.path).catch(() => {});
}

function normalizeGuideLanguages(languages) {
  let rawLanguages = [];

  if (Array.isArray(languages)) {
    rawLanguages = languages;
  } else if (typeof languages === "string") {
    rawLanguages = languages
      .split(/[,\n]/)
      .map((language) => language.trim())
      .filter(Boolean);
  }

  return rawLanguages
    .map((language) => {
      if (typeof language === "string") {
        return { name: language.trim(), level: "Fluent" };
      }
      if (language && typeof language === "object" && language.name) {
        const level = ["Fluent", "Intermediate", "Basic"].includes(language.level)
          ? language.level
          : "Fluent";
        return { name: String(language.name).trim(), level };
      }
      return null;
    })
    .filter((language) => language?.name);
}

const identityProofUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, IDENTITY_PROOF_UPLOAD_DIR);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `identity_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: IDENTITY_PROOF_MAX_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IDENTITY_PROOF_MIME_TYPES.has(file.mimetype) || IDENTITY_PROOF_EXTENSIONS.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error("Identity proof must be a PDF or image file"));
  }
});

function handleIdentityProofUpload(req, res, next) {
  identityProofUpload.single("identityProof")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Identity proof must be 8 MB or smaller" });
    }

    return res.status(400).json({ message: err.message || "Invalid identity proof upload" });
  });
}

// =================== REGISTER ===================
router.post("/register", handleIdentityProofUpload, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      interests,
      role,
      hotelName,
      hotelAddress,
      cityState,
      hotelType,
      amenities
    } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();
    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedRole = role || "tourist";
    const normalizedAmenities = normalizeAmenities(amenities);
    const fail = (status, message, extra = {}) => {
      removeUploadedFile(req.file);
      return res.status(status).json({ message, ...extra });
    };

    // Validate
    if (!name || !email || !password || !phone) {
      return fail(400, "All required fields must be filled");
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return fail(400, "Enter a valid email address");
    }
    if (!PHONE_REGEX.test(normalizedPhone)) {
      return fail(400, "Enter a 10-digit mobile number");
    }
    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return fail(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }

    const normalizedLanguages = normalizeGuideLanguages(req.body.languages);
    const experienceYearsNumber = Number(req.body.experienceYears);
    if (normalizedRole === "guide") {
      if (!String(req.body.bio || "").trim()) {
        return fail(400, "Bio is required for guide accounts");
      }
      if (
        String(req.body.experienceYears ?? "").trim() === "" ||
        !Number.isFinite(experienceYearsNumber) ||
        experienceYearsNumber < 0
      ) {
        return fail(400, "Enter valid years of experience");
      }
      if (!normalizedLanguages.length) {
        return fail(400, "Enter at least one language");
      }
      if (!req.file) {
        return fail(400, "Identity proof is required for guide registration");
      }
    }

    if (normalizedRole === "hotel") {
      if (!String(hotelName || "").trim()) {
        return fail(400, "Hotel name is required");
      }
      if (!String(hotelAddress || "").trim()) {
        return fail(400, "Hotel address is required");
      }
      if (!String(cityState || "").trim()) {
        return fail(400, "City/state is required");
      }
      if (!String(hotelType || "").trim()) {
        return fail(400, "Hotel type is required");
      }
      if (!normalizedAmenities.length) {
        return fail(400, "Enter at least one amenity");
      }
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return fail(400, "Email already exists");
    }

    const sanitizedInterests = normalizedRole === "tourist"
      ? String(interests || "").trim()
      : "";



    // Create user, initialize hotel fields if role is hotel
    const userData = {
      name,
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      country: "",
      interests: sanitizedInterests,
      role: normalizedRole
    };
    if (normalizedRole === 'hotel') {
      userData.address = String(hotelAddress || '').trim();
      userData.amenities = normalizedAmenities;
      userData.hotelImages = [];
    }
    const user = await User.create(userData);

    // If registering as a hotel, create Hotel profile
    if (normalizedRole === 'hotel') {
      const Hotel = require('../models/Hotel');
      await Hotel.create({
        user: user._id,
        ownerName: user.name,
        name: String(hotelName || '').trim(),
        email: user.email,
        phone: user.phone,
        country: '',
        address: String(hotelAddress || '').trim(),
        cityState: String(cityState || '').trim(),
        hotelType: String(hotelType || '').trim(),
        businessLicenseProof: '',
        amenities: normalizedAmenities,
        images: []
      });
    }

    // If registering as a guide, also create Guide profile
    if (normalizedRole === 'guide') {
      await Guide.create({
        userId: user._id,
        bio: String(req.body.bio || '').trim(),
        experienceYears: experienceYearsNumber,
        languages: normalizedLanguages,
        identityProof: `/uploads/identity-proofs/${req.file.filename}`,
        phone: user.phone,
        currency: 'INR',
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
        interests: user.interests
      }
    });

  } catch (err) {
    removeUploadedFile(req.file);
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
    const { email, password, role } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (String(password).length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
      });
    }
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account belongs to ${user.role}. Select ${user.role} to continue.`
      });
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
        phone: user.phone,
        country: user.country || '',
        interests: user.interests || '',
        address: user.address || '',
        amenities: user.amenities || [],
        hotelImages: user.hotelImages || [],
        nationality: user.nationality || '',
        language: user.language || '',
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
