const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: 6,
  },
  type: {
    type: String,
    enum: ['login', 'registration', 'password_reset'],
    required: [true, 'OTP type is required'],
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    index: { expireAfterSeconds: 0 }, // MongoDB TTL index
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5, // Maximum attempts allowed
  },
  registrationData: {
    name: String,
    hotelName: String,
    email: String,
    password: String,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ email: 1, otp: 1, isUsed: 1 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create OTP with expiration
otpSchema.statics.createOTP = async function(email, type, expirationMinutes = 10) {
  // Normalize email to lowercase and handle Gmail dot normalization
  let normalizedEmail = email.toLowerCase().trim();
  
  // Handle Gmail dot normalization (remove dots from local part for Gmail addresses)
  if (normalizedEmail.includes('@gmail.com')) {
    const [localPart, domain] = normalizedEmail.split('@');
    const normalizedLocalPart = localPart.replace(/\./g, '');
    normalizedEmail = `${normalizedLocalPart}@${domain}`;
  }
  
  console.log('Creating OTP for:', { originalEmail: email, normalizedEmail, type });
  
  // Delete any existing unused OTPs for this email and type
  await this.deleteMany({ 
    email: normalizedEmail, 
    type, 
    isUsed: false 
  });

  const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  const otpRecord = await this.create({
    email: normalizedEmail,
    otp,
    type,
    expiresAt,
  });
  
  console.log('OTP created successfully:', { email: normalizedEmail, otp, type });
  return otpRecord;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp, type) {
  // Normalize email to lowercase and handle Gmail dot normalization
  let normalizedEmail = email.toLowerCase().trim();
  
  // Handle Gmail dot normalization (remove dots from local part for Gmail addresses)
  if (normalizedEmail.includes('@gmail.com')) {
    const [localPart, domain] = normalizedEmail.split('@');
    const normalizedLocalPart = localPart.replace(/\./g, '');
    normalizedEmail = `${normalizedLocalPart}@${domain}`;
  }
  
  console.log('Verifying OTP:', { originalEmail: email, normalizedEmail, otp, type });
  
  const otpRecord = await this.findOne({
    email: normalizedEmail,
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  console.log('Found OTP record:', otpRecord ? 'Yes' : 'No');
  if (otpRecord) {
    console.log('OTP record details:', {
      email: otpRecord.email,
      otp: otpRecord.otp,
      type: otpRecord.type,
      isUsed: otpRecord.isUsed,
      expiresAt: otpRecord.expiresAt,
      attempts: otpRecord.attempts,
      hasRegistrationData: !!otpRecord.registrationData
    });
  }

  if (!otpRecord) {
    return { isValid: false, message: 'Invalid or expired OTP' };
  }

  // Check if too many attempts
  if (otpRecord.attempts >= 5) {
    return { isValid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  // Increment attempts
  otpRecord.attempts += 1;
  await otpRecord.save();

  // Mark as used if valid
  if (otpRecord.attempts <= 5) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    return { isValid: true, message: 'OTP verified successfully', otpRecord };
  }

  return { isValid: false, message: 'Invalid OTP' };
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

module.exports = mongoose.model('OTP', otpSchema); 