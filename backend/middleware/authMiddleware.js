const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Alias for backward compatibility
exports.authenticateManager = exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify the JWT token using our local secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify the user exists in our database
      const user = await User.findOne({ _id: decoded.userId, isActive: true });
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not found or account is inactive' 
        });
      }

      // Add user to request object
      req.user = {
        userId: user._id,  // Add user ID for database lookups
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        hotelName: user.hotelName
      };
      
      return next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token',
        error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Middleware to check if user has manager role
 * Must be used after authenticate middleware
 */
exports.authorizeManager = (req, res, next) => {
  // Since we only have managers in our system, this is just a placeholder
  // In a more complex system, we would check user roles here
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized to access this route' 
    });
  }
  
  // If we need to add more granular permissions in the future:
  // if (req.user.role !== 'manager') {
  //   return res.status(403).json({ 
  //     success: false,
  //     message: 'Not authorized to access this resource' 
  //   });
  // }
  
  next();
};

// Alias for backward compatibility
exports.validateManagerSignup = exports.validateRegistration;

// Validation middleware for manager login
exports.validateManagerLogin = [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
];

// Validation middleware for manager registration
exports.validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('hotelName')
    .trim()
    .notEmpty()
    .withMessage('Hotel name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Hotel name must be between 2 and 100 characters'),
    
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  },
];

// Validation middleware for manager login
exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  },
];

// Validation middleware for forgot password
exports.validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email')
    .normalizeEmail(),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  },
];

// Validation middleware for reset password
exports.validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  },
];
