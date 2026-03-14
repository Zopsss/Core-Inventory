// src/routes/auth.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

const passwordRules = body("password")
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter.")
  .matches(/[0-9]/).withMessage("Password must contain a number.");

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user
 * @access Public
 */
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    passwordRules,
    body("role").optional().isIn(["INVENTORY_MANAGER", "WAREHOUSE_STAFF", "ADMIN"]),
  ],
  validate,
  ctrl.register
);

/**
 * @route  POST /api/auth/login
 * @desc   Login and receive JWT
 * @access Public
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  ctrl.login
);

/**
 * @route  POST /api/auth/forgot-password
 * @desc   Send OTP to email
 * @access Public
 */
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  validate,
  ctrl.forgotPassword
);

/**
 * @route  POST /api/auth/reset-password
 * @desc   Verify OTP and set new password
 * @access Public
 */
router.post(
  "/reset-password",
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits."),
    body("newPassword").isLength({ min: 8 }),
  ],
  validate,
  ctrl.resetPassword
);

/**
 * @route  GET /api/auth/me
 * @desc   Get current user profile
 * @access Private
 */
router.get("/me", authenticate, ctrl.getMe);

/**
 * @route  PUT /api/auth/me
 * @desc   Update own profile
 * @access Private
 */
router.put(
  "/me",
  authenticate,
  [body("name").trim().notEmpty()],
  validate,
  ctrl.updateProfile
);

/**
 * @route  PUT /api/auth/change-password
 * @desc   Change own password
 * @access Private
 */
router.put(
  "/change-password",
  authenticate,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
