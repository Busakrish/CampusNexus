const Event = require('../models/Event');
const Organization = require('../models/Organization');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Attendance = require('../models/Attendance');
const { notifyUser, notifyAudience } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

exports.createEvent = async (req, res, next) => {
  try {
    const {
      eventName,
      description,
      category,
      banner,
      startDate,
      endDate,
      startTime,
      endTime,
      venue,
      room,
      address,
      maximumCapacity,
      capacityLimit,
      registrationDeadline,
      registrationFee,
      organizationId,
      requiresMembership,
      status: requestedStatus
    } = req.body;

    let orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      const defaultOrg = await Organization.findOne({ status: 'Active' });
      if (defaultOrg) orgId = defaultOrg.organizationId;
    }

    if (!orgId) {
      return sendError(res, 'Organization ID is required to create an event.', 400, 'ORG_REQUIRED');
    }

    const rawCap = maximumCapacity !== undefined ? maximumCapacity : capacityLimit;
    const deadline = registrationDeadline || startDate;

    if (!eventName || !startDate || !endDate || !venue || rawCap === undefined) {
      return sendError(res, 'Event name, dates, venue, and capacity limit are required.', 400, 'VALIDATION_FAILED');
    }

    const cap = parseInt(rawCap, 10);
    if (isNaN(cap) || cap <= 0) {
      return sendError(res, 'Maximum capacity must be a positive integer.', 400, 'INVALID_CAPACITY');
    }

    let initialStatus = 'Draft';
    if (req.user.role === 'ADMIN') {
      initialStatus = (requestedStatus === 'Draft' || requestedStatus === 'draft') ? 'Draft' : 'Published';
    } else if (requestedStatus === 'Pending Approval' || requestedStatus === 'pending approval' || requestedStatus === 'Pending') {
      initialStatus = 'Pending Approval';
    }

    const event = await Event.create({
      organizationId: orgId,
      organizerId: req.user.userId,
      eventName,
      description: description || '',
      category: category ? (category.charAt(0).toUpperCase() + category.slice(1)) : 'Workshop',
      banner: banner || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      venue,
      room: room || '',
      address: address || '',
      maximumCapacity: cap,
      availableSeats: cap,
      registrationCount: 0,
      registrationDeadline: new Date(deadline),
      registrationFee: Number(registrationFee) || 0,
      requiresMembership: Boolean(requiresMembership),
      status: initialStatus
    });

    return sendSuccess(res, `Event created as ${event.status}`, { event }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listEvents = async (req, res, next) => {
  try {
    const { status, category, organizationId, search, view } = req.query;
    const query = {};

    // For public students: show Published / Ongoing / Completed events
    if (req.user && req.user.role === 'STUDENT') {
      if (status) {
        query.status = { $regex: new RegExp(`^${status}$`, 'i') };
      } else {
        query.status = { $in: ['Published', 'Ongoing', 'Completed'] };
      }
    } else if (req.user && req.user.role === 'VOLUNTEER') {
      if (status) {
        query.status = { $regex: new RegExp(`^${status}$`, 'i') };
      } else {
        query.$or = [
          { status: { $in: ['Published', 'Ongoing', 'Completed', 'Approved'] } },
          { organizerId: req.user.userId }
        ];
      }
    } else if (req.user && req.user.role === 'ORGANIZER') {
      if (view === 'my_org' || !status) {
        if (req.user.organizationId) {
          query.organizationId = req.user.organizationId;
        }
      }
      if (status) {
        query.status = { $regex: new RegExp(`^${status}$`, 'i') };
      }
    } else if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    if (organizationId) query.organizationId = organizationId;
    if (category) query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (search) {
      query.$or = [
        { eventName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).sort({ startDate: 1 });

    // Populate organization names and calculate live attendance
    const eventIds = events.map(e => e.eventId);
    const orgIds = [...new Set(events.map(e => e.organizationId))];
    const [orgs, attendances] = await Promise.all([
      Organization.find({ organizationId: { $in: orgIds } }),
      Attendance.find({ eventId: { $in: eventIds } })
    ]);

    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));
    const attMap = {};
    attendances.forEach(a => { attMap[a.eventId] = (attMap[a.eventId] || 0) + 1; });

    const populated = events.map(e => {
      const obj = e.toObject();
      return {
        ...obj,
        registeredCount: obj.registrationCount,
        capacityLimit: obj.maximumCapacity,
        attendanceCount: attMap[e.eventId] || 0,
        organization: orgMap[e.organizationId] || null
      };
    });

    return sendSuccess(res, 'Events retrieved', { events: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findOne({ eventId: req.params.eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    const org = await Organization.findOne({ organizationId: event.organizationId });

    return sendSuccess(res, 'Event details retrieved', { event, organization: org });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    // Organizer check
    if (req.user.role === 'ORGANIZER' && event.organizationId !== req.user.organizationId) {
      return sendError(res, 'Forbidden: You do not own this event.', 403, 'FORBIDDEN_CROSS_ORG');
    }

    // Editable only when in Draft, Rejected, or Approved before publishing
    if (!['Draft', 'Rejected', 'Approved', 'Pending Approval'].includes(event.status) && req.user.role !== 'ADMIN') {
      return sendError(res, `Cannot edit event while in status '${event.status}'.`, 400, 'EVENT_NOT_EDITABLE');
    }

    const fields = [
      'eventName', 'description', 'category', 'banner', 'startDate', 'endDate',
      'startTime', 'endTime', 'venue', 'room', 'address', 'registrationDeadline',
      'registrationFee', 'requiresMembership'
    ];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        event[f] = req.body[f];
      }
    });

    if (req.body.maximumCapacity !== undefined) {
      const newCap = parseInt(req.body.maximumCapacity, 10);
      if (newCap < event.registrationCount) {
        return sendError(res, `Capacity cannot be lower than existing registrations (${event.registrationCount}).`, 400, 'CAPACITY_TOO_LOW');
      }
      event.maximumCapacity = newCap;
      event.availableSeats = newCap - event.registrationCount;
    }

    await event.save();
    return sendSuccess(res, 'Event updated successfully', { event });
  } catch (err) {
    next(err);
  }
};

// Lifecycle: Submit Draft for Admin Approval
exports.submitEventForApproval = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (req.user.role === 'ORGANIZER' && event.organizationId !== req.user.organizationId) {
      return sendError(res, 'Forbidden: Not your organization event.', 403, 'FORBIDDEN_CROSS_ORG');
    }

    if (!['Draft', 'Rejected'].includes(event.status)) {
      return sendError(res, `Event status must be Draft or Rejected to submit for approval. Current: ${event.status}`, 400, 'INVALID_TRANSITION');
    }

    event.status = 'Pending Approval';
    event.rejectionReason = '';
    await event.save();

    return sendSuccess(res, 'Event submitted for Admin approval.', { event });
  } catch (err) {
    next(err);
  }
};

// Lifecycle: Admin Approves Event
exports.approveEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { autoPublish, publish } = req.body || {};
    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (event.status !== 'Pending Approval' && event.status !== 'Draft' && event.status !== 'Rejected') {
      return sendError(res, `Event must be 'Pending Approval', 'Draft', or 'Rejected' to approve. Current: ${event.status}`, 400, 'INVALID_TRANSITION');
    }

    const shouldPublish = autoPublish || publish || req.query.autoPublish === 'true' || req.query.publish === 'true';
    event.status = shouldPublish ? 'Published' : 'Approved';
    event.rejectionReason = '';
    await event.save();

    await notifyUser(event.organizerId, {
      type: 'EVENT',
      title: shouldPublish ? 'Event Approved & Published!' : 'Event Approved!',
      message: shouldPublish
        ? `Your event "${event.eventName}" was approved and published to campus students.`
        : `Your event "${event.eventName}" has been approved by the Admin and can now be published.`,
      relatedEntity: 'EVENT',
      relatedId: event.eventId
    });

    if (shouldPublish) {
      await notifyAudience('Students', {
        type: 'EVENT',
        title: 'New Event Published!',
        message: `Registration is now open for "${event.eventName}". Check details and reserve your seat!`,
        relatedEntity: 'EVENT',
        relatedId: event.eventId
      });
    }

    return sendSuccess(res, `Event approved${shouldPublish ? ' and published' : ''} successfully.`, { event });
  } catch (err) {
    next(err);
  }
};

