// src/routes/delivery.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/delivery.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const all = ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"];
const mgr = ["ADMIN", "INVENTORY_MANAGER"];

/**
 * @route  GET /api/deliveries
 * @desc   List delivery orders with filters
 * @access Private
 * @query  page, limit, status, search, from, to
 */
router.get("/", authenticate, ctrl.getDeliveries);

/**
 * @route  GET /api/deliveries/:id
 * @desc   Get single delivery order
 * @access Private
 */
router.get("/:id", authenticate, ctrl.getDelivery);

/**
 * @route  POST /api/deliveries
 * @desc   Create delivery order (draft)
 * @access Manager+
 * @body   { customerName, customerEmail?, notes?, lines: [{ productId, orderedQty, warehouseId }] }
 */
router.post(
  "/",
  authenticate, authorize(...mgr),
  [
    body("customerName").trim().notEmpty(),
    body("customerEmail").optional().isEmail(),
    body("lines").isArray({ min: 1 }),
    body("lines.*.productId").isUUID(),
    body("lines.*.orderedQty").isFloat({ gt: 0 }),
    body("lines.*.warehouseId").isUUID(),
  ],
  validate,
  ctrl.createDelivery
);

/**
 * @route  PUT /api/deliveries/:id
 * @desc   Update delivery (if not DONE/CANCELED)
 * @access Manager+
 */
router.put("/:id", authenticate, authorize(...mgr), ctrl.updateDelivery);

/**
 * @route  POST /api/deliveries/:id/pick
 * @desc   Mark items as picked → status: WAITING
 * @access All staff
 */
router.post("/:id/pick", authenticate, authorize(...all), ctrl.pickDelivery);

/**
 * @route  POST /api/deliveries/:id/pack
 * @desc   Mark items as packed → status: READY
 * @access All staff
 */
router.post("/:id/pack", authenticate, authorize(...all), ctrl.packDelivery);

/**
 * @route  POST /api/deliveries/:id/validate
 * @desc   Validate delivery → stock decreases
 * @access Manager+
 */
router.post("/:id/validate", authenticate, authorize(...mgr), ctrl.validateDelivery);

/**
 * @route  POST /api/deliveries/:id/cancel
 * @desc   Cancel delivery
 * @access Manager+
 */
router.post("/:id/cancel", authenticate, authorize(...mgr), ctrl.cancelDelivery);

module.exports = router;
