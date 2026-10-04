const Reimbursement = require('../models/Reimbursement');
const Expense = require('../models/Expense');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

exports.listReimbursements = async (req, res, next) => {
  try {
    const { status, submittedBy } = req.query;
    const query = {};

    if (req.user.role === 'VOLUNTEER') {
      query.submittedBy = req.user.userId;
    } else if (submittedBy) {
      query.submittedBy = submittedBy;
    }

    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const reimbursements = await Reimbursement.find(query).sort({ createdAt: -1 });

    const userIds = [...new Set(reimbursements.map(r => r.submittedBy))];
    const expenseIds = [...new Set(reimbursements.map(r => r.expenseId))];

    const [users, expenses] = await Promise.all([
      User.find({ userId: { $in: userIds } }).select('userId name email phone'),
      Expense.find({ expenseId: { $in: expenseIds } })
    ]);

    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));
    const expenseMap = Object.fromEntries(expenses.map(e => [e.expenseId, e]));

    const populated = reimbursements.map(r => ({
      ...r.toObject(),
      user: userMap[r.submittedBy] || null,
      expense: expenseMap[r.expenseId] || null
    }));

    return sendSuccess(res, 'Reimbursements retrieved', { reimbursements: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getReimbursementById = async (req, res, next) => {
  try {
    const reimbursement = await Reimbursement.findOne({ reimbursementId: req.params.reimbursementId });
    if (!reimbursement) return sendError(res, 'Reimbursement not found.', 404, 'REIMBURSEMENT_NOT_FOUND');

    if (req.user.role === 'VOLUNTEER' && reimbursement.submittedBy !== req.user.userId) {
      return sendError(res, 'Forbidden: You cannot view another user reimbursement.', 403, 'FORBIDDEN_REIMBURSEMENT_VIEW');
    }

    const [user, expense, transaction] = await Promise.all([
      User.findOne({ userId: reimbursement.submittedBy }).select('userId name email phone'),
      Expense.findOne({ expenseId: reimbursement.expenseId }),
      reimbursement.transactionId ? Transaction.findOne({ transactionId: reimbursement.transactionId }) : null
    ]);

    return sendSuccess(res, 'Reimbursement details retrieved', {
      reimbursement,
      user,
      expense,
      transaction
    });
  } catch (err) {
    next(err);
  }
};

exports.payReimbursement = async (req, res, next) => {
  try {
    const { reimbursementId } = req.params;
    const { paymentReference = 'DIRECT-DEPOSIT' } = req.body;

    const reimbursement = await Reimbursement.findOne({ reimbursementId });
    if (!reimbursement) return sendError(res, 'Reimbursement not found.', 404, 'REIMBURSEMENT_NOT_FOUND');

    // CRITICAL: Prevent duplicate reimbursement payment
    if (reimbursement.status === 'Paid') {
      return sendError(res, 'DUPLICATE PAYMENT BLOCKED: This reimbursement has already been paid.', 409, 'ALREADY_PAID');
    }

    const expense = await Expense.findOne({ expenseId: reimbursement.expenseId });
    if (!expense) return sendError(res, 'Associated expense not found.', 404, 'EXPENSE_NOT_FOUND');

    // Create Traceable Financial Transaction
    const txn = await Transaction.create({
      type: 'REIMBURSEMENT',
      category: 'REIMBURSEMENT',
      amount: reimbursement.amount,
      sourceEntity: 'REIMBURSEMENT',
      sourceId: reimbursement.reimbursementId,
      organizationId: expense.organizationId,
      status: 'Verified',
      description: `Reimbursement payment of $${reimbursement.amount} to ${reimbursement.submittedBy} for expense ${expense.expenseId}`,
      processedBy: req.user.userId
    });

    // Update reimbursement record
    reimbursement.status = 'Paid';
    reimbursement.paidAt = new Date();
    reimbursement.paymentReference = paymentReference;
    reimbursement.transactionId = txn.transactionId;
    await reimbursement.save();

    // Update expense status to Reimbursed
    expense.status = 'Reimbursed';
    await expense.save();

    await notifyUser(reimbursement.submittedBy, {
      type: 'REIMBURSEMENT',
      title: 'Reimbursement Disbursed!',
      message: `Your reimbursement of $${reimbursement.amount} for "${expense.description}" has been paid (Ref: ${paymentReference}).`,
      relatedEntity: 'REIMBURSEMENT',
      relatedId: reimbursement.reimbursementId
    });

    return sendSuccess(res, 'Reimbursement disbursed and recorded in financial transactions.', {
      reimbursement,
      transaction: txn
    });
  } catch (err) {
    next(err);
  }
};
