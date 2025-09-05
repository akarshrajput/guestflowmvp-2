const Hotel = require('../models/Hotel');
const { body, validationResult } = require('express-validator');

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
exports.getHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find({ isActive: true })
      .select('-__v');
      // Removed populate since we're storing manager as string ID

    res.json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
exports.getHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id)
      .select('-__v');
      // Removed populate since we're storing manager as string ID

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `Hotel not found with id of ${req.params.id}`,
      });
    }

    res.json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    console.error('Get hotel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new hotel
// @route   POST /api/hotels
// @access  Private
exports.createHotel = async (req, res) => {
  try {
    // Add manager to req.body
    req.body.manager = req.user.id;

    const hotel = await Hotel.create(req.body);

    res.status(201).json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private
exports.updateHotel = async (req, res) => {
  try {
    let hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `Hotel not found with id of ${req.params.id}`,
      });
    }

    // Make sure user is hotel owner
    if (hotel.manager !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this hotel`,
      });
    }

    hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: hotel,
    });
  } catch (error) {
    console.error('Update hotel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete hotel
// @route   DELETE /api/hotels/:id
// @access  Private
exports.deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `Hotel not found with id of ${req.params.id}`,
      });
    }

    // Make sure user is hotel owner
    if (hotel.manager !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this hotel`,
      });
    }

    // Soft delete by setting isActive to false
    hotel.isActive = false;
    await hotel.save();

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get hotels by manager
// @route   GET /api/hotels/manager/my-hotels
// @access  Private
exports.getHotelsByManager = async (req, res) => {
  try {
    const hotels = await Hotel.find({ manager: req.user.id })
      .select('-__v');
      // Removed populate since we're storing manager as string ID

    res.json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    console.error('Get manager hotels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validation middleware for hotel
exports.validateHotel = [
  body('name', 'Name is required').not().isEmpty(),
  body('location.address', 'Address is required').not().isEmpty(),
  body('location.city', 'City is required').not().isEmpty(),
  body('location.country', 'Country is required').not().isEmpty(),
  body('contact.phone', 'Phone number is required').not().isEmpty(),
  body('rooms').custom((rooms) => {
    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw new Error('At least one room is required');
    }
    return true;
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
