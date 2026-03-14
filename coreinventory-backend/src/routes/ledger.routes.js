// src/routes/ledger.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/ledger.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @route  GET /api/ledger
 * @desc   Full stock movement history (move history)
 * @access Private
 * @query  page, limit, productId, warehouseId, locationId, referenceType, referenceId, from, to
 */
router.get("/", authenticate, ctrl.getLedger);

/**
 * @route  GET /api/ledger/summary
 * @desc   Current stock summary per product across all locations
 * @access Private
 * @query  warehouseId?, categoryId?
 */
router.get("/summary", authenticate, ctrl.getLedgerSummary);

module.exports = router;
