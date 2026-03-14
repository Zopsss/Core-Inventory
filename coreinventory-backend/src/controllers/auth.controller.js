// src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const { success, created, error } = require("../utils/response");
const { sendOtpEmail } = require("../utils/mailer");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return error(res, "Email already registered.", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "WAREHOUSE_STAFF" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return created(res, { user, token }, "Account created successfully.");
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return error(res, "Invalid credentials.", 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return error(res, "Invalid credentials.", 401);

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const { password: _, ...userData } = user;
    return success(res, { user: userData, token }, "Login successful.");
  } catch (err) { next(err); }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) return success(res, null, "If this email exists, an OTP has been sent.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
    const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpiresAt },
    });

    await sendOtpEmail(email, otp);
    return success(res, null, "OTP sent to your email address.");
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.otpCode !== otp) {
      return error(res, "Invalid or expired OTP.", 400);
    }
    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return error(res, "OTP has expired.", 400);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashed, otpCode: null, otpExpiresAt: null },
    });

    return success(res, null, "Password reset successfully.");
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return success(res, user);
  } catch (err) { next(err); }
};

// PUT /api/auth/me
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });
    return success(res, user, "Profile updated.");
  } catch (err) { next(err); }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return error(res, "Current password is incorrect.", 400);

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    return success(res, null, "Password changed successfully.");
  } catch (err) { next(err); }
};

module.exports = { register, login, forgotPassword, resetPassword, getMe, updateProfile, changePassword };
