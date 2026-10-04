const express = require('express');
const router = express.Router();
const fundraiserController = require('../controllers/fundraiserController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', fundraiserController.listFundraisers);
router.get('/:fundraiserId', fundraiserController.getFundraiserById);

// Admin or Organizer creates and manages fundraisers
router.post('/', authorizeRoles('ADMIN', 'ORGANIZER'), fundraiserController.createFundraiser);
router.put('/:fundraiserId', authorizeRoles('ADMIN', 'ORGANIZER'), fundraiserController.updateFundraiser);

module.exports = router;
