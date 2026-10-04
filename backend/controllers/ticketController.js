const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

exports.listTickets = async (req, res, next) => {
  try {
    const { eventId, status, studentId } = req.query;
    const query = {};

    if (req.user.role === 'STUDENT') {
      // Find student profile or use userId
      const studentProfile = await StudentProfile.findOne({ userId: req.user.userId });
      const sId = studentProfile ? studentProfile.studentId : req.user.userId;
      query.$or = [{ studentId: sId }, { studentId: req.user.userId }];
    } else if (studentId) {
      query.$or = [{ studentId: studentId }, { studentId: req.user.userId }];
    }

    if (eventId) query.eventId = eventId;
    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });

    const eventIds = [...new Set(tickets.map(t => t.eventId))];
    const events = await Event.find({ eventId: { $in: eventIds } });
    const eventMap = Object.fromEntries(events.map(e => [e.eventId, e]));

    const regIds = [...new Set(tickets.map(t => t.registrationId).filter(Boolean))];
    const registrations = await Registration.find({ registrationId: { $in: regIds } });
    const regMap = Object.fromEntries(registrations.map(r => [r.registrationId, r]));

    const studentIds = [...new Set([
      ...tickets.map(t => t.studentId),
      ...registrations.map(r => r.userId),
      ...registrations.map(r => r.studentId)
    ].filter(Boolean))];

    const studentProfiles = await StudentProfile.find({
      $or: [{ studentId: { $in: studentIds } }, { userId: { $in: studentIds } }]
    });
    const profileMap = {};
    const userIdsToFetch = [...studentIds];
    studentProfiles.forEach(sp => {
      profileMap[sp.studentId] = sp;
      profileMap[sp.userId] = sp;
      if (sp.userId) userIdsToFetch.push(sp.userId);
    });

    const users = await User.find({
      $or: [{ userId: { $in: userIdsToFetch } }, { email: { $in: userIdsToFetch } }]
    });
    const userMap = {};
    users.forEach(u => {
      userMap[u.userId] = u;
      userMap[u.email] = u;
    });

    const populated = tickets.map(t => {
      const reg = regMap[t.registrationId] || null;
      const effectiveStudentId = t.studentId || (reg ? reg.studentId : '') || (reg ? reg.userId : '');
      const sp = profileMap[effectiveStudentId] || (reg ? profileMap[reg.userId] : null);
      const u = (sp && userMap[sp.userId]) || userMap[effectiveStudentId] || (reg ? userMap[reg.userId] : null);

      const resolvedName = u ? u.name : (sp ? sp.studentNumber : 'Registered Student');
      const resolvedEmail = u ? u.email : '';

      return {
        ...t.toObject(),
        pricePaid: t.price || 0,
        studentName: resolvedName,
        studentEmail: resolvedEmail,
        user: { name: resolvedName, email: resolvedEmail },
        student: sp ? { studentNumber: sp.studentNumber, department: sp.department, name: resolvedName } : null,
        event: eventMap[t.eventId] || null,
        registration: reg
      };
    });

    return sendSuccess(res, 'Tickets retrieved', { tickets: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId });
    if (!ticket) return sendError(res, 'Ticket not found.', 404, 'TICKET_NOT_FOUND');

    if (req.user.role === 'STUDENT') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user.userId });
      const studentId = studentProfile ? studentProfile.studentId : req.user.userId;
      if (ticket.studentId !== studentId && ticket.studentId !== req.user.userId) {
        return sendError(res, 'Forbidden: You cannot access another student ticket.', 403, 'FORBIDDEN_TICKET_ACCESS');
      }
    }

    const event = await Event.findOne({ eventId: ticket.eventId });
    const registration = await Registration.findOne({ registrationId: ticket.registrationId });
    const attendance = await Attendance.findOne({ ticketId: ticket.ticketId });

    return sendSuccess(res, 'Ticket details retrieved', {
      ticket,
      event,
      registration,
      attendance
    });
  } catch (err) {
    next(err);
  }
};

