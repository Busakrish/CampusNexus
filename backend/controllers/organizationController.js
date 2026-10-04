const Organization = require('../models/Organization');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

exports.createOrganization = async (req, res, next) => {
  try {
    const { name, code, description, category, leadOrganizerId, logo, contactEmail, membershipFee } = req.body;

    if (!name || !code || !leadOrganizerId) {
      return sendError(res, 'Organization name, code, and lead organizer are required.', 400, 'VALIDATION_FAILED');
    }

    const existingCode = await Organization.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return sendError(res, 'An organization with this code already exists.', 409, 'CODE_ALREADY_EXISTS');
    }

    const leadOrganizer = await User.findOne({ userId: leadOrganizerId });
    if (!leadOrganizer) {
      return sendError(res, 'Lead organizer user not found.', 404, 'ORGANIZER_NOT_FOUND');
    }

    const organization = await Organization.create({
      name,
      code: code.toUpperCase(),
      description: description || '',
      category: category || 'General',
      leadOrganizerId,
      logo: logo || '',
      contactEmail: contactEmail || leadOrganizer.email,
      membershipFee: Number(membershipFee) || 0,
      status: 'Active'
    });

    // Update user's organizationId
    leadOrganizer.organizationId = organization.organizationId;
    if (leadOrganizer.role !== 'ADMIN') {
      leadOrganizer.role = 'ORGANIZER';
    }
    await leadOrganizer.save();

    return sendSuccess(res, 'Organization created successfully', { organization }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listOrganizations = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    const query = {};

    // For public students, show Active organizations by default
    if (req.user && req.user.role === 'STUDENT') {
      query.status = 'Active';
    } else if (status) {
      query.status = status;
    }

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const organizations = await Organization.find(query).sort({ name: 1 });
    return sendSuccess(res, 'Organizations retrieved', { organizations, count: organizations.length });
  } catch (err) {
    next(err);
  }
};

exports.getOrganizationById = async (req, res, next) => {
  try {
    const organization = await Organization.findOne({ organizationId: req.params.organizationId });
    if (!organization) {
      return sendError(res, 'Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const leadUser = await User.findOne({ userId: organization.leadOrganizerId }).select('userId name email phone');

    return sendSuccess(res, 'Organization details retrieved', { organization, leadUser });
  } catch (err) {
    next(err);
  }
};

exports.updateOrganization = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    const { name, description, category, logo, contactEmail, membershipFee, leadOrganizerId } = req.body;

    const organization = await Organization.findOne({ organizationId });
    if (!organization) {
      return sendError(res, 'Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    }

    // Role check: Admin can update any, Organizer can only update their own
    if (req.user.role === 'ORGANIZER' && req.user.organizationId !== organizationId) {
      return sendError(res, 'Forbidden: You can only update your own organization.', 403, 'FORBIDDEN_ORG_UPDATE');
    }

    if (name) organization.name = name;
    if (description !== undefined) organization.description = description;
    if (category) organization.category = category;
    if (logo !== undefined) organization.logo = logo;
    if (contactEmail !== undefined) organization.contactEmail = contactEmail;
    if (membershipFee !== undefined) organization.membershipFee = Number(membershipFee);

    if (leadOrganizerId && req.user.role === 'ADMIN') {
      organization.leadOrganizerId = leadOrganizerId;
      await User.updateOne({ userId: leadOrganizerId }, { organizationId });
    }

    await organization.save();
    return sendSuccess(res, 'Organization updated successfully', { organization });
  } catch (err) {
    next(err);
  }
};

exports.updateOrganizationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Active', 'Inactive', 'Suspended', 'Pending'];

    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Allowed: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    const organization = await Organization.findOne({ organizationId: req.params.organizationId });
    if (!organization) {
      return sendError(res, 'Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    }

    organization.status = status;
    await organization.save();

    return sendSuccess(res, `Organization status updated to ${status}`, { organization });
  } catch (err) {
    next(err);
  }
};
