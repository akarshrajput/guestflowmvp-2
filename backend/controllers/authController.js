const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/emailService');

// Initialize Supabase client with email confirmation disabled
let supabase;
try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Supabase environment variables missing:', {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY
    });
  } else {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        autoConfirmEmail: true,
        detectSessionInUrl: false,
      }
    });
    console.log('✅ Supabase client initialized successfully');
  }
} catch (supabaseError) {
  console.error('❌ Failed to initialize Supabase client:', supabaseError);
}

// @desc    Register a hotel manager (Step 1: Send OTP)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, hotelName, email, password } = req.body;

    // Validate input
    if (!name || !hotelName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, hotel name, email, and password'
      });
    }

    // Check if user already exists in our database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate and send OTP
    console.log('Creating OTP for email:', email);
    const otpRecord = await OTP.createOTP(email, 'registration', 10);
    console.log('OTP created:', otpRecord.otp);
    
    try {
      console.log('Sending OTP email to:', email);
      await sendOTPEmail(email, otpRecord.otp, 'registration');
      console.log('OTP email sent successfully');
    } catch (emailError) {
      // If email fails, delete the OTP and return error
      await OTP.findByIdAndDelete(otpRecord._id);
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

    // Store registration data temporarily (you might want to use Redis in production)
    // For now, we'll store it in the OTP record
    console.log('Storing registration data in OTP record:', { name, hotelName, email, password: '***' });
    
    try {
      otpRecord.registrationData = { name, hotelName, email, password };
      await otpRecord.save();
      console.log('Registration data stored successfully');
    } catch (saveError) {
      console.error('Failed to save registration data:', saveError);
      // Delete the OTP record if we can't save the data
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to process registration data. Please try again.',
        error: process.env.NODE_ENV === 'development' ? saveError.message : undefined
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox and enter the 6-digit code.',
      email: email,
      requiresOTP: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Log more details for debugging
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify OTP and complete registration
// @route   POST /api/auth/verify-registration
// @access  Public
exports.verifyRegistration = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('Verifying registration OTP:', { email, otp });

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'registration');
    console.log('OTP verification result:', verificationResult);
    
    if (!verificationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Get the OTP record with registration data from verification result
    const otpRecord = verificationResult.otpRecord;
    console.log('OTP record from verification:', otpRecord ? 'Yes' : 'No');
    console.log('OTP record has registration data:', otpRecord?.registrationData ? 'Yes' : 'No');
    
    if (!otpRecord || !otpRecord.registrationData) {
      return res.status(400).json({
        success: false,
        message: 'Registration data not found. Please try registering again.'
      });
    }

    const { name, hotelName, email: userEmail, password } = otpRecord.registrationData;

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userEmail,
      password,
      options: {
        data: {
          name,
          hotel_name: hotelName,
          email_confirm: true
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ 
        success: false,
        message: authError.message 
      });
    }

    // Create user in our database
    const user = await User.create({
      name,
      hotelName,
      email: userEmail,
      supabaseId: authData.user.id,
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        hotelName: user.hotelName
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Clean up OTP record
    await OTP.findByIdAndDelete(otpRecord._id);

    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        hotelName: user.hotelName,
        email: user.email
      },
      token,
      message: 'Registration completed successfully!'
    });

  } catch (error) {
    console.error('Registration verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Authenticate hotel manager (Step 1: Send OTP)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // First, verify credentials with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Login error:', authError);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: process.env.NODE_ENV === 'development' ? authError.message : undefined
      });
    }

    // Find user in our database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate and send OTP
    const otpRecord = await OTP.createOTP(email, 'login', 10);
    
    try {
      await sendOTPEmail(email, otpRecord.otp, 'login');
    } catch (emailError) {
      // If email fails, delete the OTP and return error
      await OTP.findByIdAndDelete(otpRecord._id);
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox and enter the 6-digit code.',
      email: email,
      requiresOTP: true
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify OTP and complete login
// @route   POST /api/auth/verify-login
// @access  Public
exports.verifyLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'login');
    
    if (!verificationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Find user in our database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        hotelName: user.hotelName
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Clean up OTP record
    await OTP.findOneAndDelete({ email, type: 'login', isUsed: true });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        hotelName: user.hotelName,
        email: user.email,
      },
      token,
      message: 'Login successful!'
    });

  } catch (error) {
    console.error('Login verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during login verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout hotel manager
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error logging out',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current logged in manager
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // The user is already attached to the request by the auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Get fresh user data from database
    const user = await User.findById(req.user.userId).select('-__v -createdAt -updatedAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        hotelName: user.hotelName,
        email: user.email,
        isActive: user.isActive
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address',
      });
    }

    // Generate and send OTP
    const otpRecord = await OTP.createOTP(email, 'password_reset', 10);
    
    try {
      await sendOTPEmail(email, otpRecord.otp, 'password_reset');
    } catch (emailError) {
      // If email fails, delete the OTP and return error
      await OTP.findByIdAndDelete(otpRecord._id);
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset verification code sent to your email. Please check your inbox.',
      email: email,
      requiresOTP: true
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-password-reset
// @access  Public
exports.verifyPasswordReset = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'password_reset');
    
    if (!verificationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Generate a temporary reset token
    const resetToken = jwt.sign(
      { email, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      resetToken,
      email
    });
  } catch (error) {
    console.error('Password reset verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reset password with OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
      });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token',
      });
    }

    const { email } = decoded;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update password in Supabase
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.supabaseId,
      { password: password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(400).json({
        success: false,
        message: 'Failed to update password',
        error: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      });
    }

    // Clean up any remaining OTP records for this user
    await OTP.deleteMany({ email, type: 'password_reset' });
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
