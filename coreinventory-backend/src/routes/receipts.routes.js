// src/routes/receipts.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/receipts.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const mgr = ["ADMIN", "INVENTORY_MANAGER"];

// ── Suppliers (must come BEFORE /:id) ────────────────────────────

/**
 * @route  GET /api/receipts/suppliers
 * @desc   List all active suppliers
 * @access Private
 */
router.get("/suppliers", authenticate, ctrl.getSuppliers);

/**
 * @route  POST /api/receipts/suppliers
 * @desc   Create supplier
 * @access Manager+
 */
router.post(
  "/suppliers",
  authenticate, authorize(...mgr),
  [body("name").trim().notEmpty()],
  validate,
  ctrl.createSupplier
);

/**
 * @route  PUT /api/receipts/suppliers/:id
 * @desc   Update supplier
 * @access Manager+
 */
router.put(
  "/suppliers/:id",
  authenticate, authorize(...mgr),
  ctrl.updateSupplier
);

// ── Receipts ──────────────────────────────────────────────────────

/**
 * @route  GET /api/receipts
 * @desc   List receipts with filters
 * @access Private
 * @query  page, limit, status, supplierId, search, from, to
 */
router.get("/", authenticate, ctrl.getReceipts);

/**
 * @route  GET /api/receipts/:id
 * @desc   Get single receipt
 * @access Private
 */
router.get("/:id", authenticate, ctrl.getReceipt);

/**
 * @route  POST /api/receipts
 * @desc   Create receipt (draft)
 * @access Manager+
 * @body   { supplierId, notes, lines: [{ productId, expectedQty, unitCost? }] }
 */
router.post(
  "/",
  authenticate, authorize(...mgr),
  [
    body("supplierId").isUUID(),
    body("lines").isArray({ min: 1 }).withMessage("At least one line required."),
    body("lines.*.productId").isUUID(),
    body("lines.*.expectedQty").isFloat({ gt: 0 }),
  ],
  validate,
  ctrl.createReceipt
);

/**
 * @route  PUT /api/receipts/:id
 * @desc   Update receipt (if not DONE/CANCELED)
 * @access Manager+
 */
router.put(
  "/:id",
  authenticate, authorize(...mgr),
  ctrl.updateReceipt
);

/**
 * @route  POST /api/receipts/:id/validate
 * @desc   Validate receipt → stock increases
 * @access Manager+
 * @body   { warehouseId, locationId? }
 */
router.post(
  "/:id/validate",
  authenticate, authorize(...mgr),
  [body("warehouseId").isUUID().withMessage("warehouseId is required.")],
  validate,
  ctrl.validateReceipt
);

/**
 * @route  POST /api/receipts/:id/cancel
 * @desc   Cancel receipt
 * @access Manager+
 */
router.post("/:id/cancel", authenticate, authorize(...mgr), ctrl.cancelReceipt);

module.exports = router;
