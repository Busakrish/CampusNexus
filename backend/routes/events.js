const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles, authorizeOrganizationScope } = require('../middleware/rbac');

router.use(authenticate);

// Public / student browsing
router.get('/', eventController.listEvents);
router.get('/:eventId', eventController.getEventById);

// Organizer / Admin / Volunteer event creation and modifications
router.post('/', authorizeRoles('ADMIN', 'ORGANIZER', 'VOLUNTEER'), authorizeOrganizationScope, eventController.createEvent);
router.put('/:eventId', authorizeRoles('ADMIN', 'ORGANIZER', 'VOLUNTEER'), authorizeOrganizationScope, eventController.updateEvent);

// Event lifecycle transition endpoints
router.put('/:eventId/submit', authorizeRoles('ADMIN', 'ORGANIZER', 'VOLUNTEER'), authorizeOrganizationScope, eventController.submitEventForApproval);
router.put('/:eventId/approve', authorizeRoles('ADMIN'), eventController.approveEvent);
router.put('/:eventId/reject', authorizeRoles('ADMIN'), eventController.rejectEvent);
router.put('/:eventId/publish', authorizeRoles('ADMIN', 'ORGANIZER'), authorizeOrganizationScope, eventController.publishEvent);
router.put('/:eventId/cancel', authorizeRoles('ADMIN', 'ORGANIZER'), authorizeOrganizationScope, eventController.cancelEvent);
router.put('/:eventId/status', authorizeRoles('ADMIN', 'ORGANIZER', 'VOLUNTEER'), authorizeOrganizationScope, eventController.updateEventStatus);

module.exports = router;
