const { mongoose, autoId, idField, fk, schemaOptions } = require('./_helpers');

const organizationSchema = new mongoose.Schema({
  organizationId: idField,                           // ORG001
  name: { type: String, required: true, trim: true, unique: true },
  description: String,
  logoUrl: String,
  contactEmail: { type: String, lowercase: true, trim: true },
  contactPhone: String,
  ownerId: fk(true),                                 // Organizer User.userId
  organizerIds: [{ type: String, index: true }],     // all organizers allowed to act for this org
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected', 'Suspended'], default: 'Pending', index: true },
  verifiedBy: fk(),
  verifiedAt: Date,
  rejectionReason: String
}, schemaOptions);

autoId(organizationSchema, 'organizationId', 'ORG', 3);
module.exports = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