// Lifecycle: Admin Rejects Event
exports.rejectEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { reason = 'Details did not meet institutional guidelines.' } = req.body;
    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (event.status !== 'Pending Approval' && event.status !== 'Draft') {
      return sendError(res, `Event must be 'Pending Approval' or 'Draft' to reject. Current: ${event.status}`, 400, 'INVALID_TRANSITION');
    }

    event.status = 'Rejected';
    event.rejectionReason = reason;
    await event.save();

    await notifyUser(event.organizerId, {
      type: 'EVENT',
      title: 'Event Rejected',
      message: `Your event "${event.eventName}" was rejected. Reason: ${reason}`,
      relatedEntity: 'EVENT',
      relatedId: event.eventId
    });

    return sendSuccess(res, 'Event rejected with feedback.', { event });
  } catch (err) {
    next(err);
  }
};

// Lifecycle: Organizer / Admin Publishes Approved Event
exports.publishEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (req.user.role === 'ORGANIZER' && event.organizationId !== req.user.organizationId) {
      return sendError(res, 'Forbidden: Not your organization event.', 403, 'FORBIDDEN_CROSS_ORG');
    }

    if (!['Approved', 'Draft'].includes(event.status) && req.user.role !== 'ADMIN') {
      return sendError(res, `Event status must be Approved or Draft to publish. Current: ${event.status}`, 400, 'INVALID_TRANSITION');
    }

    event.status = 'Published';
    await event.save();

    // Broadcast notification to students
    await notifyAudience('Students', {
      type: 'EVENT',
      title: 'New Event Published!',
      message: `Registration is now open for "${event.eventName}". Check details and reserve your seat!`,
      relatedEntity: 'EVENT',
      relatedId: event.eventId
    });

    return sendSuccess(res, 'Event published to students.', { event });
  } catch (err) {
    next(err);
  }
};

