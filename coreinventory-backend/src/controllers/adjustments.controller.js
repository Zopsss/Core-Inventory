// src/controllers/adjustments.controller.js
const prisma = require("../utils/prisma");
const { success, created, error, paginated } = require("../utils/response");
const { generateReference } = require("../utils/reference");

// GET /api/adjustments
const getAdjustments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (search) where.reference = { contains: search, mode: "insensitive" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
            },
          },
        },
      }),
      prisma.stockAdjustment.count({ where }),
    ]);

    return paginated(res, adjustments, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/adjustments/:id
const getAdjustment = async (req, res, next) => {
  try {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!adjustment) return error(res, "Adjustment not found.", 404);
    return success(res, adjustment);
  } catch (err) { next(err); }
};

// POST /api/adjustments
// lines: [{ productId, warehouseId, locationId?, countedQty, reason }]
const createAdjustment = async (req, res, next) => {
  try {
    const { notes, lines } = req.body;

    // Fetch current system quantities for each line
    const enrichedLines = await Promise.all(
      lines.map(async (l) => {
        const stockItem = await prisma.stockItem.findFirst({
          where: {
            productId:   l.productId,
            warehouseId: l.warehouseId,
            locationId:  l.locationId || null,
          },
        });
        const systemQty = stockItem ? stockItem.quantity : 0;
        const difference = l.countedQty - systemQty;
        return { ...l, systemQty, difference };
      })
    );

    const reference = generateReference("ADJ");

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        reference,
        notes,
        createdById: req.user.id,
        status: "DRAFT",
        lines: {
          create: enrichedLines.map((l) => ({
            productId:   l.productId,
            warehouseId: l.warehouseId,
            locationId:  l.locationId || null,
            countedQty:  l.countedQty,
            systemQty:   l.systemQty,
            difference:  l.difference,
            reason:      l.reason || "CORRECTION",
          })),
        },
      },
      include: {
        lines: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return created(res, adjustment, "Stock adjustment created.");
  } catch (err) { next(err); }
};

// PUT /api/adjustments/:id
const updateAdjustment = async (req, res, next) => {
  try {
    const existing = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Adjustment not found.", 404);
    if (existing.status === "DONE")     return error(res, "Cannot edit a validated adjustment.", 400);
    if (existing.status === "CANCELED") return error(res, "Cannot edit a canceled adjustment.", 400);

    const { notes, lines } = req.body;

    if (lines) {
      const enrichedLines = await Promise.all(
        lines.map(async (l) => {
          const stockItem = await prisma.stockItem.findFirst({
            where: {
              productId:   l.productId,
              warehouseId: l.warehouseId,
              locationId:  l.locationId || null,
            },
          });
          const systemQty = stockItem ? stockItem.quantity : 0;
          return { ...l, systemQty, difference: l.countedQty - systemQty };
        })
      );

      await prisma.adjustmentLine.deleteMany({ where: { adjustmentId: req.params.id } });
      await prisma.adjustmentLine.createMany({
        data: enrichedLines.map((l) => ({
          adjustmentId: req.params.id,
          productId:    l.productId,
          warehouseId:  l.warehouseId,
          locationId:   l.locationId || null,
          countedQty:   l.countedQty,
          systemQty:    l.systemQty,
          difference:   l.difference,
          reason:       l.reason || "CORRECTION",
        })),
      });
    }

    const adjustment = await prisma.stockAdjustment.update({
      where: { id: req.params.id },
      data: { notes },
      include: { lines: { include: { product: true } } },
    });

    return success(res, adjustment, "Adjustment updated.");
  } catch (err) { next(err); }
};

// POST /api/adjustments/:id/validate  — apply corrections to stock
const validateAdjustment = async (req, res, next) => {
  try {
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!adjustment) return error(res, "Adjustment not found.", 404);
    if (adjustment.status === "DONE")     return error(res, "Adjustment already validated.", 400);
    if (adjustment.status === "CANCELED") return error(res, "Adjustment is canceled.", 400);
    if (!adjustment.lines.length)         return error(res, "Adjustment has no lines.", 400);

    await prisma.$transaction(async (tx) => {
      for (const line of adjustment.lines) {
        if (line.difference === 0) continue; // nothing to change

        const stockItem = await tx.stockItem.findFirst({
          where: {
            productId:   line.productId,
            warehouseId: line.warehouseId,
            locationId:  line.locationId || null,
          },
        });

        let newQty = line.countedQty;

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantity: newQty },
          });
        } else {
          await tx.stockItem.create({
            data: {
              productId:   line.productId,
              warehouseId: line.warehouseId,
              locationId:  line.locationId || null,
              quantity:    newQty,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            productId:      line.productId,
            warehouseId:    line.warehouseId,
            locationId:     line.locationId || null,
            quantityChange: line.difference,
            quantityAfter:  newQty,
            referenceType:  "ADJUSTMENT",
            referenceId:    adjustment.id,
            notes:          `Adjustment ${adjustment.reference} — reason: ${line.reason}`,
            createdBy:      req.user.id,
          },
        });
      }

      await tx.stockAdjustment.update({
        where: { id: adjustment.id },
        data: { status: "DONE", validatedAt: new Date() },
      });
    });

    return success(res, null, "Stock adjustment validated. Stock corrected.");
  } catch (err) { next(err); }
};

// POST /api/adjustments/:id/cancel
const cancelAdjustment = async (req, res, next) => {
  try {
    const adjustment = await prisma.stockAdjustment.findUnique({ where: { id: req.params.id } });
    if (!adjustment) return error(res, "Adjustment not found.", 404);
    if (adjustment.status === "DONE") return error(res, "Cannot cancel a validated adjustment.", 400);

    await prisma.stockAdjustment.update({
      where: { id: req.params.id },
      data: { status: "CANCELED" },
    });
    return success(res, null, "Adjustment canceled.");
  } catch (err) { next(err); }
};

module.exports = {
  getAdjustments, getAdjustment, createAdjustment, updateAdjustment,
  validateAdjustment, cancelAdjustment,
};
