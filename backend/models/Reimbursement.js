const mongoose = require('mongoose');
const { reimbursement: generateReimbursementId } = require('../utils/idGenerator');

const ReimbursementSchema = new mongoose.Schema({
  reimbursementId: {
    type: String,
    required: true,
    unique: true,
    default: generateReimbursementId,
    index: true
  },
  expenseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  submittedBy: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Paid'],
    default: 'Pending',
    index: true
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  paymentReference: {
    type: String,
    default: ''
  },
  transactionId: {
    type: String,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reimbursement', ReimbursementSchema);
