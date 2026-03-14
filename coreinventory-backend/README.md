# CoreInventory — Backend API

A production-ready REST API for the CoreInventory Management System built with **Express**, **Prisma**, and **PostgreSQL**.

---

## Tech Stack

| Layer        | Technology                     |
|--------------|-------------------------------|
| Runtime      | Node.js                        |
| Framework    | Express.js                     |
| ORM          | Prisma                         |
| Database     | PostgreSQL                     |
| Auth         | JWT + bcrypt                   |
| Validation   | express-validator              |
| Email (OTP)  | Nodemailer                     |
| Logging      | Winston + Morgan               |
| Security     | Helmet, CORS, Rate limiting    |

---

## Project Structure

```
coreinventory-backend/
├── prisma/
│   ├── schema.prisma       # Full DB schema
│   └── seed.js             # Seed data (users, warehouses, products)
├── src/
│   ├── controllers/        # Business logic per module
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── products.controller.js
│   │   ├── warehouse.controller.js
│   │   ├── receipts.controller.js
│   │   ├── delivery.controller.js
│   │   ├── transfers.controller.js
│   │   ├── adjustments.controller.js
│   │   ├── ledger.controller.js
│   │   └── users.controller.js
│   ├── routes/             # Route definitions with validation rules
│   ├── middleware/
│   │   ├── auth.js         # JWT authenticate + role authorize
│   │   ├── validate.js     # express-validator error formatter
│   │   └── errorHandler.js # Global error handler + 404
│   ├── utils/
│   │   ├── prisma.js       # Singleton Prisma client
│   │   ├── response.js     # Standardised response helpers
│   │   ├── reference.js    # Auto-reference generator (REC-, DEL-, TRF-, ADJ-)
│   │   ├── mailer.js       # OTP email sender
│   │   └── logger.js       # Winston logger
│   ├── app.js              # Express app setup
│   └── index.js            # Server entry point
└── package.json
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
```

### 3. Run migrations and generate Prisma client
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed the database
```bash
npm run prisma:seed
```

### 5. Start the server
```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## Seed Credentials

| Role              | Email                        | Password      |
|-------------------|------------------------------|---------------|
| Admin             | admin@coreinventory.com      | Admin@1234    |
| Inventory Manager | manager@coreinventory.com    | Manager@1234  |
| Warehouse Staff   | staff@coreinventory.com      | Staff@1234    |

---

## Authentication

All protected routes require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Roles & Permissions

| Role               | Permissions                                              |
|--------------------|----------------------------------------------------------|
| `ADMIN`            | Full access — all routes including user management       |
| `INVENTORY_MANAGER`| Products, receipts, deliveries, transfers, adjustments   |
| `WAREHOUSE_STAFF`  | View + create transfers, pick/pack deliveries            |

---

## API Reference

### Base URL: `http://localhost:5000/api`

---

### Auth  `/api/auth`

| Method | Route                    | Access  | Description                        |
|--------|--------------------------|---------|-------------------------------------|
| POST   | `/register`              | Public  | Register a new user                 |
| POST   | `/login`                 | Public  | Login — returns JWT                 |
| POST   | `/forgot-password`       | Public  | Send OTP to email                   |
| POST   | `/reset-password`        | Public  | Verify OTP and set new password     |
| GET    | `/me`                    | Private | Get own profile                     |
| PUT    | `/me`                    | Private | Update own profile name             |
| PUT    | `/change-password`       | Private | Change own password                 |

---

### Dashboard  `/api/dashboard`

| Method | Route | Access  | Description                                              |
|--------|-------|---------|----------------------------------------------------------|
| GET    | `/`   | Private | KPIs, low-stock alerts, operation breakdown, recent activity |

**Query params:** `warehouseId`, `categoryId`

---

### Products  `/api/products`

| Method | Route                       | Access   | Description                         |
|--------|-----------------------------|----------|--------------------------------------|
| GET    | `/`                         | Private  | List products (paginated)            |
| POST   | `/`                         | Manager+ | Create product                       |
| GET    | `/:id`                      | Private  | Get product + stock breakdown        |
| PUT    | `/:id`                      | Manager+ | Update product details               |
| DELETE | `/:id`                      | Admin    | Deactivate product                   |
| GET    | `/:id/stock`                | Private  | Stock per warehouse/location         |
| GET    | `/:id/history`              | Private  | Full ledger history for product      |
| POST   | `/:id/reorder-rules`        | Manager+ | Set reorder rule (min/max qty)       |
| GET    | `/categories`               | Private  | List categories                      |
| POST   | `/categories`               | Manager+ | Create category                      |
| PUT    | `/categories/:id`           | Manager+ | Update category                      |
| DELETE | `/categories/:id`           | Admin    | Delete category                      |

**Query params for GET /:** `page`, `limit`, `search`, `categoryId`, `isActive`

---

### Warehouses  `/api/warehouses`

