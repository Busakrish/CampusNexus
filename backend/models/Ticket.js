const crypto = require('crypto');
const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const ticketSchema = new mongoose.Schema({
  ticketId: idField,                                 // TKT9001
  eventId: fk(true),
  registrationId: { type: String, required: true, trim: true },   // indexed below (named, partial unique)
  studentId: fk(true),
  ticketType: { type: String, default: 'General' },
  price: money(),                                    // historical price, never rewritten
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Verified', 'Failed', 'Refunded', 'Cancelled'], default: 'Pending' },
  qrCode: { type: String, unique: true, immutable: true, default: () => crypto.randomBytes(16).toString('hex') },
  status: { type: String, enum: ['Valid', 'Used', 'Cancelled', 'Expired'], default: 'Valid', index: true },
  checkInStatus: { type: String, enum: ['Not Checked In', 'Checked In'], default: 'Not Checked In' },
  checkInTime: Date,
  issuedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, schemaOptions);

ticketSchema.pre('validate', function () { this.isActive = ['Valid', 'Used'].includes(this.status); });

// No duplicate active tickets for the same registration.
ticketSchema.index(
  { registrationId: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: 'uniq_active_ticket_per_registration' }
);
ticketSchema.index({ registrationId: 1, status: 1 });   // lookups by registration
ticketSchema.index({ eventId: 1, studentId: 1 });

autoId(ticketSchema, 'ticketId', 'TKT');
module.exports = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);