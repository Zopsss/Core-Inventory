// src/app.js
require("dotenv").config();

const express      = require("express");
const helmet       = require("helmet");
const cors         = require("cors");
const morgan       = require("morgan");
const rateLimit    = require("express-rate-limit");

const { errorHandler, notFound } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// ── Routes ─────────────────────────────────────────────────────────
const authRoutes        = require("./routes/auth.routes");
const dashboardRoutes   = require("./routes/dashboard.routes");
const productRoutes     = require("./routes/products.routes");
const warehouseRoutes   = require("./routes/warehouse.routes");
const receiptRoutes     = require("./routes/receipts.routes");
const deliveryRoutes    = require("./routes/delivery.routes");
const transferRoutes    = require("./routes/transfers.routes");
const adjustmentRoutes  = require("./routes/adjustments.routes");
const ledgerRoutes      = require("./routes/ledger.routes");
const userRoutes        = require("./routes/users.routes");

const app = express();

// ── Security ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting ───────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts. Please try again later." },
});

app.use(limiter);

// ── Request parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ── Health check ────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CoreInventory API is running.",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ───────────────────────────────────────────────────────
app.use("/api/auth",        authLimiter, authRoutes);
app.use("/api/dashboard",   dashboardRoutes);
app.use("/api/products",    productRoutes);
app.use("/api/warehouses",  warehouseRoutes);
app.use("/api/receipts",    receiptRoutes);
app.use("/api/deliveries",  deliveryRoutes);
app.use("/api/transfers",   transferRoutes);
app.use("/api/adjustments", adjustmentRoutes);
app.use("/api/ledger",      ledgerRoutes);
app.use("/api/users",       userRoutes);

// ── 404 + Error handler ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
