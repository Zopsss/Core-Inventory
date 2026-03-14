// src/controllers/delivery.controller.js
const prisma = require("../utils/prisma");
const { success, created, error, paginated } = require("../utils/response");
const { generateReference } = require("../utils/reference");

// GET /api/deliveries
const getDeliveries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [deliveries, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          lines: { include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } } },
        },
      }),
      prisma.deliveryOrder.count({ where }),
    ]);

    return paginated(res, deliveries, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/deliveries/:id
const getDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!delivery) return error(res, "Delivery order not found.", 404);
    return success(res, delivery);
  } catch (err) { next(err); }
};

// POST /api/deliveries
const createDelivery = async (req, res, next) => {
  try {
    const { customerName, customerEmail, notes, lines } = req.body;
    const reference = generateReference("DEL");

    const delivery = await prisma.deliveryOrder.create({
      data: {
        reference,
        customerName,
        customerEmail,
        notes,
        createdById: req.user.id,
        status: "DRAFT",
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            orderedQty: l.orderedQty,
            deliveredQty: 0,
            warehouseId: l.warehouseId || null,
          })),
        },
      },
      include: {
        lines: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return created(res, delivery, "Delivery order created.");
  } catch (err) { next(err); }
};

// PUT /api/deliveries/:id
const updateDelivery = async (req, res, next) => {
  try {
    const existing = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Delivery order not found.", 404);
    if (existing.status === "DONE") return error(res, "Cannot edit a validated delivery.", 400);
    if (existing.status === "CANCELED") return error(res, "Cannot edit a canceled delivery.", 400);

    const { customerName, customerEmail, notes, status, lines } = req.body;

    if (lines) {
      await prisma.deliveryLine.deleteMany({ where: { deliveryId: req.params.id } });
      await prisma.deliveryLine.createMany({
        data: lines.map((l) => ({
          deliveryId: req.params.id,
          productId: l.productId,
          orderedQty: l.orderedQty,
          deliveredQty: l.deliveredQty || 0,
          warehouseId: l.warehouseId || null,
        })),
      });
    }

    const delivery = await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data: { customerName, customerEmail, notes, status },
      include: { lines: { include: { product: true } } },
    });

    return success(res, delivery, "Delivery order updated.");
  } catch (err) { next(err); }
};

// POST /api/deliveries/:id/pick  — mark as picked
const pickDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!delivery) return error(res, "Delivery order not found.", 404);
    if (delivery.status === "DONE") return error(res, "Already validated.", 400);
    if (delivery.status === "CANCELED") return error(res, "Order is canceled.", 400);

    await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data: { status: "WAITING", pickedAt: new Date() },
    });

    return success(res, null, "Items marked as picked.");
  } catch (err) { next(err); }
};

// POST /api/deliveries/:id/pack  — mark as packed
const packDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!delivery) return error(res, "Delivery order not found.", 404);
    if (!["WAITING", "READY"].includes(delivery.status)) {
      return error(res, "Items must be picked before packing.", 400);
    }

    await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data: { status: "READY", packedAt: new Date() },
    });

    return success(res, null, "Items marked as packed.");
  } catch (err) { next(err); }
};

// POST /api/deliveries/:id/validate  — decrease stock
const validateDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!delivery) return error(res, "Delivery order not found.", 404);
    if (delivery.status === "DONE") return error(res, "Already validated.", 400);
    if (delivery.status === "CANCELED") return error(res, "Order is canceled.", 400);
    if (!delivery.lines.length) return error(res, "Delivery has no lines.", 400);

    // Check stock availability first
    for (const line of delivery.lines) {
      const qty = line.deliveredQty || line.orderedQty;
      const warehouseId = line.warehouseId;
      if (!warehouseId) return error(res, `No warehouse set for line with product ${line.productId}.`, 400);

      const stock = await prisma.stockItem.findFirst({
        where: { productId: line.productId, warehouseId },
      });

      if (!stock || stock.quantity < qty) {
        return error(res, `Insufficient stock for product ${line.productId}. Available: ${stock?.quantity || 0}.`, 400);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const line of delivery.lines) {
        const qty = line.deliveredQty || line.orderedQty;
        const warehouseId = line.warehouseId;

        const stock = await tx.stockItem.findFirst({
          where: { productId: line.productId, warehouseId },
        });

        const newQty = stock.quantity - qty;
        await tx.stockItem.update({
          where: { id: stock.id },
          data: { quantity: newQty },
        });

        await tx.stockLedger.create({
          data: {
            productId: line.productId,
            warehouseId,
            quantityChange: -qty,
            quantityAfter: newQty,
            referenceType: "DELIVERY",
            referenceId: delivery.id,
            notes: `Delivery ${delivery.reference} to ${delivery.customerName}`,
            createdBy: req.user.id,
          },
        });
      }

      await tx.deliveryOrder.update({
        where: { id: delivery.id },
        data: { status: "DONE", validatedAt: new Date() },
      });
    });

    return success(res, null, "Delivery validated. Stock decreased.");
  } catch (err) { next(err); }
};

// POST /api/deliveries/:id/cancel
const cancelDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.deliveryOrder.findUnique({ where: { id: req.params.id } });
    if (!delivery) return error(res, "Delivery not found.", 404);
    if (delivery.status === "DONE") return error(res, "Cannot cancel a validated delivery.", 400);

    await prisma.deliveryOrder.update({
      where: { id: req.params.id },
      data: { status: "CANCELED" },
    });
    return success(res, null, "Delivery order canceled.");
  } catch (err) { next(err); }
};

module.exports = {
  getDeliveries, getDelivery, createDelivery, updateDelivery,
  pickDelivery, packDelivery, validateDelivery, cancelDelivery,
};
