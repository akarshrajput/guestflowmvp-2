const QRCode = require('../models/QRCode');
const qr = require('qrcode');
const { body, validationResult } = require('express-validator');

// @desc    Generate QR code for a room
// @route   POST /api/qr-codes/generate
// @access  Private (Hotel Staff)
exports.generateQRCode = [
  [
    body('roomNumber', 'Room number is required').not().isEmpty().trim(),
    body('daysValid', 'Days valid must be a positive number')
      .optional()
      .isInt({ min: 1, max: 365 })
      .toInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { roomNumber, daysValid = 30 } = req.body;
      const hotelId = req.user.hotelId;
      const userId = req.user.id;

      // Generate new QR code
      const qrCode = await QRCode.generateForRoom(
        roomNumber, 
        hotelId, 
        userId, 
        daysValid
      );

      // Generate QR code image data URL
      const qrData = {
        roomNumber,
        token: qrCode.token,
        hotelId: hotelId.toString(),
      };

      const qrDataUrl = await new Promise((resolve, reject) => {
        qr.toDataURL(JSON.stringify(qrData), {
          errorCorrectionLevel: 'H', // High error correction
          type: 'image/png',
          margin: 1,
          scale: 8,
        }, (err, url) => {
          if (err) return reject(err);
          resolve(url);
        });
      });

      res.json({
        success: true,
        data: {
          qrCode: qrCode.toObject(),
          qrDataUrl,
          expiresAt: qrCode.expiresAt,
        },
      });

    } catch (error) {
      console.error('Generate QR code error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to generate QR code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
];

// @desc    Validate QR code
// @route   POST /api/qr-codes/validate
// @access  Public
exports.validateQRCode = [
  [
    body('token', 'Token is required').not().isEmpty().trim(),
    body('roomNumber', 'Room number is required').not().isEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { token, roomNumber } = req.body;
      const isValid = await QRCode.validateToken(token, roomNumber);

      res.json({
        success: true,
        data: {
          isValid,
          roomNumber,
        },
      });

    } catch (error) {
      console.error('Validate QR code error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to validate QR code',
      });
    }
  }
];

// @desc    Get all QR codes for a hotel
// @route   GET /api/qr-codes
// @access  Private (Hotel Staff)
exports.getQRCodes = async (req, res) => {
  try {
    const qrCodes = await QRCode.find({ 
      hotel: req.user.hotelId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: qrCodes.length,
      data: qrCodes,
    });

  } catch (error) {
    console.error('Get QR codes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get QR codes',
    });
  }
};

// @desc    Revoke a QR code
// @route   DELETE /api/qr-codes/:id
// @access  Private (Hotel Staff)
exports.revokeQRCode = async (req, res) => {
  try {
    const qrCode = await QRCode.findOneAndUpdate(
      { 
        _id: req.params.id,
        hotel: req.user.hotelId,
        isActive: true,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found or already revoked',
      });
    }

    res.json({
      success: true,
      data: {},
      message: 'QR code has been revoked',
    });

  } catch (error) {
    console.error('Revoke QR code error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to revoke QR code',
    });
  }
};
