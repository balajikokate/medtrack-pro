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

Then seed demo data (matching the mock data from the Stitch screens) and a login user — **local
development and sales demos only**, this wipes all existing data and refuses to run when
`NODE_ENV=production`:

```bash
npm run seed
```

This creates the login: **admin@medtrack.pro / password123**

For a real customer's deployment, use `npm run bootstrap` instead (see
[Deploying for a real customer](#deploying-for-a-real-customer)) — it creates one admin login
without touching or deleting any existing data.

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

Open `http://localhost:5173`. To have the login form pre-filled with the seeded demo credentials
(local dev/demo convenience only), set `VITE_DEMO_MODE=true` in `frontend/.env` — see
`frontend/.env.example`. Leave it unset for any real deployment.

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

## Deploying for a real customer

1. Run `npx prisma migrate deploy` against the customer's database (empty tables, no demo data).
2. Set `BOOTSTRAP_ADMIN_EMAIL` (and optionally `BOOTSTRAP_ADMIN_NAME` / `BOOTSTRAP_ADMIN_PASSWORD`)
   in the backend environment, then run `npm run bootstrap`. It creates exactly one admin login and
   prints the password once if you didn't set one — save it immediately.
3. Do **not** run `npm run seed` against a real customer's database — it deletes everything and
   inserts fake demo content.
4. Leave `VITE_DEMO_MODE` unset in the frontend's production environment variables.
5. Log in as the new admin and use the profile menu (top right) → **Change Password** to rotate
   off the generated password onto one only the customer knows.

## API overview

All endpoints require `Authorization: Bearer <token>` except `/api/auth/login`. `/api/auth/register`
also requires a token — and the caller must already be an `admin` — so the very first account has to
come from `npm run seed` (demo) or `npm run bootstrap` (real deployment).

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

- Roles (`admin`, `pharmacist`, `technician`) are enforced via `authorize()` in `middleware/auth.js`.
  Admin: full access. Pharmacist: clinical/inventory ops (products, suppliers, prescription
  verification) but not staff/settings. Technician: POS, dashboards, and read access everywhere else.
- GST on Sales POS is a flat 8% placeholder (`saleController.js`), not real slab-based Indian GST —
  no HSN codes, no CGST/SGST split, no printable invoice. Fine for internal tracking, not yet
  compliance-ready for statutory billing.
- No automated test suite yet.
- File upload for prescriptions (seen in the Sales POS mockup) isn't wired to storage — `Prescription.fileUrl`
  is a plain string field, ready for you to plug in S3/local storage/multer.
- Sales POS decrements product stock on checkout; there's no stock-reservation/undo flow yet.
