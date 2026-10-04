const User = require('../models/User');
const Event = require('../models/Event');
const Membership = require('../models/Membership');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Reimbursement = require('../models/Reimbursement');
const Fundraiser = require('../models/Fundraiser');
const Collection = require('../models/Collection');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Organization = require('../models/Organization');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const StudentProfile = require('../models/StudentProfile');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

// Student Dashboard Aggregate
exports.getStudentDashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const studentProfile = await StudentProfile.findOne({ userId });
    const studentId = studentProfile ? studentProfile.studentId : userId;

    const [
      activeMemberships,
      upcomingEvents,
      activeTickets,
      recentOrders,
      unreadNotificationsCount
    ] = await Promise.all([
      Membership.find({ userId, status: 'Active' }),
      Event.find({ status: 'Published', startDate: { $gte: new Date(Date.now() - 86400000) } }).limit(4).sort({ startDate: 1 }),
      Ticket.find({ studentId, status: 'Valid' }).limit(5).sort({ createdAt: -1 }),
      Order.find({ userId }).limit(5).sort({ createdAt: -1 }),
      Notification.countDocuments({ userId, read: false })
    ]);

    // Populate tickets with event details
    const ticketEventIds = activeTickets.map(t => t.eventId);
    const events = await Event.find({ eventId: { $in: ticketEventIds } });
    const eventMap = Object.fromEntries(events.map(e => [e.eventId, e]));

    const populatedTickets = activeTickets.map(t => ({
      ...t.toObject(),
      event: eventMap[t.eventId] || null
    }));

    return sendSuccess(res, 'Student dashboard metrics loaded', {
      metrics: {
        activeMembershipsCount: activeMemberships.length,
        activeTicketsCount: activeTickets.length,
        totalOrdersCount: recentOrders.length,
        unreadNotificationsCount
      },
      activeMemberships,
      upcomingEvents,
      activeTickets: populatedTickets,
      recentOrders
    });
  } catch (err) {
    next(err);
  }
};

// Volunteer Dashboard Aggregate
exports.getVolunteerDashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [
      pendingTasks,
      completedTasks,
      myExpenses,
      myCollections,
      fundraisers,
      unreadNotificationsCount
    ] = await Promise.all([
      Task.find({ assignedVolunteerId: userId, status: { $in: ['Pending', 'In Progress'] } }).sort({ dueDate: 1 }),
      Task.find({ assignedVolunteerId: userId, status: 'Completed' }),
      Expense.find({ submittedBy: userId }).sort({ createdAt: -1 }),
      Collection.find({ volunteerId: userId }).sort({ createdAt: -1 }),
      Fundraiser.find({ assignedVolunteers: userId, status: 'Active' }),
      Notification.countDocuments({ userId, read: false })
    ]);

    let totalPendingExpenseAmount = 0;
    let totalReimbursedAmount = 0;
    myExpenses.forEach(e => {
      if (e.status === 'Pending' || e.status === 'Under Review' || e.status === 'Approved') totalPendingExpenseAmount += e.amount;
      if (e.status === 'Reimbursed') totalReimbursedAmount += e.amount;
    });

    let totalVerifiedCollections = 0;
    myCollections.forEach(c => {
      if (c.status === 'Verified') totalVerifiedCollections += c.amount;
    });

    return sendSuccess(res, 'Volunteer dashboard metrics loaded', {
      metrics: {
        pendingTasksCount: pendingTasks.length,
        completedTasksCount: completedTasks.length,
        activeFundraisersCount: fundraisers.length,
        pendingExpenseAmount: totalPendingExpenseAmount,
        verifiedCollectionsAmount: totalVerifiedCollections,
        unreadNotificationsCount
      },
      pendingTasks,
      recentExpenses: myExpenses.slice(0, 5),
      recentCollections: myCollections.slice(0, 5),
      assignedFundraisers: fundraisers
    });
  } catch (err) {
    next(err);
  }
};

// Admin Dashboard Aggregate
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalVolunteers,
      totalOrganizations,
      totalEvents,
      pendingApprovalEvents,
      totalOrders,
      transactions,
      pendingExpenses
    ] = await Promise.all([
      User.countDocuments({ status: 'Active' }),
      User.countDocuments({ role: 'STUDENT', status: 'Active' }),
      User.countDocuments({ role: 'VOLUNTEER', status: 'Active' }),
      Organization.countDocuments({ status: 'Active' }),
      Event.countDocuments(),
      Event.countDocuments({ status: 'Pending Approval' }),
      Order.countDocuments(),
      Transaction.find({ status: 'Verified' }),
      Expense.countDocuments({ status: 'Pending' })
    ]);

    let totalRevenue = 0;
    let totalExpenses = 0;
    transactions.forEach(t => {
      if (t.type === 'INCOME') totalRevenue += t.amount;
      else totalExpenses += t.amount;
    });

    const recentEvents = await Event.find().sort({ createdAt: -1 }).limit(5);
    const pendingEventsList = await Event.find({ status: 'Pending Approval' }).limit(5);

    return sendSuccess(res, 'Admin dashboard metrics loaded', {
      metrics: {
        totalUsers,
        totalStudents,
        totalVolunteers,
        totalOrganizations,
        totalEvents,
        pendingApprovalEvents,
        totalOrders,
        pendingExpenses,
        totalRevenue,
        totalExpenses,
        netBalance: totalRevenue - totalExpenses
      },
      recentEvents,
      pendingEventsList
    });
  } catch (err) {
    next(err);
  }
};

