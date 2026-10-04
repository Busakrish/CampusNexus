const Expense = require('../models/Expense');
const Reimbursement = require('../models/Reimbursement');
const Budget = require('../models/Budget');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

exports.createExpense = async (req, res, next) => {
  try {
    const {
      organizationId,
      eventId,
      fundraiserId,
      taskId,
      budgetId,
      amount,
      category,
      description,
      receiptUrl
    } = req.body;

    const submittedBy = req.user.userId;

    if (!amount || !description) {
      return sendError(res, 'Amount and description are required for an expense.', 400, 'VALIDATION_FAILED');
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return sendError(res, 'Expense amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    }

    let orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      const defaultOrg = await Organization.findOne({ status: 'Active' });
      if (defaultOrg) orgId = defaultOrg.organizationId;
    }

    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    const validCategories = ['Equipment', 'Logistics', 'Food & Refreshments', 'Printing & Stationery', 'Marketing', 'Prizes', 'Travel', 'Other'];
    const matchedCategory = validCategories.find(c => c.toLowerCase() === (category || '').toLowerCase()) || 'Logistics';

    const expense = await Expense.create({
      organizationId: orgId,
      eventId: eventId || null,
      fundraiserId: fundraiserId || null,
      taskId: taskId || null,
      budgetId: budgetId || null,
      submittedBy,
      amount: amt,
      category: matchedCategory,
      description,
      receiptUrl: receiptUrl || '',
      status: 'Pending'
    });

    return sendSuccess(res, 'Expense submitted for Treasurer review and approval.', { expense }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listExpenses = async (req, res, next) => {
  try {
    const { status, submittedBy, eventId, fundraiserId, organizationId } = req.query;
    const query = {};

    if (req.user.role === 'VOLUNTEER') {
      query.submittedBy = req.user.userId;
    } else if (submittedBy) {
      query.submittedBy = submittedBy;
    }

    if (organizationId) query.organizationId = organizationId;
    if (eventId) query.eventId = eventId;
    if (fundraiserId) query.fundraiserId = fundraiserId;
    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const expenses = await Expense.find(query).sort({ createdAt: -1 });

    const userIds = [...new Set(expenses.map(e => e.submittedBy))];
    const users = await User.find({ userId: { $in: userIds } }).select('userId name email');
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const populated = expenses.map(e => ({
      ...e.toObject(),
      submitter: userMap[e.submittedBy] || null
    }));

    return sendSuccess(res, 'Expenses retrieved', { expenses: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ expenseId: req.params.expenseId });
    if (!expense) return sendError(res, 'Expense not found.', 404, 'EXPENSE_NOT_FOUND');

    if (req.user.role === 'VOLUNTEER' && expense.submittedBy !== req.user.userId) {
      return sendError(res, 'Forbidden: You cannot view another user expense.', 403, 'FORBIDDEN_EXPENSE_VIEW');
    }

    const [submitter, reimbursement] = await Promise.all([
      User.findOne({ userId: expense.submittedBy }).select('userId name email phone'),
      Reimbursement.findOne({ expenseId: expense.expenseId })
    ]);

    return sendSuccess(res, 'Expense details retrieved', {
      expense,
      submitter,
      reimbursement
    });
  } catch (err) {
    next(err);
  }
};

exports.approveExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findOne({ expenseId });
    if (!expense) return sendError(res, 'Expense not found.', 404, 'EXPENSE_NOT_FOUND');

    if (expense.status === 'Approved' || expense.status === 'Reimbursed') {
      return sendError(res, 'Expense has already been approved.', 400, 'ALREADY_APPROVED');
    }

    // If budget is attached, update used amount
    if (expense.budgetId) {
      const budget = await Budget.findOne({ budgetId: expense.budgetId });
      if (budget) {
        budget.usedAmount = (budget.usedAmount || 0) + expense.amount;
        budget.remainingAmount = budget.allocatedAmount - budget.usedAmount;
        await budget.save();
      }
    }

    expense.status = 'Approved';
    expense.reviewedBy = req.user.userId;
    expense.reviewedAt = new Date();
    await expense.save();

    // Auto-create corresponding Reimbursement request if not already present
    let reimbursement = await Reimbursement.findOne({ expenseId: expense.expenseId });
    if (!reimbursement) {
      reimbursement = await Reimbursement.create({
        expenseId: expense.expenseId,
        submittedBy: expense.submittedBy,
        amount: expense.amount,
        status: 'Approved',
        approvedBy: req.user.userId,
        approvedAt: new Date()
      });
    }

    await notifyUser(expense.submittedBy, {
      type: 'EXPENSE',
      title: 'Expense Approved',
      message: `Your expense of $${expense.amount} for "${expense.description}" has been approved. Reimbursement is queued.`,
      relatedEntity: 'EXPENSE',
      relatedId: expense.expenseId
    });

    return sendSuccess(res, 'Expense approved and reimbursement queued.', {
      expense,
      reimbursement
    });
  } catch (err) {
    next(err);
  }
};

exports.rejectExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { reason = 'Insufficient receipts or out of budget policy.' } = req.body;

    const expense = await Expense.findOne({ expenseId });
    if (!expense) return sendError(res, 'Expense not found.', 404, 'EXPENSE_NOT_FOUND');

    if (expense.status === 'Approved' || expense.status === 'Reimbursed') {
      return sendError(res, 'Cannot reject an already approved expense.', 400, 'CANNOT_REJECT_APPROVED');
    }

    expense.status = 'Rejected';
    expense.rejectionReason = reason;
    expense.reviewedBy = req.user.userId;
    expense.reviewedAt = new Date();
    await expense.save();

    // Invalidate any existing reimbursement record
    await Reimbursement.deleteOne({ expenseId: expense.expenseId });

    await notifyUser(expense.submittedBy, {
      type: 'EXPENSE',
      title: 'Expense Rejected',
      message: `Your expense for "${expense.description}" was rejected. Reason: ${reason}`,
      relatedEntity: 'EXPENSE',
      relatedId: expense.expenseId
    });

    return sendSuccess(res, 'Expense rejected with feedback.', { expense });
  } catch (err) {
    next(err);
  }
};

