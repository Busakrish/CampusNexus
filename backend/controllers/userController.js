const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { sendSuccess, sendError } = require('../utils/response');

exports.listUsers = async (req, res, next) => {
  try {
    const { role, status, search, organizationId } = req.query;
    const query = {};

    if (role) query.role = role.toUpperCase();
    if (status) query.status = status;
    if (organizationId) query.organizationId = organizationId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, 'Users retrieved successfully', { users, count: users.length });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return sendError(res, 'User not found.', 404, 'USER_NOT_FOUND');

    let studentProfile = null;
    if (user.role === 'STUDENT') {
      studentProfile = await StudentProfile.findOne({ userId: user.userId });
    }

    return sendSuccess(res, 'User details retrieved', { user, studentProfile });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role, organizationId } = req.body;
    const validRoles = ['STUDENT', 'VOLUNTEER', 'ADMIN', 'TREASURER', 'ORGANIZER'];

    if (!validRoles.includes(role)) {
      return sendError(res, `Invalid role. Allowed: ${validRoles.join(', ')}`, 400, 'INVALID_ROLE');
    }

    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return sendError(res, 'User not found.', 404, 'USER_NOT_FOUND');

    user.role = role;
    if (organizationId !== undefined) {
      user.organizationId = organizationId;
    }
    await user.save();

    return sendSuccess(res, `User role updated to ${role}`, { user });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Active', 'Inactive', 'Suspended'];

    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Allowed: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return sendError(res, 'User not found.', 404, 'USER_NOT_FOUND');

    // Prevent suspending own admin account
    if (user.userId === req.user.userId && status !== 'Active') {
      return sendError(res, 'Cannot change status of currently logged in user.', 400, 'CANNOT_MODIFY_SELF');
    }

    user.status = status;
    await user.save();

    return sendSuccess(res, `User status updated to ${status}`, { user });
  } catch (err) {
    next(err);
  }
};

exports.getVolunteers = async (req, res, next) => {
  try {
    const volunteers = await User.find({ role: 'VOLUNTEER', status: 'Active' }).select('userId name email phone');
    return sendSuccess(res, 'Active volunteers retrieved', { volunteers });
  } catch (err) {
    next(err);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'STUDENT', status: 'Active' }).select('userId name email phone');
    return sendSuccess(res, 'Active students retrieved', { students });
  } catch (err) {
    next(err);
  }
};
