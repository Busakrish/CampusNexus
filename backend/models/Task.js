const mongoose = require('mongoose');
const { task: generateTaskId } = require('../utils/idGenerator');

const TaskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    unique: true,
    default: generateTaskId,
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
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  assignedVolunteerId: {
    type: String,
    required: true,
    index: true
  },
  assignedBy: {
    type: String,
    required: true
  },
  spendingLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', TaskSchema);
