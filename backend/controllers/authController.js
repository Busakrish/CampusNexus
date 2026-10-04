const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Otp = require('../models/Otp');
const { sendRegistrationOtpEmail } = require('../services/emailService');
const { sendSuccess, sendError } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_campusnexus_jwt_secret_key_2026_x99a!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const RATE_LIMIT_COOLDOWN_SECONDS = 60;
const MAX_OTP_REQUESTS_PER_WINDOW = 5;
const MAX_FAILED_VERIFICATION_ATTEMPTS = 5;

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.userId, email: user.email, role: user.role, organizationId: user.organizationId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * 1. User Login: Direct Email + Password verification returning JWT
 * (No OTP required during login)
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide email and password.', 400, 'CREDENTIALS_REQUIRED');
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status === 'Suspended') {
      return sendError(res, 'Your account has been suspended. Please contact the administrator.', 403, 'ACCOUNT_SUSPENDED');
    }

    if (user.status === 'Inactive') {
      return sendError(res, 'Your account is inactive.', 403, 'ACCOUNT_INACTIVE');
    }

    // Generate JWT token directly
    const token = generateToken(user);
    let studentProfile = null;
    if (user.role === 'STUDENT') {
      studentProfile = await StudentProfile.findOne({ userId: user.userId });
    }

    return sendSuccess(res, 'Login successful', {
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        organizationId: user.organizationId,
        studentProfile
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Registration Step 1: Initiate Student Registration
 * Checks details, applies mail rate limits, generates 6-digit OTP, and dispatches via Nodemailer
 */
exports.registerInitiate = async (req, res, next) => {
  try {
    const { name, email, password, role = 'STUDENT', studentNumber, major, department, yearOfStudy, phone } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Name, email and password are required.', 400, 'VALIDATION_FAILED');
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters.', 400, 'PASSWORD_TOO_SHORT');
    }

    const cleanEmail = email.toLowerCase().trim();
    const requestedRole = role.toUpperCase();

    if (['ADMIN', 'TREASURER'].includes(requestedRole)) {
      return sendError(res, 'Administrator or Treasurer accounts can only be created by system admins.', 403, 'FORBIDDEN_REGISTRATION');
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists. Please sign in instead.', 409, 'USER_ALREADY_EXISTS');
    }

    // Rate Limiting & Cooldown Check
    const existingOtp = await Otp.findOne({ email: cleanEmail, purpose: 'REGISTER' });
    if (existingOtp) {
      const now = Date.now();
      const lastSentTime = new Date(existingOtp.lastSentAt).getTime();
      const secondsSinceLast = Math.floor((now - lastSentTime) / 1000);

      // Enforce 60s cooldown
      if (secondsSinceLast < RATE_LIMIT_COOLDOWN_SECONDS) {
        const remainingCooldown = RATE_LIMIT_COOLDOWN_SECONDS - secondsSinceLast;
        return sendError(
          res,
          `Please wait ${remainingCooldown} seconds before requesting another verification code.`,
          429,
          'RATE_LIMIT_COOLDOWN'
        );
      }

      // Enforce max requests limit per window
      if (existingOtp.requestCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
        return sendError(
          res,
          'Maximum verification attempts reached for this email. Please try again after 15 minutes.',
          429,
          'MAX_REQUESTS_EXCEEDED'
        );
      }
    }

    // Generate 6-digit secure numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Prepare pending registration payload
    const pendingData = {
      name,
      email: cleanEmail,
      password,
      role: requestedRole,
      studentNumber: studentNumber || `STU-${Math.floor(100000 + Math.random() * 900000)}`,
      major: major || 'General',
      department: department || 'General',
      yearOfStudy: parseInt(yearOfStudy, 10) || 1,
      phone: phone || ''
    };

    // Save or update OTP record
    await Otp.deleteMany({ email: cleanEmail, purpose: 'REGISTER' });

    await Otp.create({
      email: cleanEmail,
      otp: generatedOtp,
      purpose: 'REGISTER',
      pendingData,
      attempts: 0,
      requestCount: existingOtp ? (existingOtp.requestCount + 1) : 1,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send email using Nodemailer
    await sendRegistrationOtpEmail(cleanEmail, generatedOtp, name);

    return sendSuccess(res, 'Verification code sent to your email address.', {
      otpRequired: true,
      email: cleanEmail,
      cooldownSeconds: RATE_LIMIT_COOLDOWN_SECONDS
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Registration Step 2: Verify 6-Digit Email OTP and Create User Account
 */
exports.verifyRegistrationOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendError(res, 'Email and 6-digit verification code are required.', 400, 'OTP_REQUIRED');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      purpose: 'REGISTER'
    });

    if (!otpRecord) {
      return sendError(res, 'No pending registration found for this email. Please initiate registration.', 404, 'REGISTRATION_NOT_FOUND');
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return sendError(res, 'Verification code has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    // Check brute-force attempts
    if (otpRecord.attempts >= MAX_FAILED_VERIFICATION_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return sendError(res, 'Too many incorrect attempts. Please initiate registration again.', 429, 'MAX_ATTEMPTS_EXCEEDED');
    }

    if (otpRecord.otp !== cleanOtp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = MAX_FAILED_VERIFICATION_ATTEMPTS - otpRecord.attempts;
      return sendError(res, `Invalid verification code. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    // OTP is valid! Create the user in database
    const { pendingData } = otpRecord;
    if (!pendingData) {
      return sendError(res, 'Registration data is missing. Please register again.', 400, 'DATA_CORRUPTED');
    }

    // Double check email uniqueness
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return sendError(res, 'An account with this email already exists.', 409, 'USER_ALREADY_EXISTS');
    }

    const user = await User.create({
      name: pendingData.name,
      email: cleanEmail,
      password: pendingData.password,
      role: pendingData.role || 'STUDENT',
      phone: pendingData.phone || '',
      status: 'Active'
    });

    let studentProfile = null;
    if (user.role === 'STUDENT') {
      studentProfile = await StudentProfile.create({
        userId: user.userId,
        studentNumber: pendingData.studentNumber,
        major: pendingData.major,
        department: pendingData.department,
        yearOfStudy: pendingData.yearOfStudy
      });
    }

    // Clean up OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate JWT
    const token = generateToken(user);

    return sendSuccess(res, 'Email verified! Account created successfully.', {
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        organizationId: user.organizationId,
        studentProfile
      }
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Resend Registration OTP (with 60-second cooldown & rate limiting)
 */
exports.resendRegistrationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, 'Email address is required.', 400, 'EMAIL_REQUIRED');
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({ email: cleanEmail, purpose: 'REGISTER' });

    if (!otpRecord) {
      return sendError(res, 'No pending registration found for this email.', 404, 'REGISTRATION_NOT_FOUND');
    }

    const now = Date.now();
    const lastSentTime = new Date(otpRecord.lastSentAt).getTime();
    const secondsSinceLast = Math.floor((now - lastSentTime) / 1000);

    if (secondsSinceLast < RATE_LIMIT_COOLDOWN_SECONDS) {
      const remainingCooldown = RATE_LIMIT_COOLDOWN_SECONDS - secondsSinceLast;
      return sendError(
        res,
        `Please wait ${remainingCooldown} seconds before requesting a new verification code.`,
        429,
        'RATE_LIMIT_COOLDOWN'
      );
    }

    if (otpRecord.requestCount >= MAX_OTP_REQUESTS_PER_WINDOW) {
      return sendError(
        res,
        'Maximum verification requests reached for this email. Please try again after 15 minutes.',
        429,
        'MAX_REQUESTS_EXCEEDED'
      );
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpRecord.otp = newOtp;
    otpRecord.requestCount += 1;
    otpRecord.attempts = 0;
    otpRecord.lastSentAt = new Date();
    otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await otpRecord.save();

    await sendRegistrationOtpEmail(cleanEmail, newOtp, otpRecord.pendingData ? otpRecord.pendingData.name : 'Student');

    return sendSuccess(res, 'A new verification code has been dispatched to your email.', {
      email: cleanEmail,
      cooldownSeconds: RATE_LIMIT_COOLDOWN_SECONDS
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Direct Register (Legacy / Direct programmatic support for internal seeds/tests)
 */
exports.register = async (req, res, next) => {
  return exports.registerInitiate(req, res, next);
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return sendError(res, 'User not found.', 404, 'USER_NOT_FOUND');
    }

    let studentProfile = null;
    if (user.role === 'STUDENT') {
      studentProfile = await StudentProfile.findOne({ userId: user.userId });
    }

    return sendSuccess(res, 'User profile retrieved', {
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        avatar: user.avatar,
        organizationId: user.organizationId,
        studentProfile
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, major, department, yearOfStudy, emergencyContact } = req.body;
    
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return sendError(res, 'User not found.', 404, 'USER_NOT_FOUND');

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    if (user.role === 'STUDENT') {
      let profile = await StudentProfile.findOne({ userId: user.userId });
      if (!profile) {
        profile = new StudentProfile({ userId: user.userId, studentNumber: `STU-${Math.floor(100000 + Math.random() * 900000)}` });
      }
      if (major) profile.major = major;
      if (department) profile.department = department;
      if (yearOfStudy) profile.yearOfStudy = yearOfStudy;
      if (emergencyContact) profile.emergencyContact = emergencyContact;
      await profile.save();
    }

    return sendSuccess(res, 'Profile updated successfully', { user });
  } catch (err) {
    next(err);
  }
};
