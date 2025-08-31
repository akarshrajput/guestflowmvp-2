const Room = require('../models/Room');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');
const QRCode = require('qrcode');

// @desc    Get all rooms for the manager's hotel
// @route   GET /api/rooms
// @access  Private/Manager
exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ 
      manager: req.user.userId,
      isActive: true 
    }).select('-__v -createdAt -updatedAt');

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private/Manager
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      manager: req.user.userId,
      isActive: true
    }).select('-__v -createdAt -updatedAt');

    if (!room) {
      return next(new ErrorResponse(`Room not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Create a room
// @route   POST /api/rooms
// @access  Private/Manager
exports.createRoom = async (req, res, next) => {
  try {
    // Add manager to request body
    req.body.manager = req.user.userId;
    
    // Check for duplicate room number
    const roomExists = await Room.findOne({
      number: req.body.number,
      manager: req.user.userId,
      isActive: true
    });

    if (roomExists) {
      return res.status(400).json({
        success: false,
        message: `Room with number ${req.body.number} already exists`
      });
    }

    const room = await Room.create(req.body);

    // Generate QR code for the room
    const frontendUrl = process.env.FRONTEND_URL || 'https://hotelflow-frontend-three.vercel.app';
    const roomUrl = `${frontendUrl}/hotel/${room.number}`;
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(roomUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      room.qrCode = qrCodeDataUrl;
      room.qrCodeUrl = roomUrl;
      await room.save();
    } catch (qrError) {
      console.error('QR code generation error:', qrError);
      // Continue without QR code if generation fails
    }

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Manager
exports.updateRoom = async (req, res, next) => {
  try {
    let room = await Room.findOne({
      _id: req.params.id,
      manager: req.user.userId,
      isActive: true
    });

    if (!room) {
      return next(
        new ErrorResponse(`Room not found with id of ${req.params.id}`, 404)
      );
    }

    // Check for duplicate room number
    if (req.body.number && req.body.number !== room.number) {
      const roomExists = await Room.findOne({
        number: req.body.number,
        manager: req.user.userId,
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (roomExists) {
        return next(
          new ErrorResponse(
            `Room with number ${req.body.number} already exists`,
            400
          )
        );
      }
    }

    // Update room fields
    const fieldsToUpdate = ['number', 'type', 'floor', 'status'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        room[field] = req.body[field];
      }
    });

    await room.save();

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Update room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Delete room (soft delete)
// @route   DELETE /api/rooms/:id
// @access  Private/Manager
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      manager: req.user.userId,
      isActive: true
    });

    if (!room) {
      return next(
        new ErrorResponse(`Room not found with id of ${req.params.id}`, 404)
      );
    }

    // Check for active tickets
    const activeTickets = await Ticket.countDocuments({
      room: room._id,
      status: { $in: ['raised', 'in_progress'] }
    });

    if (activeTickets > 0) {
      return next(
        new ErrorResponse(
          'Cannot delete room with active tickets. Please resolve all tickets first.',
          400
        )
      );
    }

    // Soft delete
    room.isActive = false;
    await room.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get room by number (public)
// @route   GET /api/rooms/number/:number
// @access  Public
exports.getRoomByNumber = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      number: req.params.number,
      isActive: true
    }).select('-__v -createdAt -updatedAt -isActive');

    if (!room) {
      return next(
        new ErrorResponse(
          `Room with number ${req.params.number} not found or inactive`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room by number error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Validation middleware for room
exports.validateRoom = [
  body('number')
    .trim()
    .notEmpty()
    .withMessage('Room number is required')
    .matches(/^[0-9A-Za-z-]+$/)
    .withMessage('Room number can only contain letters, numbers, and hyphens'),
    
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Room type is required')
    .isLength({ max: 50 })
    .withMessage('Room type must be less than 50 characters'),
    
  body('floor')
    .isInt({ min: 1, max: 200 })
    .withMessage('Floor must be a number between 1 and 200'),
    
  body('status')
    .optional()
    .isIn(['available', 'occupied', 'maintenance'])
    .withMessage('Invalid room status'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

// @desc    Generate QR code for existing room
// @route   POST /api/rooms/:id/qr
// @access  Private/Manager
exports.generateQRCode = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      manager: req.user.userId,
      isActive: true
    });

    if (!room) {
      return next(new ErrorResponse(`Room not found with id of ${req.params.id}`, 404));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://hotelflow-frontend-three.vercel.app';
    const roomUrl = `${frontendUrl}/hotel/${room.number}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(roomUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    room.qrCode = qrCodeDataUrl;
    room.qrCodeUrl = roomUrl;
    await room.save();

    res.status(200).json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        url: roomUrl
      }
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Download QR code for room
// @route   GET /api/rooms/:id/qr/download
// @access  Private/Manager
exports.downloadQRCode = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      manager: req.user.userId,
      isActive: true
    });

    if (!room) {
      return next(new ErrorResponse(`Room not found with id of ${req.params.id}`, 404));
    }

    if (!room.qrCode) {
      return next(new ErrorResponse('QR code not found for this room', 404));
    }

    // Convert data URL to buffer
    const base64Data = room.qrCode.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="room-${room.number}-qr.png"`,
      'Content-Length': buffer.length
    });

    res.send(buffer);
  } catch (error) {
    console.error('Download QR code error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};
