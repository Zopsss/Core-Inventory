// src/routes/users.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/users.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

/**
 * @route  GET /api/users
 * @desc   List all users
 * @access Admin
 * @query  page, limit, search, role, isActive
 */
router.get("/", authenticate, authorize("ADMIN"), ctrl.getUsers);

/**
 * @route  GET /api/users/:id
 * @desc   Get single user
 * @access Admin
 */
router.get("/:id", authenticate, authorize("ADMIN"), ctrl.getUser);

/**
 * @route  POST /api/users
 * @desc   Admin creates a user
 * @access Admin
 */
router.post(
  "/",
  authenticate, authorize("ADMIN"),
  [
    body("name").trim().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("role").isIn(["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]),
  ],
  validate,
  ctrl.createUser
);

/**
 * @route  PUT /api/users/:id
 * @desc   Update user (name, role, isActive)
 * @access Admin
 */
router.put(
  "/:id",
  authenticate, authorize("ADMIN"),
  [
    body("role").optional().isIn(["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]),
    body("isActive").optional().isBoolean(),
  ],
  validate,
  ctrl.updateUser
);

/**
 * @route  DELETE /api/users/:id
 * @desc   Soft-delete (deactivate) user
 * @access Admin
 */
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.deleteUser);

/**
 * @route  PUT /api/users/:id/reset-password
 * @desc   Admin resets a user's password
 * @access Admin
 */
router.put(
  "/:id/reset-password",
  authenticate, authorize("ADMIN"),
  [body("newPassword").isLength({ min: 8 })],
  validate,
  ctrl.adminResetPassword
);

module.exports = router;
