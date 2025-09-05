const mongoose = require('mongoose');
const crypto = require('crypto');

const qrCodeSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.ObjectId,
      ref: 'Hotel',
      required: [true, 'QR code must belong to a hotel'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index for auto-expiry
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String, // Supabase user ID
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate a secure random token
qrCodeSchema.statics.generateToken = function() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buf) => {
      if (err) return reject(err);
      resolve(buf.toString('hex'));
    });
  });
};

// Generate a new QR code for a room
qrCodeSchema.statics.generateForRoom = async function(roomNumber, hotelId, userId, daysValid = 30) {
  const token = await this.generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysValid);

  // Deactivate any existing active QR codes for this room
  await this.updateMany(
    { roomNumber, hotel: hotelId, isActive: true },
    { $set: { isActive: false } }
  );

  // Create new QR code
  return this.create({
    hotel: hotelId,
    roomNumber,
    token,
    expiresAt,
    createdBy: userId,
  });
};

// Validate a QR code token
qrCodeSchema.statics.validateToken = async function(token, roomNumber) {
  const qrCode = await this.findOne({
    token,
    roomNumber,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  return !!qrCode;
};

module.exports = mongoose.model('QRCode', qrCodeSchema);
