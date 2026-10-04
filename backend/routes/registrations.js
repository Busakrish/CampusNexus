const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', registrationController.listRegistrations);
router.post('/', authorizeRoles('STUDENT', 'ADMIN'), registrationController.registerForEvent);
router.post('/events/:eventId/register', authorizeRoles('STUDENT', 'ADMIN'), registrationController.registerForEvent);
router.post('/:registrationId/pay', authorizeRoles('STUDENT', 'ADMIN'), registrationController.payRegistrationFee);
router.put('/:registrationId/status', authorizeRoles('ORGANIZER', 'ADMIN'), registrationController.updateRegistrationStatus);
router.put('/:registrationId/cancel', authorizeRoles('STUDENT', 'ADMIN', 'ORGANIZER'), registrationController.cancelRegistration);

module.exports = router;
