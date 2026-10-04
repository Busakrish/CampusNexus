const mongoose = require('mongoose');
const { registration: generateRegistrationId } = require('../utils/idGenerator');

const RegistrationSchema = new mongoose.Schema({
  registrationId: {
    type: String,
    required: true,
    unique: true,
    default: generateRegistrationId,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  feePaid: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentId: {
    type: String,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  cancellationReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Registration', RegistrationSchema);
