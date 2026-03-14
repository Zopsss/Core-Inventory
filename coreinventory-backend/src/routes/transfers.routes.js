// src/routes/transfers.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/transfers.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const all = ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"];
const mgr = ["ADMIN", "INVENTORY_MANAGER"];

/**
 * @route  GET /api/transfers
 * @desc   List internal transfers with filters
 * @access Private
 * @query  page, limit, status, sourceWarehouseId, destWarehouseId, search, from, to
 */
router.get("/", authenticate, ctrl.getTransfers);

/**
 * @route  GET /api/transfers/:id
 * @desc   Get single transfer detail
 * @access Private
 */
router.get("/:id", authenticate, ctrl.getTransfer);

/**
 * @route  POST /api/transfers
 * @desc   Create internal transfer (draft)
 * @access All staff
 * @body   { sourceWarehouseId, sourceLocationId?, destWarehouseId, destLocationId?, scheduledAt?, notes?, lines: [{ productId, quantity }] }
 */
router.post(
  "/",
  authenticate, authorize(...all),
  [
    body("sourceWarehouseId").isUUID(),
    body("destWarehouseId").isUUID(),
    body("lines").isArray({ min: 1 }),
    body("lines.*.productId").isUUID(),
    body("lines.*.quantity").isFloat({ gt: 0 }),
  ],
  validate,
  ctrl.createTransfer
);

/**
 * @route  PUT /api/transfers/:id
 * @desc   Update transfer (if not DONE/CANCELED)
 * @access All staff
 */
router.put("/:id", authenticate, authorize(...all), ctrl.updateTransfer);

/**
 * @route  POST /api/transfers/:id/validate
 * @desc   Validate transfer → stock moves between locations
 * @access Manager+
 */
router.post("/:id/validate", authenticate, authorize(...mgr), ctrl.validateTransfer);

/**
 * @route  POST /api/transfers/:id/cancel
 * @desc   Cancel transfer
 * @access Manager+
 */
router.post("/:id/cancel", authenticate, authorize(...mgr), ctrl.cancelTransfer);

module.exports = router;
