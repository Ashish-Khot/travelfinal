const mongoose = require('mongoose');

const GuideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bio: {
    type: String,
    trim: true
  },
  languages: [{
    name: { type: String, trim: true },
    level: { type: String, enum: ['Fluent', 'Intermediate', 'Basic'], default: 'Fluent' }
  }],
  experienceYears: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'INR'],
    default: 'USD'
  },
  rateType: {
    type: String,
    enum: ['hourly', 'daily'],
    default: 'daily'
  },
  ratings: {
    type: Number,
    default: 4.5
  },
  earnings: {
    type: Number,
    default: 0
  },
  approved: {
    type: Boolean,
    default: false
  },
  rejected: {
    type: Boolean,
    default: false
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  travelogues: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Travelogue'
  }],
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // New professional fields
  guideVideo: {
    type: String,
    default: ''
  },
  cancelPolicy: {
    type: String,
    enum: ['Free', 'Moderate', 'Strict'],
    default: 'Moderate'
  },
  tourTypes: [{
    type: String,
    trim: true
  }],
  averageResponseTime: {
    type: Number,
    default: 24
  },
  highlights: [{
    type: String,
    trim: true
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  verifiedPhone: {
    type: Boolean,
    default: false
  },
  verifiedID: {
    type: Boolean,
    default: false
  },
  verifiedPayment: {
    type: Boolean,
    default: false
  },
  lastBookingDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Guide', GuideSchema);
