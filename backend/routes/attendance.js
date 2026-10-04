const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', authorizeRoles('ORGANIZER', 'ADMIN', 'VOLUNTEER'), attendanceController.listAttendance);
router.get('/events/:eventId', authorizeRoles('ORGANIZER', 'ADMIN', 'VOLUNTEER'), attendanceController.listAttendance);

module.exports = router;
