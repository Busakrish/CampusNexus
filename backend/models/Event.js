const mongoose = require('mongoose');
const { event: generateEventId } = require('../utils/idGenerator');

const EventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: generateEventId,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  organizerId: {
    type: String,
    required: true,
    index: true
  },
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Workshop', 'Hackathon', 'Cultural', 'Seminar', 'Competition', 'Sports', 'Social', 'Meeting', 'Other'],
    default: 'Workshop'
  },
  banner: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    default: '09:00'
  },
  endTime: {
    type: String,
    default: '17:00'
  },
  venue: {
    type: String,
    required: true
  },
  room: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  maximumCapacity: {
    type: Number,
    required: true,
    min: 1
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  registrationFee: {
    type: Number,
    default: 0,
    min: 0
  },
  registrationCount: {
    type: Number,
    default: 0,
    min: 0
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Published', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Draft',
    index: true
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  requiresMembership: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Middleware to initialize availableSeats
EventSchema.pre('validate', function(next) {
  if (this.isNew && this.availableSeats === undefined) {
    this.availableSeats = this.maximumCapacity;
  }
  next();
});

module.exports = mongoose.model('Event', EventSchema);
