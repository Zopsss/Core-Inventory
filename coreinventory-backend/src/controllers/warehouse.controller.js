// src/controllers/warehouse.controller.js
const prisma = require("../utils/prisma");
const { success, created, error } = require("../utils/response");

// GET /api/warehouses
const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        locations: { where: { isActive: true }, orderBy: { name: "asc" } },
        _count: { select: { stockItems: true } },
      },
      orderBy: { name: "asc" },
    });
    return success(res, warehouses);
  } catch (err) { next(err); }
};

// GET /api/warehouses/:id
const getWarehouse = async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: {
        locations: { orderBy: { name: "asc" } },
        stockItems: {
          include: {
            product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
            location: { select: { id: true, name: true, code: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    if (!warehouse) return error(res, "Warehouse not found.", 404);
    return success(res, warehouse);
  } catch (err) { next(err); }
};

// POST /api/warehouses
const createWarehouse = async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.create({ data: req.body });
    return created(res, warehouse, "Warehouse created.");
  } catch (err) { next(err); }
};

// PUT /api/warehouses/:id
const updateWarehouse = async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return success(res, warehouse, "Warehouse updated.");
  } catch (err) { next(err); }
};

// DELETE /api/warehouses/:id  (soft)
const deleteWarehouse = async (req, res, next) => {
  try {
    await prisma.warehouse.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return success(res, null, "Warehouse deactivated.");
  } catch (err) { next(err); }
};

// GET /api/warehouses/:id/stock
const getWarehouseStock = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const where = { warehouseId: req.params.id };
    if (locationId) where.locationId = locationId;

    const stockItems = await prisma.stockItem.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, unitOfMeasure: true, minStockLevel: true } },
        location: { select: { id: true, name: true, code: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return success(res, stockItems);
  } catch (err) { next(err); }
};

// ── Locations ──────────────────────────────

// GET /api/warehouses/:warehouseId/locations
const getLocations = async (req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      where: { warehouseId: req.params.warehouseId, isActive: true },
      orderBy: { name: "asc" },
    });
    return success(res, locations);
  } catch (err) { next(err); }
};

// POST /api/warehouses/:warehouseId/locations
const createLocation = async (req, res, next) => {
  try {
    const location = await prisma.location.create({
      data: { ...req.body, warehouseId: req.params.warehouseId },
    });
    return created(res, location, "Location created.");
  } catch (err) { next(err); }
};

// PUT /api/warehouses/:warehouseId/locations/:locationId
const updateLocation = async (req, res, next) => {
  try {
    const location = await prisma.location.update({
      where: { id: req.params.locationId },
      data: req.body,
    });
    return success(res, location, "Location updated.");
  } catch (err) { next(err); }
};

// DELETE /api/warehouses/:warehouseId/locations/:locationId
const deleteLocation = async (req, res, next) => {
  try {
    await prisma.location.update({
      where: { id: req.params.locationId },
      data: { isActive: false },
    });
    return success(res, null, "Location deactivated.");
  } catch (err) { next(err); }
};

module.exports = {
  getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse, getWarehouseStock,
  getLocations, createLocation, updateLocation, deleteLocation,
};
