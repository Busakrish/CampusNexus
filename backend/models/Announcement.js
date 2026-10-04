const mongoose = require('mongoose');
const { announcement: generateAnnouncementId } = require('../utils/idGenerator');

const AnnouncementSchema = new mongoose.Schema({
  announcementId: {
    type: String,
    required: true,
    unique: true,
    default: generateAnnouncementId,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required']
  },
  audience: {
    type: String,
    enum: ['All', 'Students', 'Volunteers', 'Treasurer', 'Organizers'],
    default: 'All',
    index: true
  },
  eventId: {
    type: String,
    default: null,
    index: true
  },
  scope: {
    type: String,
    enum: ['CAMPUS', 'EVENT', 'ORGANIZATION'],
    default: 'CAMPUS'
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Published', 'Archived'],
    default: 'Published',
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
