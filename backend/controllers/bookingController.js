const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');

// @desc    Create a new booking
// @route   POST /api/hotels/:hotelId/bookings
// @access  Public
exports.createBooking = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { room: roomId, checkIn, checkOut } = req.body;

    // Find the hotel and room
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `Hotel not found with id of ${hotelId}`,
      });
    }

    const room = hotel.rooms.id(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room not found with id of ${roomId}`,
      });
    }

    // Check room availability
    const isAvailable = await Booking.isRoomAvailable(roomId, checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Room is not available for the selected dates',
      });
    }

    // Calculate total amount (simplified - in a real app, you'd have more complex pricing logic)
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalAmount = room.price * nights;

    // Create booking
    const booking = await Booking.create({
      ...req.body,
      hotel: hotelId,
      room: roomId,
      totalAmount,
    });

    // Generate QR code for guest access
    const qrCodeData = {
      bookingId: booking._id,
      hotelId,
      roomId,
      guestName: booking.guest.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
    };

    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));

    res.status(201).json({
      success: true,
      data: {
        ...booking.toObject(),
        qrCodeUrl,
      },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all bookings for a hotel
// @route   GET /api/hotels/:hotelId/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    // Check if user is hotel manager
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `Hotel not found with id of ${req.params.hotelId}`,
      });
    }

    if (hotel.manager.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to view these bookings`,
      });
    }

    const bookings = await Booking.find({ hotel: req.params.hotelId })
      .sort({ checkIn: -1 })
      .populate('room', 'number type');

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Public (with token)
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hotel', 'name location contact')
      .populate('room', 'number type price');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Booking not found with id of ${req.params.id}`,
      });
    }

    // If not a guest accessing their own booking, check if user is hotel manager
    if (req.user) {
      const hotel = await Hotel.findById(booking.hotel);
      if (hotel.manager.toString() !== req.user.id) {
        return res.status(401).json({
          success: false,
          message: `User ${req.user.id} is not authorized to view this booking`,
        });
      }
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
exports.updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Booking not found with id of ${req.params.id}`,
      });
    }

    // Check if user is hotel manager
    const hotel = await Hotel.findById(booking.hotel);
    if (hotel.manager.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this booking`,
      });
    }

    // Check room availability if dates or room are being updated
    if (req.body.checkIn || req.body.checkOut || req.body.room) {
      const isAvailable = await Booking.isRoomAvailable(
        req.body.room || booking.room,
        req.body.checkIn || booking.checkIn,
        req.body.checkOut || booking.checkOut,
        booking._id
      );

      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Room is not available for the selected dates',
        });
      }
    }

    // Update booking
    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Public (with token or booking reference)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Booking not found with id of ${req.params.id}`,
      });
    }

    // Check if user is authorized (either hotel manager or guest with booking reference)
    if (req.user) {
      const hotel = await Hotel.findById(booking.hotel);
      if (hotel.manager.toString() !== req.user.id) {
        return res.status(401).json({
          success: false,
          message: `User ${req.user.id} is not authorized to cancel this booking`,
        });
      }
    } else if (req.body.bookingReference !== booking.bookingNumber) {
      return res.status(401).json({
        success: false,
        message: 'Invalid booking reference',
      });
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking.cancellationDate = Date.now();
    if (req.body.reason) {
      booking.cancellationReason = req.body.reason;
    }
    await booking.save();

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Generate guest access link/QR code
// @route   GET /api/hotels/:hotelId/guest-link
// @access  Public
exports.generateGuestLink = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { roomId, checkIn, checkOut, guestName } = req.query;

    // Basic validation
    if (!roomId || !checkIn || !checkOut || !guestName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roomId, checkIn, checkOut, and guestName',
      });
    }

    // Generate a unique token for guest access
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // In a real app, you'd store this token in the database with an expiration time
    // and associate it with the booking

    // Generate QR code
    const qrCodeData = {
      hotelId,
      roomId,
      guestName,
      checkIn,
      checkOut,
      token,
    };

    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData));

    // Generate a shareable link
    const baseUrl = process.env.FRONTEND_URL || 'https://hotelflow-frontend-three.vercel.app';
    const guestLink = `${baseUrl}/guest/checkin?token=${token}`;

    res.json({
      success: true,
      data: {
        qrCodeUrl,
        guestLink,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Generate guest link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validation middleware for booking
exports.validateBooking = [
  body('guest.name', 'Guest name is required').not().isEmpty(),
  body('guest.email', 'Please include a valid email').isEmail(),
  body('room', 'Room ID is required').not().isEmpty(),
  body('checkIn', 'Check-in date is required').isISO8601(),
  body('checkOut', 'Check-out date is required').isISO8601(),
  body('numberOfGuests', 'Number of guests is required').isInt({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
