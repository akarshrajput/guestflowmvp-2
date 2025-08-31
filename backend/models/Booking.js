const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hotel: {
      type: mongoose.Schema.ObjectId,
      ref: 'Hotel',
      required: [true, 'Booking must belong to a hotel'],
    },
    room: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room',
      required: [true, 'Booking must have a room'],
    },
    guest: {
      name: {
        type: String,
        required: [true, 'Guest name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Guest email is required'],
        trim: true,
        lowercase: true,
        match: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          'Please provide a valid email',
        ],
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
      validate: {
        validator: function (value) {
          return value > this.checkIn;
        },
        message: 'Check-out date must be after check-in date',
      },
    },
    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Number of guests must be at least 1'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed', 'no-show'],
      default: 'confirmed',
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash', 'other'],
    },
    paymentDetails: {
      // Store payment gateway response or reference
      type: Object,
      select: false, // Don't expose payment details by default
    },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict'],
      default: 'moderate',
    },
    cancellationDate: Date,
    cancellationReason: String,
    source: {
      type: String,
      enum: ['website', 'mobile_app', 'walk_in', 'travel_agent', 'other'],
      default: 'website',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
bookingSchema.index({ hotel: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ 'guest.email': 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });

// Virtual for duration of stay in days
bookingSchema.virtual('duration').get(function () {
  return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
});

// Generate booking number before saving
bookingSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  
  // Generate a unique booking number (e.g., HOTEL-123456)
  const count = await this.constructor.countDocuments();
  this.bookingNumber = `HOTEL-${(count + 1).toString().padStart(6, '0')}`;
  
  next();
});

// Update room availability when a booking is created
bookingSchema.post('save', async function (doc) {
  if (doc.status === 'confirmed') {
    // Update room availability if needed
    // This is a simplified example - in a real app, you'd want to handle this more carefully
    await mongoose.model('Hotel').updateOne(
      { 'rooms._id': doc.room },
      { $set: { 'rooms.$.isAvailable': false } }
    );
  }
});

// Update room availability when a booking is cancelled
bookingSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && doc.status === 'cancelled') {
    // Update room availability when a booking is cancelled
    await mongoose.model('Hotel').updateOne(
      { 'rooms._id': doc.room },
      { $set: { 'rooms.$.isAvailable': true } }
    );
  }
});

// Static method to check room availability
bookingSchema.statics.isRoomAvailable = async function (roomId, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    room: roomId,
    status: { $ne: 'cancelled' }, // Exclude cancelled bookings
    $or: [
      { checkIn: { $lt: new Date(checkOut) }, checkOut: { $gt: new Date(checkIn) } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existingBooking = await this.findOne(query);
  return !existingBooking;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
