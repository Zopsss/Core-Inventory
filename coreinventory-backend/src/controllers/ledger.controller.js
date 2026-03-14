// src/controllers/ledger.controller.js
const prisma = require("../utils/prisma");
const { success, paginated } = require("../utils/response");

// GET /api/ledger  — full move history with filters
const getLedger = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20,
      productId, warehouseId, locationId,
      referenceType, referenceId,
      from, to,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (productId)     where.productId     = productId;
    if (warehouseId)   where.warehouseId   = warehouseId;
    if (locationId)    where.locationId    = locationId;
    if (referenceType) where.referenceType = referenceType;
    if (referenceId)   where.referenceId   = referenceId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockLedger.count({ where }),
    ]);

    // Enrich with product & warehouse names via separate queries
    // (stockLedger has no prisma relations defined — uses raw IDs)
    const productIds   = [...new Set(entries.map((e) => e.productId))];
    const warehouseIds = [...new Set(entries.map((e) => e.warehouseId))];

    const [products, warehouses] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, unitOfMeasure: true },
      }),
      prisma.warehouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, name: true },
      }),
    ]);

    const productMap   = Object.fromEntries(products.map((p) => [p.id, p]));
    const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

    const enriched = entries.map((e) => ({
      ...e,
      product:   productMap[e.productId]   || null,
      warehouse: warehouseMap[e.warehouseId] || null,
    }));

    return paginated(res, enriched, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/ledger/summary  — aggregated per product
const getLedgerSummary = async (req, res, next) => {
  try {
    const { warehouseId, categoryId } = req.query;

    const stockWhere = {};
    if (warehouseId) stockWhere.warehouseId = warehouseId;

    const productWhere = { isActive: true };
    if (categoryId) productWhere.categoryId = categoryId;

    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true, name: true, sku: true, unitOfMeasure: true, minStockLevel: true,
        category: { select: { id: true, name: true } },
        stockItems: {
          where: stockWhere,
          include: {
            warehouse: { select: { id: true, name: true } },
            location:  { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const summary = products.map((p) => {
      const totalQty = p.stockItems.reduce((sum, s) => sum + s.quantity, 0);
      return {
        ...p,
        totalQty,
        isLowStock:   totalQty > 0 && totalQty <= p.minStockLevel,
        isOutOfStock: totalQty === 0,
      };
    });

    return success(res, summary);
  } catch (err) { next(err); }
};

module.exports = { getLedger, getLedgerSummary };
