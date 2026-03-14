# CoreInventory — Frontend

React + Jotai + TailwindCSS + Vite

## Stack

| Layer        | Technology                    |
|--------------|-------------------------------|
| Framework    | React 18                      |
| Bundler      | Vite                          |
| State        | Jotai (global) + React Query (server) |
| Styling      | TailwindCSS v3                |
| Routing      | React Router DOM v6           |
| Forms        | React Hook Form               |
| HTTP         | Axios                         |
| Notifications| React Hot Toast               |
| Icons        | Lucide React                  |
| Fonts        | Syne (display) + DM Sans (body) + JetBrains Mono |

## Design

Dark-first industrial aesthetic. Accent color `#c8f135` (chartreuse green). Monospace font for references, quantities, and codes. Clean table-heavy layout optimised for warehouse staff on desktop.

## Project Structure

```
src/
├── atoms/         — Jotai atoms (auth token, user, sidebar state)
├── api/           — Axios client + per-module API helpers
├── components/
│   ├── ui/        — Button, Input, Modal, Table, Badge, StatCard, Pagination…
│   └── layout/    — AppShell, Sidebar, AuthGuard
├── pages/
│   ├── auth/      — Login, ForgotPassword, ResetPassword
│   ├── dashboard/ — KPI cards + alerts
│   ├── products/  — Product CRUD + categories
│   ├── warehouses/— Warehouses + nested locations
│   ├── receipts/  — Incoming goods + supplier management
│   ├── deliveries/— Outgoing orders (pick → pack → validate)
│   ├── transfers/ — Internal stock movement
│   ├── adjustments— Stock corrections
│   ├── ledger/    — Full move history audit trail
│   └── users/     — Admin user management
├── utils/         — cn(), date formatters, status color maps
├── App.jsx        — Route definitions
└── main.jsx       — Entry point + providers
```

## Quick Start

```bash
# Install
npm install

# Copy env
cp .env.example .env

# Start dev server (proxies /api → localhost:5000)
npm run dev
```

App runs on `http://localhost:3000`

Backend must be running on `http://localhost:5000`.

## Build for production

```bash
npm run build
npm run preview
```
