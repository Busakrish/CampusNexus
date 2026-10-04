const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['LOGIN', 'REGISTER', 'PASSWORD_RESET'],
    default: 'REGISTER'
  },
  pendingData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  attempts: {
    type: Number,
    default: 0
  },
  requestCount: {
    type: Number,
    default: 1
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '15m' } // Automatically purge after 15 minutes
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Otp', OtpSchema);
