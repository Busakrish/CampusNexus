const { mongoose, fk, schemaOptions } = require('./_helpers');

// One profile per Student user. NOTE: "studentId" on every other entity
// (Registration, Ticket, Order, ...) stores the student's User.userId.
const studentProfileSchema = new mongoose.Schema({
  userId: { ...fk(true), unique: true },
  rollNumber: { type: String, trim: true, unique: true, sparse: true },
  department: String,
  course: String,
  yearOfStudy: { type: Number, min: 1, max: 8 },
  dateOfBirth: Date,
  address: String,
  emergencyContact: { name: String, phone: String }
}, schemaOptions);

module.exports = mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema);
