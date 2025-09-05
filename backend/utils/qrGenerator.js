const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate a QR code image as a data URL
 * @param {Object} data - Data to encode in the QR code
 * @returns {Promise<string>} - QR code as a data URL
 */
const generateQRCode = async (data) => {
  try {
    const dataString = JSON.stringify(data);
    const qrCodeUrl = await QRCode.toDataURL(dataString, {
      errorCorrectionLevel: 'H', // High error correction
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate a secure random token
 * @param {number} [length=32] - Length of the token in bytes
 * @returns {string} - Random token as hex string
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate guest access token with expiration
 * @param {Object} data - Data to include in the token
 * @param {string} [expiresIn='24h'] - Expiration time (e.g., '24h', '7d')
 * @returns {Object} - Token and expiration info
 */
const generateGuestToken = (data, expiresIn = '24h') => {
  const token = generateToken();
  const now = new Date();
  
  // Parse expiresIn (e.g., '24h' -> 24 hours)
  const value = parseInt(expiresIn);
  const unit = expiresIn.replace(/\d+/g, '');
  
  const expiresAt = new Date(now);
  
  switch (unit) {
    case 'h':
      expiresAt.setHours(now.getHours() + value);
      break;
    case 'd':
      expiresAt.setDate(now.getDate() + value);
      break;
    default:
      expiresAt.setHours(now.getHours() + 24); // Default to 24 hours
  }

  return {
    token,
    expiresAt,
    data: {
      ...data,
      token,
      expiresAt,
    },
  };
};

module.exports = {
  generateQRCode,
  generateToken,
  generateGuestToken,
};
