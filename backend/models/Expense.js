const mongoose = require('mongoose');
const { expense: generateExpenseId } = require('../utils/idGenerator');

const ExpenseSchema = new mongoose.Schema({
  expenseId: {
    type: String,
    required: true,
    unique: true,
    default: generateExpenseId,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    default: null,
    index: true
  },
  fundraiserId: {
    type: String,
    default: null,
    index: true
  },
  taskId: {
    type: String,
    default: null,
    index: true
  },
  budgetId: {
    type: String,
    default: null,
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
  category: {
    type: String,
    enum: ['Equipment', 'Logistics', 'Food & Refreshments', 'Printing & Stationery', 'Marketing', 'Prizes', 'Travel', 'Other'],
    default: 'Logistics'
  },
  description: {
    type: String,
    required: [true, 'Expense description is required']
  },
  receiptUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Reimbursed'],
    default: 'Pending',
    index: true
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  reviewRemarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);
