const { sendError } = require('../utils/response');
const Event = require('../models/Event');
const Organization = require('../models/Organization');

/**
 * Enforce role-based access control
 * @param  {...string} roles Allowed roles ('ADMIN', 'STUDENT', 'VOLUNTEER', 'TREASURER', 'ORGANIZER')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthenticated. Please log in first.', 401, 'UNAUTHENTICATED');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`,
        403,
        'FORBIDDEN_ROLE'
      );
    }

    next();
  };
};

/**
 * Enforces organization isolation for ORGANIZER role.
 * Admins have global access. Organizers are strictly scoped to their own organizationId.
 */
const authorizeOrganizationScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthenticated.', 401, 'UNAUTHENTICATED');
    }

    if (req.user.role === 'ADMIN') {
      return next(); // Admins bypass org scope check
    }

    if (req.user.role === 'ORGANIZER') {
      const targetOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
      
      // If an eventId is passed, look up the event to find its organizationId
      const targetEventId = req.params.eventId || req.body.eventId;
      if (targetEventId && !targetOrgId) {
        const event = await Event.findOne({ eventId: targetEventId });
        if (!event) {
          return sendError(res, 'Event not found for organization scope check.', 404, 'EVENT_NOT_FOUND');
        }
        if (event.organizationId !== req.user.organizationId) {
          return sendError(res, 'Forbidden: You do not have permission to manage events from another organization.', 403, 'FORBIDDEN_CROSS_ORG');
        }
        return next();
      }

      if (targetOrgId && targetOrgId !== req.user.organizationId) {
        return sendError(
          res,
          'Forbidden: You are only authorized to manage resources for your assigned organization.',
          403,
          'FORBIDDEN_CROSS_ORG'
        );
      }

      // If no explicit orgId specified, automatically attach user's organizationId
      if (req.body && !req.body.organizationId && req.user.organizationId) {
        req.body.organizationId = req.user.organizationId;
      }
    }

    next();
  } catch (err) {
    return sendError(res, `Organization authorization error: ${err.message}`, 500, 'ORG_AUTH_ERROR');
  }
};

module.exports = {
  authorizeRoles,
  authorizeOrganizationScope
};
