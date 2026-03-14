// src/routes/products.routes.js
const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");
const ctrl     = require("../controllers/products.controller");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const mgr = ["ADMIN", "INVENTORY_MANAGER"];

// ── Categories (must come BEFORE /:id routes) ─────────────────────

/**
 * @route  GET /api/products/categories
 * @desc   List all categories
 * @access Private
 */
router.get("/categories", authenticate, ctrl.getCategories);

/**
 * @route  POST /api/products/categories
 * @desc   Create category
 * @access Manager+
 */
router.post(
  "/categories",
  authenticate, authorize(...mgr),
  [body("name").trim().notEmpty()],
  validate,
  ctrl.createCategory
);

/**
 * @route  PUT /api/products/categories/:id
 * @desc   Update category
 * @access Manager+
 */
router.put(
  "/categories/:id",
  authenticate, authorize(...mgr),
  [body("name").trim().notEmpty()],
  validate,
  ctrl.updateCategory
);

/**
 * @route  DELETE /api/products/categories/:id
 * @desc   Delete category (only if no active products)
 * @access Admin
 */
router.delete("/categories/:id", authenticate, authorize("ADMIN"), ctrl.deleteCategory);

// ── Products ──────────────────────────────────────────────────────

/**
 * @route  GET /api/products
 * @desc   List products with pagination
 * @access Private
 * @query  page, limit, search, categoryId, isActive
 */
router.get("/", authenticate, ctrl.getProducts);

/**
 * @route  GET /api/products/:id
 * @desc   Get single product with stock breakdown
 * @access Private
 */
router.get("/:id", authenticate, ctrl.getProduct);

/**
 * @route  GET /api/products/:id/stock
 * @desc   Stock availability per location
 * @access Private
 */
router.get("/:id/stock", authenticate, ctrl.getProductStock);

/**
 * @route  GET /api/products/:id/history
 * @desc   Full ledger history for a product
 * @access Private
 */
router.get("/:id/history", authenticate, ctrl.getProductHistory);

/**
 * @route  POST /api/products
 * @desc   Create product
 * @access Manager+
 */
router.post(
  "/",
  authenticate, authorize(...mgr),
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("sku").trim().notEmpty().withMessage("SKU is required."),
    body("categoryId").isUUID().withMessage("Valid categoryId required."),
    body("unitOfMeasure").notEmpty(),
    body("minStockLevel").optional({ values: "falsy" }).isFloat({ min: 0 }),
    body("initialStock").optional({ values: "falsy" }).isFloat({ min: 0 }),
  ],
  validate,
  ctrl.createProduct
);

/**
 * @route  PUT /api/products/:id
 * @desc   Update product details (not SKU)
 * @access Manager+
 */
router.put(
  "/:id",
  authenticate, authorize(...mgr),
  [
    body("name").optional().trim().notEmpty(),
    body("minStockLevel").optional().isFloat({ min: 0 }),
  ],
  validate,
  ctrl.updateProduct
);

/**
 * @route  DELETE /api/products/:id
 * @desc   Soft-delete (deactivate) product
 * @access Admin
 */
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.deleteProduct);

/**
 * @route  POST /api/products/:id/reorder-rules
 * @desc   Upsert reorder rule for a product
 * @access Manager+
 */
router.post(
  "/:id/reorder-rules",
  authenticate, authorize(...mgr),
  [
    body("minQty").isFloat({ min: 0 }),
    body("maxQty").isFloat({ min: 0 }),
  ],
  validate,
  ctrl.upsertReorderRule
);

module.exports = router;
