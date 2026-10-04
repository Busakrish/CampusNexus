const Collection = require('../models/Collection');
const Fundraiser = require('../models/Fundraiser');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

exports.createCollection = async (req, res, next) => {
  try {
    const { fundraiserId, contributor, amount, paymentMethod, notes } = req.body;
    const volunteerId = req.user.userId;

    if (!fundraiserId || !contributor || !contributor.name || !amount) {
      return sendError(res, 'Fundraiser ID, contributor name, and amount are required.', 400, 'VALIDATION_FAILED');
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return sendError(res, 'Amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    }

    const fundraiser = await Fundraiser.findOne({ fundraiserId, status: 'Active' });
    if (!fundraiser) {
      return sendError(res, 'Active fundraiser campaign not found.', 404, 'FUNDRAISER_NOT_FOUND');
    }

    const collection = await Collection.create({
      fundraiserId,
      volunteerId,
      contributor: {
        name: contributor.name,
        email: contributor.email || '',
        phone: contributor.phone || ''
      },
      amount: amt,
      paymentMethod: paymentMethod || 'CASH',
      notes: notes || '',
      status: 'Pending'
    });

    return sendSuccess(res, 'Fundraiser collection logged and submitted for Treasurer verification.', { collection }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listCollections = async (req, res, next) => {
  try {
    const { fundraiserId, volunteerId, status } = req.query;
    const query = {};

    if (req.user.role === 'VOLUNTEER') {
      query.volunteerId = req.user.userId;
    } else if (volunteerId) {
      query.volunteerId = volunteerId;
    }

    if (fundraiserId) query.fundraiserId = fundraiserId;
    if (status) query.status = status;

    const collections = await Collection.find(query).sort({ createdAt: -1 });

    const volIds = [...new Set(collections.map(c => c.volunteerId))];
    const fundIds = [...new Set(collections.map(c => c.fundraiserId))];

    const [volunteers, fundraisers] = await Promise.all([
      User.find({ userId: { $in: volIds } }).select('userId name email phone'),
      Fundraiser.find({ fundraiserId: { $in: fundIds } }).select('fundraiserId name organizationId')
    ]);

    const volMap = Object.fromEntries(volunteers.map(v => [v.userId, v]));
    const fundMap = Object.fromEntries(fundraisers.map(f => [f.fundraiserId, f]));

    const populated = collections.map(c => ({
      ...c.toObject(),
      volunteer: volMap[c.volunteerId] || null,
      fundraiser: fundMap[c.fundraiserId] || null
    }));

    return sendSuccess(res, 'Collections retrieved', { collections: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getCollectionById = async (req, res, next) => {
  try {
    const collection = await Collection.findOne({ collectionId: req.params.collectionId });
    if (!collection) return sendError(res, 'Collection record not found.', 404, 'COLLECTION_NOT_FOUND');

    if (req.user.role === 'VOLUNTEER' && collection.volunteerId !== req.user.userId) {
      return sendError(res, 'Forbidden: You cannot view another volunteer collection.', 403, 'FORBIDDEN_COLLECTION_VIEW');
    }

    const [fundraiser, volunteer] = await Promise.all([
      Fundraiser.findOne({ fundraiserId: collection.fundraiserId }),
      User.findOne({ userId: collection.volunteerId }).select('userId name email phone')
    ]);

    return sendSuccess(res, 'Collection details retrieved', {
      collection,
      fundraiser,
      volunteer
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyCollection = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const collection = await Collection.findOne({ collectionId });
    if (!collection) return sendError(res, 'Collection record not found.', 404, 'COLLECTION_NOT_FOUND');

    if (collection.status === 'Verified') {
      return sendError(res, 'Collection has already been verified.', 400, 'ALREADY_VERIFIED');
    }

    const fundraiser = await Fundraiser.findOne({ fundraiserId: collection.fundraiserId });
    if (!fundraiser) return sendError(res, 'Fundraiser not found.', 404, 'FUNDRAISER_NOT_FOUND');

    // Update collection status
    collection.status = 'Verified';
    collection.verifiedBy = req.user.userId;
    collection.verifiedAt = new Date();
    await collection.save();

    // Atomically increment Fundraiser total collectedAmount
    fundraiser.collectedAmount = (fundraiser.collectedAmount || 0) + collection.amount;
    await fundraiser.save();

    // Create Traceable Financial Transaction
    await Transaction.create({
      type: 'INCOME',
      category: 'FUNDRAISER',
      amount: collection.amount,
      sourceEntity: 'COLLECTION',
      sourceId: collection.collectionId,
      organizationId: fundraiser.organizationId,
      status: 'Verified',
      description: `Fundraiser collection from ${collection.contributor.name} for "${fundraiser.name}" (Volunteer: ${collection.volunteerId})`,
      processedBy: req.user.userId
    });

    // Notify volunteer
    await notifyUser(collection.volunteerId, {
      type: 'FUNDRAISER',
      title: 'Collection Verified',
      message: `Your collection of $${collection.amount} for "${fundraiser.name}" was verified by the Treasurer.`,
      relatedEntity: 'COLLECTION',
      relatedId: collection.collectionId
    });

    return sendSuccess(res, 'Collection verified and credited to fundraiser total & finance ledger.', {
      collection,
      fundraiserCollectedAmount: fundraiser.collectedAmount
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectCollection = async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    const { reason = 'Information unverified or invalid payment proof.' } = req.body;

    const collection = await Collection.findOne({ collectionId });
    if (!collection) return sendError(res, 'Collection not found.', 404, 'COLLECTION_NOT_FOUND');

    if (collection.status === 'Verified') {
      return sendError(res, 'Cannot reject an already verified collection.', 400, 'CANNOT_REJECT_VERIFIED');
    }

    collection.status = 'Rejected';
    collection.rejectionReason = reason;
    await collection.save();

    await notifyUser(collection.volunteerId, {
      type: 'FUNDRAISER',
      title: 'Collection Rejected',
      message: `Your collection entry of $${collection.amount} was rejected. Reason: ${reason}`,
      relatedEntity: 'COLLECTION',
      relatedId: collection.collectionId
    });

    return sendSuccess(res, 'Collection marked as Rejected.', { collection });
  } catch (err) {
    next(err);
  }
};
