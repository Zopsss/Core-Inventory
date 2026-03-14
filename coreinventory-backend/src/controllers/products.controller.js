// src/controllers/products.controller.js
const prisma = require("../utils/prisma");
const { success, created, error, paginated } = require("../utils/response");

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, categoryId, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: "asc" },
        include: {
          category: { select: { id: true, name: true } },
          stockItems: {
            include: {
              warehouse: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
          reorderRules: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return paginated(res, products, total, page, limit);
  } catch (err) { next(err); }
};

// GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        stockItems: {
          include: {
            warehouse: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
          },
        },
        reorderRules: true,
      },
    });
    if (!product) return error(res, "Product not found.", 404);
    return success(res, product);
  } catch (err) { next(err); }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, description, categoryId, unitOfMeasure, minStockLevel, initialStock, warehouseId } = req.body;

    const product = await prisma.product.create({
      data: { name, sku, description, categoryId, unitOfMeasure, minStockLevel: minStockLevel || 0 },
      include: { category: true },
    });

    // Set initial stock if provided
    if (initialStock && warehouseId) {
      await prisma.stockItem.create({
        data: { productId: product.id, warehouseId, quantity: initialStock },
      });
      await prisma.stockLedger.create({
        data: {
          productId: product.id,
          warehouseId,
          quantityChange: initialStock,
          quantityAfter: initialStock,
          referenceType: "ADJUSTMENT",
          referenceId: product.id,
          notes: "Initial stock entry",
          createdBy: req.user.id,
        },
      });
    }

    return created(res, product, "Product created successfully.");
  } catch (err) { next(err); }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const { name, description, categoryId, unitOfMeasure, minStockLevel } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, description, categoryId, unitOfMeasure, minStockLevel },
      include: { category: true },
    });
    return success(res, product, "Product updated.");
  } catch (err) { next(err); }
};

// DELETE /api/products/:id  (soft delete)
const deleteProduct = async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return success(res, null, "Product deactivated.");
  } catch (err) { next(err); }
};

// GET /api/products/:id/stock
const getProductStock = async (req, res, next) => {
  try {
    const stockItems = await prisma.stockItem.findMany({
      where: { productId: req.params.id },
      include: {
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    const total = stockItems.reduce((sum, s) => sum + s.quantity, 0);
    return success(res, { stockItems, total });
  } catch (err) { next(err); }
};

// GET /api/products/:id/history
const getProductHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [entries, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where: { productId: req.params.id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockLedger.count({ where: { productId: req.params.id } }),
    ]);

    return paginated(res, entries, total, page, limit);
  } catch (err) { next(err); }
};

// ── Categories ─────────────────────────────

// GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return success(res, categories);
  } catch (err) { next(err); }
};

// POST /api/products/categories
const createCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    return created(res, category, "Category created.");
  } catch (err) { next(err); }
};

// PUT /api/products/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return success(res, category, "Category updated.");
  } catch (err) { next(err); }
};

// DELETE /api/products/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const count = await prisma.product.count({ where: { categoryId: req.params.id, isActive: true } });
    if (count > 0) return error(res, "Cannot delete category with active products.", 400);
    await prisma.category.delete({ where: { id: req.params.id } });
    return success(res, null, "Category deleted.");
  } catch (err) { next(err); }
};

// ── Reorder Rules ─────────────────────────

// POST /api/products/:id/reorder-rules
const upsertReorderRule = async (req, res, next) => {
  try {
    const { minQty, maxQty } = req.body;
    const rule = await prisma.reorderRule.upsert({
      where: { id: req.body.ruleId || "" },
      create: { productId: req.params.id, minQty, maxQty },
      update: { minQty, maxQty },
    });
    return success(res, rule, "Reorder rule saved.");
  } catch (err) { next(err); }
};

module.exports = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getProductStock, getProductHistory,
  getCategories, createCategory, updateCategory, deleteCategory,
  upsertReorderRule,
};
