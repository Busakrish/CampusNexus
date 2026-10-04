const Transaction = require('../models/Transaction');
const Organization = require('../models/Organization');
const { sendSuccess, sendError } = require('../utils/response');

exports.listTransactions = async (req, res, next) => {
  try {
    const { type, category, sourceEntity, organizationId, startDate, endDate, status } = req.query;
    const query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (sourceEntity) query.sourceEntity = sourceEntity;
    if (organizationId) query.organizationId = organizationId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });

    const orgIds = [...new Set(transactions.map(t => t.organizationId))];
    const orgs = await Organization.find({ organizationId: { $in: orgIds } });
    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));

    const populated = transactions.map(t => ({
      ...t.toObject(),
      organization: orgMap[t.organizationId] || null
    }));

    // Summary calculations
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalReimbursements = 0;

    transactions.forEach(t => {
      if (t.status === 'Verified') {
        if (t.type === 'INCOME') totalIncome += t.amount;
        else if (t.type === 'EXPENSE') totalExpenses += t.amount;
        else if (t.type === 'REIMBURSEMENT') totalReimbursements += t.amount;
      }
    });

    const netBalance = totalIncome - (totalExpenses + totalReimbursements);

    return sendSuccess(res, 'Transactions retrieved', {
      transactions: populated,
      count: populated.length,
      summary: {
        totalIncome,
        totalExpenses,
        totalReimbursements,
        totalOutflow: totalExpenses + totalReimbursements,
        netBalance
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
    if (!transaction) return sendError(res, 'Transaction not found.', 404, 'TRANSACTION_NOT_FOUND');

    const org = await Organization.findOne({ organizationId: transaction.organizationId });

    return sendSuccess(res, 'Transaction details retrieved', {
      transaction,
      organization: org
    });
  } catch (err) {
    next(err);
  }
};

exports.createManualTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, description, organizationId } = req.body;

    if (!type || !category || !amount || !description) {
      return sendError(res, 'Type, category, amount, and description are required.', 400, 'VALIDATION_FAILED');
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return sendError(res, 'Amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    }

    const transaction = await Transaction.create({
      type,
      category,
      amount: amt,
      sourceEntity: 'MANUAL',
      sourceId: 'MANUAL-' + Date.now(),
      organizationId: orgId,
      status: 'Verified',
      description,
      processedBy: req.user.userId
    });

    return sendSuccess(res, 'Manual ledger entry posted successfully.', { transaction }, 201);
  } catch (err) {
    next(err);
  }
};
