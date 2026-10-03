const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

// Every ledger row must trace to an operational source (sourceType + sourceId).
//   Membership           -> membershipId      EventRegistration  -> registrationId
//   Order                -> orderId           FundraiserCollection -> collectionId
//   EventExpense         -> expenseId         FundraiserExpense  -> expenseId
//   Reimbursement        -> reimbursementId   (use this instead of *Expense when a volunteer fronted the money)
const SOURCE_TYPES = ['Membership', 'EventRegistration', 'Order', 'FundraiserCollection', 'EventExpense', 'FundraiserExpense', 'Reimbursement'];
const INCOME_SOURCES = ['Membership', 'EventRegistration', 'Order', 'FundraiserCollection'];

const transactionSchema = new mongoose.Schema({
  transactionId: idField,                            // TXN8001
  type: { type: String, enum: ['Income', 'Expense'], required: true, index: true },
  sourceType: { type: String, enum: SOURCE_TYPES, required: true },
  sourceId: { type: String, required: true },
  amount: money({ required: true, min: 0.01 }),
  description: String,
  transactionDate: { type: Date, default: Date.now },

  // Optional context links for drill-down / reporting
  eventId: fk(), fundraiserId: fk(), membershipId: fk(), orderId: fk(),
  paymentId: fk(), registrationId: fk(), collectionId: fk(), expenseId: fk(), reimbursementId: fk(),
  userId: fk(),

  status: { type: String, enum: ['Pending', 'Verified', 'Cancelled'], default: 'Pending', index: true },
  createdBy: fk(),
  verifiedBy: fk(),
  verifiedAt: Date,
  cancelledReason: String,                           // void instead of delete
  isActive: { type: Boolean, default: true }
}, schemaOptions);

transactionSchema.pre('validate', function () {
  this.isActive = this.status !== 'Cancelled';
  const isIncomeSource = INCOME_SOURCES.includes(this.sourceType);
  if (this.type && ((this.type === 'Income') !== isIncomeSource))
    this.invalidate('sourceType', `${this.sourceType} cannot be an ${this.type} transaction`);
  if (['EventRegistration', 'EventExpense'].includes(this.sourceType) && !this.eventId)
    this.invalidate('eventId', `${this.sourceType} transactions require eventId`);
  if (['FundraiserCollection', 'FundraiserExpense'].includes(this.sourceType) && !this.fundraiserId)
    this.invalidate('fundraiserId', `${this.sourceType} transactions require fundraiserId`);
});

// A source can be posted to the ledger only once (cancelled rows are excluded).
transactionSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
transactionSchema.index({ eventId: 1, status: 1 });
transactionSchema.index({ fundraiserId: 1, status: 1 });
transactionSchema.index({ transactionDate: -1 });

autoId(transactionSchema, 'transactionId', 'TXN');
module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
module.exports.SOURCE_TYPES = SOURCE_TYPES;