// Treasurer Dashboard Aggregate
exports.getTreasurerDashboard = async (req, res, next) => {
  try {
    const [
      transactions,
      pendingExpenses,
      pendingReimbursements,
      activeBudgets,
      activeFundraisers,
      pendingCollections
    ] = await Promise.all([
      Transaction.find({ status: 'Verified' }).sort({ createdAt: -1 }),
      Expense.find({ status: 'Pending' }).sort({ createdAt: -1 }),
      Reimbursement.find({ status: 'Approved' }).sort({ createdAt: -1 }),
      Budget.find({ status: 'Active' }),
      Fundraiser.find({ status: 'Active' }),
      Collection.find({ status: 'Pending' }).sort({ createdAt: -1 })
    ]);

    let totalIncome = 0;
    let totalExpenseOutflow = 0;
    let totalReimbursementOutflow = 0;

    transactions.forEach(t => {
      if (t.type === 'INCOME') totalIncome += t.amount;
      else if (t.type === 'EXPENSE') totalExpenseOutflow += t.amount;
      else if (t.type === 'REIMBURSEMENT') totalReimbursementOutflow += t.amount;
    });

    const netBalance = totalIncome - (totalExpenseOutflow + totalReimbursementOutflow);

    let totalAllocatedBudget = 0;
    let totalUsedBudget = 0;
    activeBudgets.forEach(b => {
      totalAllocatedBudget += b.allocatedAmount;
      totalUsedBudget += (b.usedAmount || 0);
    });

    return sendSuccess(res, 'Treasurer dashboard metrics loaded', {
      metrics: {
        currentBalance: netBalance,
        totalIncome,
        totalExpenses: totalExpenseOutflow + totalReimbursementOutflow,
        pendingExpensesCount: pendingExpenses.length,
        pendingReimbursementsCount: pendingReimbursements.length,
        pendingCollectionsCount: pendingCollections.length,
        activeBudgetsCount: activeBudgets.length,
        totalAllocatedBudget,
        totalUsedBudget,
        budgetRemaining: totalAllocatedBudget - totalUsedBudget
      },
      recentTransactions: transactions.slice(0, 8),
      pendingExpenses: pendingExpenses.slice(0, 5),
      pendingReimbursements: pendingReimbursements.slice(0, 5),
      pendingCollections: pendingCollections.slice(0, 5),
      activeBudgets
    });
  } catch (err) {
    next(err);
  }
};

// Organizer Dashboard Aggregate
exports.getOrganizerDashboard = async (req, res, next) => {
  try {
    const organizerId = req.user.userId;
    const organizationId = req.user.organizationId;
    
    let organization = null;
    if (organizationId) {
      organization = await Organization.findOne({ organizationId });
    }

    // Find events by org or by organizer userId
    const orgFilter = organizationId ? { organizationId } : { organizerId };

    const [
      myEvents,
      myMemberships
    ] = await Promise.all([
      Event.find(orgFilter).sort({ startDate: 1 }),
      organizationId ? Membership.find({ organizationId, status: { $in: ['Active', 'active'] } }) : []
    ]);

    const eventIds = myEvents.map(e => e.eventId);

    const [registrations, attendances, issuedTickets] = await Promise.all([
      eventIds.length > 0 ? Registration.find({ eventId: { $in: eventIds } }) : [],
      eventIds.length > 0 ? Attendance.find({ eventId: { $in: eventIds } }) : [],
      eventIds.length > 0 ? Ticket.find({ eventId: { $in: eventIds } }) : []
    ]);

    // Enrich events with counts
    const regByEvent = {};
    registrations.forEach(r => { regByEvent[r.eventId] = (regByEvent[r.eventId] || 0) + 1; });
    const attByEvent = {};
    attendances.forEach(a => { attByEvent[a.eventId] = (attByEvent[a.eventId] || 0) + 1; });

    const enrichedEvents = myEvents.map(e => ({
      ...e.toObject(),
      registeredCount: regByEvent[e.eventId] || 0,
      attendanceCount: attByEvent[e.eventId] || 0
    }));

    // Populate user info for recent registrations
    const userIds = [...new Set(registrations.slice(0, 10).map(r => r.userId))];
    const users = await User.find({ userId: { $in: userIds } }, 'userId name email').lean();
    const userMap = Object.fromEntries(users.map(u => [u.userId, u]));
    const eventMap = Object.fromEntries(myEvents.map(e => [e.eventId, e]));
    const recentRegistrations = registrations.slice(0, 10).map(r => ({
      ...r.toObject(),
      user: userMap[r.userId] || null,
      event: eventMap[r.eventId] || null
    }));

    return sendSuccess(res, 'Organizer dashboard metrics loaded', {
      metrics: {
        totalEventsCount: myEvents.length,
        activeMembersCount: myMemberships.length,
        totalRegistrationsCount: registrations.length,
        totalAttendanceCount: attendances.length,
        totalTicketsIssued: issuedTickets.length,
        attendanceRate: registrations.length > 0 ? ((attendances.length / registrations.length) * 100).toFixed(1) + '%' : '0%'
      },
      organization,
      myEvents: enrichedEvents.slice(0, 6),
      recentRegistrations
    });
  } catch (err) {
    next(err);
  }
};
