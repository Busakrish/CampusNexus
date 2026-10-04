const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/mark-all-read', notificationController.markAllRead || notificationController.markAllAsRead);
router.put('/:notificationId/read', notificationController.markAsRead);

module.exports = router;
