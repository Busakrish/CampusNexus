const mongoose = require('mongoose');
const { notification: generateNotificationId } = require('../utils/idGenerator');

const NotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    default: generateNotificationId,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['EVENT', 'PAYMENT', 'TICKET', 'TASK', 'EXPENSE', 'REIMBURSEMENT', 'FUNDRAISER', 'ANNOUNCEMENT', 'GENERAL', 'MEMBERSHIP'],
    default: 'GENERAL',
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedEntity: {
    type: String,
    default: null
  },
  relatedId: {
    type: String,
    default: null
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);
