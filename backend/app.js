const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import error handler
const { errorHandler } = require('./middleware/errorMiddleware');

// Import OTP cleanup service
const { initializeOTPCleanup } = require('./services/otpCleanupService');

// Initialize Express app
const app = express();

// Middleware
// ✅ Enable CORS with proper configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://hotelflow-frontend-three.vercel.app',
      'https://hotelflow-frontend-three.vercel.app'
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log blocked origins for debugging
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and/or Anon Key not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Make supabase available in app
app.set('supabase', supabase);

// Health check endpoint with CORS testing
app.get('/health', (req, res) => {
  console.log('🏥 Health check request:', {
    origin: req.headers.origin,
    method: req.method,
    userAgent: req.headers['user-agent']
  });
  
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      allowed: true
    }
  });
});

// Test registration endpoint for debugging
app.post('/test-register', (req, res) => {
  console.log('🧪 Test registration request:', {
    body: req.body,
    headers: req.headers
  });
  
  try {
    const { name, hotelName, email, password } = req.body;
    
    // Test data validation
    if (!name || !hotelName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: { name: !!name, hotelName: !!hotelName, email: !!email, password: !!password }
      });
    }
    
    // Test data structure
    const testData = { name, hotelName, email, password: '***' };
    console.log('✅ Test data structure valid:', testData);
    
    res.json({
      success: true,
      message: 'Test registration data received successfully',
      data: testData
    });
    
  } catch (error) {
    console.error('❌ Test registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Test registration failed',
      error: error.message
    });
  }
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    maxPoolSize: 10, // Maintain up to 10 socket connections
    retryWrites: true,
    w: 'majority'
  })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    // Initialize OTP cleanup service after MongoDB connection
    initializeOTPCleanup();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Backend only serves API routes - frontend is deployed separately

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'GuestFlow API is running',
    timestamp: new Date().toISOString(),
  });
});

// Test email configuration endpoint
app.get('/test-email', async (req, res) => {
  try {
    const { sendOTPEmail } = require('./utils/emailService');
    await sendOTPEmail('test@example.com', '123456', 'login');
    res.json({ success: true, message: 'Email service is working' });
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email service failed',
      error: error.message 
    });
  }
});

// Test OTP database endpoint
app.get('/test-otp', async (req, res) => {
  try {
    const OTP = require('./models/OTP');
    const otps = await OTP.find({}).sort({ createdAt: -1 }).limit(5);
    res.json({ 
      success: true, 
      message: 'OTP database check',
      otps: otps.map(otp => ({
        email: otp.email,
        otp: otp.otp,
        type: otp.type,
        isUsed: otp.isUsed,
        expiresAt: otp.expiresAt,
        createdAt: otp.createdAt
      }))
    });
  } catch (error) {
    console.error('OTP test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'OTP database check failed',
      error: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to GuestFlow API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Only start the server if this file is run directly (not required as a module)
if (require.main === module) {
  const PORT = process.env.PORT || 5050;
  app.listen(PORT, () => {
    console.log(`App server running on port ${PORT}`);
  });
} else {
  // Export the app for server.js to use
  module.exports = app;
}

// Export the configured app for Netlify functions
module.exports = app;
