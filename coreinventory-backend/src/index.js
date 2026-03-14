// src/index.js
require("dotenv").config();

const app    = require("./app");
const prisma = require("./utils/prisma");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify DB connection
    await prisma.$connect();
    logger.info("✅ Database connected successfully.");

    app.listen(PORT, () => {
      logger.info(`🚀 CoreInventory API running on port ${PORT}`);
      logger.info(`   Environment : ${process.env.NODE_ENV || "development"}`);
      logger.info(`   Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
