const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
      set: function(email) {
        // Handle Gmail dot normalization
        if (email && email.includes('@gmail.com')) {
          const [localPart, domain] = email.toLowerCase().split('@');
          const normalizedLocalPart = localPart.replace(/\./g, '');
          return `${normalizedLocalPart}@${domain}`;
        }
        return email.toLowerCase();
      }
    },
    hotelName: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
    },
    // Supabase auth ID will be stored here
    supabaseId: {
      type: String,
      required: true,
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

// Index for faster queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ supabaseId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
