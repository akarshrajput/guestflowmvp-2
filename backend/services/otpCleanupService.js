const cron = require('node-cron');
const OTP = require('../models/OTP');

// Clean up expired OTPs every hour
const cleanupExpiredOTPs = async () => {
  try {
    const deletedCount = await OTP.cleanupExpired();
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired OTPs`);
    }
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
};

// Schedule OTP cleanup to run every hour
const scheduleOTPCleanup = () => {
  cron.schedule('0 * * * *', cleanupExpiredOTPs, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  console.log('⏰ OTP cleanup service scheduled to run every hour');
};

// Run initial cleanup on startup
const initializeOTPCleanup = () => {
  cleanupExpiredOTPs();
  scheduleOTPCleanup();
};

module.exports = {
  cleanupExpiredOTPs,
  scheduleOTPCleanup,
  initializeOTPCleanup
}; 