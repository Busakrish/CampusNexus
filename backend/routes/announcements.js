const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', announcementController.listAnnouncements);
router.get('/:announcementId', announcementController.getAnnouncementById);

// Admin & Organizer create announcements
router.post('/', authorizeRoles('ADMIN', 'ORGANIZER'), announcementController.createAnnouncement);

// Admin approves announcements
router.put('/:announcementId/approve', authorizeRoles('ADMIN'), announcementController.approveAnnouncement);

module.exports = router;
