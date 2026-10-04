const mongoose = require('mongoose');
const { membership: generateMembershipId } = require('../utils/idGenerator');

const MembershipSchema = new mongoose.Schema({
  membershipId: {
    type: String,
    required: true,
    unique: true,
    default: generateMembershipId,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  membershipType: {
    type: String,
    enum: ['General', 'Premium', 'Honorary', 'Executive'],
    default: 'General'
  },
  memberSince: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Expired', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  benefits: {
    type: [String],
    default: ['Event Discounts', 'Voting Rights', 'Exclusive Merchandise Access']
  },
  feeAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  paymentId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Membership', MembershipSchema);
