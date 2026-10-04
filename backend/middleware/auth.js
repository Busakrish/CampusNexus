const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_campusnexus_jwt_secret_key_2026_x99a!';

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return sendError(res, 'Authentication token required. Please log in.', 401, 'AUTH_TOKEN_MISSING');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please log in again.', 401, 'AUTH_TOKEN_EXPIRED');
      }
      return sendError(res, 'Invalid authentication token.', 401, 'AUTH_TOKEN_INVALID');
    }

    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return sendError(res, 'Authenticated user not found.', 401, 'AUTH_USER_NOT_FOUND');
    }

    if (user.status === 'Suspended') {
      return sendError(res, 'Account is suspended. Contact administrator.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.status === 'Inactive') {
      return sendError(res, 'Account is inactive.', 403, 'ACCOUNT_INACTIVE');
    }

    // Attach user to request
    req.user = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId
    };

    next();
  } catch (error) {
    return sendError(res, `Authentication failure: ${error.message}`, 500, 'AUTH_INTERNAL_ERROR');
  }
};

module.exports = {
  authenticate
};
