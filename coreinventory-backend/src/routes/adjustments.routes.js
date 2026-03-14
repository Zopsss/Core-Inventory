// src/routes/adjustments.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/adjustments.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const mgr = ["ADMIN", "INVENTORY_MANAGER"];

/**
 * @route  GET /api/adjustments
 * @desc   List stock adjustments
 * @access Private
 * @query  page, limit, status, search, from, to
 */
router.get("/", authenticate, ctrl.getAdjustments);

/**
 * @route  GET /api/adjustments/:id
 * @desc   Get single adjustment
 * @access Private
 */
router.get("/:id", authenticate, ctrl.getAdjustment);

/**
 * @route  POST /api/adjustments
 * @desc   Create adjustment (calculates diff automatically)
 * @access Manager+
 * @body   { notes?, lines: [{ productId, warehouseId, locationId?, countedQty, reason? }] }
 */
router.post(
  "/",
  authenticate, authorize(...mgr),
  [
    body("lines").isArray({ min: 1 }),
    body("lines.*.productId").isUUID(),
    body("lines.*.warehouseId").isUUID(),
    body("lines.*.countedQty").isFloat({ min: 0 }),
    body("lines.*.reason").optional().isIn([
      "DAMAGED", "LOST", "FOUND", "EXPIRED", "CORRECTION", "OTHER",
    ]),
  ],
  validate,
  ctrl.createAdjustment
);

/**
 * @route  PUT /api/adjustments/:id
 * @desc   Update adjustment (if not DONE/CANCELED)
 * @access Manager+
 */
router.put("/:id", authenticate, authorize(...mgr), ctrl.updateAdjustment);

/**
 * @route  POST /api/adjustments/:id/validate
 * @desc   Validate adjustment → corrects stock, logs to ledger
 * @access Manager+
 */
router.post("/:id/validate", authenticate, authorize(...mgr), ctrl.validateAdjustment);

/**
 * @route  POST /api/adjustments/:id/cancel
 * @desc   Cancel adjustment
 * @access Manager+
 */
router.post("/:id/cancel", authenticate, authorize(...mgr), ctrl.cancelAdjustment);

module.exports = router;
