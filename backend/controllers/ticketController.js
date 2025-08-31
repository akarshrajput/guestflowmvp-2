const Ticket = require('../models/Ticket');
const Room = require('../models/Room');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');
const { createGuestTicket } = require('./chatController');

// Lightweight category classifier (kept local to avoid cross-deps)
// Returns one of: reception, housekeeping, porter, concierge, service_fb, maintenance
const classifyCategoryFast = (text = '') => {
  const t = String(text || '').toLowerCase();
  if (/(clean|towel|linen|sheet|housekeep|trash|amenit)/.test(t)) return 'housekeeping';
  if (/(luggage|baggage|bags|bell ?(boy|hop)|porter|trolley|cart|carry|help with bags)/.test(t)) return 'porter';
  if (/(break|broken|leak|ac|heater|hvac|power|door|plumb|fix|repair|not working|maintenance)/.test(t)) return 'maintenance';
  if (/(food|breakfast|dinner|lunch|menu|order|restaurant|bar|drink|beverage|room service)/.test(t)) return 'service_fb';
  if (/(taxi|uber|cab|transport|reservation|book|tour|attraction|recommend|directions|concierge)/.test(t)) return 'concierge';
  if (/(check[- ]?in|check[- ]?out|bill|payment|key|card|front desk|reception)/.test(t)) return 'reception';
  return 'reception';
};

// Helper function to emit ticket updates
const emitTicketUpdate = (req, ticket, event = 'ticketUpdated') => {
  if (req.app.get('io')) {
    const io = req.app.get('io');
    io.to(`ticket_${ticket._id}`).emit(event, ticket);
  }
};

// @desc    Create a new ticket (guest request)
// @route   POST /api/tickets
// @access  Public
exports.createTicket = [
  // Input validation
  [
    body('roomId', 'Room ID is required').notEmpty().isMongoId(),
    body('message', 'Message content is required').notEmpty().trim(),
    body('guestName', 'Guest name is required').trim().notEmpty(),
    body('guestContact', 'Guest contact information is required').optional().trim(),
    body('priority', 'Priority must be low, medium, or high').optional().isIn(['low', 'medium', 'high']),
  ],
  
  // Process request
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { roomId, message: content, guestName, guestContact, priority = 'medium', subject, category: incomingCategory } = req.body;

      // Verify room exists and is active
      const room = await Room.findOne({ 
        _id: roomId,
        isActive: true 
      });
      
      if (!room) {
        return next(new ErrorResponse('Invalid room or room not found', 404));
      }

      // Determine category from provided value or heuristics on subject/message
      const resolvedCategory = incomingCategory || classifyCategoryFast(`${subject || ''} ${content || ''}`);

      // Create new ticket with all required fields
      const ticketData = {
        room: roomId,
        roomNumber: room.number, // Get room number from the found room
        manager: room.manager,   // Get manager from the room
        category: resolvedCategory,
        guestInfo: {
          name: guestName,
          contact: guestContact || 'Not provided',
          email: req.body.email || 'not-provided@example.com'
        },
        status: 'raised',
        priority: priority || 'medium',
        subject: subject || 'No subject',
        messages: [{
          content,
          sender: 'guest',
          senderName: guestName,
        }],
      };

      const ticket = await Ticket.create(ticketData);

      // Populate room details for response
      await ticket.populate('room', 'number type floor');
      
      // Notify managers about new ticket immediately via WebSocket
      if (req.app.get('io')) {
        const io = req.app.get('io');
        // Emit to all managers (they should join 'managers' room)
        io.to('managers').emit('newTicket', {
          ticket,
          message: `New ticket raised by ${guestName} in Room ${room.number}`,
          timestamp: new Date()
        });
        console.log(`📨 New ticket notification sent to managers for Room ${room.number}`);
      }

      res.status(201).json({
        success: true,
        data: ticket
      });

    } catch (error) {
      console.error('Create ticket error:', error);
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
];

// @desc    Get all tickets with filtering (for manager)
// @route   GET /api/tickets
// @access  Private/Manager
exports.getTickets = async (req, res, next) => {
  try {
    const { 
      status,
      roomId,
      sort = '-createdAt',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { manager: req.user.userId };
    
    if (status) query.status = status;
    if (roomId) query.room = roomId;

    // Execute query with pagination
    const tickets = await Ticket.find(query)
      .populate('room', 'number type floor')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Ticket.countDocuments(query);

    // Get ticket counts by status
    const raisedCount = await Ticket.countDocuments({ ...query, status: 'raised' });
    const inProgressCount = await Ticket.countDocuments({ ...query, status: 'in_progress' });
    const completedCount = await Ticket.countDocuments({ ...query, status: 'completed' });

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      stats: {
        raised: raisedCount,
        in_progress: inProgressCount,
        completed: completedCount,
        total
      },
      data: tickets
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private/Manager
exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      manager: req.user.userId
    }).populate('room', 'number type floor');

    if (!ticket) {
      return next(new ErrorResponse('Ticket not found', 404));
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Update ticket status
// @route   PUT /api/tickets/:id/status
// @access  Private/Manager
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['raised', 'in_progress', 'completed'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }

    let ticket = await Ticket.findOne({
      _id: req.params.id,
      manager: req.user.userId
    });

    if (!ticket) {
      return next(new ErrorResponse('Ticket not found', 404));
    }

    ticket.status = status;
    await ticket.save();
    await ticket.populate('room', 'number type floor');
    
    // Notify about status update
    emitTicketUpdate(req, ticket);

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Add message to ticket
// @route   POST /api/tickets/:id/messages
// @access  Private/Manager & Public (guest)
exports.addMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string' || !content.trim()) {
      return next(new ErrorResponse('Message content is required', 400));
    }

    // For guest requests, we'll need to verify the ticket ID matches their room
    // For now, we'll just handle manager messages
    const isManager = req.user?.role === 'manager';
    
    if (!isManager) {
      return next(new ErrorResponse('Unauthorized', 401));
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      manager: req.user.userId
    });

    if (!ticket) {
      return next(new ErrorResponse('Ticket not found', 404));
    }

    const message = {
      content: content.trim(),
      sender: 'manager',
      senderName: req.user.name,
      sentAt: new Date()
    };

    ticket.messages.push(message);
    await ticket.save();
    
    // Populate room for the notification
    await ticket.populate('room', 'number type floor');
    
    // Notify about new message
    emitTicketUpdate(req, ticket, 'newMessage');

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Add message error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};
