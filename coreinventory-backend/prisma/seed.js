// prisma/seed.js
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("Admin@1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@coreinventory.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@coreinventory.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@coreinventory.com" },
    update: {},
    create: {
      name: "Inventory Manager",
      email: "manager@coreinventory.com",
      password: await bcrypt.hash("Manager@1234", 10),
      role: "INVENTORY_MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@coreinventory.com" },
    update: {},
    create: {
      name: "Warehouse Staff",
      email: "staff@coreinventory.com",
      password: await bcrypt.hash("Staff@1234", 10),
      role: "WAREHOUSE_STAFF",
    },
  });

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { name: "Main Warehouse" },
    update: {},
    create: {
      name: "Main Warehouse",
      address: "123 Industrial Zone, Ahmedabad",
    },
  });

  const prodWarehouse = await prisma.warehouse.upsert({
    where: { name: "Production Floor" },
    update: {},
    create: {
      name: "Production Floor",
      address: "123 Industrial Zone, Ahmedabad - B Block",
    },
  });

  await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: mainWarehouse.id, code: "RACK-A1" },
    },
    update: {},
    create: { name: "Rack A1", code: "RACK-A1", warehouseId: mainWarehouse.id },
  });

  await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: mainWarehouse.id, code: "RACK-B1" },
    },
    update: {},
    create: { name: "Rack B1", code: "RACK-B1", warehouseId: mainWarehouse.id },
  });

  await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: prodWarehouse.id, code: "PROD-RACK-1" },
    },
    update: {},
    create: {
      name: "Production Rack 1",
      code: "PROD-RACK-1",
      warehouseId: prodWarehouse.id,
    },
  });

  const rawMat = await prisma.category.upsert({
    where: { name: "Raw Materials" },
    update: {},
    create: { name: "Raw Materials", description: "Unprocessed materials" },
  });

  const packaging = await prisma.category.upsert({
    where: { name: "Packaging" },
    update: {},
    create: { name: "Packaging", description: "Packaging materials" },
  });

  const finishedGoods = await prisma.category.upsert({
    where: { name: "Finished Goods" },
    update: {},
    create: { name: "Finished Goods", description: "Ready to sell products" },
  });

  await prisma.product.upsert({
    where: { sku: "STEEL-ROD-001" },
    update: {},
    create: {
      name: "Steel Rods",
      sku: "STEEL-ROD-001",
      description: "Industrial steel rods 10mm diameter",
      categoryId: rawMat.id,
      unitOfMeasure: "KG",
      minStockLevel: 20,
    },
  });

  await prisma.product.upsert({
    where: { sku: "CHAIR-FIN-001" },
    update: {},
    create: {
      name: "Office Chair",
      sku: "CHAIR-FIN-001",
      description: "Standard office chair",
      categoryId: finishedGoods.id,
      unitOfMeasure: "PIECE",
      minStockLevel: 5,
    },
  });

  await prisma.product.upsert({
    where: { sku: "BOX-CARD-001" },
    update: {},
    create: {
      name: "Cardboard Box",
      sku: "BOX-CARD-001",
      description: "Standard shipping box 30x30x30cm",
      categoryId: packaging.id,
      unitOfMeasure: "PIECE",
      minStockLevel: 50,
    },
  });

  await prisma.supplier.upsert({
    where: { id: "supplier-seed-001" },
    update: {},
    create: {
      id: "supplier-seed-001",
      name: "SteelCo Industries",
      email: "supply@steelco.com",
      phone: "+91-9876543210",
      address: "Industrial Area, Surat",
    },
  });

  console.log("✅ Seeding complete!");
  console.log("👤 Admin:   admin@coreinventory.com / Admin@1234");
  console.log("👤 Manager: manager@coreinventory.com / Manager@1234");
  console.log("👤 Staff:   staff@coreinventory.com / Staff@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
