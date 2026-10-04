const QRCode = require('qrcode');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const Membership = require('../models/Membership');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { sendEventTicketEmail } = require('../services/emailService');
const { sendSuccess, sendError } = require('../utils/response');
const { ticket: generateTicketId } = require('../utils/idGenerator');

// Helper to create ticket with QR code
async function createTicketForRegistration(event, registration, studentId) {
  const ticketId = generateTicketId();
  const qrPayload = JSON.stringify({
    ticketId,
    eventId: event.eventId,
    registrationId: registration.registrationId,
    studentId
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280
  });

  const ticket = await Ticket.create({
    ticketId,
    eventId: event.eventId,
    registrationId: registration.registrationId,
    studentId,
    ticketType: event.registrationFee > 0 ? 'Paid Admission' : 'Standard Admission',
    price: event.registrationFee, // Historical fee preservation
    paymentStatus: event.registrationFee > 0 ? 'Paid/Verified' : 'Paid/Verified',
    qrCode: qrCodeDataUrl,
    qrData: qrPayload,
    status: 'Valid'
  });

  return ticket;
}

exports.registerForEvent = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.body.eventId;
    const userId = req.user.userId;

    if (!eventId) {
      return sendError(res, 'Event ID is required for registration.', 400, 'EVENT_ID_REQUIRED');
    }

    // Fetch student profile
    const studentProfile = await StudentProfile.findOne({ userId });
    const studentId = studentProfile ? studentProfile.studentId : userId;

    // Check event existence
    const event = await Event.findOne({ eventId });
    if (!event) {
      return sendError(res, 'Event not found.', 404, 'EVENT_NOT_FOUND');
    }

    // 1. Must be published
    if (event.status !== 'Published') {
      return sendError(res, `Event is not open for registration (Status: ${event.status}).`, 400, 'EVENT_NOT_PUBLISHED');
    }

    // 2. Registration deadline check
    if (new Date() > new Date(event.registrationDeadline)) {
      return sendError(res, 'Registration deadline for this event has passed.', 400, 'DEADLINE_PASSED');
    }

    // 3. Prevent duplicate active registration
    const existingRegistration = await Registration.findOne({
      eventId,
      userId,
      status: { $in: ['Confirmed', 'Pending'] }
    });

    if (existingRegistration) {
      return sendError(res, 'You already have an active registration for this event.', 400, 'DUPLICATE_REGISTRATION');
    }

    // 4. Membership eligibility check if required
    if (event.requiresMembership) {
      const activeMembership = await Membership.findOne({
        userId,
        organizationId: event.organizationId,
        status: 'Active'
      });
      if (!activeMembership) {
        return sendError(res, 'This event requires an active membership in the host organization.', 403, 'MEMBERSHIP_REQUIRED');
      }
    }

    // 5. ATOMIC CAPACITY & SEAT ALLOCATION (prevents race conditions)
    const updatedEvent = await Event.findOneAndUpdate(
      {
        eventId,
        availableSeats: { $gt: 0 },
        status: 'Published'
      },
      {
        $inc: { availableSeats: -1, registrationCount: 1 }
      },
      { new: true }
    );

    if (!updatedEvent) {
      return sendError(res, 'Sorry, this event is fully booked or no longer available.', 400, 'CAPACITY_EXCEEDED');
    }

    // 6. Handle Free vs Paid registration
    if (event.registrationFee > 0) {
      // Create Pending registration awaiting payment
      const registration = await Registration.create({
        eventId,
        studentId,
        userId,
        feePaid: 0,
        status: 'Pending'
      });

      return sendSuccess(res, 'Registration initiated. Please complete payment to confirm your seat and issue ticket.', {
        registration,
        requiresPayment: true,
        feeAmount: event.registrationFee,
        event: {
          eventId: event.eventId,
          eventName: event.eventName,
          availableSeats: updatedEvent.availableSeats
        }
      }, 201);
    }

    // Free event: Immediately confirm and issue ticket
    const registration = await Registration.create({
      eventId,
      studentId,
      userId,
      feePaid: 0,
      status: 'Confirmed'
    });

    const ticket = await createTicketForRegistration(event, registration, studentId);

    // Send Ticket with Embedded QR Code to Student's Email via Nodemailer
    const attendeeUser = await User.findOne({ userId });
    if (attendeeUser && attendeeUser.email) {
      sendEventTicketEmail({
        recipientEmail: attendeeUser.email,
        studentName: attendeeUser.name || req.user.name || 'Student',
        event,
        ticket,
        registration
      }).catch(err => console.error('⚠️ Ticket email dispatch warning:', err.message));
    }

    await notifyUser(userId, {
      type: 'TICKET',
      title: 'Registration Confirmed!',
      message: `Your registration for "${event.eventName}" is confirmed. Your QR ticket is ready!`,
      relatedEntity: 'TICKET',
      relatedId: ticket.ticketId
    });

    return sendSuccess(res, 'Registration confirmed and ticket issued.', {
      registration,
      ticket,
      event: {
        eventId: event.eventId,
        eventName: event.eventName,
        availableSeats: updatedEvent.availableSeats
      }
    }, 201);
  } catch (err) {
    next(err);
  }
};

