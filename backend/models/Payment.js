const mongoose = require('mongoose');
const { payment: generatePaymentId } = require('../utils/idGenerator');

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    default: generatePaymentId,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  purpose: {
    type: String,
    enum: ['EVENT_REGISTRATION', 'MEMBERSHIP_DUES', 'MERCHANDISE_ORDER', 'FUNDRAISER_DONATION', 'OTHER'],
    required: true
  },
  relatedEntityId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['CARD', 'UPI', 'NET_BANKING', 'CAMPUS_WALLET', 'CASH', 'SIMULATED'],
    default: 'SIMULATED'
  },
  transactionRef: {
    type: String,
    default: () => 'TXREF-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid/Verified', 'Failed', 'Refunded/Cancelled'],
    default: 'Pending',
    index: true
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);
