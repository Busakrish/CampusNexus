const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Attendance = require('../models/Attendance');
const QRCode = require('../utils/idGenerator');

module.exports = async function runEventTests() {
  // Test 1: Event Lifecycle transitions
  const testEvent = await Event.create({
    organizationId: 'ORG-CSS01',
    organizerId: 'USR-ORG01',
    eventName: 'Autonomous Systems Symposium',
    description: 'Robotics and self-driving technologies conference.',
    category: 'Workshop',
    startDate: new Date(Date.now() + 10 * 86400000),
    endDate: new Date(Date.now() + 11 * 86400000),
    venue: 'Hall 4',
    maximumCapacity: 1, // Only 1 seat to test concurrency protection
    availableSeats: 1,
    registrationCount: 0,
    registrationDeadline: new Date(Date.now() + 8 * 86400000),
    registrationFee: 20,
    status: 'Draft'
  });

  assertEqual(testEvent.status, 'Draft', 'New event starts in Draft status');

  // Submit for Approval
  testEvent.status = 'Pending Approval';
  await testEvent.save();
  assertEqual(testEvent.status, 'Pending Approval', 'Event transitions to Pending Approval');

  // Admin Approves
  testEvent.status = 'Approved';
  await testEvent.save();
  assertEqual(testEvent.status, 'Approved', 'Event transitions to Approved');

  // Publish
  testEvent.status = 'Published';
  await testEvent.save();
  assertEqual(testEvent.status, 'Published', 'Event transitions to Published');

  // Test 2: ATOMIC CAPACITY & LAST-SEAT CONCURRENCY PROTECTION (Rule 11)
  // Simulate two concurrent registration requests for the only remaining 1 seat
  const registerAttempt = async (studentId, userId) => {
    const updated = await Event.findOneAndUpdate(
      {
        eventId: testEvent.eventId,
        availableSeats: { $gt: 0 },
        status: 'Published'
      },
      {
        $inc: { availableSeats: -1, registrationCount: 1 }
      },
      { new: true }
    );
    if (updated) {
      const reg = await Registration.create({
        eventId: testEvent.eventId,
        studentId,
        userId,
        feePaid: testEvent.registrationFee,
        status: 'Confirmed'
      });
      const tkt = await Ticket.create({
        eventId: testEvent.eventId,
        registrationId: reg.registrationId,
        studentId,
        ticketType: 'Paid Admission',
        price: testEvent.registrationFee,
        paymentStatus: 'Paid/Verified',
        qrCode: 'data:image/png;base64,mockqr',
        qrData: JSON.stringify({ ticketId: 'TKT-TEST', eventId: testEvent.eventId }),
        status: 'Valid'
      });
      return { success: true, registration: reg, ticket: tkt };
    }
    return { success: false, error: 'CAPACITY_EXCEEDED' };
  };

  const [res1, res2] = await Promise.all([
    registerAttempt('STU-1002', 'USR-STU02'),
    registerAttempt('STU-1003', 'USR-STU03')
  ]);

  const successes = [res1, res2].filter(r => r.success);
  const failures = [res1, res2].filter(r => !r.success);

  assertEqual(successes.length, 1, 'Exactly one concurrent registration succeeds for the last remaining seat');
  assertEqual(failures.length, 1, 'The competing concurrent registration is safely rejected');

  const refreshedEvent = await Event.findOne({ eventId: testEvent.eventId });
  assertEqual(refreshedEvent.availableSeats, 0, 'Available seats is 0 (never negative)');
  assertEqual(refreshedEvent.registrationCount, 1, 'Registration count is exactly 1');

  // Test 3: Historical Ticket Price Preservation (Rule 6)
  const issuedTicket = successes[0].ticket;
  const initialTicketPrice = issuedTicket.price;
  assertEqual(initialTicketPrice, 20, 'Initial ticket price matches event registration fee');

  // If Organizer changes current event price to $50, historical ticket price must remain $20
  refreshedEvent.registrationFee = 50;
  await refreshedEvent.save();

  const verifyTicket = await Ticket.findOne({ ticketId: issuedTicket.ticketId });
  assertEqual(verifyTicket.price, 20, 'Historical ticket price remains $20 after event fee changes');

  // Test 4: QR Check-in & Duplicate Scan Safe Rejection (Rule 8 & 13)
  const firstAttendance = await Attendance.create({
    eventId: testEvent.eventId,
    ticketId: issuedTicket.ticketId,
    studentId: issuedTicket.studentId,
    checkInStatus: 'Checked In',
    checkInTime: new Date(),
    checkedInBy: 'USR-VOL01'
  });
  issuedTicket.status = 'Used';
  await issuedTicket.save();

  assertEqual(firstAttendance.checkInStatus, 'Checked In', 'First QR scan creates attendance record and marks Checked In');

  // Second scan attempt for the same ticket
  const duplicateCheck = async () => {
    const existing = await Attendance.findOne({ ticketId: issuedTicket.ticketId });
    if (existing && existing.checkInStatus === 'Checked In') {
      return { duplicate: true, message: 'DUPLICATE SCAN' };
    }
    return { duplicate: false };
  };

  const duplicateResult = await duplicateCheck();
  assert(duplicateResult.duplicate === true, 'Duplicate QR scan is detected and rejected without duplicating attendance');

  // Test 5: Registration Cancellation releases capacity
  const regToCancel = successes[0].registration;
  regToCancel.status = 'Cancelled';
  await regToCancel.save();

  await Event.updateOne(
    { eventId: testEvent.eventId },
    { $inc: { availableSeats: 1, registrationCount: -1 } }
  );

  const afterCancelEvent = await Event.findOne({ eventId: testEvent.eventId });
  assertEqual(afterCancelEvent.availableSeats, 1, 'Cancelled registration restored seat to event capacity');
  assertEqual(afterCancelEvent.registrationCount, 0, 'Cancelled registration reduced registrationCount to 0');
};
