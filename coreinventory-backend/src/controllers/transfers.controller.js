// src/controllers/transfers.controller.js
const prisma = require("../utils/prisma");
const { success, created, error, paginated } = require("../utils/response");
const { generateReference } = require("../utils/reference");

// GET /api/transfers
const getTransfers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, sourceWarehouseId, destWarehouseId, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (sourceWarehouseId) where.sourceWarehouseId = sourceWarehouseId;
    if (destWarehouseId) where.destWarehouseId = destWarehouseId;
    if (search) where.reference = { contains: search, mode: "insensitive" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [transfers, total] = await Promise.all([
      prisma.internalTransfer.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          sourceWarehouse: { select: { id: true, name: true } },
          sourceLocation:  { select: { id: true, name: true } },
          destWarehouse:   { select: { id: true, name: true } },
          destLocation:    { select: { id: true, name: true } },
          createdBy:       { select: { id: true, name: true } },
          lines: {
            include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
          },
        },
      }),
      prisma.internalTransfer.count({ where }),
    ]);

    return paginated(res, transfers, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/transfers/:id
const getTransfer = async (req, res, next) => {
  try {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id: req.params.id },
      include: {
        sourceWarehouse: true,
        sourceLocation:  true,
        destWarehouse:   true,
        destLocation:    true,
        createdBy:       { select: { id: true, name: true, email: true } },
        lines: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!transfer) return error(res, "Internal transfer not found.", 404);
    return success(res, transfer);
  } catch (err) { next(err); }
};

// POST /api/transfers
const createTransfer = async (req, res, next) => {
  try {
    const {
      sourceWarehouseId, sourceLocationId,
      destWarehouseId, destLocationId,
      scheduledAt, notes, lines,
    } = req.body;

    if (sourceWarehouseId === destWarehouseId && sourceLocationId === destLocationId) {
      return error(res, "Source and destination cannot be the same.", 400);
    }

    const reference = generateReference("TRF");

    const transfer = await prisma.internalTransfer.create({
      data: {
        reference,
        sourceWarehouseId,
        sourceLocationId: sourceLocationId || null,
        destWarehouseId,
        destLocationId: destLocationId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes,
        createdById: req.user.id,
        status: "DRAFT",
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: parseFloat(l.quantity),
          })),
        },
      },
      include: {
        sourceWarehouse: { select: { id: true, name: true } },
        destWarehouse:   { select: { id: true, name: true } },
        lines: { include: { product: true } },
      },
    });

    return created(res, transfer, "Internal transfer created.");
  } catch (err) { next(err); }
};

// PUT /api/transfers/:id
const updateTransfer = async (req, res, next) => {
  try {
    const existing = await prisma.internalTransfer.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Transfer not found.", 404);
    if (existing.status === "DONE") return error(res, "Cannot edit a completed transfer.", 400);
    if (existing.status === "CANCELED") return error(res, "Cannot edit a canceled transfer.", 400);

    const {
      sourceWarehouseId, sourceLocationId,
      destWarehouseId, destLocationId,
      scheduledAt, notes, status, lines,
    } = req.body;

    if (lines) {
      await prisma.transferLine.deleteMany({ where: { transferId: req.params.id } });
      await prisma.transferLine.createMany({
        data: lines.map((l) => ({
          transferId: req.params.id,
          productId: l.productId,
          quantity: parseFloat(l.quantity),
        })),
      });
    }

    const transfer = await prisma.internalTransfer.update({
      where: { id: req.params.id },
      data: {
        sourceWarehouseId, sourceLocationId: sourceLocationId || null,
        destWarehouseId,   destLocationId:   destLocationId   || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        notes, status,
      },
      include: {
        sourceWarehouse: { select: { id: true, name: true } },
        destWarehouse:   { select: { id: true, name: true } },
        lines: { include: { product: true } },
      },
    });

    return success(res, transfer, "Transfer updated.");
  } catch (err) { next(err); }
};

