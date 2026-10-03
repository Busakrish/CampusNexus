const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const EVENT_STATUS = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Published', 'Ongoing', 'Completed', 'Cancelled'];

const eventSchema = new mongoose.Schema({
  eventId: idField,                                  // EVT1001
  organizationId: fk(true),
  organizerId: fk(true),                             // User.userId who created/operates it
  eventName: { type: String, required: true, trim: true },
  description: String,
  category: { type: String, trim: true, index: true },
  bannerUrl: String,

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },   // "HH:mm"
  endTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  venue: String, room: String, address: String,

  maximumCapacity: { type: Number, required: true, min: 1 },
  registrationDeadline: Date,
  registrationFee: money(),
  eligibility: { membersOnly: { type: Boolean, default: false } },

  // Backend-maintained counter (never edited by clients). Increment atomically:
  //   Event.findOneAndUpdate({ eventId, $expr: { $lt: ['$registeredCount', '$maximumCapacity'] } },
  //                          { $inc: { registeredCount: 1 } })
  registeredCount: { type: Number, default: 0, min: 0 },

  assignedVolunteerIds: [String],                    // volunteers allowed to scan / work the event
  status: { type: String, enum: EVENT_STATUS, default: 'Draft', index: true },
  submittedAt: Date,
  reviewedBy: fk(),
  reviewedAt: Date,
  rejectionReason: String,
  cancellationReason: String
}, schemaOptions);

eventSchema.virtual('availableSeats').get(function () { return Math.max(0, this.maximumCapacity - this.registeredCount); });
eventSchema.virtual('registrationCount').get(function () { return this.registeredCount; });

eventSchema.pre('validate', function () {
  if (this.endDate && this.startDate && this.endDate < this.startDate)
    this.invalidate('endDate', 'endDate cannot be before startDate');
  if (this.registeredCount > this.maximumCapacity)
    this.invalidate('registeredCount', 'registeredCount cannot exceed maximumCapacity');
});

eventSchema.index({ organizationId: 1, status: 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ eventName: 'text', description: 'text', category: 'text' });

autoId(eventSchema, 'eventId', 'EVT');
module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
module.exports.EVENT_STATUS = EVENT_STATUS;
