const nodemailer = require('nodemailer');

// Create transporter for sending emails
const createTransporter = () => {
  console.log('Creating email transporter...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : '***NOT SET***');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  // For development, use Gmail or a test service
  if (process.env.NODE_ENV === 'development') {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
      },
    });
    console.log('Gmail transporter created');
    return transporter;
  }

  // For production, use Gmail with app password (same as development)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
    },
  });
  console.log('Gmail transporter created for production');
  return transporter;
};

// Send OTP email
const sendOTPEmail = async (email, otp, type) => {
  try {
    const transporter = createTransporter();

    let subject, htmlContent;

    switch (type) {
      case 'login':
        subject = 'Your Login OTP - GuestFlow';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">GuestFlow</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Hotel Management System</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Login Verification</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                You've requested to log in to your GuestFlow account. Please use the following OTP to complete your login:
              </p>
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
                <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">Valid for 10 minutes</p>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                If you didn't request this login, please ignore this email or contact support immediately.
              </p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} GuestFlow. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'registration':
        subject = 'Complete Your Registration - GuestFlow';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">GuestFlow</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Hotel Management System</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome to GuestFlow!</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Thank you for registering with GuestFlow. To complete your registration, please verify your email address using the following OTP:
              </p>
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
                <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">Valid for 10 minutes</p>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                Once verified, you'll have access to your hotel management dashboard.
              </p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} GuestFlow. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `;
        break;

      case 'password_reset':
        subject = 'Password Reset OTP - GuestFlow';
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">GuestFlow</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Hotel Management System</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                You've requested to reset your password. Please use the following OTP to complete the password reset process:
              </p>
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
                <p style="color: #999; font-size: 14px; margin: 10px 0 0 0;">Valid for 10 minutes</p>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                If you didn't request a password reset, please ignore this email or contact support immediately.
              </p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #999; font-size: 12px;">
                  © ${new Date().getFullYear()} GuestFlow. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error('Invalid OTP type');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@guestflow.com',
      to: email,
      subject: subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${email}: ${result.messageId}`);
    return result;

  } catch (error) {
    console.error('📧 Email sending error details:', {
      error: error.message,
      stack: error.stack,
      email: email,
      type: type,
      env: process.env.NODE_ENV,
      hasUser: !!process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD
    });
    throw new Error('Failed to send OTP email');
  }
};

// Send simple text email (fallback)
const sendSimpleEmail = async (email, subject, text) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@guestflow.com',
      to: email,
      subject: subject,
      text: text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Simple email sent to ${email}: ${result.messageId}`);
    return result;

  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = {
  sendOTPEmail,
  sendSimpleEmail,
  createTransporter,
}; 