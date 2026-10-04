require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { connectDB, disconnectDB } = require('./config/db');

const User = require('./models/User');
const StudentProfile = require('./models/StudentProfile');
const Organization = require('./models/Organization');
const Membership = require('./models/Membership');
const Payment = require('./models/Payment');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const Ticket = require('./models/Ticket');
const Attendance = require('./models/Attendance');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Task = require('./models/Task');
const Fundraiser = require('./models/Fundraiser');
const Collection = require('./models/Collection');
const Expense = require('./models/Expense');
const Reimbursement = require('./models/Reimbursement');
const Budget = require('./models/Budget');
const Transaction = require('./models/Transaction');
const Announcement = require('./models/Announcement');
const Notification = require('./models/Notification');

async function seedDatabase() {
  console.log('[Seeder] Connecting to database...');
  await connectDB();

  console.log('[Seeder] Clearing old collections...');
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    Organization.deleteMany({}),
    Membership.deleteMany({}),
    Payment.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
    Ticket.deleteMany({}),
    Attendance.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Task.deleteMany({}),
    Fundraiser.deleteMany({}),
    Collection.deleteMany({}),
    Expense.deleteMany({}),
    Reimbursement.deleteMany({}),
    Budget.deleteMany({}),
    Transaction.deleteMany({}),
    Announcement.deleteMany({}),
    Notification.deleteMany({})
  ]);

  console.log('[Seeder] Creating Users & Profiles...');
  const defaultPassword = 'Password123!';

  // 1. Admin
  const adminUser = await User.create({
    userId: 'USR-ADMIN01',
    name: 'Dr. Arthur Pendelton (Admin)',
    email: 'admin@campus.edu',
    password: defaultPassword,
    role: 'ADMIN',
    status: 'Active',
    phone: '+1 555-0199'
  });

  // 2. Treasurer
  const treasurerUser = await User.create({
    userId: 'USR-TREAS01',
    name: 'Elena Rostova (Treasurer)',
    email: 'treasurer@campus.edu',
    password: defaultPassword,
    role: 'TREASURER',
    status: 'Active',
    phone: '+1 555-0188'
  });

  // 3. Organizer
  const organizerUser = await User.create({
    userId: 'USR-ORG01',
    name: 'Marcus Vance (Organizer)',
    email: 'organizer@campus.edu',
    password: defaultPassword,
    role: 'ORGANIZER',
    status: 'Active',
    phone: '+1 555-0177'
  });

  // 4. Volunteers
  const volunteer1 = await User.create({
    userId: 'USR-VOL01',
    name: 'Chloe Bennett (Volunteer 1)',
    email: 'volunteer1@campus.edu',
    password: defaultPassword,
    role: 'VOLUNTEER',
    status: 'Active',
    phone: '+1 555-0161'
  });

  const volunteer2 = await User.create({
    userId: 'USR-VOL02',
    name: 'David Kim (Volunteer 2)',
    email: 'volunteer2@campus.edu',
    password: defaultPassword,
    role: 'VOLUNTEER',
    status: 'Active',
    phone: '+1 555-0162'
  });

  // 5. Students
  const student1 = await User.create({
    userId: 'USR-STU01',
    name: 'Alice Harper',
    email: 'student1@campus.edu',
    password: defaultPassword,
    role: 'STUDENT',
    status: 'Active',
    phone: '+1 555-0151'
  });

  const student2 = await User.create({
    userId: 'USR-STU02',
    name: 'Bob Jenkins',
    email: 'student2@campus.edu',
    password: defaultPassword,
    role: 'STUDENT',
    status: 'Active',
    phone: '+1 555-0152'
  });

  const student3 = await User.create({
    userId: 'USR-STU03',
    name: 'Carla Diaz',
    email: 'student3@campus.edu',
    password: defaultPassword,
    role: 'STUDENT',
    status: 'Active',
    phone: '+1 555-0153'
  });

  // Create StudentProfiles
  await StudentProfile.create([
    {
      studentId: 'STU-1001',
      userId: student1.userId,
      studentNumber: 'CS-2024-8801',
      major: 'Computer Science',
      department: 'School of Engineering',
      yearOfStudy: 3,
      emergencyContact: { name: 'Sarah Harper', phone: '+1 555-9001', relation: 'Mother' }
    },
    {
      studentId: 'STU-1002',
      userId: student2.userId,
      studentNumber: 'EE-2024-4412',
      major: 'Electrical Engineering',
      department: 'School of Engineering',
      yearOfStudy: 2,
      emergencyContact: { name: 'Robert Jenkins', phone: '+1 555-9002', relation: 'Father' }
    },
    {
      studentId: 'STU-1003',
      userId: student3.userId,
      studentNumber: 'BIO-2024-3319',
      major: 'Biomedical Informatics',
      department: 'School of Science',
      yearOfStudy: 4,
      emergencyContact: { name: 'Maria Diaz', phone: '+1 555-9003', relation: 'Sister' }
    }
  ]);

  console.log('[Seeder] Creating Organization...');
  const org1 = await Organization.create({
    organizationId: 'ORG-CSS01',
    name: 'Computer Science Society',
    code: 'CSS',
    description: 'Premier academic and tech innovation student chapter advancing coding, hackathons, and software craft.',
    category: 'Technology',
    leadOrganizerId: organizerUser.userId,
    status: 'Active',
    contactEmail: 'contact@css-campus.org',
    membershipFee: 25
  });

  // Assign organization to organizer
  organizerUser.organizationId = org1.organizationId;
  await organizerUser.save();

  console.log('[Seeder] Creating Memberships...');
  const mem1 = await Membership.create({
    membershipId: 'MEM-001',
    userId: student1.userId,
    organizationId: org1.organizationId,
    membershipType: 'Premium',
    memberSince: new Date(Date.now() - 30 * 86400000),
    startDate: new Date(Date.now() - 30 * 86400000),
    endDate: new Date(Date.now() + 335 * 86400000),
    status: 'Active',
    feeAmount: 25,
    benefits: ['Free Workshop Entry', 'Merchandise 15% Discount', 'Executive Voting Rights']
  });

  const mem2 = await Membership.create({
    membershipId: 'MEM-002',
    userId: student2.userId,
    organizationId: org1.organizationId,
    membershipType: 'General',
    memberSince: new Date(),
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 86400000),
    status: 'Pending',
    feeAmount: 25,
    benefits: ['Event Discounts', 'Voting Rights']
  });

  // Membership Transaction
  await Transaction.create({
    transactionId: 'TXN-MEM01',
    type: 'INCOME',
    category: 'MEMBERSHIP',
    amount: 25,
    sourceEntity: 'MEMBERSHIP',
    sourceId: mem1.membershipId,
    organizationId: org1.organizationId,
    status: 'Verified',
    description: `Membership dues from student ${student1.name}`,
    processedBy: adminUser.userId
  });

  console.log('[Seeder] Creating Events across canonical lifecycles...');
  const now = Date.now();

  // Published Hackathon
  const eventPublished = await Event.create({
    eventId: 'EVT-HACK2026',
    organizationId: org1.organizationId,
    organizerId: organizerUser.userId,
    eventName: 'Annual Campus Hackathon 2026',
    description: '36-hour flagship hackathon building AI, Web3, and sustainability solutions with top tech mentors.',
    category: 'Hackathon',
    banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    startDate: new Date(now + 7 * 86400000),
    endDate: new Date(now + 9 * 86400000),
    startTime: '09:00',
    endTime: '20:00',
    venue: 'Innovation Hub Grand Auditorium',
    room: 'Hall A & B',
    address: 'Campus North Quad, Tech Complex',
    maximumCapacity: 120,
    availableSeats: 119,
    registrationCount: 1,
    registrationDeadline: new Date(now + 5 * 86400000),
    registrationFee: 15,
    requiresMembership: false,
    status: 'Published'
  });

  // Approved Event ready to publish
  const eventApproved = await Event.create({
    eventId: 'EVT-AI-WORKSHOP',
    organizationId: org1.organizationId,
    organizerId: organizerUser.userId,
    eventName: 'Deep Learning & LLM Masterclass',
    description: 'Hands-on practical session building agents and neural transformers with Python.',
    category: 'Workshop',
    banner: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    startDate: new Date(now + 14 * 86400000),
    endDate: new Date(now + 14 * 86400000),
    startTime: '10:00',
    endTime: '16:00',
    venue: 'Computer Science Lab 3',
    room: 'Room 304',
    address: 'CS Building 3rd Floor',
    maximumCapacity: 40,
    availableSeats: 40,
    registrationCount: 0,
    registrationDeadline: new Date(now + 12 * 86400000),
    registrationFee: 0,
    requiresMembership: false,
    status: 'Approved'
  });

  // Pending Approval Event
  const eventPending = await Event.create({
    eventId: 'EVT-CYBER-MEET',
    organizationId: org1.organizationId,
    organizerId: organizerUser.userId,
    eventName: 'Cybersecurity CTF Competition',
    description: 'Capture the flag hacking challenge with reverse engineering, web exploitation, and cryptography.',
    category: 'Competition',
    startDate: new Date(now + 21 * 86400000),
    endDate: new Date(now + 21 * 86400000),
    startTime: '13:00',
    endTime: '19:00',
    venue: 'Cyber Range Arena',
    room: 'Room 102',
    maximumCapacity: 60,
    availableSeats: 60,
    registrationCount: 0,
    registrationDeadline: new Date(now + 19 * 86400000),
    registrationFee: 10,
    requiresMembership: true,
    status: 'Pending Approval'
  });

  // Draft Event
  const eventDraft = await Event.create({
    eventId: 'EVT-CAREER-FAIR',
    organizationId: org1.organizationId,
    organizerId: organizerUser.userId,
    eventName: 'Tech Industry Networking & Career Fair',
    description: 'Meet recruiters from top software companies and explore summer internship opportunities.',
    category: 'Seminar',
    startDate: new Date(now + 30 * 86400000),
    endDate: new Date(now + 30 * 86400000),
    startTime: '11:00',
    endTime: '17:00',
    venue: 'Student Union Ballroom',
    maximumCapacity: 250,
    availableSeats: 250,
    registrationCount: 0,
    registrationDeadline: new Date(now + 28 * 86400000),
    registrationFee: 0,
    status: 'Draft'
  });

  console.log('[Seeder] Creating Registrations & Tickets with QR codes...');
  const reg1 = await Registration.create({
    registrationId: 'REG-1001',
    eventId: eventPublished.eventId,
    studentId: 'STU-1001',
    userId: student1.userId,
    registrationDate: new Date(),
    feePaid: 15,
    status: 'Confirmed'
  });

  const tktPayload = JSON.stringify({
    ticketId: 'TKT-1001',
    eventId: eventPublished.eventId,
    registrationId: reg1.registrationId,
    studentId: 'STU-1001'
  });

  const tktQr = await QRCode.toDataURL(tktPayload, { errorCorrectionLevel: 'M', margin: 2, width: 280 });

  const tkt1 = await Ticket.create({
    ticketId: 'TKT-1001',
    eventId: eventPublished.eventId,
    registrationId: reg1.registrationId,
    studentId: 'STU-1001',
    ticketType: 'Paid Admission',
    price: 15, // Historical price preserved
    paymentStatus: 'Paid/Verified',
    qrCode: tktQr,
    qrData: tktPayload,
    status: 'Valid'
  });

  // Event Registration Transaction
  await Transaction.create({
    transactionId: 'TXN-EVT01',
    type: 'INCOME',
    category: 'EVENT',
    amount: 15,
    sourceEntity: 'REGISTRATION',
    sourceId: reg1.registrationId,
    organizationId: org1.organizationId,
    status: 'Verified',
    description: `Registration ticket for event "${eventPublished.eventName}" from Alice Harper`,
    processedBy: student1.userId
  });

  console.log('[Seeder] Creating Merchandise Products...');
  const prod1 = await Product.create({
    productId: 'PRD-HOODIE-01',
    organizationId: org1.organizationId,
    name: 'CSS Premium Developer Hoodie',
    description: 'Ultra-comfortable heavy-blend cotton fleece hoodie with embroidered CSS badge and clean minimal sleeve typography.',
    price: 45,
    category: 'Apparel',
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80'],
    variants: ['Midnight Black', 'Heather Charcoal', 'Navy Blue'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 28,
    status: 'Active'
  });

  const prod2 = await Product.create({
    productId: 'PRD-BOTTLE-02',
    organizationId: org1.organizationId,
    name: 'Vacuum Insulated Stainless Steel Bottle (750ml)',
    description: 'Double-wall matte black thermal bottle that keeps beverages iced for 24 hours or hot for 12 hours.',
    price: 20,
    category: 'Accessories',
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80'],
    variants: ['Matte Black', 'Arctic White'],
    sizes: ['750ml'],
    stock: 50,
    status: 'Active'
  });

  console.log('[Seeder] Creating Merchandise Orders...');
  const ord1 = await Order.create({
    orderId: 'ORD-5001',
    userId: student1.userId,
    organizationId: org1.organizationId,
    items: [
      {
        orderItemId: 'ITM-9001',
        productId: prod1.productId,
        name: prod1.name,
        variant: 'Midnight Black',
        size: 'L',
        quantity: 1,
        unitPrice: 45, // Historical unitPrice
        subtotal: 45
      }
    ],
    totalAmount: 45,
    paymentStatus: 'Paid/Verified',
    status: 'Ready',
    shippingAddress: {
      recipientName: 'Alice Harper',
      roomOrHostel: 'Hostel Block 4, Room 212',
      campusLocation: 'North Campus Hub',
      phone: '+1 555-0151'
    }
  });

  // Merchandise Transaction
  await Transaction.create({
    transactionId: 'TXN-ORD01',
    type: 'INCOME',
    category: 'MERCHANDISE',
    amount: 45,
    sourceEntity: 'ORDER',
    sourceId: ord1.orderId,
    organizationId: org1.organizationId,
    status: 'Verified',
    description: `Merchandise order ORD-5001 from Alice Harper`,
    processedBy: student1.userId
  });

  console.log('[Seeder] Creating Volunteer Tasks...');
  await Task.create([
    {
      taskId: 'TSK-101',
      title: 'Setup Innovation Hub AV Equipment & Networking',
      description: 'Configure PA system, projectors, and guest WiFi routing for the annual hackathon.',
      assignedVolunteerId: volunteer1.userId,
      assignedBy: organizerUser.userId,
      organizationId: org1.organizationId,
      eventId: eventPublished.eventId,
      spendingLimit: 150,
      dueDate: new Date(now + 6 * 86400000),
      status: 'In Progress'
    },
    {
      taskId: 'TSK-102',
      title: 'Volunteer Booth for Fundraiser Drive',
      description: 'Staff donation collection desk at Student Quad entrance between 12pm and 4pm.',
      assignedVolunteerId: volunteer2.userId,
      assignedBy: adminUser.userId,
      organizationId: org1.organizationId,
      spendingLimit: 50,
      dueDate: new Date(now + 2 * 86400000),
      status: 'Pending'
    }
  ]);

  console.log('[Seeder] Creating Fundraiser, Collections, and Expenses...');
  const fundraiser1 = await Fundraiser.create({
    fundraiserId: 'FND-TECH4ALL',
    organizationId: org1.organizationId,
    name: 'Tech for All: Campus Laptop Grant Campaign',
    purpose: 'Raise funds to purchase refurbished laptops for underprivileged incoming STEM freshmen.',
    targetAmount: 5000,
    collectedAmount: 650, // Derived verified collections
    startDate: new Date(now - 10 * 86400000),
    endDate: new Date(now + 20 * 86400000),
    assignedVolunteers: [volunteer1.userId, volunteer2.userId],
    createdBy: adminUser.userId,
    status: 'Active'
  });

  // Verified Collection
  const col1 = await Collection.create({
    collectionId: 'COL-801',
    fundraiserId: fundraiser1.fundraiserId,
    volunteerId: volunteer1.userId,
    contributor: { name: 'Alumni Network Donation', email: 'alumni@tech.edu', phone: '+1 555-4433' },
    amount: 500,
    paymentMethod: 'UPI',
    notes: 'Batch 2020 alumni group contribution',
    status: 'Verified',
    verifiedBy: treasurerUser.userId,
    verifiedAt: new Date(now - 2 * 86400000)
  });

  const col2 = await Collection.create({
    collectionId: 'COL-802',
    fundraiserId: fundraiser1.fundraiserId,
    volunteerId: volunteer2.userId,
    contributor: { name: 'Dr. Gregory House', email: 'ghouse@campus.edu' },
    amount: 150,
    paymentMethod: 'CASH',
    notes: 'Faculty donor pledge',
    status: 'Verified',
    verifiedBy: treasurerUser.userId,
    verifiedAt: new Date(now - 1 * 86400000)
  });

  // Pending Collection
  await Collection.create({
    collectionId: 'COL-803',
    fundraiserId: fundraiser1.fundraiserId,
    volunteerId: volunteer1.userId,
    contributor: { name: 'Local Coffee Shop Sponsor', email: 'beans@cafe.com' },
    amount: 200,
    paymentMethod: 'CHEQUE',
    notes: 'Awaiting cheque clearance',
    status: 'Pending'
  });

  // Record verified collection transactions
  await Transaction.create([
    {
      transactionId: 'TXN-COL01',
      type: 'INCOME',
      category: 'FUNDRAISER',
      amount: 500,
      sourceEntity: 'COLLECTION',
      sourceId: col1.collectionId,
      organizationId: org1.organizationId,
      status: 'Verified',
      description: `Fundraiser collection from Alumni Network for "${fundraiser1.name}"`,
      processedBy: treasurerUser.userId
    },
    {
      transactionId: 'TXN-COL02',
      type: 'INCOME',
      category: 'FUNDRAISER',
      amount: 150,
      sourceEntity: 'COLLECTION',
      sourceId: col2.collectionId,
      organizationId: org1.organizationId,
      status: 'Verified',
      description: `Fundraiser collection from Dr. Gregory House for "${fundraiser1.name}"`,
      processedBy: treasurerUser.userId
    }
  ]);

  console.log('[Seeder] Creating Budgets...');
  const budget1 = await Budget.create({
    budgetId: 'BDG-ANNUAL2026',
    organizationId: org1.organizationId,
    budgetName: 'CSS Annual Technical Activities Budget',
    category: 'Event',
    allocatedAmount: 4000,
    usedAmount: 180,
    remainingAmount: 3820,
    startDate: new Date(now - 30 * 86400000),
    endDate: new Date(now + 335 * 86400000),
    status: 'Active'
  });

  console.log('[Seeder] Creating Expenses & Reimbursements...');
  const exp1 = await Expense.create({
    expenseId: 'EXP-401',
    organizationId: org1.organizationId,
    eventId: eventPublished.eventId,
    budgetId: budget1.budgetId,
    submittedBy: volunteer1.userId,
    amount: 180,
    category: 'Printing & Stationery',
    description: 'Badges, lanyards, and event flyers for the Hackathon',
    receiptUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
    status: 'Reimbursed',
    reviewedBy: treasurerUser.userId,
    reviewedAt: new Date(now - 3 * 86400000)
  });

  const exp2 = await Expense.create({
    expenseId: 'EXP-402',
    organizationId: org1.organizationId,
    fundraiserId: fundraiser1.fundraiserId,
    submittedBy: volunteer2.userId,
    amount: 45,
    category: 'Logistics',
    description: 'Refreshments and volunteer hydration packs for fundraising drive',
    status: 'Pending'
  });

  // Reimbursement for exp1
  const rmb1 = await Reimbursement.create({
    reimbursementId: 'RMB-301',
    expenseId: exp1.expenseId,
    submittedBy: volunteer1.userId,
    amount: 180,
    status: 'Paid',
    approvedBy: treasurerUser.userId,
    approvedAt: new Date(now - 3 * 86400000),
    paidAt: new Date(now - 2 * 86400000),
    paymentReference: 'ACH-DIRECT-PAY-98211'
  });

  // Reimbursement Transaction
  const txnRmb = await Transaction.create({
    transactionId: 'TXN-RMB01',
    type: 'REIMBURSEMENT',
    category: 'REIMBURSEMENT',
    amount: 180,
    sourceEntity: 'REIMBURSEMENT',
    sourceId: rmb1.reimbursementId,
    organizationId: org1.organizationId,
    status: 'Verified',
    description: `Reimbursement payment for expense EXP-401 to Chloe Bennett`,
    processedBy: treasurerUser.userId
  });

  rmb1.transactionId = txnRmb.transactionId;
  await rmb1.save();

  console.log('[Seeder] Creating Announcements & Notifications...');
  const ann1 = await Announcement.create({
    announcementId: 'ANN-WELCOME2026',
    organizationId: org1.organizationId,
    title: 'Welcome to the New Academic Semester with CampusNexus!',
    content: 'We are thrilled to launch the unified campus organization portal. Check out upcoming hackathons, tech workshops, merchandise drops, and club memberships.',
    audience: 'All',
    scope: 'CAMPUS',
    status: 'Published',
    createdBy: adminUser.userId,
    publishedAt: new Date(now - 5 * 86400000)
  });

  const ann2 = await Announcement.create({
    announcementId: 'ANN-HACK-RULES',
    organizationId: org1.organizationId,
    title: 'Hackathon 2026 Team Guidelines Released',
    content: 'Teams must register between 2 to 4 members. Hardware track kits will be provided on-site.',
    audience: 'Students',
    eventId: eventPublished.eventId,
    scope: 'EVENT',
    status: 'Published',
    createdBy: organizerUser.userId,
    publishedAt: new Date(now - 2 * 86400000)
  });

  // Create Notifications for users
  const notifUsers = [student1.userId, student2.userId, volunteer1.userId, organizerUser.userId, treasurerUser.userId];
  for (const uid of notifUsers) {
    await Notification.create({
      userId: uid,
      type: 'ANNOUNCEMENT',
      title: 'Welcome to CampusNexus Portal',
      message: 'Explore your personalized dashboard, events, and notifications.',
      relatedEntity: 'ANNOUNCEMENT',
      relatedId: ann1.announcementId,
      read: false
    });
  }

  await Notification.create({
    userId: student1.userId,
    type: 'TICKET',
    title: 'Hackathon Ticket Confirmed',
    message: 'Your registration for Annual Campus Hackathon 2026 is confirmed. QR ticket available in My Tickets.',
    relatedEntity: 'TICKET',
    relatedId: tkt1.ticketId,
    read: false
  });

  console.log('\n================================================================');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
  console.log('Default Seed Accounts (Password for all: Password123!):');
  console.log('  1. ADMIN:      admin@campus.edu');
  console.log('  2. TREASURER:  treasurer@campus.edu');
  console.log('  3. ORGANIZER:  organizer@campus.edu');
  console.log('  4. VOLUNTEER:  volunteer1@campus.edu, volunteer2@campus.edu');
  console.log('  5. STUDENT:    student1@campus.edu, student2@campus.edu, student3@campus.edu');
  console.log('================================================================\n');

  if (require.main === module) {
    await disconnectDB();
    process.exit(0);
  }
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
