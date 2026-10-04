const mongoose = require('mongoose');
const { collection: generateCollectionId } = require('../utils/idGenerator');

const CollectionSchema = new mongoose.Schema({
  collectionId: {
    type: String,
    required: true,
    unique: true,
    default: generateCollectionId,
    index: true
  },
  fundraiserId: {
    type: String,
    required: true,
    index: true
  },
  volunteerId: {
    type: String,
    required: true,
    index: true
  },
  contributor: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'UPI', 'CARD', 'ONLINE', 'CHEQUE'],
    default: 'CASH'
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending',
    index: true
  },
  verifiedBy: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Collection', CollectionSchema);
