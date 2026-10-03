const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const registrationSchema = new mongoose.Schema({
  registrationId: idField,                           // REG5001
  eventId: fk(true),
  studentId: fk(true),                               // User.userId
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending', index: true },
  amount: money(),                                   // fee at time of registration (historical)
  paymentId: fk(),
  registeredAt: { type: Date, default: Date.now },
  cancelledAt: Date,
  cancellationReason: String,
  isActive: { type: Boolean, default: true }         // derived from status; powers the unique index
}, schemaOptions);

registrationSchema.pre('validate', function () { this.isActive = ['Pending', 'Confirmed'].includes(this.status); });

// One ACTIVE registration per student per event.
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
registrationSchema.index({ eventId: 1, status: 1 });

autoId(registrationSchema, 'registrationId', 'REG');
module.exports = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
