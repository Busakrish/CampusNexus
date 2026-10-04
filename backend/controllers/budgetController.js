const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const Organization = require('../models/Organization');
const { sendSuccess, sendError } = require('../utils/response');

exports.createBudget = async (req, res, next) => {
  try {
    const {
      organizationId,
      budgetName,
      category,
      eventId,
      fundraiserId,
      allocatedAmount,
      startDate,
      endDate
    } = req.body;

    if (!budgetName || allocatedAmount === undefined || !startDate || !endDate) {
      return sendError(res, 'Budget name, allocated amount, start date, and end date are required.', 400, 'VALIDATION_FAILED');
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    const allocated = Number(allocatedAmount);
    if (isNaN(allocated) || allocated <= 0) {
      return sendError(res, 'Allocated amount must be a positive number.', 400, 'INVALID_ALLOCATED_AMOUNT');
    }

    const budget = await Budget.create({
      organizationId: orgId,
      budgetName,
      category: category || 'General',
      eventId: eventId || null,
      fundraiserId: fundraiserId || null,
      allocatedAmount: allocated,
      usedAmount: 0,
      remainingAmount: allocated,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'Active'
    });

    return sendSuccess(res, 'Budget allocated successfully', { budget }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listBudgets = async (req, res, next) => {
  try {
    const { organizationId, category, status } = req.query;
    const query = {};

    if (organizationId) query.organizationId = organizationId;
    if (category) query.category = category;
    if (status) query.status = status;

    const budgets = await Budget.find(query).sort({ createdAt: -1 });

    const orgIds = [...new Set(budgets.map(b => b.organizationId))];
    const orgs = await Organization.find({ organizationId: { $in: orgIds } });
    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));

    const populated = budgets.map(b => ({
      ...b.toObject(),
      organization: orgMap[b.organizationId] || null,
      utilizationRate: b.allocatedAmount > 0 ? ((b.usedAmount / b.allocatedAmount) * 100).toFixed(1) + '%' : '0%'
    }));

    return sendSuccess(res, 'Budgets retrieved', { budgets: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getBudgetById = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ budgetId: req.params.budgetId });
    if (!budget) return sendError(res, 'Budget not found.', 404, 'BUDGET_NOT_FOUND');

    const expenses = await Expense.find({ budgetId: budget.budgetId, status: { $in: ['Approved', 'Reimbursed'] } });
    const org = await Organization.findOne({ organizationId: budget.organizationId });

    return sendSuccess(res, 'Budget details retrieved', {
      budget,
      organization: org,
      expenses,
      utilizationRate: budget.allocatedAmount > 0 ? ((budget.usedAmount / budget.allocatedAmount) * 100).toFixed(1) + '%' : '0%'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateBudget = async (req, res, next) => {
  try {
    const { budgetId } = req.params;
    const budget = await Budget.findOne({ budgetId });
    if (!budget) return sendError(res, 'Budget not found.', 404, 'BUDGET_NOT_FOUND');

    const { budgetName, category, allocatedAmount, status, startDate, endDate } = req.body;
    if (budgetName) budget.budgetName = budgetName;
    if (category) budget.category = category;
    if (status) budget.status = status;
    if (startDate) budget.startDate = new Date(startDate);
    if (endDate) budget.endDate = new Date(endDate);

    if (allocatedAmount !== undefined) {
      const newAlloc = Number(allocatedAmount);
      if (newAlloc < budget.usedAmount) {
        return sendError(res, `Allocated amount cannot be less than already used expenses ($${budget.usedAmount}).`, 400, 'ALLOCATION_TOO_LOW');
      }
      budget.allocatedAmount = newAlloc;
      budget.remainingAmount = newAlloc - budget.usedAmount;
    }

    await budget.save();
    return sendSuccess(res, 'Budget updated successfully', { budget });
  } catch (err) {
    next(err);
  }
};
