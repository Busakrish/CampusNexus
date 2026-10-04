const express = require('express');
const router = express.Router();
const reimbursementController = require('../controllers/reimbursementController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', reimbursementController.listReimbursements);
router.get('/:reimbursementId', reimbursementController.getReimbursementById);

// Treasurer or Admin pays reimbursement
router.put('/:reimbursementId/pay', authorizeRoles('TREASURER', 'ADMIN'), reimbursementController.payReimbursement);

module.exports = router;
