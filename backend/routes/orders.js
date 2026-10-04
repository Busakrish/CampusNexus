const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', orderController.listOrders);
router.get('/:orderId', orderController.getOrderById);

// Student / Admin placing orders
router.post('/', authorizeRoles('STUDENT', 'ADMIN'), orderController.createOrder);

// Admin / Organizer updating fulfillment status, or Student cancelling their own order
router.put('/:orderId/status', authorizeRoles('ADMIN', 'ORGANIZER', 'STUDENT'), orderController.updateOrderStatus);

module.exports = router;
