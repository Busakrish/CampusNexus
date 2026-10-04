const Fundraiser = require('../models/Fundraiser');
const Collection = require('../models/Collection');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

exports.createFundraiser = async (req, res, next) => {
  try {
    const {
      name,
      purpose,
      targetAmount,
      startDate,
      endDate,
      organizationId,
      assignedVolunteers
    } = req.body;

    if (!name || !purpose || !targetAmount || !startDate || !endDate) {
      return sendError(res, 'Name, purpose, target amount, and dates are required.', 400, 'VALIDATION_FAILED');
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    const fundraiser = await Fundraiser.create({
      name,
      purpose,
      targetAmount: Number(targetAmount),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      organizationId: orgId,
      assignedVolunteers: assignedVolunteers || [],
      createdBy: req.user.userId,
      collectedAmount: 0,
      status: 'Active'
    });

    return sendSuccess(res, 'Fundraiser campaign created successfully', { fundraiser }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listFundraisers = async (req, res, next) => {
  try {
    const { status, organizationId, search } = req.query;
    const query = {};

    if (organizationId) query.organizationId = organizationId;
    if (status) query.status = new RegExp(`^${status}$`, 'i');
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } }
      ];
    }

    const fundraisers = await Fundraiser.find(query).sort({ createdAt: -1 });

    const orgIds = [...new Set(fundraisers.map(f => f.organizationId))];
    const orgs = await Organization.find({ organizationId: { $in: orgIds } });
    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));

    const populated = fundraisers.map(f => ({
      ...f.toObject(),
      organization: orgMap[f.organizationId] || null,
      progressPercentage: f.targetAmount > 0 ? Math.min(100, ((f.collectedAmount / f.targetAmount) * 100)).toFixed(1) : 0
    }));

    return sendSuccess(res, 'Fundraisers retrieved', { fundraisers: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getFundraiserById = async (req, res, next) => {
  try {
    const fundraiser = await Fundraiser.findOne({ fundraiserId: req.params.fundraiserId });
    if (!fundraiser) return sendError(res, 'Fundraiser not found.', 404, 'FUNDRAISER_NOT_FOUND');

    const org = await Organization.findOne({ organizationId: fundraiser.organizationId });
    const collections = await Collection.find({ fundraiserId: fundraiser.fundraiserId }).sort({ createdAt: -1 });
    const volunteers = await User.find({ userId: { $in: fundraiser.assignedVolunteers } }).select('userId name email phone');

    return sendSuccess(res, 'Fundraiser details retrieved', {
      fundraiser,
      organization: org,
      collections,
      volunteers,
      progressPercentage: fundraiser.targetAmount > 0 ? Math.min(100, ((fundraiser.collectedAmount / fundraiser.targetAmount) * 100)).toFixed(1) : 0
    });
  } catch (err) {
    next(err);
  }
};

exports.updateFundraiser = async (req, res, next) => {
  try {
    const { fundraiserId } = req.params;
    const fundraiser = await Fundraiser.findOne({ fundraiserId });
    if (!fundraiser) return sendError(res, 'Fundraiser not found.', 404, 'FUNDRAISER_NOT_FOUND');

    const { name, purpose, targetAmount, startDate, endDate, status, assignedVolunteers } = req.body;
    if (name) fundraiser.name = name;
    if (purpose) fundraiser.purpose = purpose;
    if (targetAmount) fundraiser.targetAmount = Number(targetAmount);
    if (startDate) fundraiser.startDate = new Date(startDate);
    if (endDate) fundraiser.endDate = new Date(endDate);
    if (status) fundraiser.status = status;
    if (assignedVolunteers) fundraiser.assignedVolunteers = assignedVolunteers;

    await fundraiser.save();
    return sendSuccess(res, 'Fundraiser updated successfully', { fundraiser });
  } catch (err) {
    next(err);
  }
};
