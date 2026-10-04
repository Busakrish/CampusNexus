const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

exports.listAttendance = async (req, res, next) => {
  try {
    const targetEventId = req.params.eventId || req.query.eventId;

    if (!targetEventId) {
      return sendError(res, 'Event ID is required to retrieve attendance.', 400, 'EVENT_ID_REQUIRED');
    }

    const event = await Event.findOne({ eventId: targetEventId });
    if (!event) return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');

    if (req.user.role === 'ORGANIZER' && event.organizationId !== req.user.organizationId) {
      return sendError(res, 'Forbidden: You do not have access to this event attendance.', 403, 'FORBIDDEN_ATTENDANCE_ACCESS');
    }

    const attendanceRecords = await Attendance.find({ eventId: targetEventId }).sort({ checkInTime: -1 });

    // Populate student profiles and user records
    const studentIdentifiers = attendanceRecords.map(a => a.studentId);
    const scannerUserIds = attendanceRecords.map(a => a.checkedInBy);

    const [profiles, usersDirect, scannerUsers] = await Promise.all([
      StudentProfile.find({
        $or: [{ studentId: { $in: studentIdentifiers } }, { userId: { $in: studentIdentifiers } }]
      }),
      User.find({ userId: { $in: studentIdentifiers } }).select('userId name email phone'),
      User.find({ userId: { $in: scannerUserIds } }).select('userId name email role')
    ]);

    const profileUserIds = profiles.map(p => p.userId);
    const profileUsers = await User.find({ userId: { $in: profileUserIds } }).select('userId name email phone');

    const allStudentUsers = [...usersDirect, ...profileUsers];
    const userMap = Object.fromEntries(allStudentUsers.map(u => [u.userId, u]));
    const scannerMap = Object.fromEntries(scannerUsers.map(u => [u.userId, u]));

    const profileByStudentId = Object.fromEntries(profiles.map(p => [p.studentId, p]));
    const profileByUserId = Object.fromEntries(profiles.map(p => [p.userId, p]));

    const populated = attendanceRecords.map(a => {
      const prof = profileByStudentId[a.studentId] || profileByUserId[a.studentId] || null;
      const user = userMap[a.studentId] || (prof ? userMap[prof.userId] : null) || null;
      const scanner = scannerMap[a.checkedInBy] || null;

      return {
        ...a.toObject(),
        status: a.checkInStatus,
        user: user ? { userId: user.userId, name: user.name, email: user.email, phone: user.phone } : { name: a.studentId, email: '' },
        student: {
          name: user ? user.name : a.studentId,
          email: user ? user.email : '',
          studentNumber: prof ? prof.studentNumber : a.studentId,
          major: prof ? prof.major : 'General'
        },
        scannedBy: scanner ? { userId: scanner.userId, name: scanner.name, role: scanner.role } : a.checkedInBy
      };
    });

    const stats = {
      totalRegistered: event.registrationCount,
      totalCheckedIn: attendanceRecords.length,
      attendanceRate: event.registrationCount > 0 ? ((attendanceRecords.length / event.registrationCount) * 100).toFixed(1) + '%' : '0%'
    };

    return sendSuccess(res, 'Event attendance retrieved', {
      attendance: populated,
      stats,
      event: {
        eventId: event.eventId,
        eventName: event.eventName,
        maximumCapacity: event.maximumCapacity,
        registrationCount: event.registrationCount
      }
    });
  } catch (err) {
    next(err);
  }
};
