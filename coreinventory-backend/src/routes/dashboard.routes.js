// src/routes/dashboard.routes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @route  GET /api/dashboard
 * @desc   KPIs, alerts, recent activity, operation breakdown
 * @access Private
 * @query  warehouseId?, categoryId?
 */
router.get("/", authenticate, ctrl.getDashboard);

module.exports = router;
