const mongoose = require('mongoose');
const { attendance: generateAttendanceId } = require('../utils/idGenerator');

const AttendanceSchema = new mongoose.Schema({
  attendanceId: {
    type: String,
    required: true,
    unique: true,
    default: generateAttendanceId,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  checkInStatus: {
    type: String,
    enum: ['Not Checked In', 'Checked In'],
    default: 'Checked In',
    index: true
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkedInBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