// POST /api/transfers/:id/validate  — move stock between locations
const validateTransfer = async (req, res, next) => {
  try {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!transfer) return error(res, "Transfer not found.", 404);
    if (transfer.status === "DONE")     return error(res, "Transfer already completed.", 400);
    if (transfer.status === "CANCELED") return error(res, "Transfer is canceled.", 400);
    if (!transfer.lines.length)         return error(res, "Transfer has no lines.", 400);

    // Pre-check: enough stock at source for all lines
    for (const line of transfer.lines) {
      const sourceStock = await prisma.stockItem.findFirst({
        where: {
          productId:   line.productId,
          warehouseId: transfer.sourceWarehouseId,
          locationId:  transfer.sourceLocationId || null,
        },
      });
      if (!sourceStock || sourceStock.quantity < line.quantity) {
        return error(
          res,
          `Insufficient stock for product ${line.productId} at source. Available: ${sourceStock?.quantity || 0}.`,
          400
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        // ── Deduct from source ──────────────────────────────────────
        const sourceStock = await tx.stockItem.findFirst({
          where: {
            productId:   line.productId,
            warehouseId: transfer.sourceWarehouseId,
            locationId:  transfer.sourceLocationId || null,
          },
        });
        const srcNewQty = sourceStock.quantity - line.quantity;
        await tx.stockItem.update({ where: { id: sourceStock.id }, data: { quantity: srcNewQty } });

        await tx.stockLedger.create({
          data: {
            productId:      line.productId,
            warehouseId:    transfer.sourceWarehouseId,
            locationId:     transfer.sourceLocationId || null,
            quantityChange: -line.quantity,
            quantityAfter:  srcNewQty,
            referenceType:  "INTERNAL",
            referenceId:    transfer.id,
            notes:          `Transfer ${transfer.reference} — stock out`,
            createdBy:      req.user.id,
          },
        });

        // ── Add to destination ──────────────────────────────────────
        const destStock = await tx.stockItem.findFirst({
          where: {
            productId:   line.productId,
            warehouseId: transfer.destWarehouseId,
            locationId:  transfer.destLocationId || null,
          },
        });

        let destNewQty;
        if (destStock) {
          destNewQty = destStock.quantity + line.quantity;
          await tx.stockItem.update({ where: { id: destStock.id }, data: { quantity: destNewQty } });
        } else {
          destNewQty = line.quantity;
          await tx.stockItem.create({
            data: {
              productId:   line.productId,
              warehouseId: transfer.destWarehouseId,
              locationId:  transfer.destLocationId || null,
              quantity:    line.quantity,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            productId:      line.productId,
            warehouseId:    transfer.destWarehouseId,
            locationId:     transfer.destLocationId || null,
            quantityChange: line.quantity,
            quantityAfter:  destNewQty,
            referenceType:  "INTERNAL",
            referenceId:    transfer.id,
            notes:          `Transfer ${transfer.reference} — stock in`,
            createdBy:      req.user.id,
          },
        });
      }

      await tx.internalTransfer.update({
        where: { id: transfer.id },
        data: { status: "DONE", completedAt: new Date() },
      });
    });

    return success(res, null, "Transfer completed. Stock moved successfully.");
  } catch (err) { next(err); }
};

// POST /api/transfers/:id/cancel
const cancelTransfer = async (req, res, next) => {
  try {
    const transfer = await prisma.internalTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return error(res, "Transfer not found.", 404);
    if (transfer.status === "DONE") return error(res, "Cannot cancel a completed transfer.", 400);

    await prisma.internalTransfer.update({
      where: { id: req.params.id },
      data: { status: "CANCELED" },
    });
    return success(res, null, "Transfer canceled.");
  } catch (err) { next(err); }
};

module.exports = {
  getTransfers, getTransfer, createTransfer, updateTransfer,
  validateTransfer, cancelTransfer,
};
