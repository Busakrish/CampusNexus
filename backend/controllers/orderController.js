const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendMerchandiseReceiptEmail } = require('../services/emailService');
const { sendSuccess, sendError } = require('../utils/response');

exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = 'SIMULATED' } = req.body;
    const userId = req.user.userId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Order must contain at least one item.', 400, 'ITEMS_REQUIRED');
    }

    let calculatedTotal = 0;
    const orderItems = [];
    let organizationId = null;

    // Validate and atomically reserve stock for each item
    for (const item of items) {
      const { productId, quantity = 1, variant = 'Default', size = 'M' } = item;
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return sendError(res, 'Quantity must be at least 1.', 400, 'INVALID_QUANTITY');
      }

      // Check product and atomically decrement stock
      const product = await Product.findOneAndUpdate(
        { productId, stock: { $gte: qty }, status: 'Active' },
        { $inc: { stock: -qty } },
        { new: true }
      );

      if (!product) {
        // Rollback previously decremented items
        for (const prev of orderItems) {
          await Product.updateOne({ productId: prev.productId }, { $inc: { stock: prev.quantity } });
        }
        return sendError(res, `Product ${productId} is out of stock or insufficient inventory available.`, 400, 'OUT_OF_STOCK');
      }

      organizationId = product.organizationId;
      const unitPrice = product.price; // Historical snapshot price
      const subtotal = unitPrice * qty;
      calculatedTotal += subtotal;

      orderItems.push({
        productId,
        name: product.name,
        variant,
        size,
        quantity: qty,
        unitPrice,
        subtotal
      });
    }

    // Create Order with status 'Pending/Confirmed'
    const order = await Order.create({
      userId,
      organizationId,
      items: orderItems,
      totalAmount: calculatedTotal,
      paymentStatus: 'Paid/Verified',
      status: 'Pending/Confirmed',
      shippingAddress: shippingAddress || { campusLocation: 'Campus Store Pickup' }
    });

    // Create Payment Record
    const payment = await Payment.create({
      userId,
      purpose: 'MERCHANDISE_ORDER',
      relatedEntityId: order.orderId,
      amount: calculatedTotal,
      paymentMethod,
      status: 'Paid/Verified',
      paidAt: new Date()
    });

    order.paymentId = payment.paymentId;
    await order.save();

    // Create Traceable Financial Transaction
    await Transaction.create({
      type: 'INCOME',
      category: 'MERCHANDISE',
      amount: calculatedTotal,
      sourceEntity: 'ORDER',
      sourceId: order.orderId,
      organizationId,
      status: 'Verified',
      description: `Merchandise order ${order.orderId} (${orderItems.length} items) from user ${req.user.name || userId}`,
      processedBy: userId
    });

    // Send in-app notification
    await notifyUser(userId, {
      type: 'PAYMENT',
      title: 'Order Confirmed!',
      message: `Your order #${order.orderId} for $${calculatedTotal} is confirmed and is being prepared.`,
      relatedEntity: 'ORDER',
      relatedId: order.orderId
    });

    // Send itemized purchase receipt email via Nodemailer
    const customerUser = await User.findOne({ userId });
    if (customerUser && customerUser.email) {
      sendMerchandiseReceiptEmail({
        recipientEmail: customerUser.email,
        customerName: customerUser.name || req.user.name || 'Student',
        order,
        payment
      }).catch(err => console.error('⚠️ Merchandise receipt email error:', err.message));
    }

    return sendSuccess(res, 'Order placed and payment verified successfully.', { order, payment }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const { status, userId, organizationId } = req.query;
    const query = {};

    if (req.user.role === 'STUDENT') {
      query.userId = req.user.userId;
    } else if (userId) {
      query.userId = userId;
    }

    if (organizationId) query.organizationId = organizationId;
    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return sendSuccess(res, 'Orders retrieved', { orders, count: orders.length });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return sendError(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');

    if (req.user.role === 'STUDENT' && order.userId !== req.user.userId) {
      return sendError(res, 'Forbidden: You cannot access another student order.', 403, 'FORBIDDEN_ORDER_ACCESS');
    }

    const payment = order.paymentId ? await Payment.findOne({ paymentId: order.paymentId }) : null;

    return sendSuccess(res, 'Order details retrieved', { order, payment });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending/Confirmed', 'Preparing', 'Ready', 'Delivered/Picked Up', 'Cancelled'];

    const matchedStatus = validStatuses.find(s => s.toLowerCase() === (status || '').toLowerCase());
    if (!matchedStatus) {
      return sendError(res, `Invalid order status. Allowed: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
    }

    const order = await Order.findOne({ orderId });
    if (!order) return sendError(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');

    if (req.user.role === 'STUDENT') {
      if (order.userId !== req.user.userId) {
        return sendError(res, 'Forbidden: You cannot modify another student order.', 403, 'FORBIDDEN_ORDER_ACCESS');
      }
      if (matchedStatus !== 'Cancelled') {
        return sendError(res, 'Students can only cancel their pending orders.', 403, 'FORBIDDEN_STATUS_TRANSITION');
      }
      if (order.status !== 'Pending/Confirmed') {
        return sendError(res, 'Cannot cancel order once it is being prepared or fulfilled.', 400, 'CANNOT_CANCEL_IN_PROGRESS');
      }
    }

    // If cancelling, restore stock atomically
    if (matchedStatus === 'Cancelled' && order.status !== 'Cancelled') {
      for (const item of order.items) {
        await Product.updateOne({ productId: item.productId }, { $inc: { stock: item.quantity } });
      }
    }

    order.status = matchedStatus;
    await order.save();

    await notifyUser(order.userId, {
      type: 'GENERAL',
      title: `Order Status: ${status}`,
      message: `Your order #${order.orderId} status has been updated to "${status}".`,
      relatedEntity: 'ORDER',
      relatedId: order.orderId
    });

    return sendSuccess(res, `Order status updated to ${status}`, { order });
  } catch (err) {
    next(err);
  }
};
