const Task = require('../models/Task');
const Event = require('../models/Event');
const Fundraiser = require('../models/Fundraiser');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      assignedVolunteerId,
      eventId,
      fundraiserId,
      organizationId,
      spendingLimit,
      dueDate
    } = req.body;

    if (!title || !assignedVolunteerId) {
      return sendError(res, 'Task title and assigned volunteer are required.', 400, 'VALIDATION_FAILED');
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    const volunteer = await User.findOne({ userId: assignedVolunteerId });
    if (!volunteer) {
      return sendError(res, 'Assigned volunteer not found.', 404, 'VOLUNTEER_NOT_FOUND');
    }

    const task = await Task.create({
      title,
      description: description || '',
      assignedVolunteerId,
      assignedBy: req.user.userId,
      eventId: eventId || null,
      fundraiserId: fundraiserId || null,
      organizationId: orgId,
      spendingLimit: Number(spendingLimit) || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'Pending'
    });

    await notifyUser(assignedVolunteerId, {
      type: 'TASK',
      title: 'New Volunteer Task Assigned',
      message: `You have been assigned the task: "${task.title}". Check your volunteer dashboard.`,
      relatedEntity: 'TASK',
      relatedId: task.taskId
    });

    return sendSuccess(res, 'Task assigned successfully.', { task }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listTasks = async (req, res, next) => {
  try {
    const { status, assignedVolunteerId, eventId, fundraiserId, organizationId } = req.query;
    const query = {};

    if (req.user.role === 'VOLUNTEER') {
      query.assignedVolunteerId = req.user.userId;
    } else if (assignedVolunteerId) {
      query.assignedVolunteerId = assignedVolunteerId;
    }

    if (organizationId) query.organizationId = organizationId;
    if (eventId) query.eventId = eventId;
    if (fundraiserId) query.fundraiserId = fundraiserId;
    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const tasks = await Task.find(query).sort({ dueDate: 1, createdAt: -1 });

    const volunteerIds = [...new Set(tasks.map(t => t.assignedVolunteerId))];
    const volunteers = await User.find({ userId: { $in: volunteerIds } }).select('userId name email phone');
    const volMap = Object.fromEntries(volunteers.map(v => [v.userId, v]));

    const populated = tasks.map(t => ({
      ...t.toObject(),
      volunteer: volMap[t.assignedVolunteerId] || null
    }));

    return sendSuccess(res, 'Tasks retrieved', { tasks: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ taskId: req.params.taskId });
    if (!task) return sendError(res, 'Task not found.', 404, 'TASK_NOT_FOUND');

    if (req.user.role === 'VOLUNTEER' && task.assignedVolunteerId !== req.user.userId) {
      return sendError(res, 'Forbidden: You cannot access another volunteer task.', 403, 'FORBIDDEN_TASK_ACCESS');
    }

    const volunteer = await User.findOne({ userId: task.assignedVolunteerId }).select('userId name email phone');

    return sendSuccess(res, 'Task details retrieved', { task, volunteer });
  } catch (err) {
    next(err);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

    const matchedStatus = validStatuses.find(s => s.toLowerCase() === (status || '').toLowerCase());
    if (!matchedStatus) {
      return sendError(res, `Invalid status. Allowed: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    const task = await Task.findOne({ taskId });
    if (!task) return sendError(res, 'Task not found.', 404, 'TASK_NOT_FOUND');

    if (req.user.role === 'VOLUNTEER' && task.assignedVolunteerId !== req.user.userId) {
      return sendError(res, 'Forbidden: You cannot update another volunteer task.', 403, 'FORBIDDEN_TASK_UPDATE');
    }

    task.status = matchedStatus;
    if (matchedStatus === 'Completed') {
      task.completedAt = new Date();
    }
    await task.save();

    return sendSuccess(res, `Task marked as ${matchedStatus}`, { task });
  } catch (err) {
    next(err);
  }
};
