const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  validateRegistration: validateManagerSignup, 
  validateLogin: validateManagerLogin, 
  authenticate: authenticateManager,
  authorizeManager 
} = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a hotel manager (Step 1: Send OTP)
// @access  Public
router.post('/register', validateManagerSignup, authController.register);

// @route   POST /api/auth/verify-registration
// @desc    Verify OTP and complete registration
// @access  Public
router.post('/verify-registration', authController.verifyRegistration);

// @route   POST /api/auth/login
// @desc    Authenticate manager (Step 1: Send OTP)
// @access  Public
router.post('/login', validateManagerLogin, authController.login);

// @route   POST /api/auth/verify-login
// @desc    Verify OTP and complete login
// @access  Public
router.post('/verify-login', authController.verifyLogin);

// @route   POST /api/auth/logout
// @desc    Logout manager / clear cookie
// @access  Private
router.post('/logout', authenticateManager, authController.logout);

// @route   GET /api/auth/me
// @desc    Get current logged in manager
// @access  Private
router.get('/me', authenticateManager, authController.getMe);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - Send OTP
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/auth/verify-password-reset
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-password-reset', authController.verifyPasswordReset);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP verification
// @access  Public
router.post('/reset-password', authController.resetPassword);

module.exports = router;
