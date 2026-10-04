const mongoose = require('mongoose');
const { organization: generateOrgId } = require('../utils/idGenerator');

const OrganizationSchema = new mongoose.Schema({
  organizationId: {
    type: String,
    required: true,
    unique: true,
    default: generateOrgId,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Organization code is required'],
    uppercase: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Academic', 'Cultural', 'Sports', 'Technology', 'Community', 'Arts', 'General'],
    default: 'General'
  },
  leadOrganizerId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Pending'],
    default: 'Active',
    index: true
  },
  logo: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  membershipFee: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organization', OrganizationSchema);
