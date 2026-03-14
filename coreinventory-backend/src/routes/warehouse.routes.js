// src/routes/warehouse.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/warehouse.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const mgr = ["ADMIN", "INVENTORY_MANAGER"];

// ── Warehouses ────────────────────────────────────────────────────

/**
 * @route  GET /api/warehouses
 * @desc   List all warehouses with their locations
 * @access Private
 */
router.get("/", authenticate, ctrl.getWarehouses);

/**
 * @route  GET /api/warehouses/:id
 * @desc   Get warehouse detail with all stock items
 * @access Private
 */
router.get("/:id", authenticate, ctrl.getWarehouse);

/**
 * @route  GET /api/warehouses/:id/stock
 * @desc   Current stock inside a warehouse
 * @access Private
 * @query  locationId?
 */
router.get("/:id/stock", authenticate, ctrl.getWarehouseStock);

/**
 * @route  POST /api/warehouses
 * @desc   Create warehouse
 * @access Admin
 */
router.post(
  "/",
  authenticate, authorize("ADMIN"),
  [body("name").trim().notEmpty()],
  validate,
  ctrl.createWarehouse
);

/**
 * @route  PUT /api/warehouses/:id
 * @desc   Update warehouse
 * @access Admin
 */
router.put(
  "/:id",
  authenticate, authorize("ADMIN"),
  [body("name").optional().trim().notEmpty()],
  validate,
  ctrl.updateWarehouse
);

/**
 * @route  DELETE /api/warehouses/:id
 * @desc   Deactivate warehouse
 * @access Admin
 */
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.deleteWarehouse);

// ── Locations ─────────────────────────────────────────────────────

/**
 * @route  GET /api/warehouses/:warehouseId/locations
 * @desc   List locations in a warehouse
 * @access Private
 */
router.get("/:warehouseId/locations", authenticate, ctrl.getLocations);

/**
 * @route  POST /api/warehouses/:warehouseId/locations
 * @desc   Add a location to a warehouse
 * @access Manager+
 */
router.post(
  "/:warehouseId/locations",
  authenticate, authorize(...mgr),
  [
    body("name").trim().notEmpty(),
    body("code").trim().notEmpty(),
  ],
  validate,
  ctrl.createLocation
);

/**
 * @route  PUT /api/warehouses/:warehouseId/locations/:locationId
 * @desc   Update location
 * @access Manager+
 */
router.put(
  "/:warehouseId/locations/:locationId",
  authenticate, authorize(...mgr),
  [body("name").optional().trim().notEmpty()],
  validate,
  ctrl.updateLocation
);

/**
 * @route  DELETE /api/warehouses/:warehouseId/locations/:locationId
 * @desc   Deactivate location
 * @access Admin
 */
router.delete(
  "/:warehouseId/locations/:locationId",
  authenticate, authorize("ADMIN"),
  ctrl.deleteLocation
);

module.exports = router;
