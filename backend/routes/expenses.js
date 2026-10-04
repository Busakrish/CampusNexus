const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', expenseController.listExpenses);
router.get('/:expenseId', expenseController.getExpenseById);

// Volunteer, Organizer, Admin submit expenses
router.post('/', authorizeRoles('VOLUNTEER', 'ORGANIZER', 'ADMIN'), expenseController.createExpense);

// Treasurer or Admin review & approve/reject expenses
router.put('/:expenseId/approve', authorizeRoles('TREASURER', 'ADMIN'), expenseController.approveExpense);
router.put('/:expenseId/reject', authorizeRoles('TREASURER', 'ADMIN'), expenseController.rejectExpense);

// Unified review endpoint (status in body: 'approved' | 'rejected' | 'reimbursed')
router.put('/:expenseId/review', authorizeRoles('TREASURER', 'ADMIN'), expenseController.reviewExpense);

module.exports = router;

