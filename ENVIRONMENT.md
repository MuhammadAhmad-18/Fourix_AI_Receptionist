# Environment

## Deployment target: **A — Self-hosted Node** (`Docker` + `next start`)

Chosen because the appointment engine relies on a long-lived transaction/advisory-lock pattern
and an in-process background worker (the transactional-outbox dispatcher), both of which are
awkward on serverless. Revisit if/when this needs to scale beyond one process — see "Moving to
target B" below.

Consequences of this choice, concretely:

- **Prisma connection pooling**: direct connection to Postgres, no PgBouncer/Accelerate needed —
  `src/lib/db.ts` holds one `PrismaClient` singleton for the process lifetime (dev-mode HMR guard
  included).
- **Rate limiting** (`src/lib/rate-limit.ts`): in-memory fixed-window counters. Correct for one
  process; would silently under-count across multiple instances.
- **Background jobs** (`instrumentation.ts` → `src/jobs/outbox-worker.ts`,
  `src/jobs/idempotency-cleanup.ts`): a `setInterval` started once when the Node process boots.
  There is no separate cron service.
- **File uploads** (`src/lib/storage/file-storage.ts`): local disk under `FILE_STORAGE_LOCAL_DIR`,
  routed through a normal `POST /api/v1/files` multipart handler. No presigned-URL dance needed —
  that requirement exists specifically to work around Vercel's ~4.5MB serverless body limit, which
  doesn't apply here.

## Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js JWT signing secret — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | Base URL Auth.js uses for callbacks (`http://localhost:3000` in dev) |
| `CLINIC_TIMEZONE` | Default timezone for `prisma/seed.ts` (the `Clinic.timezone` column is the actual runtime source of truth) |
| `FILE_STORAGE_PROVIDER` | `local` (only provider implemented in Phase 1) |
| `FILE_STORAGE_LOCAL_DIR` | Disk path for uploaded files (default `./.uploads`) |
| `DEPLOYMENT_TARGET` | `A` or `B` — documents which set of tradeoffs above apply; not read by any code path |

See `.env.example`. Copy to `.env` for `next dev`/`next start`, and to `.env.test` (already
present, points at a separate `fourix_clinic_test` database) for Vitest.

## Local setup used in development

- PostgreSQL 18, native Windows service, `127.0.0.1:5432`.
- Two databases: `fourix_clinic` (dev) and `fourix_clinic_test` (Vitest — truncated between test
  files by `tests/helpers/reset-db.ts`, never touched by `prisma migrate dev`, only
  `migrate deploy`).
- `btree_gist` extension enabled on both (required by the appointment exclusion constraint — see
  DATABASE.md).

## Moving to target B (serverless)

Not done in Phase 1. If needed later:

- Swap `src/lib/db.ts` for a pooled/serverless-friendly driver (PgBouncer transaction mode, Prisma
  Accelerate, or a serverless driver adapter).
- Replace `src/lib/rate-limit.ts` with Redis/Upstash.
- Move `src/jobs/*` off `instrumentation.ts`'s `setInterval` onto Vercel Cron hitting a route
  handler.
- Replace the local `FileStorageProvider` with an S3/R2 implementation of the same interface
  (`src/lib/storage/file-storage.ts` already defines the interface so this is additive, not a
  rewrite) and switch uploads to presigned direct-to-storage.

## Node / package manager

Node 22 LTS or newer (developed against Node 24). `npm` (package-lock.json committed).
