const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const paymentSchema = new mongoose.Schema({
  paymentId: idField,                                // PAY7001
  payerId: fk(true),                                 // User.userId
  relatedType: { type: String, enum: ['Membership', 'Registration', 'Order'], required: true },
  relatedId: { type: String, required: true, index: true }, // membershipId / registrationId / orderId
  amount: money({ required: true }),
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer'], default: 'UPI' },
  status: { type: String, enum: ['Pending', 'Paid', 'Verified', 'Failed', 'Refunded', 'Cancelled'], default: 'Pending', index: true },
  gatewayRef: String,                                // gateway / UPI reference
  idempotencyKey: { type: String, unique: true, sparse: true }, // prevents double charge / double ticket
  paidAt: Date,
  verifiedBy: fk(),
  verifiedAt: Date,
  refundedAt: Date,
  refundReason: String
}, schemaOptions);

paymentSchema.index({ relatedType: 1, relatedId: 1 });

autoId(paymentSchema, 'paymentId', 'PAY');
module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
