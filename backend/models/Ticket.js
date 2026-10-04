const mongoose = require('mongoose');
const { ticket: generateTicketId } = require('../utils/idGenerator');

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    default: generateTicketId,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  registrationId: {
    type: String,
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  ticketType: {
    type: String,
    default: 'Standard Admission'
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid/Verified', 'Failed', 'Refunded/Cancelled'],
    default: 'Paid/Verified',
    index: true
  },
  qrCode: {
    type: String,
    required: true
  },
  qrData: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Valid', 'Used', 'Cancelled', 'Expired'],
    default: 'Valid',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket', TicketSchema);
