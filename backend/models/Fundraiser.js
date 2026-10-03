const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const fundraiserSchema = new mongoose.Schema({
  fundraiserId: idField,                             // FND0001
  title: { type: String, required: true, trim: true },
  description: String,
  purpose: String,
  targetAmount: money({ required: true }),
  // Backend-maintained: sum of VERIFIED collections only. Never client-editable.
  collectedAmount: money(),
  startDate: Date,
  endDate: Date,
  volunteerIds: [{ type: String, index: true }],
  status: { type: String, enum: ['Draft', 'Active', 'Completed', 'Cancelled'], default: 'Draft', index: true },
  createdBy: fk(true)
}, schemaOptions);

fundraiserSchema.virtual('progressPercent').get(function () {
  return this.targetAmount ? Math.min(100, Math.round((this.collectedAmount / this.targetAmount) * 100)) : 0;
});

autoId(fundraiserSchema, 'fundraiserId', 'FND');
module.exports = mongoose.models.Fundraiser || mongoose.model('Fundraiser', fundraiserSchema);
