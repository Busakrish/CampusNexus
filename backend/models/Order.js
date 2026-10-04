const mongoose = require('mongoose');
const { order: generateOrderId, orderItem: generateOrderItemId } = require('../utils/idGenerator');

const OrderItemSchema = new mongoose.Schema({
  orderItemId: {
    type: String,
    required: true,
    default: generateOrderItemId
  },
  productId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'Default'
  },
  size: {
    type: String,
    default: 'M'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    default: generateOrderId,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentId: {
    type: String,
    default: null,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid/Verified', 'Failed', 'Refunded/Cancelled'],
    default: 'Pending',
    index: true
  },
  status: {
    type: String,
    enum: ['Pending/Confirmed', 'Preparing', 'Ready', 'Delivered/Picked Up', 'Cancelled'],
    default: 'Pending/Confirmed',
    index: true
  },
  shippingAddress: {
    recipientName: { type: String, default: '' },
    roomOrHostel: { type: String, default: '' },
    campusLocation: { type: String, default: 'Campus Pickup Center' },
    phone: { type: String, default: '' }
  },
  placedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);
