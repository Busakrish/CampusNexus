const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', budgetController.listBudgets);
router.get('/:budgetId', budgetController.getBudgetById);

// Treasurer / Admin create and manage budgets
router.post('/', authorizeRoles('TREASURER', 'ADMIN'), budgetController.createBudget);
router.put('/:budgetId', authorizeRoles('TREASURER', 'ADMIN'), budgetController.updateBudget);

module.exports = router;
