const mongoose = require('mongoose');
const { student: generateStudentId } = require('../utils/idGenerator');

const StudentProfileSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    default: generateStudentId,
    index: true
  },
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  major: {
    type: String,
    default: 'Undeclared'
  },
  department: {
    type: String,
    default: 'General'
  },
  yearOfStudy: {
    type: Number,
    min: 1,
    max: 6,
    default: 1
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudentProfile', StudentProfileSchema);
