const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const budgetSchema = new mongoose.Schema({
  budgetId: idField,                                 // BUD0001
  budgetName: { type: String, required: true, trim: true },
  category: String,
  eventId: fk(),
  fundraiserId: fk(),
  taskId: fk(),                                      // task budget = child allocation
  parentBudgetId: fk(),
  allocatedAmount: money({ required: true }),        // approved limit
  usedAmount: money(),                               // backend-calculated from approved/posted expenses
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['Draft', 'Active', 'Closed'], default: 'Active', index: true },
  createdBy: fk()
}, schemaOptions);

budgetSchema.virtual('remainingAmount').get(function () { return this.allocatedAmount - this.usedAmount; });

budgetSchema.pre('validate', function () {
  if (this.usedAmount > this.allocatedAmount)
    this.invalidate('usedAmount', 'Used amount exceeds allocation; apply the over-budget approval rule first');
});

autoId(budgetSchema, 'budgetId', 'BUD');
module.exports = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
