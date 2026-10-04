const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

exports.listNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    const query = { userId: req.user.userId };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    const unreadCount = await Notification.countDocuments({ userId: req.user.userId, read: false });

    return sendSuccess(res, 'Notifications retrieved', {
      notifications,
      unreadCount,
      count: notifications.length
    });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.user.userId, read: false });
    return sendSuccess(res, 'Unread count retrieved', { unreadCount });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOne({ notificationId, userId: req.user.userId });
    if (!notification) return sendError(res, 'Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');

    notification.read = true;
    await notification.save();

    return sendSuccess(res, 'Notification marked as read', { notification });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
    return sendSuccess(res, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};
