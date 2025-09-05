const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const ticketCleanupService = require('./services/ticketCleanupService');

// Get port from environment and store in Express.
const port = process.env.PORT || 5050;
app.set('port', port);

// Create HTTP server.
const server = http.createServer(app);

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // List of allowed origins for WebSocket connections
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://hotelflow-frontend-three.vercel.app'
      ];
      
      // Check if origin is allowed
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Log blocked origins for debugging
        console.log('🚫 WebSocket CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'], // Allow both websocket and polling
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false,
  serveClient: false,
  path: '/socket.io/'
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('🔗 New WebSocket connection from:', socket.handshake.address);
  console.log('🔗 Socket ID:', socket.id);
  console.log('🔗 Headers:', socket.handshake.headers);

  // Join managers room for real-time ticket notifications
  socket.on('joinManagersRoom', (managerId) => {
    socket.join('managers');
    console.log(`👥 Manager ${managerId} joined managers room for real-time notifications`);
  });

  // Join room for ticket updates
  socket.on('joinTicketRoom', (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`User joined ticket room: ticket_${ticketId}`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('❌ User disconnected:', reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

// Make io accessible in app
app.set('io', io);

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('WebSocket server is running');
  
  // Log Socket.IO CORS configuration
  console.log('🔌 Socket.IO CORS: All origins allowed');
  
  // Start the ticket cleanup service
  ticketCleanupService.start();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  ticketCleanupService.stop();
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
