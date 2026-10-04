const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

// Treasurer and Admin view finance transactions
router.get('/', authorizeRoles('TREASURER', 'ADMIN', 'ORGANIZER'), transactionController.listTransactions);
router.get('/:transactionId', authorizeRoles('TREASURER', 'ADMIN', 'ORGANIZER'), transactionController.getTransactionById);
router.post('/manual', authorizeRoles('TREASURER', 'ADMIN'), transactionController.createManualTransaction);

module.exports = router;