// Unified review endpoint — delegates to approve/reject/reimburse based on status field
exports.reviewExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const { status, remarks = '' } = req.body;

    const normalizedStatus = (status || '').toLowerCase();

    const expense = await Expense.findOne({ expenseId });
    if (!expense) return sendError(res, 'Expense not found.', 404, 'EXPENSE_NOT_FOUND');

    if (normalizedStatus === 'approved') {
      // Budget update
      if (expense.budgetId) {
        const budget = await Budget.findOne({ budgetId: expense.budgetId });
        if (budget) {
          budget.usedAmount = (budget.usedAmount || 0) + expense.amount;
          budget.remainingAmount = budget.allocatedAmount - budget.usedAmount;
          await budget.save();
        }
      }

      expense.status = 'Approved';
      expense.reviewedBy = req.user.userId;
      expense.reviewedAt = new Date();
      if (remarks) expense.reviewRemarks = remarks;
      await expense.save();

      let reimbursement = await Reimbursement.findOne({ expenseId: expense.expenseId });
      if (!reimbursement) {
        reimbursement = await Reimbursement.create({
          expenseId: expense.expenseId,
          submittedBy: expense.submittedBy,
          amount: expense.amount,
          status: 'Approved',
          approvedBy: req.user.userId,
          approvedAt: new Date()
        });
      }

      await notifyUser(expense.submittedBy, {
        type: 'EXPENSE',
        title: 'Expense Approved',
        message: `Your expense of ₹${expense.amount} for "${expense.description}" has been approved.`,
        relatedEntity: 'EXPENSE',
        relatedId: expense.expenseId
      });

      return sendSuccess(res, 'Expense approved.', { expense, reimbursement });

    } else if (normalizedStatus === 'rejected') {
      if (expense.status === 'Approved' || expense.status === 'Reimbursed') {
        return sendError(res, 'Cannot reject an already approved expense.', 400, 'CANNOT_REJECT_APPROVED');
      }
      expense.status = 'Rejected';
      expense.reviewedBy = req.user.userId;
      expense.reviewedAt = new Date();
      expense.rejectionReason = remarks || 'Insufficient documentation.';
      await expense.save();

      await notifyUser(expense.submittedBy, {
        type: 'EXPENSE',
        title: 'Expense Rejected',
        message: `Your expense for "${expense.description}" was rejected. Reason: ${expense.rejectionReason}`,
        relatedEntity: 'EXPENSE',
        relatedId: expense.expenseId
      });

      return sendSuccess(res, 'Expense rejected.', { expense });

    } else if (normalizedStatus === 'reimbursed') {
      expense.status = 'Reimbursed';
      expense.reviewedBy = req.user.userId;
      await expense.save();

      await Reimbursement.updateOne({ expenseId: expense.expenseId }, { $set: { status: 'Disbursed', disbursedAt: new Date() } });

      await notifyUser(expense.submittedBy, {
        type: 'EXPENSE',
        title: 'Reimbursement Disbursed',
        message: `Your reimbursement of ₹${expense.amount} for "${expense.description}" has been disbursed.`,
        relatedEntity: 'EXPENSE',
        relatedId: expense.expenseId
      });

      return sendSuccess(res, 'Expense marked as reimbursed.', { expense });

    } else {
      return sendError(res, 'Invalid status. Must be: approved, rejected, or reimbursed.', 400, 'INVALID_STATUS');
    }
  } catch (err) {
    next(err);
  }
};

