const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', collectionController.listCollections);
router.get('/:collectionId', collectionController.getCollectionById);

// Volunteer logs collection
router.post('/', authorizeRoles('VOLUNTEER', 'ADMIN'), collectionController.createCollection);

// Treasurer or Admin verifies or rejects collections
router.put('/:collectionId/verify', authorizeRoles('TREASURER', 'ADMIN'), collectionController.verifyCollection);
router.put('/:collectionId/reject', authorizeRoles('TREASURER', 'ADMIN'), collectionController.rejectCollection);

module.exports = router;
