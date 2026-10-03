const { mongoose, autoId, idField, fk, schemaOptions } = require('./_helpers');

const announcementSchema = new mongoose.Schema({
  announcementId: idField,                           // ANN0001
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  audience: { type: [String], enum: ['All', 'Students', 'Volunteers', 'Treasurer', 'Organizers'], default: ['All'] },
  scope: { type: String, enum: ['College', 'Event'], default: 'College' },
  eventId: fk(),                                     // required when scope = Event
  organizationId: fk(),
  createdBy: fk(true),
  createdByRole: { type: String, enum: ['Admin', 'Organizer'] },
  // Organizer college-wide announcements start as 'Pending Approval' (set by backend)
  status: { type: String, enum: ['Draft', 'Pending Approval', 'Published', 'Rejected', 'Archived'], default: 'Draft', index: true },
  approvedBy: fk(),
  publishedAt: Date
}, schemaOptions);

announcementSchema.pre('validate', function () {
  if (this.scope === 'Event' && !this.eventId) this.invalidate('eventId', 'Event announcements require eventId');
});
announcementSchema.index({ status: 1, publishedAt: -1 });

autoId(announcementSchema, 'announcementId', 'ANN');
module.exports = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
