const { mongoose, autoId, idField, schemaOptions } = require('./_helpers');

const ROLES = ['Student', 'Volunteer', 'Admin', 'Treasurer', 'Organizer'];
const ACCOUNT_STATUS = ['Active', 'Inactive', 'Suspended'];

const userSchema = new mongoose.Schema({
  userId: idField,                                   // USR0001
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true, default: 'Student', index: true },
  status: { type: String, enum: ACCOUNT_STATUS, default: 'Active', index: true },
  phone: { type: String, trim: true },
  avatarUrl: String,
  lastLoginAt: Date
}, schemaOptions);

autoId(userSchema, 'userId', 'USR');
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
