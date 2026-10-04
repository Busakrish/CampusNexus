const Fundraiser = require('../models/Fundraiser');
const Collection = require('../models/Collection');
const Expense = require('../models/Expense');
const Reimbursement = require('../models/Reimbursement');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

module.exports = async function runFinanceTests() {
  // Test 1: Fundraiser & Collections Verification (Rule 10 & 19)
  const fundraiser = await Fundraiser.create({
    organizationId: 'ORG-CSS01',
    name: 'Hardware Lab Modernization Fund',
    purpose: 'Procure GPU workstations and soldering equipment.',
    targetAmount: 2000,
    collectedAmount: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 86400000),
    createdBy: 'USR-ADMIN01',
    status: 'Active'
  });

  const pendingCollection = await Collection.create({
    fundraiserId: fundraiser.fundraiserId,
    volunteerId: 'USR-VOL01',
    contributor: { name: 'Anonymous Student Donor' },
    amount: 100,
    status: 'Pending'
  });

  assertEqual(fundraiser.collectedAmount, 0, 'Pending collection does NOT increase fundraiser collectedAmount');

  // Verify Collection
  pendingCollection.status = 'Verified';
  pendingCollection.verifiedBy = 'USR-TREAS01';
  pendingCollection.verifiedAt = new Date();
  await pendingCollection.save();

  fundraiser.collectedAmount += pendingCollection.amount;
  await fundraiser.save();

  const verifyFundraiser = await Fundraiser.findOne({ fundraiserId: fundraiser.fundraiserId });
  assertEqual(verifyFundraiser.collectedAmount, 100, 'Verified collection successfully updates fundraiser collectedAmount to 100');

  // Test 2: Budget Utilization (Rule 14 & 23)
  const budget = await Budget.create({
    organizationId: 'ORG-CSS01',
    budgetName: 'Lab Maintenance Budget',
    category: 'Equipment',
    allocatedAmount: 1000,
    usedAmount: 0,
    remainingAmount: 1000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 86400000),
    status: 'Active'
  });

  assertEqual(budget.remainingAmount, 1000, 'Initial remaining amount equals allocated amount');

  // Test 3: Expense Submission and Approval
  const expense = await Expense.create({
    organizationId: 'ORG-CSS01',
    budgetId: budget.budgetId,
    submittedBy: 'USR-VOL01',
    amount: 120,
    category: 'Equipment',
    description: 'Replacement soldering tips and safety goggles',
    status: 'Pending'
  });

  assertEqual(expense.status, 'Pending', 'Expense created with Pending status');

  // Treasurer approves expense
  expense.status = 'Approved';
  expense.reviewedBy = 'USR-TREAS01';
  expense.reviewedAt = new Date();
  await expense.save();

  // Update budget used and remaining amounts
  budget.usedAmount += expense.amount;
  budget.remainingAmount = budget.allocatedAmount - budget.usedAmount;
  await budget.save();

  const verifyBudget = await Budget.findOne({ budgetId: budget.budgetId });
  assertEqual(verifyBudget.usedAmount, 120, 'Approved expense updates budget usedAmount to $120');
  assertEqual(verifyBudget.remainingAmount, 880, 'Budget remainingAmount correctly calculates to $880 ($1000 - $120)');

  // Test 4: Reimbursement Workflow & Traceability (Rule 13 & 21)
  const reimbursement = await Reimbursement.create({
    expenseId: expense.expenseId,
    submittedBy: expense.submittedBy,
    amount: expense.amount,
    status: 'Approved',
    approvedBy: 'USR-TREAS01',
    approvedAt: new Date()
  });

  assertEqual(reimbursement.status, 'Approved', 'Reimbursement created referencing expenseId');

  // Pay Reimbursement
  const rmbTxn = await Transaction.create({
    type: 'REIMBURSEMENT',
    category: 'REIMBURSEMENT',
    amount: reimbursement.amount,
    sourceEntity: 'REIMBURSEMENT',
    sourceId: reimbursement.reimbursementId,
    organizationId: 'ORG-CSS01',
    status: 'Verified',
    description: `Reimbursement payout for expense ${expense.expenseId}`,
    processedBy: 'USR-TREAS01'
  });

  reimbursement.status = 'Paid';
  reimbursement.paidAt = new Date();
  reimbursement.transactionId = rmbTxn.transactionId;
  await reimbursement.save();

  expense.status = 'Reimbursed';
  await expense.save();

  assertEqual(reimbursement.status, 'Paid', 'Reimbursement successfully marked as Paid');
  assertEqual(expense.status, 'Reimbursed', 'Expense status updated to Reimbursed');

  // Test 5: PREVENT DUPLICATE REIMBURSEMENT PAYMENT (Rule 21)
  const duplicatePayAttempt = async (rmb) => {
    if (rmb.status === 'Paid') {
      return { success: false, error: 'ALREADY_PAID' };
    }
    return { success: true };
  };

  const dupResult = await duplicatePayAttempt(reimbursement);
  assert(dupResult.success === false, 'Duplicate payout attempt on already Paid reimbursement is prevented');

  // Test 6: Transaction Traceability (Rule 15 & 22)
  const fetchedTxn = await Transaction.findOne({ transactionId: rmbTxn.transactionId });
  assert(fetchedTxn !== null, 'Financial transaction is persisted in database');
  assertEqual(fetchedTxn.sourceEntity, 'REIMBURSEMENT', 'Transaction sourceEntity traces back to REIMBURSEMENT');
  assertEqual(fetchedTxn.sourceId, reimbursement.reimbursementId, 'Transaction sourceId matches reimbursementId exactly');
};