exports.validateAndCheckInTicket = async (req, res, next) => {
  try {
    const { qrData, ticketId, eventId } = req.body;

    let targetTicketId = ticketId;
    let targetEventId = eventId;

    // Parse qrData payload if provided
    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        targetTicketId = parsed.ticketId || targetTicketId;
        targetEventId = targetEventId || parsed.eventId;
      } catch (e) {
        targetTicketId = qrData; // fallback to raw string if plain ticket ID was scanned
      }
    }

    if (!targetTicketId) {
      return sendError(res, 'Ticket ID or QR code data is required for check-in.', 400, 'TICKET_ID_REQUIRED');
    }

    // 1. Find ticket
    const ticket = await Ticket.findOne({
      $or: [{ ticketId: targetTicketId }, { qrData: qrData || targetTicketId }]
    });

    if (!ticket) {
      return sendError(res, 'Invalid QR code. No ticket matches this code.', 404, 'TICKET_NOT_FOUND');
    }

    // 2. Event validation
    if (targetEventId && ticket.eventId !== targetEventId) {
      return sendError(res, `Ticket is for a different event (${ticket.eventId}). Cannot check in for current event.`, 400, 'EVENT_MISMATCH');
    }

    // 3. Ticket status validation
    if (ticket.status === 'Cancelled') {
      return sendError(res, 'This ticket has been CANCELLED and is invalid.', 400, 'TICKET_CANCELLED');
    }

    if (ticket.status === 'Expired') {
      return sendError(res, 'This ticket has EXPIRED.', 400, 'TICKET_EXPIRED');
    }

    // 4. Duplicate scan check against Attendance record
    const existingAttendance = await Attendance.findOne({ ticketId: ticket.ticketId });
    if (existingAttendance && existingAttendance.checkInStatus === 'Checked In') {
      return sendError(res, `DUPLICATE SCAN: Ticket already checked in on ${new Date(existingAttendance.checkInTime).toLocaleString()}.`, 409, 'ALREADY_CHECKED_IN', {
        attendanceId: existingAttendance.attendanceId,
        checkInTime: existingAttendance.checkInTime,
        ticketId: ticket.ticketId
      });
    }

    // 5. Registration validation
    const registration = await Registration.findOne({ registrationId: ticket.registrationId });
    if (!registration || registration.status !== 'Confirmed') {
      return sendError(res, 'Registration is not confirmed.', 400, 'REGISTRATION_NOT_CONFIRMED');
    }

    // 6. Fetch Student information
    let studentInfo = { name: 'Student', studentNumber: ticket.studentId };
    const studentProfile = await StudentProfile.findOne({
      $or: [{ studentId: ticket.studentId }, { userId: ticket.studentId }]
    });
    if (studentProfile) {
      const studentUser = await User.findOne({ userId: studentProfile.userId });
      if (studentUser) studentInfo.name = studentUser.name;
      studentInfo.studentNumber = studentProfile.studentNumber;
    } else {
      const directUser = await User.findOne({ userId: ticket.studentId });
      if (directUser) studentInfo.name = directUser.name;
    }

    // 7. Create Attendance record
    const attendance = await Attendance.create({
      eventId: ticket.eventId,
      ticketId: ticket.ticketId,
      studentId: ticket.studentId,
      checkInStatus: 'Checked In',
      checkInTime: new Date(),
      checkedInBy: req.user.userId
    });

    // 8. Mark ticket as Used
    ticket.status = 'Used';
    await ticket.save();

    const event = await Event.findOne({ eventId: ticket.eventId });

    return sendSuccess(res, 'Check-in successful! Attendance verified.', {
      attendance,
      ticket,
      event: {
        eventId: event.eventId,
        eventName: event.eventName
      },
      student: studentInfo
    });
  } catch (err) {
    // Unique index violation on ticketId in Attendance handles concurrent check-in scans safely
    if (err.code === 11000) {
      return sendError(res, 'DUPLICATE SCAN: Ticket was just checked in concurrently.', 409, 'ALREADY_CHECKED_IN');
    }
    next(err);
  }
};
