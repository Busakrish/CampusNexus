const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

// Volunteers list for task assignment (accessible to Admin & Organizer)
router.get('/volunteers', authorizeRoles('ADMIN', 'ORGANIZER', 'TREASURER'), userController.getVolunteers);

// Students list
router.get('/students', authorizeRoles('ADMIN', 'ORGANIZER'), userController.getStudents);

// Admin-only user governance
router.get('/', authorizeRoles('ADMIN'), userController.listUsers);
router.get('/:userId', authorizeRoles('ADMIN', 'ORGANIZER'), userController.getUserById);
router.put('/:userId/role', authorizeRoles('ADMIN'), userController.updateUserRole);
router.put('/:userId/status', authorizeRoles('ADMIN'), userController.updateUserStatus);

module.exports = router;
