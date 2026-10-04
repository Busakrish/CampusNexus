const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', productController.listProducts);
router.get('/:productId', productController.getProductById);

// Admin or Organizer merchandise catalog management
router.post('/', authorizeRoles('ADMIN', 'ORGANIZER'), productController.createProduct);
router.put('/:productId', authorizeRoles('ADMIN', 'ORGANIZER'), productController.updateProduct);

module.exports = router;
