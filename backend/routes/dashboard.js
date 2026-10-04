const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/student', authorizeRoles('STUDENT', 'ADMIN'), dashboardController.getStudentDashboard);
router.get('/volunteer', authorizeRoles('VOLUNTEER', 'ADMIN'), dashboardController.getVolunteerDashboard);
router.get('/admin', authorizeRoles('ADMIN'), dashboardController.getAdminDashboard);
router.get('/treasurer', authorizeRoles('TREASURER', 'ADMIN'), dashboardController.getTreasurerDashboard);
router.get('/organizer', authorizeRoles('ORGANIZER', 'ADMIN'), dashboardController.getOrganizerDashboard);

module.exports = router;