exports.payRegistrationFee = async (req, res, next) => {
  try {
    const { registrationId } = req.params;
    const { paymentMethod = 'SIMULATED' } = req.body;

    const registration = await Registration.findOne({ registrationId });
    if (!registration) {
      return sendError(res, 'Registration record not found.', 404, 'REGISTRATION_NOT_FOUND');
    }

    if (registration.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return sendError(res, 'Forbidden: You can only pay for your own registration.', 403, 'FORBIDDEN_REGISTRATION_PAYMENT');
    }

    if (registration.status === 'Confirmed') {
      return sendError(res, 'Registration is already confirmed and paid.', 400, 'REGISTRATION_ALREADY_CONFIRMED');
    }

    const event = await Event.findOne({ eventId: registration.eventId });
    if (!event) return sendError(res, 'Associated event not found.', 404, 'EVENT_NOT_FOUND');

    // Create Payment record
    const payment = await Payment.create({
      userId: registration.userId,
      purpose: 'EVENT_REGISTRATION',
      relatedEntityId: registration.registrationId,
      amount: event.registrationFee,
      paymentMethod,
      status: 'Paid/Verified',
      paidAt: new Date()
    });

    // Update Registration
    registration.status = 'Confirmed';
    registration.feePaid = event.registrationFee;
    registration.paymentId = payment.paymentId;
    await registration.save();

    // Create Ticket
    const ticket = await createTicketForRegistration(event, registration, registration.studentId);

    // Send Ticket with Embedded QR Code to Student's Email via Nodemailer
    const paidAttendeeUser = await User.findOne({ userId: registration.userId });
    if (paidAttendeeUser && paidAttendeeUser.email) {
      sendEventTicketEmail({
        recipientEmail: paidAttendeeUser.email,
        studentName: paidAttendeeUser.name || req.user.name || 'Student',
        event,
        ticket,
        registration
      }).catch(err => console.error('⚠️ Ticket email dispatch warning:', err.message));
    }

    // Create Traceable Financial Transaction
    await Transaction.create({
      type: 'INCOME',
      category: 'EVENT',
      amount: event.registrationFee,
      sourceEntity: 'REGISTRATION',
      sourceId: registration.registrationId,
      organizationId: event.organizationId,
      status: 'Verified',
      description: `Registration fee for event "${event.eventName}" from student ${req.user.name || registration.userId}`,
      processedBy: req.user.userId
    });

    // Notify student
    await notifyUser(registration.userId, {
      type: 'TICKET',
      title: 'Payment Received & Ticket Issued',
      message: `Your registration fee of $${event.registrationFee} for "${event.eventName}" was received. Your QR Ticket is ready!`,
      relatedEntity: 'TICKET',
      relatedId: ticket.ticketId
    });

    return sendSuccess(res, 'Payment verified and ticket successfully issued.', {
      registration,
      payment,
      ticket
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelRegistration = async (req, res, next) => {
  try {
    const { registrationId } = req.params;
    const { reason = 'Cancelled by student' } = req.body;

    const registration = await Registration.findOne({ registrationId });
    if (!registration) return sendError(res, 'Registration not found.', 404, 'REGISTRATION_NOT_FOUND');

    if (registration.userId !== req.user.userId && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return sendError(res, 'Forbidden: You cannot cancel another student registration.', 403, 'FORBIDDEN_CANCEL');
    }

    if (registration.status === 'Cancelled') {
      return sendError(res, 'Registration is already cancelled.', 400, 'ALREADY_CANCELLED');
    }

    registration.status = 'Cancelled';
    registration.cancellationReason = reason;
    await registration.save();

    // Invalidate any issued tickets
    await Ticket.updateMany({ registrationId, status: 'Valid' }, { status: 'Cancelled' });

    // Atomically release capacity back to event
    await Event.updateOne(
      { eventId: registration.eventId },
      { $inc: { availableSeats: 1, registrationCount: -1 } }
    );

    return sendSuccess(res, 'Registration cancelled and seat released.', { registration });
  } catch (err) {
    next(err);
  }
};

exports.listRegistrations = async (req, res, next) => {
  try {
    const { eventId, status, userId } = req.query;
    const query = {};

    if (req.user.role === 'STUDENT') {
      query.userId = req.user.userId;
    } else if (userId) {
      query.userId = userId;
    }

    if (eventId) query.eventId = eventId;
    if (status) query.status = new RegExp(`^${status}$`, 'i');

    const registrations = await Registration.find(query).sort({ createdAt: -1 });

    const eventIds = [...new Set(registrations.map(r => r.eventId))];
    const userIds = [...new Set(registrations.map(r => r.userId))];

    const [events, users] = await Promise.all([
      Event.find({ eventId: { $in: eventIds } }),
      User.find({ userId: { $in: userIds } }).select('userId name email')
    ]);

    const eventMap = Object.fromEntries(events.map(e => [e.eventId, e]));
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));

    const populated = registrations.map(r => ({
      ...r.toObject(),
      event: eventMap[r.eventId] || null,
      user: userMap[r.userId] || null
    }));

    return sendSuccess(res, 'Registrations retrieved', { registrations: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.updateRegistrationStatus = async (req, res, next) => {
  try {
    const { registrationId } = req.params;
    const { status, reason } = req.body;

    const registration = await Registration.findOne({ registrationId });
    if (!registration) return sendError(res, 'Registration not found.', 404, 'REGISTRATION_NOT_FOUND');

    const event = await Event.findOne({ eventId: registration.eventId });
    if (!event) return sendError(res, 'Associated event not found.', 404, 'EVENT_NOT_FOUND');

    const prevStatus = registration.status;
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : registration.status;

    registration.status = normalizedStatus;
    if (reason) registration.cancellationReason = reason;
    await registration.save();

    let ticket = null;
    if (normalizedStatus === 'Confirmed') {
      ticket = await Ticket.findOne({ registrationId: registration.registrationId });
      if (!ticket) {
        ticket = await createTicketForRegistration(event, registration, registration.studentId);
      } else if (ticket.status !== 'Valid') {
        ticket.status = 'Valid';
        await ticket.save();
      }

      await notifyUser(registration.userId, {
        type: 'TICKET',
        title: 'Registration Status Updated',
        message: `Your registration for "${event.eventName}" is now Confirmed.`,
        relatedEntity: 'TICKET',
        relatedId: ticket ? ticket.ticketId : registration.registrationId
      });
    } else if (normalizedStatus === 'Cancelled') {
      await Ticket.updateMany({ registrationId, status: 'Valid' }, { status: 'Cancelled' });
      if (prevStatus === 'Confirmed' || prevStatus === 'Pending') {
        await Event.updateOne(
          { eventId: registration.eventId },
          { $inc: { availableSeats: 1, registrationCount: -1 } }
        );
      }
      await notifyUser(registration.userId, {
        type: 'REGISTRATION',
        title: 'Registration Cancelled',
        message: `Your registration for "${event.eventName}" has been marked as Cancelled.`,
        relatedEntity: 'EVENT',
        relatedId: event.eventId
      });
    }

    return sendSuccess(res, 'Registration status updated successfully.', { registration, ticket });
  } catch (err) {
    next(err);
  }
};
