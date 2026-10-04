const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Dispatches a notification to a specific user.
 */
async function notifyUser(userId, { type = 'GENERAL', title, message, relatedEntity = null, relatedId = null }) {
  try {
    return await Notification.create({
      userId,
      type,
      title,
      message,
      relatedEntity,
      relatedId,
      read: false
    });
  } catch (err) {
    console.error(`[NotificationService] Error notifying user ${userId}:`, err.message);
  }
}

/**
 * Dispatches a notification to an audience group (All, Students, Volunteers, Treasurer, Organizers).
 */
async function notifyAudience(audience, { type = 'ANNOUNCEMENT', title, message, relatedEntity = null, relatedId = null }) {
  try {
    let query = { status: 'Active' };
    if (audience === 'Students') query.role = 'STUDENT';
    else if (audience === 'Volunteers') query.role = 'VOLUNTEER';
    else if (audience === 'Treasurer') query.role = 'TREASURER';
    else if (audience === 'Organizers') query.role = 'ORGANIZER';
    // If 'All', no role filter

    const users = await User.find(query).select('userId');
    if (!users || users.length === 0) return [];

    const notifications = users.map(u => ({
      userId: u.userId,
      type,
      title,
      message,
      relatedEntity,
      relatedId,
      read: false
    }));

    return await Notification.insertMany(notifications);
  } catch (err) {
    console.error(`[NotificationService] Error notifying audience ${audience}:`, err.message);
  }
}

module.exports = {
  notifyUser,
  notifyAudience
};
