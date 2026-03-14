// src/controllers/dashboard.controller.js
const prisma = require("../utils/prisma");
const { success } = require("../utils/response");

// GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const { warehouseId, categoryId } = req.query;

    const stockWhere = warehouseId ? { warehouseId } : {};

    // Total products in stock
    const totalProductsInStock = await prisma.stockItem.aggregate({
      _sum: { quantity: true },
      where: { quantity: { gt: 0 }, ...stockWhere },
    });

    // Distinct products with stock
    const totalDistinctProducts = await prisma.stockItem.groupBy({
      by: ["productId"],
      where: { quantity: { gt: 0 }, ...stockWhere },
    });

    // Low stock / out of stock
    const lowStockItems = await prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, p."minStockLevel", 
             COALESCE(SUM(si.quantity), 0) as "totalQty",
             p."unitOfMeasure"
      FROM products p
      LEFT JOIN stock_items si ON si."productId" = p.id
      WHERE p."isActive" = true
      GROUP BY p.id, p.name, p.sku, p."minStockLevel", p."unitOfMeasure"
      HAVING COALESCE(SUM(si.quantity), 0) <= p."minStockLevel"
    `;

    const outOfStock = lowStockItems.filter((p) => Number(p.totalQty) === 0);
    const lowStock = lowStockItems.filter((p) => Number(p.totalQty) > 0);

    // Operation counts
    const [pendingReceipts, pendingDeliveries, scheduledTransfers] = await Promise.all([
      prisma.receipt.count({ where: { status: { in: ["DRAFT", "WAITING", "READY"] } } }),
      prisma.deliveryOrder.count({ where: { status: { in: ["DRAFT", "WAITING", "READY"] } } }),
      prisma.internalTransfer.count({ where: { status: { in: ["DRAFT", "WAITING", "READY"] } } }),
    ]);

    // Recent activity (last 10 ledger entries)
    const recentActivity = await prisma.stockLedger.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Operation status breakdown
    const [receiptsByStatus, deliveriesByStatus, transfersByStatus] = await Promise.all([
      prisma.receipt.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.deliveryOrder.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.internalTransfer.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    return success(res, {
      kpis: {
        totalStockQuantity: Number(totalProductsInStock._sum.quantity) || 0,
        totalDistinctProductsInStock: totalDistinctProducts.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
      },
      alerts: {
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
      },
      recentActivity,
      operationBreakdown: {
        receipts: receiptsByStatus,
        deliveries: deliveriesByStatus,
        transfers: transfersByStatus,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getDashboard };
