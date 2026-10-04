const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { user: generateUserId } = require('../utils/idGenerator');

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: generateUserId,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['STUDENT', 'VOLUNTEER', 'ADMIN', 'TREASURER', 'ORGANIZER'],
    required: true,
    default: 'STUDENT',
    index: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active',
    index: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  organizationId: {
    type: String,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Password Hash middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare Password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
