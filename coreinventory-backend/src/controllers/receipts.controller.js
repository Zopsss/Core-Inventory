// src/controllers/receipts.controller.js
const prisma = require("../utils/prisma");
const { success, created, error, paginated } = require("../utils/response");
const { generateReference } = require("../utils/reference");

// GET /api/receipts
const getReceipts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, supplierId, search, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (search) where.reference = { contains: search, mode: "insensitive" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          lines: { include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } } },
        },
      }),
      prisma.receipt.count({ where }),
    ]);

    return paginated(res, receipts, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/receipts/:id
const getReceipt = async (req, res, next) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!receipt) return error(res, "Receipt not found.", 404);
    return success(res, receipt);
  } catch (err) { next(err); }
};

// POST /api/receipts
const createReceipt = async (req, res, next) => {
  try {
    const { supplierId, notes, lines } = req.body;
    const reference = generateReference("REC");

    const receipt = await prisma.receipt.create({
      data: {
        reference,
        supplierId,
        notes,
        createdById: req.user.id,
        status: "DRAFT",
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            expectedQty: l.expectedQty,
            receivedQty: 0,
            unitCost: l.unitCost || null,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: { include: { product: true } },
      },
    });

    return created(res, receipt, "Receipt created.");
  } catch (err) { next(err); }
};

// PUT /api/receipts/:id
const updateReceipt = async (req, res, next) => {
  try {
    const existing = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!existing) return error(res, "Receipt not found.", 404);
    if (existing.status === "DONE") return error(res, "Cannot edit a validated receipt.", 400);
    if (existing.status === "CANCELED") return error(res, "Cannot edit a canceled receipt.", 400);

    const { supplierId, notes, status, lines } = req.body;

    // Update lines if provided
    if (lines) {
      await prisma.receiptLine.deleteMany({ where: { receiptId: req.params.id } });
      await prisma.receiptLine.createMany({
        data: lines.map((l) => ({
          receiptId: req.params.id,
          productId: l.productId,
          expectedQty: l.expectedQty,
          receivedQty: l.receivedQty || 0,
          unitCost: l.unitCost || null,
        })),
      });
    }

    const receipt = await prisma.receipt.update({
      where: { id: req.params.id },
      data: { supplierId, notes, status },
      include: {
        supplier: true,
        lines: { include: { product: true } },
      },
    });

    return success(res, receipt, "Receipt updated.");
  } catch (err) { next(err); }
};

// POST /api/receipts/:id/validate  — confirm receipt, increase stock
const validateReceipt = async (req, res, next) => {
  try {
    const { warehouseId, locationId } = req.body;

    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!receipt) return error(res, "Receipt not found.", 404);
    if (receipt.status === "DONE") return error(res, "Receipt already validated.", 400);
    if (receipt.status === "CANCELED") return error(res, "Cannot validate a canceled receipt.", 400);
    if (!receipt.lines.length) return error(res, "Receipt has no lines.", 400);

    // Update stock in a transaction
    await prisma.$transaction(async (tx) => {
      for (const line of receipt.lines) {
        const qty = line.receivedQty || line.expectedQty;

        // Upsert stock item
        const existing = await tx.stockItem.findFirst({
          where: { productId: line.productId, warehouseId, locationId: locationId || null },
        });

        let newQty;
        if (existing) {
          newQty = existing.quantity + qty;
          await tx.stockItem.update({
            where: { id: existing.id },
            data: { quantity: newQty },
          });
        } else {
          newQty = qty;
          await tx.stockItem.create({
            data: { productId: line.productId, warehouseId, locationId: locationId || null, quantity: qty },
          });
        }

        // Log to ledger
        await tx.stockLedger.create({
          data: {
            productId: line.productId,
            warehouseId,
            locationId: locationId || null,
            quantityChange: qty,
            quantityAfter: newQty,
            referenceType: "RECEIPT",
            referenceId: receipt.id,
            notes: `Receipt ${receipt.reference} validated`,
            createdBy: req.user.id,
          },
        });
      }

      await tx.receipt.update({
        where: { id: receipt.id },
        data: { status: "DONE", validatedAt: new Date() },
      });
    });

    return success(res, null, "Receipt validated. Stock updated.");
  } catch (err) { next(err); }
};

// POST /api/receipts/:id/cancel
const cancelReceipt = async (req, res, next) => {
  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!receipt) return error(res, "Receipt not found.", 404);
    if (receipt.status === "DONE") return error(res, "Cannot cancel a validated receipt.", 400);

    await prisma.receipt.update({
      where: { id: req.params.id },
      data: { status: "CANCELED" },
    });
    return success(res, null, "Receipt canceled.");
  } catch (err) { next(err); }
};

// ── Suppliers ──────────────────────────────

// GET /api/receipts/suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return success(res, suppliers);
  } catch (err) { next(err); }
};

// POST /api/receipts/suppliers
const createSupplier = async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    return created(res, supplier, "Supplier created.");
  } catch (err) { next(err); }
};

// PUT /api/receipts/suppliers/:id
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return success(res, supplier, "Supplier updated.");
  } catch (err) { next(err); }
};

module.exports = {
  getReceipts, getReceipt, createReceipt, updateReceipt,
  validateReceipt, cancelReceipt,
  getSuppliers, createSupplier, updateSupplier,
};
