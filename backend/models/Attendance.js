const { mongoose, autoId, idField, fk, schemaOptions } = require('./_helpers');

const attendanceSchema = new mongoose.Schema({
  attendanceId: idField,                             // ATT3001
  eventId: fk(true),
  ticketId: { ...fk(true), unique: true },           // unique => a ticket can be checked in only once
  studentId: fk(true),
  checkInStatus: { type: String, enum: ['Not Checked In', 'Checked In'], default: 'Checked In' },
  checkInTime: { type: Date, default: Date.now },
  checkedInBy: fk(true),                             // organizer / authorized volunteer userId
  method: { type: String, enum: ['QR', 'Manual'], default: 'QR' }
}, schemaOptions);

attendanceSchema.index({ eventId: 1, checkInTime: -1 });

autoId(attendanceSchema, 'attendanceId', 'ATT');
module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
