const express = require('express');
const router = express.Router();
const membershipController = require('../controllers/membershipController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', membershipController.listMemberships);
router.get('/:membershipId', membershipController.getMembershipById);

// Student apply, renew, and pay dues
router.post('/apply', authorizeRoles('STUDENT', 'ADMIN'), membershipController.applyMembership);
router.post('/:membershipId/pay', authorizeRoles('STUDENT', 'ADMIN'), membershipController.payMembershipDues);
router.post('/:membershipId/renew', authorizeRoles('STUDENT', 'ADMIN'), membershipController.renewMembership);

// Organizer / Admin manage memberships
router.put('/:membershipId/approve', authorizeRoles('ORGANIZER', 'ADMIN'), membershipController.approveMembership);
router.put('/:membershipId/status', authorizeRoles('ORGANIZER', 'ADMIN'), membershipController.updateMembershipStatus);

module.exports = router;

