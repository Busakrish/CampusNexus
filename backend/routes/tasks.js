const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', taskController.listTasks);
router.get('/:taskId', taskController.getTaskById);

// Admin or Organizer assigning tasks
router.post('/', authorizeRoles('ADMIN', 'ORGANIZER'), taskController.createTask);

// Volunteer updating status of their task or Admin/Organizer updating
router.put('/:taskId/status', authorizeRoles('VOLUNTEER', 'ADMIN', 'ORGANIZER'), taskController.updateTaskStatus);

module.exports = router;
