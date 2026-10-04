const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Direct JWT Login (No OTP)
router.post('/login', authController.login);

// Email Verification OTP Registration Flow
router.post('/register', authController.registerInitiate);
router.post('/register-initiate', authController.registerInitiate);
router.post('/verify-registration-otp', authController.verifyRegistrationOtp);
router.post('/verify-otp', authController.verifyRegistrationOtp);
router.post('/resend-registration-otp', authController.resendRegistrationOtp);
router.post('/resend-otp', authController.resendRegistrationOtp);

// Profile
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;
