# MedTrack Pro — Pharmacy Management System

Full-stack app generated from the Stitch design export (`stitch_medical_inventory_system.zip`),
covering all 8 screens: Dashboard, Inventory, Sales POS, Suppliers, Prescriptions, Analytics, Staff, Settings.

- **Frontend**: React 18 + Vite + Tailwind CSS (configured with the exact "Clinical Precision" design tokens
  from the Stitch export — colors, fonts, spacing, radii), React Router, Chart.js.
- **Backend**: Node.js + Express + PostgreSQL via [Neon](https://neon.tech) + Prisma ORM, JWT authentication.

## Prerequisites

- Node.js 18+
- A Neon Postgres project (free tier works) — create one at https://console.neon.tech, then copy the
  connection string from the project dashboard (use the pooled connection string ending `?sslmode=require`)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Paste your Neon connection string into `.env` as `DATABASE_URL`, and set a `JWT_SECRET`.

Create the database tables from the Prisma schema:

```bash
npx prisma migrate dev --name init
```

Then seed demo data (matching the mock data from the Stitch screens) and a login user:

```bash
npm run seed
```

This creates the login: **admin@medtrack.pro / password123**

Start the API:

```bash
npm run dev
```

Runs on `http://localhost:5000`.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` requests to the backend on port 5000.

## 3. Log in

Open `http://localhost:5173`, the login form is pre-filled with the seeded demo credentials.

## Project structure

```
backend/
  prisma/schema.prisma     Postgres schema (User, Product, Sale, SaleItem, Supplier, PurchaseOrder, Staff, Prescription, Settings)
  config/prisma.js         Prisma Client singleton
  middleware/              auth (JWT) + error handling
  controllers/ + routes/   REST API per module
  seed/seed.js             Demo data matching the Stitch mockups
  server.js                Express entrypoint

frontend/
  src/api/                 Axios wrappers per module
  src/context/AuthContext.jsx
  src/components/          Sidebar, Topbar, Layout, StatCard, StatusBadge, Modal
  src/pages/                One page per module, each wired to its API
  tailwind.config.js       Exact color/spacing/typography tokens from the Stitch DESIGN.md
```

## API overview

All endpoints except `/api/auth/login` and `/api/auth/register` require `Authorization: Bearer <token>`.

| Module | Base route |
|---|---|
| Auth | `/api/auth` |
| Products / Inventory | `/api/products` |
| Sales / POS | `/api/sales` |
| Suppliers | `/api/suppliers` |
| Staff | `/api/staff` |
| Prescriptions | `/api/prescriptions` |
| Dashboard summary | `/api/dashboard` |
| Analytics | `/api/analytics` |
| Settings | `/api/settings` |

## Notes / next steps

- Roles (`admin`, `pharmacist`, `technician`) exist on the `User` model but routes aren't role-restricted yet —
  add `authorize('admin')` from `middleware/auth.js` to any route that should be locked down.
- File upload for prescriptions (seen in the Sales POS mockup) isn't wired to storage — `Prescription.fileUrl`
  is a plain string field, ready for you to plug in S3/local storage/multer.
- Sales POS decrements product stock on checkout; there's no stock-reservation/undo flow yet.
