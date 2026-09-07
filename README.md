# Fourix Clinic — Aesthetic Clinic Management System (Phase 1)

A clinic-management **backend platform** with a dashboard as its first client — built so a
Phase 2 AI receptionist can be attached later as another client, without rewriting business logic.

See also: [ARCHITECTURE.md](ARCHITECTURE.md) · [API.md](API.md) · [DATABASE.md](DATABASE.md) ·
[AI_INTEGRATION.md](AI_INTEGRATION.md) · [ENVIRONMENT.md](ENVIRONMENT.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · PostgreSQL 18 · Prisma 6 ·
Tailwind CSS 4 · shadcn/ui · React Hook Form · Zod · TanStack Query · Auth.js v5 · Vitest

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET (see ENVIRONMENT.md)
npx prisma migrate dev
npm run db:seed             # clinic, roles, permissions, admin login, ai-receptionist key
npm run db:seed:demo        # 30+ patients, practitioners, services, inventory, appointments...
npm run dev
```

Default login: `admin@fourixclinic.com` / `Admin@12345` (printed by `db:seed`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / start |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Foundation data (clinic, RBAC, admin user, AI receptionist key) |
| `npm run db:seed:demo` | Full demo dataset, exercised through the real service layer |
| `npm test` / `npm run test:watch` | Vitest (service-layer + route-scope tests, against a real Postgres) |

## API & docs

- `/api/v1/*` — versioned REST API (see [API.md](API.md))
- `/api/v1/openapi.json` — generated OpenAPI 3.1 spec
- `/api/v1/docs` — Swagger UI

## Project layout

```
src/
  app/(dashboard)/    UI pages — Server Components calling services in-process
  app/api/v1/         Thin route handlers — parse → auth → service → envelope
  modules/<domain>/   *.repository.ts (only Prisma import) → *.service.ts → *.controller.ts
  lib/                cross-cutting: auth, errors, events, storage, tz, phone, idempotency
  jobs/               outbox worker, idempotency-key cleanup (target-A in-process workers)
prisma/
  schema.prisma       full data model
  seed.ts             foundation seed
  seed-demo.ts         demo dataset (runs through the service layer)
tests/
  modules/            service + route-scope tests (real Postgres, see tests/setup.ts)
```

## What's built (Phase 1)

Foundation (auth, RBAC, audit log, event bus + outbox, idempotency, rate limiting, API
versioning) · Patients · Services & Practitioners · **Appointment engine** (advisory lock +
DB exclusion constraint against double-booking, full status lifecycle) · Consultations,
Treatments, Consents, Files · Inventory (stock, batches, FIFO usage, low-stock/expiry) ·
Finance (invoices, payments, refunds, expenses) · Packages & Memberships · Notifications +
transactional outbox · Reports · OpenAPI generation · 30-test Vitest suite.

Not in Phase 1 (by design — see [AI_INTEGRATION.md](AI_INTEGRATION.md)): the AI receptionist
itself, Gemini, WhatsApp/Instagram/Messenger webhooks, voice. The `ApiClient` auth mode and
`ai.*` permission scopes exist and are seeded (disabled) so Phase 2 is an enable-and-configure
step.
