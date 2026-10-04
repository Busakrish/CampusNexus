const Announcement = require('../models/Announcement');
const Organization = require('../models/Organization');
const Event = require('../models/Event');
const { notifyAudience, notifyUser } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, audience = 'All', eventId, organizationId, scope = 'CAMPUS' } = req.body;

    if (!title || !content) {
      return sendError(res, 'Announcement title and content are required.', 400, 'VALIDATION_FAILED');
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    // Role check: Organizer creating campus-wide requires Admin approval, or creates event-specific
    let status = 'Published';
    if (req.user.role === 'ORGANIZER') {
      if (scope === 'CAMPUS') {
        status = 'Pending Approval';
      } else {
        status = 'Published';
      }
    }

    const announcement = await Announcement.create({
      organizationId: orgId,
      title,
      content,
      audience,
      eventId: eventId || null,
      scope: eventId ? 'EVENT' : scope,
      status,
      createdBy: req.user.userId,
      publishedAt: status === 'Published' ? new Date() : null
    });

    // If immediately published, notify the intended audience
    if (status === 'Published') {
      await notifyAudience(audience, {
        type: 'ANNOUNCEMENT',
        title: `Announcement: ${title}`,
        message: content.length > 120 ? content.substring(0, 117) + '...' : content,
        relatedEntity: 'ANNOUNCEMENT',
        relatedId: announcement.announcementId
      });
    }

    return sendSuccess(
      res,
      status === 'Published' ? 'Announcement published successfully.' : 'Announcement submitted for Admin approval.',
      { announcement },
      201
    );
  } catch (err) {
    next(err);
  }
};

exports.listAnnouncements = async (req, res, next) => {
  try {
    const { audience, scope, status, eventId } = req.query;
    const query = {};

    if (req.user.role === 'STUDENT') {
      query.status = 'Published';
      query.audience = { $in: ['All', 'Students'] };
    } else if (req.user.role === 'VOLUNTEER') {
      query.status = 'Published';
      query.audience = { $in: ['All', 'Volunteers'] };
    } else if (req.user.role === 'TREASURER') {
      query.status = 'Published';
      query.audience = { $in: ['All', 'Treasurer'] };
    } else if (req.user.role === 'ORGANIZER') {
      if (!status) {
        query.$or = [
          { status: 'Published', audience: { $in: ['All', 'Organizers'] } },
          { createdBy: req.user.userId }
        ];
      } else {
        query.status = new RegExp(`^${status}$`, 'i');
      }
    } else if (status) {
      query.status = new RegExp(`^${status}$`, 'i');
    }

    if (scope) query.scope = scope;
    if (eventId) query.eventId = eventId;
    if (audience && req.user.role === 'ADMIN') query.audience = audience;

    const announcements = await Announcement.find(query).sort({ publishedAt: -1, createdAt: -1 });

    const orgIds = [...new Set(announcements.map(a => a.organizationId))];
    const orgs = await Organization.find({ organizationId: { $in: orgIds } });
    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));

    const populated = announcements.map(a => ({
      ...a.toObject(),
      organization: orgMap[a.organizationId] || null
    }));

    return sendSuccess(res, 'Announcements retrieved', { announcements: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getAnnouncementById = async (req, res, next) => {
  try {
    const announcement = await Announcement.findOne({ announcementId: req.params.announcementId });
    if (!announcement) return sendError(res, 'Announcement not found.', 404, 'ANNOUNCEMENT_NOT_FOUND');

    const org = await Organization.findOne({ organizationId: announcement.organizationId });

    return sendSuccess(res, 'Announcement retrieved', { announcement, organization: org });
  } catch (err) {
    next(err);
  }
};

exports.approveAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    const announcement = await Announcement.findOne({ announcementId });
    if (!announcement) return sendError(res, 'Announcement not found.', 404, 'ANNOUNCEMENT_NOT_FOUND');

    announcement.status = 'Published';
    announcement.publishedAt = new Date();
    await announcement.save();

    await notifyAudience(announcement.audience, {
      type: 'ANNOUNCEMENT',
      title: `Announcement: ${announcement.title}`,
      message: announcement.content.length > 120 ? announcement.content.substring(0, 117) + '...' : announcement.content,
      relatedEntity: 'ANNOUNCEMENT',
      relatedId: announcement.announcementId
    });

    return sendSuccess(res, 'Announcement approved and broadcasted.', { announcement });
  } catch (err) {
    next(err);
  }
};
