const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
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
  price: {
    type: Number,
    required: [true, 'Room price is required'],
    min: [0, 'Price cannot be negative'],
  },
  amenities: [{
    type: String,
    trim: true,
  }],
  maxGuests: {
    type: Number,
    required: true,
    default: 2,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: [100, 'Hotel name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    location: {
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
      },
      coordinates: {
        // GeoJSON Point
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
          index: '2dsphere',
        },
      },
    },
    contact: {
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
      },
      email: {
        type: String,
        match: [
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
          'Please add a valid email',
        ],
        trim: true,
        lowercase: true,
      },
      website: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
    manager: {
      type: String,
      required: [true, 'Manager ID is required'],
      trim: true,
    },
    rooms: [roomSchema],
    amenities: [{
      type: String,
      trim: true,
    }],
    checkInTime: {
      type: String,
      default: '14:00',
    },
    checkOutTime: {
      type: String,
      default: '12:00',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
hotelSchema.index({ 'location.coordinates': '2dsphere' });
hotelSchema.index({ manager: 1 });

// Virtual for booking
hotelSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'hotel',
  justOne: false,
});

// Cascade delete bookings when a hotel is deleted
hotelSchema.pre('remove', async function (next) {
  await this.model('Booking').deleteMany({ hotel: this._id });
  next();
});

module.exports = mongoose.model('Hotel', hotelSchema);
