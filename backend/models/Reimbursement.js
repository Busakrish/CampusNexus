const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const reimbursementSchema = new mongoose.Schema({
  reimbursementId: idField,                          // RMB0001
  expenseId: { ...fk(true), unique: true },          // must point to an Expense; one per expense
  volunteerId: fk(true),
  amount: money({ required: true, min: 0.01 }),
  status: { type: String, enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Paid'], default: 'Pending', index: true },
  approvedBy: fk(),
  approvedAt: Date,
  paidBy: fk(),
  paidAt: Date,
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer'] },
  paymentReference: String,
  rejectionReason: String
}, schemaOptions);
// Double-pay guard: transition with
//   Reimbursement.updateOne({ reimbursementId, status: 'Approved' }, { $set: { status: 'Paid', paidAt, paidBy } })

autoId(reimbursementSchema, 'reimbursementId', 'RMB');
module.exports = mongoose.models.Reimbursement || mongoose.model('Reimbursement', reimbursementSchema);
