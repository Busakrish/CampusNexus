const { mongoose, autoId, idField, fk, schemaOptions } = require('./_helpers');

const notificationSchema = new mongoose.Schema({
  notificationId: idField,                           // NTF00001
  userId: fk(true),                                  // recipient
  title: { type: String, required: true },
  message: String,
  type: { type: String, enum: ['Announcement', 'Event', 'Ticket', 'Membership', 'Order', 'Task', 'Expense', 'Reimbursement', 'Collection', 'System'], default: 'System' },
  relatedType: String,
  relatedId: String,                                 // deep-link target (eventId, orderId, ...)
  announcementId: fk(),
  isRead: { type: Boolean, default: false },
  readAt: Date
}, schemaOptions);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

autoId(notificationSchema, 'notificationId', 'NTF', 5);
module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
