const ErrorResponse = require('../utils/errorResponse');

// Error handler middleware
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err.stack);
  
  // Handle CORS errors specifically (should not occur in testing mode)
  if (err.message === 'Not allowed by CORS') {
    console.error('🚫 CORS Error (unexpected in testing mode):', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(403).json({
      success: false,
      error: 'CORS: Origin not allowed (unexpected in testing mode)',
      details: {
        origin: req.headers.origin,
        note: 'CORS is configured to allow all origins'
      }
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Not authorized';
    error = new ErrorResponse(message, 401);
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Session expired, please login again';
    error = new ErrorResponse(message, 401);
  }

  // Default to 500 server error
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

// Async handler to wrap async/await and handle errors
exports.asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
