const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance'],
      default: 'available',
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    qrCode: {
      type: String, // Base64 data URL
    },
    qrCodeUrl: {
      type: String, // The URL that the QR code points to
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
roomSchema.index({ number: 1 }, { unique: true });
roomSchema.index({ manager: 1 });
roomSchema.index({ status: 1 });

// Virtual for tickets in this room
roomSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'room',
});

// Cascade delete tickets when a room is deleted
roomSchema.pre('remove', async function (next) {
  await this.model('Ticket').deleteMany({ room: this._id });
  next();
});

module.exports = mongoose.model('Room', roomSchema);
