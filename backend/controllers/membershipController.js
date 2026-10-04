const Membership = require('../models/Membership');
const Organization = require('../models/Organization');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendMembershipReceiptEmail } = require('../services/emailService');
const { sendSuccess, sendError } = require('../utils/response');

exports.applyMembership = async (req, res, next) => {
  try {
    const { organizationId, membershipType = 'General' } = req.body;
    const userId = req.user.userId;

    const organization = await Organization.findOne({ organizationId, status: 'Active' });
    if (!organization) {
      return sendError(res, 'Active organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    }

    // Check if student already has an active or pending membership
    const existing = await Membership.findOne({
      userId,
      organizationId,
      status: { $in: ['Active', 'Pending'] }
    });

    if (existing) {
      return sendError(res, `You already have an ${existing.status.toLowerCase()} membership in this organization.`, 400, 'MEMBERSHIP_ALREADY_EXISTS');
    }

    // Tier-based pricing: Premium membership has a higher tier price with VIP benefits
    const baseFee = organization.membershipFee || 15;
    const isPremium = (membershipType || '').toLowerCase() === 'premium';
    const feeAmount = isPremium ? Math.round(baseFee * 1.6 + 5) : baseFee;

    const benefits = isPremium
      ? ['All General Member Perks', 'Priority Event Reservations & VIP Seating', 'Exclusive 20% Merchandise Discount', 'Executive Voting Rights & Leadership Eligibility', 'Access to Private Workshops & Mentorship']
      : ['Official Club Voting Rights', 'Event Registration Discounts', 'Access to Club General Meetings & Workspace'];

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1-year valid membership

    const membership = new Membership({
      userId,
      organizationId,
      membershipType: isPremium ? 'Premium' : 'General',
      memberSince: startDate,
      startDate,
      endDate,
      feeAmount,
      status: feeAmount > 0 ? 'Pending' : 'Active',
      benefits
    });

    await membership.save();

    // If free membership, immediately active
    if (feeAmount === 0) {
      await notifyUser(userId, {
        type: 'MEMBERSHIP',
        title: 'Membership Activated',
        message: `Your ${membership.membershipType} membership for ${organization.name} is now Active!`,
        relatedEntity: 'MEMBERSHIP',
        relatedId: membership.membershipId
      });

      const studentUser = await User.findOne({ userId });
      if (studentUser && studentUser.email) {
        sendMembershipReceiptEmail({
          recipientEmail: studentUser.email,
          studentName: studentUser.name || req.user.name || 'Student',
          organization,
          membership,
          payment: null
        }).catch(err => console.error('⚠️ Membership receipt email error:', err.message));
      }

      return sendSuccess(res, 'Membership applied and activated successfully.', { membership }, 201);
    }

    // Return membership with pending payment info
    return sendSuccess(res, 'Membership application submitted. Please complete payment of dues.', {
      membership,
      requiresPayment: true,
      feeAmount
    }, 201);
  } catch (err) {
    next(err);
  }
};

exports.payMembershipDues = async (req, res, next) => {
  try {
    const { membershipId } = req.params;
    const { paymentMethod = 'SIMULATED' } = req.body;

    const membership = await Membership.findOne({ membershipId });
    if (!membership) return sendError(res, 'Membership record not found.', 404, 'MEMBERSHIP_NOT_FOUND');

    if (membership.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden: You can only pay for your own membership.', 403, 'FORBIDDEN_PAYMENT');
    }

    if (membership.status === 'Active') {
      return sendError(res, 'Membership is already active.', 400, 'MEMBERSHIP_ALREADY_ACTIVE');
    }

    // Create payment record
    const payment = await Payment.create({
      userId: membership.userId,
      purpose: 'MEMBERSHIP_DUES',
      relatedEntityId: membership.membershipId,
      amount: membership.feeAmount,
      paymentMethod,
      status: 'Paid/Verified',
      paidAt: new Date()
    });

    // Update membership
    membership.status = 'Active';
    membership.paymentId = payment.paymentId;
    membership.startDate = new Date();
    const newEnd = new Date();
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    membership.endDate = newEnd;
    await membership.save();

    // Create Traceable Financial Transaction
    const org = await Organization.findOne({ organizationId: membership.organizationId });
    await Transaction.create({
      type: 'INCOME',
      category: 'MEMBERSHIP',
      amount: membership.feeAmount,
      sourceEntity: 'MEMBERSHIP',
      sourceId: membership.membershipId,
      organizationId: membership.organizationId,
      status: 'Verified',
      description: `Membership dues from student ${req.user.name || membership.userId} for ${org ? org.name : 'Organization'}`,
      processedBy: req.user.userId
    });

    // Send in-app notification
    await notifyUser(membership.userId, {
      type: 'PAYMENT',
      title: 'Membership Payment Verified',
      message: `Your membership dues of $${membership.feeAmount} have been verified. Membership is now Active!`,
      relatedEntity: 'MEMBERSHIP',
      relatedId: membership.membershipId
    });

    // Send official membership receipt & confirmation email via Nodemailer
    const studentUser = await User.findOne({ userId: membership.userId });
    if (studentUser && studentUser.email) {
      sendMembershipReceiptEmail({
        recipientEmail: studentUser.email,
        studentName: studentUser.name || req.user.name || 'Student',
        organization: org,
        membership,
        payment
      }).catch(err => console.error('⚠️ Membership receipt email error:', err.message));
    }

    return sendSuccess(res, 'Membership dues paid and verified. Membership is now Active.', {
      membership,
      payment
    });
  } catch (err) {
    next(err);
  }
};

exports.renewMembership = async (req, res, next) => {
  try {
    const { membershipId } = req.params;
    const membership = await Membership.findOne({ membershipId });
    if (!membership) return sendError(res, 'Membership record not found.', 404, 'MEMBERSHIP_NOT_FOUND');

    if (membership.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden: You can only renew your own membership.', 403, 'FORBIDDEN_RENEW');
    }

    const org = await Organization.findOne({ organizationId: membership.organizationId });
    const feeAmount = org ? org.membershipFee : 0;

    if (feeAmount > 0) {
      membership.status = 'Pending';
      membership.feeAmount = feeAmount;
      await membership.save();
      return sendSuccess(res, 'Renewal requested. Please pay annual dues.', { membership, requiresPayment: true, feeAmount });
    } else {
      membership.status = 'Active';
      const renewedEnd = new Date();
      renewedEnd.setFullYear(renewedEnd.getFullYear() + 1);
      membership.endDate = renewedEnd;
      await membership.save();

      await notifyUser(membership.userId, {
        type: 'MEMBERSHIP',
        title: 'Membership Renewed',
        message: `Your membership for ${org ? org.name : 'Organization'} has been renewed for 1 year.`,
        relatedEntity: 'MEMBERSHIP',
        relatedId: membership.membershipId
      });

      return sendSuccess(res, 'Membership renewed successfully for 1 year.', { membership });
    }
  } catch (err) {
    next(err);
  }
};

exports.listMemberships = async (req, res, next) => {
  try {
    const { organizationId, status, userId } = req.query;
    const query = {};

    if (req.user.role === 'STUDENT') {
      query.userId = req.user.userId;
    } else if (userId) {
      query.userId = userId;
    }

    if (req.user.role === 'ORGANIZER') {
      query.organizationId = req.user.organizationId;
    } else if (organizationId) {
      query.organizationId = organizationId;
    }

    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const memberships = await Membership.find(query).sort({ createdAt: -1 });

    // Populate organization and user details
    const orgIds = [...new Set(memberships.map(m => m.organizationId))];
    const userIds = [...new Set(memberships.map(m => m.userId))];

    const [orgs, users] = await Promise.all([
      Organization.find({ organizationId: { $in: orgIds } }),
      User.find({ userId: { $in: userIds } }).select('userId name email')
    ]);

    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const populated = memberships.map(m => ({
      ...m.toObject(),
      organization: orgMap[m.organizationId] || null,
      user: userMap[m.userId] || null
    }));

    return sendSuccess(res, 'Memberships retrieved', { memberships: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getMembershipById = async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ membershipId: req.params.membershipId });
    if (!membership) return sendError(res, 'Membership not found.', 404, 'MEMBERSHIP_NOT_FOUND');

    if (req.user.role === 'STUDENT' && membership.userId !== req.user.userId) {
      return sendError(res, 'Forbidden: Cannot view another student membership.', 403, 'FORBIDDEN_MEMBERSHIP_VIEW');
    }

    const [org, user, payment] = await Promise.all([
      Organization.findOne({ organizationId: membership.organizationId }),
      User.findOne({ userId: membership.userId }).select('userId name email'),
      membership.paymentId ? Payment.findOne({ paymentId: membership.paymentId }) : null
    ]);

    return sendSuccess(res, 'Membership details retrieved', {
      membership,
      organization: org,
      user,
      payment
    });
  } catch (err) {
    next(err);
  }
};

exports.approveMembership = async (req, res, next) => {
  try {
    const { membershipId } = req.params;
    const membership = await Membership.findOne({ membershipId });
    if (!membership) return sendError(res, 'Membership not found.', 404, 'MEMBERSHIP_NOT_FOUND');

    membership.status = 'Active';
    membership.startDate = new Date();
    const newEnd = new Date();
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    membership.endDate = newEnd;
    await membership.save();

    const org = await Organization.findOne({ organizationId: membership.organizationId });

    await notifyUser(membership.userId, {
      type: 'MEMBERSHIP',
      title: 'Membership Approved',
      message: `Your membership application for ${org ? org.name : 'the organization'} has been approved!`,
      relatedEntity: 'MEMBERSHIP',
      relatedId: membership.membershipId
    });

    return sendSuccess(res, 'Membership approved successfully.', { membership });
  } catch (err) {
    next(err);
  }
};

exports.updateMembershipStatus = async (req, res, next) => {
  try {
    const { membershipId } = req.params;
    const { status } = req.body;

    const membership = await Membership.findOne({ membershipId });
    if (!membership) return sendError(res, 'Membership not found.', 404, 'MEMBERSHIP_NOT_FOUND');

    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : membership.status;
    membership.status = normalizedStatus;
    await membership.save();

    return sendSuccess(res, `Membership status updated to ${normalizedStatus}.`, { membership });
  } catch (err) {
    next(err);
  }
};

