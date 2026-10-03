const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const EXPENSE_CATEGORIES = ['Food', 'Decoration', 'Printing', 'Transport', 'Equipment', 'Marketing', 'Venue', 'Miscellaneous'];

const expenseSchema = new mongoose.Schema({
  expenseId: idField,                                // EXP0001
  eventId: fk(),
  fundraiserId: fk(),
  taskId: fk(),
  submittedBy: fk(true),                             // volunteer (or treasurer) userId
  title: { type: String, required: true, trim: true },
  category: { type: String, enum: EXPENSE_CATEGORIES, default: 'Miscellaneous' },
  amount: money({ required: true, min: 0.01 }),
  expenseDate: { type: Date, default: Date.now },
  description: String,
  receiptUrl: String,
  paidFromPersonalFunds: { type: Boolean, default: true },   // true => reimbursement flow applies
  status: { type: String, enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Reimbursed'], default: 'Pending', index: true },
  reviewedBy: fk(),
  reviewedAt: Date,
  reviewNotes: String,
  reimbursementId: fk()
}, schemaOptions);

expenseSchema.pre('validate', function () {
  if (!this.eventId && !this.fundraiserId) this.invalidate('eventId', 'Expense must belong to an event or a fundraiser');
});
expenseSchema.index({ submittedBy: 1, status: 1 });

autoId(expenseSchema, 'expenseId', 'EXP');
module.exports = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
