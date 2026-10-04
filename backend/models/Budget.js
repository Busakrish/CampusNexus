const mongoose = require('mongoose');
const { budget: generateBudgetId } = require('../utils/idGenerator');

const BudgetSchema = new mongoose.Schema({
  budgetId: {
    type: String,
    required: true,
    unique: true,
    default: generateBudgetId,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  budgetName: {
    type: String,
    required: [true, 'Budget name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Event', 'Fundraiser', 'Operational', 'Annual', 'Emergency', 'Equipment', 'General'],
    default: 'General'
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
  allocatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  usedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    default: function() {
      return this.allocatedAmount - (this.usedAmount || 0);
    }
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
    enum: ['Active', 'Closed', 'Pending'],
    default: 'Active',
    index: true
  }
}, {
  timestamps: true
});

BudgetSchema.pre('validate', function(next) {
  if (this.allocatedAmount !== undefined) {
    this.remainingAmount = this.allocatedAmount - (this.usedAmount || 0);
  }
  next();
});

module.exports = mongoose.model('Budget', BudgetSchema);