// Lifecycle: Cancel Event
exports.cancelEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { reason = 'Cancelled by organizer/admin.' } = req.body;
    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (req.user.role === 'ORGANIZER' && event.organizationId !== req.user.organizationId) {
      return sendError(res, 'Forbidden: Not your organization event.', 403, 'FORBIDDEN_CROSS_ORG');
    }

    event.status = 'Cancelled';
    event.rejectionReason = reason;
    await event.save();

    // Invalidate active tickets & registrations
    await Ticket.updateMany({ eventId, status: 'Valid' }, { status: 'Cancelled' });
    await Registration.updateMany({ eventId, status: 'Confirmed' }, { status: 'Cancelled', cancellationReason: `Event Cancelled: ${reason}` });

    return sendSuccess(res, 'Event cancelled safely and tickets invalidated.', { event });
  } catch (err) {
    next(err);
  }
};

// Lifecycle: Flexible status updater with case normalization
exports.updateEventStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status is required.', 400, 'STATUS_REQUIRED');
    }

    const statusMap = {
      draft: 'Draft',
      'pending approval': 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      published: 'Published',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };

    const normalizedStatus = statusMap[status.toLowerCase().trim()];
    if (!normalizedStatus) {
      return sendError(res, `Invalid status '${status}'. Allowed: ${Object.values(statusMap).join(', ')}`, 400, 'INVALID_STATUS');
    }

    const event = await Event.findOne({ eventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (req.user.role === 'ORGANIZER' && event.organizationId !== req.user.organizationId) {
      return sendError(res, 'Forbidden: Not your organization event.', 403, 'FORBIDDEN_CROSS_ORG');
    }

    event.status = normalizedStatus;
    await event.save();

    if (normalizedStatus === 'Cancelled') {
      await Ticket.updateMany({ eventId, status: 'Valid' }, { status: 'Cancelled' });
      await Registration.updateMany({ eventId, status: 'Confirmed' }, { status: 'Cancelled', cancellationReason: 'Event cancelled' });
    } else if (normalizedStatus === 'Published') {
      await notifyAudience('Students', {
        type: 'EVENT',
        title: 'New Event Published!',
        message: `Registration is now open for "${event.eventName}". Check details and reserve your seat!`,
        relatedEntity: 'EVENT',
        relatedId: event.eventId
      });
    }

    return sendSuccess(res, `Event status updated to ${normalizedStatus}`, { event });
  } catch (err) {
    next(err);
  }
};
