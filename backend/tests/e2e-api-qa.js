const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || '', BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runE2EQA() {
  console.log('====================================================');
  console.log('🚀 RUNNING END-TO-END CROSS-MODULE API QA TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate all roles (Direct JWT Login — No OTP required)
    console.log('--- 1. Authenticating Roles (Direct JWT Login & Registration OTP) ---');
    const adminRes = await request({ method: 'POST', url: '/api/auth/login' }, { email: 'admin@campus.edu', password: 'Password123!' });
    assert(adminRes.status === 200 && adminRes.body.data.token, 'Admin logged in directly with JWT (no login OTP required)');
    const adminToken = adminRes.body.data.token;

    const orgRes = await request({ method: 'POST', url: '/api/auth/login' }, { email: 'organizer@campus.edu', password: 'Password123!' });
    assert(orgRes.status === 200 && orgRes.body.data.token, 'Organizer logged in directly with JWT');
    const orgToken = orgRes.body.data.token;

    const volRes = await request({ method: 'POST', url: '/api/auth/login' }, { email: 'volunteer1@campus.edu', password: 'Password123!' });
    assert(volRes.status === 200 && volRes.body.data.token, 'Volunteer logged in directly with JWT');
    const volToken = volRes.body.data.token;

    const stuRes = await request({ method: 'POST', url: '/api/auth/login' }, { email: 'student1@campus.edu', password: 'Password123!' });
    assert(stuRes.status === 200 && stuRes.body.data.token, 'Student logged in directly with JWT');
    const stuToken = stuRes.body.data.token;

    const treasRes = await request({ method: 'POST', url: '/api/auth/login' }, { email: 'treasurer@campus.edu', password: 'Password123!' });
    assert(treasRes.status === 200 && treasRes.body.data.token, 'Treasurer logged in directly with JWT');
    const treasToken = treasRes.body.data.token;

    // 1b. Test Student Registration Email OTP Flow & Rate Limiting
    const testRegEmail = `qa_fresh_student_${Date.now()}@campus.edu`;
    const regInitRes = await request({ method: 'POST', url: '/api/auth/register-initiate' }, {
      name: 'QA Fresh Student',
      email: testRegEmail,
      password: 'Password123!',
      studentNumber: 'QA-STU-999',
      major: 'Computer Science',
      yearOfStudy: 1
    });
    assert(regInitRes.status === 200 && regInitRes.body.data.otpRequired === true, 'Student registration initiated and sent email OTP');

    // Test Mail Rate Limiting Cooldown (immediate repeat request should trigger 429)
    const rateLimitRes = await request({ method: 'POST', url: '/api/auth/register-initiate' }, {
      name: 'QA Fresh Student',
      email: testRegEmail,
      password: 'Password123!'
    });
    assert(rateLimitRes.status === 429, 'Mail rate-limiting cooldown safely triggered (429 Too Many Requests)');

    // Test invalid OTP rejection
    const invalidOtpRes = await request({ method: 'POST', url: '/api/auth/verify-registration-otp' }, {
      email: testRegEmail,
      otp: '000000'
    });
    assert(invalidOtpRes.status === 400, 'Invalid verification code was safely rejected with 400 Bad Request');

    // 2. Complete Event Lifecycle & Cross-module visibility (Volunteer & Organizer & Admin)
    console.log('\n--- 2. Event Lifecycle & Cross-Module Visibility (Bug 2 Regression & Volunteer Creation) ---');
    
    // 2a. Volunteer creates and submits event proposal
    const volEventRes = await request({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${volToken}` }
    }, {
      eventName: 'Volunteer Green Campus Drive 2026',
      description: 'Campus sustainability and recycling awareness drive organized by volunteers.',
      category: 'Social',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      venue: 'North Lawn & Student Center',
      capacityLimit: 100,
      registrationFee: 0,
      status: 'Pending Approval'
    });
    assert(volEventRes.status === 201 && volEventRes.body.data.event, 'Volunteer successfully created event with Pending Approval status');
    const volEventId = volEventRes.body.data.event.eventId;

    // Admin approves & publishes Volunteer-created event
    const adminApproveVolRes = await request({
      method: 'PUT',
      url: `/api/events/${volEventId}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` }
    }, { publish: true });
    assert(adminApproveVolRes.status === 200 && adminApproveVolRes.body.data.event.status === 'Published', 'Admin approved and published Volunteer proposed event');

    // 2b. Admin directly creates institutional event
    const adminEventRes = await request({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      eventName: 'Annual University Tech Convocation 2026',
      description: 'Official university tech convocation ceremony.',
      category: 'Seminar',
      startDate: new Date(Date.now() + 172800000).toISOString(),
      endDate: new Date(Date.now() + 259200000).toISOString(),
      venue: 'Grand University Auditorium',
      capacityLimit: 500,
      registrationFee: 0,
      status: 'Published'
    });
    assert(adminEventRes.status === 201 && adminEventRes.body.data.event.status === 'Published', 'Admin directly created and published institutional event');

    // 2c. Organizer creates event as Draft
    const newEventRes = await request({
      method: 'POST',
      url: '/api/events',
      headers: { Authorization: `Bearer ${orgToken}` }
    }, {
      eventName: 'AI Robotics Summit 2026',
      description: 'Annual flagship robotics and autonomous systems workshop.',
      category: 'Workshop',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      venue: 'Engineering Hall 302',
      locationType: 'In-Person',
      capacityLimit: 50,
      registrationFee: 0,
      tags: ['Robotics', 'AI']
    });
    assert(newEventRes.status === 201 && newEventRes.body.data.event, 'Organizer created event with Draft status');
    const createdEventId = newEventRes.body.data.event.eventId;

    // Organizer submits for approval
    const submitRes = await request({
      method: 'PUT',
      url: `/api/events/${createdEventId}/status`,
      headers: { Authorization: `Bearer ${orgToken}` }
    }, { status: 'Pending Approval' });
    assert(submitRes.status === 200, 'Organizer submitted event for approval');

    // Admin approves and publishes
    const approveRes = await request({
      method: 'PUT',
      url: `/api/events/${createdEventId}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` }
    }, { publish: true });
    assert(approveRes.status === 200 && approveRes.body.data.event.status === 'Published', 'Admin approved and published Organizer event');

    // Student queries published events
    const stuEventsRes = await request({
      method: 'GET',
      url: '/api/events?status=published',
      headers: { Authorization: `Bearer ${stuToken}` }
    });
    const foundPublished = stuEventsRes.body.data.events.find(e => e.eventId === createdEventId);
    const foundVolEvent = stuEventsRes.body.data.events.find(e => e.eventId === volEventId);
    assert(!!foundPublished, 'Organizer approved event appears in Student upcoming events API query');
    assert(!!foundVolEvent, 'Volunteer approved event appears in Student upcoming events API query');
    assert(foundPublished.eventName === 'AI Robotics Summit 2026', 'Event name matches across organizer & student views');
    assert((foundPublished.capacityLimit || foundPublished.maximumCapacity) === 50, 'Capacity limit (50) matches across views');

    // 3. Registration, Ticket & QR Check-in Flow (Bug 1 Regression)
    console.log('\n--- 3. Registration, Ticket & QR Check-In Flow (Bug 1 Regression) ---');
    const regRes = await request({
      method: 'POST',
      url: '/api/registrations',
      headers: { Authorization: `Bearer ${stuToken}` }
    }, { eventId: createdEventId });
    assert(regRes.status === 201 && regRes.body.data.ticket, 'Student registered and generated QR ticket');
    const ticketId = regRes.body.data.ticket.ticketId;
    const qrData = regRes.body.data.ticket.qrData;

    // Volunteer scans student QR ticket
    const scanRes = await request({
      method: 'POST',
      url: '/api/tickets/scan',
      headers: { Authorization: `Bearer ${volToken}` }
    }, { qrData, eventId: createdEventId });
    assert(scanRes.status === 200 && scanRes.body.data.attendance, 'Volunteer camera QR scan succeeded and created attendance');
    assert(scanRes.body.data.attendance.checkInStatus === 'Checked In', 'Attendance status marked Checked In');

    // Duplicate QR scan verification
    const dupScanRes = await request({
      method: 'POST',
      url: '/api/tickets/scan',
      headers: { Authorization: `Bearer ${volToken}` }
    }, { qrData, eventId: createdEventId });
    assert(dupScanRes.status === 409, 'Duplicate QR scan safely rejected with 409 Conflict');

    // Attendance records retrieval
    const attRes = await request({
      method: 'GET',
      url: `/api/attendance?eventId=${createdEventId}`,
      headers: { Authorization: `Bearer ${orgToken}` }
    });
    assert(attRes.status === 200 && attRes.body.data.attendance.length === 1, 'Organizer retrieves exactly 1 verified attendee');
    assert(attRes.body.data.attendance[0].student && attRes.body.data.attendance[0].student.name, 'Attendee student name cleanly resolved');

    // 4. Merchandise Order & Cancellation Flow
    console.log('\n--- 4. Merchandise Stock & Cancellation Flow ---');
    const productsRes = await request({
      method: 'GET',
      url: '/api/products',
      headers: { Authorization: `Bearer ${stuToken}` }
    });
    const testProduct = productsRes.body.data.products[0];
    const initialStock = testProduct.stock;

    const orderRes = await request({
      method: 'POST',
      url: '/api/orders',
      headers: { Authorization: `Bearer ${stuToken}` }
    }, {
      items: [{ productId: testProduct.productId, quantity: 1, variant: 'Default' }]
    });
    assert(orderRes.status === 201 && orderRes.body.data.order, 'Student placed merchandise order');
    const orderId = orderRes.body.data.order.orderId;

    // Check stock decremented
    const prodAfterRes = await request({
      method: 'GET',
      url: `/api/products/${testProduct.productId}`,
      headers: { Authorization: `Bearer ${stuToken}` }
    });
    assert(prodAfterRes.body.data.product.stock === initialStock - 1, 'Product stock decremented by 1 upon order');

    // Student cancels order
    const cancelOrderRes = await request({
      method: 'PUT',
      url: `/api/orders/${orderId}/status`,
      headers: { Authorization: `Bearer ${stuToken}` }
    }, { status: 'Cancelled' });
    assert(cancelOrderRes.status === 200, 'Student successfully cancelled pending order');

    // Check stock restored
    const prodRestoredRes = await request({
      method: 'GET',
      url: `/api/products/${testProduct.productId}`,
      headers: { Authorization: `Bearer ${stuToken}` }
    });
    assert(prodRestoredRes.body.data.product.stock === initialStock, 'Product stock fully restored after cancellation');

    // 5. Expense, Reimbursement & Financial Ledger Flow
    console.log('\n--- 5. Expense, Reimbursement & Financial Ledger Flow ---');
    const expenseRes = await request({
      method: 'POST',
      url: '/api/expenses',
      headers: { Authorization: `Bearer ${volToken}` }
    }, {
      amount: 45,
      category: 'Supplies',
      description: 'Cables and HDMI adapters for summit',
      organizationId: 'ORG-TECH01'
    });
    assert(expenseRes.status === 201, 'Volunteer submitted expense claim');
    const expenseId = expenseRes.body.data.expense.expenseId;

    // Treasurer approves & disburses
    const reviewRes = await request({
      method: 'PUT',
      url: `/api/expenses/${expenseId}/review`,
      headers: { Authorization: `Bearer ${treasToken}` }
    }, { status: 'approved', remarks: 'Approved for reimbursement' });
    assert(reviewRes.status === 200, 'Treasurer approved expense');

    // 6. Announcements & Notifications Flow
    console.log('\n--- 6. Announcements & Notifications Flow ---');
    const annRes = await request({
      method: 'POST',
      url: '/api/announcements',
      headers: { Authorization: `Bearer ${orgToken}` }
    }, {
      title: 'Workshop Materials Available',
      content: 'Please download the workshop slides and SDK from the portal.',
      audience: 'Students',
      status: 'Published'
    });
    assert(annRes.status === 201, 'Organizer published student announcement');

    const notifRes = await request({
      method: 'GET',
      url: '/api/notifications',
      headers: { Authorization: `Bearer ${stuToken}` }
    });
    assert(notifRes.status === 200 && notifRes.body.data.notifications.length > 0, 'Student received targeted announcement notification');

    console.log('\n====================================================');
    console.log(`📊 E2E QA SUMMARY: Passed: ${passed} | Failed: ${failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with unhandled error:', err);
    process.exit(1);
  }
}

runE2EQA();
