// src/utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "CoreInventory — Password Reset OTP",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
        <h2 style="color:#1D9E75">CoreInventory</h2>
        <p>You requested a password reset. Use the OTP below:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1D9E75;margin:24px 0">${otp}</div>
        <p style="color:#888;font-size:13px">This OTP expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
