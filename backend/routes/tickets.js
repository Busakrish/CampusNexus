const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', ticketController.listTickets);
router.get('/:ticketId', ticketController.getTicketById);

// QR Check-in endpoint (Authorized for Volunteer, Organizer, Admin)
router.post('/check-in', authorizeRoles('VOLUNTEER', 'ORGANIZER', 'ADMIN'), ticketController.validateAndCheckInTicket);
router.post('/scan', authorizeRoles('VOLUNTEER', 'ORGANIZER', 'ADMIN'), ticketController.validateAndCheckInTicket);

module.exports = router;
