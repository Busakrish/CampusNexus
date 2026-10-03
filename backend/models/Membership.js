const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const membershipSchema = new mongoose.Schema({
  membershipId: idField,                             // MEM0001
  userId: fk(true),
  membershipType: { type: String, default: 'Standard', trim: true },
  memberSince: Date,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['Pending', 'Active', 'Expired', 'Cancelled'], default: 'Pending', index: true },
  fee: money(),
  paymentId: fk(),                                   // -> Payment
  benefits: [String],
  renewedFromId: fk()                                // previous membershipId when renewed
}, schemaOptions);

membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ status: 1, endDate: 1 });   // expiry reminders

autoId(membershipSchema, 'membershipId', 'MEM');
module.exports = mongoose.models.Membership || mongoose.model('Membership', membershipSchema);
