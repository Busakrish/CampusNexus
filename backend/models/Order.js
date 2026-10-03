const { mongoose, nextId, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

// OrderItem is embedded (it never exists without its order) but keeps its own orderItemId.
const orderItemSchema = new mongoose.Schema({
  orderItemId: { type: String, immutable: true },    // ITM00001
  productId: fk(true),
  variantSku: String,
  productName: { type: String, required: true },     // deliberate historical snapshot
  size: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: money({ required: true, immutable: true }), // historical -- never follows Product.price
  lineTotal: money()
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: idField,                                  // ORD0001
  studentId: fk(true),
  items: { type: [orderItemSchema], validate: v => v.length > 0 },
  totalAmount: money(),
  paymentId: fk(),
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Verified', 'Failed', 'Refunded', 'Cancelled'], default: 'Pending' },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered', 'Picked Up', 'Cancelled'], default: 'Pending', index: true },
  fulfillmentType: { type: String, enum: ['Pickup', 'Delivery'], default: 'Pickup' },
  deliveryAddress: String,
  notes: String,
  statusHistory: [{ status: String, changedBy: String, changedAt: { type: Date, default: Date.now }, _id: false }]
}, schemaOptions);

orderSchema.pre('validate', async function () {
  for (const it of this.items) {
    if (!it.orderItemId) it.orderItemId = await nextId('ITM', 5, this.$session());
    it.lineTotal = it.unitPrice * it.quantity;
  }
  this.totalAmount = this.items.reduce((s, i) => s + i.lineTotal, 0);
});

orderSchema.index({ studentId: 1, createdAt: -1 });

autoId(orderSchema, 'orderId', 'ORD');
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
