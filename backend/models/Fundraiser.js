const mongoose = require('mongoose');
const { fundraiser: generateFundraiserId } = require('../utils/idGenerator');

const FundraiserSchema = new mongoose.Schema({
  fundraiserId: {
    type: String,
    required: true,
    unique: true,
    default: generateFundraiserId,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Fundraiser name is required'],
    trim: true
  },
  purpose: {
    type: String,
    required: [true, 'Fundraiser purpose is required']
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 1
  },
  collectedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Completed', 'Cancelled'],
    default: 'Active',
    index: true
  },
  assignedVolunteers: {
    type: [String],
    default: []
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Fundraiser', FundraiserSchema);
