const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', organizationController.listOrganizations);
router.get('/:organizationId', organizationController.getOrganizationById);

// Admin-only creation and status changes
router.post('/', authorizeRoles('ADMIN'), organizationController.createOrganization);
router.put('/:organizationId/status', authorizeRoles('ADMIN'), organizationController.updateOrganizationStatus);

// Admin or authorized Organizer profile update
router.put('/:organizationId', authorizeRoles('ADMIN', 'ORGANIZER'), organizationController.updateOrganization);

module.exports = router;
