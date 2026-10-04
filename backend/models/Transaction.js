const mongoose = require('mongoose');
const { transaction: generateTransactionId } = require('../utils/idGenerator');

const TransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: generateTransactionId,
    index: true
  },
  type: {
    type: String,
    enum: ['INCOME', 'EXPENSE', 'REIMBURSEMENT'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['MEMBERSHIP', 'EVENT', 'MERCHANDISE', 'FUNDRAISER', 'OPERATIONAL', 'REIMBURSEMENT', 'OTHER'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  sourceEntity: {
    type: String,
    enum: ['MEMBERSHIP', 'REGISTRATION', 'ORDER', 'COLLECTION', 'EXPENSE', 'REIMBURSEMENT', 'MANUAL'],
    required: true
  },
  sourceId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'Cancelled'],
    default: 'Verified',
    index: true
  },
  description: {
    type: String,
    required: true
  },
  processedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);