| Method | Route                                      | Access   | Description              |
|--------|--------------------------------------------|----------|--------------------------|
| GET    | `/`                                        | Private  | List warehouses          |
| POST   | `/`                                        | Admin    | Create warehouse         |
| GET    | `/:id`                                     | Private  | Warehouse + stock detail |
| PUT    | `/:id`                                     | Admin    | Update warehouse         |
| DELETE | `/:id`                                     | Admin    | Deactivate warehouse     |
| GET    | `/:id/stock`                               | Private  | Current stock in warehouse |
| GET    | `/:warehouseId/locations`                  | Private  | List locations           |
| POST   | `/:warehouseId/locations`                  | Manager+ | Add location             |
| PUT    | `/:warehouseId/locations/:locationId`      | Manager+ | Update location          |
| DELETE | `/:warehouseId/locations/:locationId`      | Admin    | Deactivate location      |

---

### Receipts (Incoming)  `/api/receipts`

| Method | Route              | Access   | Description                           |
|--------|--------------------|----------|----------------------------------------|
| GET    | `/`                | Private  | List receipts (paginated + filtered)  |
| POST   | `/`                | Manager+ | Create receipt (DRAFT)                |
| GET    | `/:id`             | Private  | Get receipt detail                    |
| PUT    | `/:id`             | Manager+ | Update receipt                        |
| POST   | `/:id/validate`    | Manager+ | Validate → increases stock            |
| POST   | `/:id/cancel`      | Manager+ | Cancel receipt                        |
| GET    | `/suppliers`       | Private  | List suppliers                        |
| POST   | `/suppliers`       | Manager+ | Create supplier                       |
| PUT    | `/suppliers/:id`   | Manager+ | Update supplier                       |

**Validate body:** `{ warehouseId, locationId? }`

---

### Deliveries (Outgoing)  `/api/deliveries`

| Method | Route           | Access   | Description                            |
|--------|-----------------|----------|----------------------------------------|
| GET    | `/`             | Private  | List delivery orders                   |
| POST   | `/`             | Manager+ | Create delivery order (DRAFT)          |
| GET    | `/:id`          | Private  | Get delivery detail                    |
| PUT    | `/:id`          | Manager+ | Update delivery                        |
| POST   | `/:id/pick`     | All      | Mark items as picked → WAITING         |
| POST   | `/:id/pack`     | All      | Mark items as packed → READY           |
| POST   | `/:id/validate` | Manager+ | Validate → decreases stock             |
| POST   | `/:id/cancel`   | Manager+ | Cancel delivery                        |

---

### Internal Transfers  `/api/transfers`

| Method | Route           | Access   | Description                               |
|--------|-----------------|----------|-------------------------------------------|
| GET    | `/`             | Private  | List transfers (filtered)                 |
| POST   | `/`             | All      | Create transfer (DRAFT)                   |
| GET    | `/:id`          | Private  | Get transfer detail                       |
| PUT    | `/:id`          | All      | Update transfer                           |
| POST   | `/:id/validate` | Manager+ | Validate → moves stock between locations  |
| POST   | `/:id/cancel`   | Manager+ | Cancel transfer                           |

---

### Stock Adjustments  `/api/adjustments`

| Method | Route           | Access   | Description                                |
|--------|-----------------|----------|--------------------------------------------|
| GET    | `/`             | Private  | List adjustments                           |
| POST   | `/`             | Manager+ | Create adjustment (auto-calculates diff)   |
| GET    | `/:id`          | Private  | Get adjustment detail                      |
| PUT    | `/:id`          | Manager+ | Update adjustment                          |
| POST   | `/:id/validate` | Manager+ | Validate → corrects stock + logs ledger    |
| POST   | `/:id/cancel`   | Manager+ | Cancel adjustment                          |

---

### Stock Ledger / Move History  `/api/ledger`

| Method | Route      | Access  | Description                            |
|--------|------------|---------|----------------------------------------|
| GET    | `/`        | Private | Full movement history (paginated)      |
| GET    | `/summary` | Private | Current stock summary per product      |

**Query params:** `productId`, `warehouseId`, `locationId`, `referenceType` (RECEIPT/DELIVERY/INTERNAL/ADJUSTMENT), `from`, `to`

---

### Users (Admin only)  `/api/users`

| Method | Route                    | Access | Description                  |
|--------|--------------------------|--------|------------------------------|
| GET    | `/`                      | Admin  | List users                   |
| POST   | `/`                      | Admin  | Create user                  |
| GET    | `/:id`                   | Admin  | Get user detail              |
| PUT    | `/:id`                   | Admin  | Update user role/status      |
| DELETE | `/:id`                   | Admin  | Deactivate user              |
| PUT    | `/:id/reset-password`    | Admin  | Admin reset user password    |

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Paginated:**
```json
{
  "success": true,
  "message": "Success",
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "...",
  "errors": [ ... ]
}
```

---

## Inventory Flow Summary

```
Vendor → [Receipt: validate] → Stock +qty
Stock  → [Delivery: validate] → Stock -qty → Customer
Stock  → [Transfer: validate] → Same qty, new location
Stock  → [Adjustment: validate] → Stock corrected (±diff)

Every operation ──► Stock Ledger (audit trail)
```

---

## Useful Commands

```bash
# Open Prisma Studio (GUI for DB)
npm run prisma:studio

# Generate Prisma client after schema changes
npm run prisma:generate

# Create & apply new migration
npx prisma migrate dev --name <migration_name>

# Reset DB and reseed
npx prisma migrate reset
npm run prisma:seed
```
