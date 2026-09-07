# Architecture

## The one rule everything else follows

> Business logic lives in services. Nothing outside `*.repository.ts` imports Prisma.

Everything below is a consequence of that rule, chosen so Phase 2 (an AI receptionist) can be
added as a new **client** of the existing services, never a rewrite of them.

## Layering

```
Server Component / Server Action   ─┐
Route Handler (/api/v1/*)           ├──▶  Service  ──▶  Repository  ──▶  Prisma  ──▶  PostgreSQL
Client Component (TanStack Query)  ─┘        ▲
                                              │
                                    ActorContext { actorId, actorType, clinicId, source, permissions }
```

- **Server Components / Server Actions call services directly, in-process.** They never
  `fetch()` the app's own `/api/v1/*` — that would be a needless loopback HTTP round trip with
  no architectural benefit inside a single Next.js process. See `src/app/(dashboard)/*/page.tsx`.
- **Client Components never call services directly.** They go through `/api/v1/*` via
  `fetch`/TanStack Query. See `src/app/(dashboard)/patients/new/page.tsx`.
- **Route handlers are thin adapters**: parse input → resolve `ActorContext` → authorize → call
  service → format response envelope. Zero business logic. See any `src/app/api/v1/**/route.ts`.
- **Every service method takes an explicit `ActorContext`**, never reads cookies/headers itself.
  That's what lets the dashboard, `prisma/seed-demo.ts`, the Vitest suite, and (later) an AI tool
  call the exact same code path. See `src/lib/auth/types.ts`.

## Module shape

Each business domain under `src/modules/<domain>/` follows:

```
<domain>.repository.ts   only this file imports PrismaClient for the domain
<domain>.service.ts      business rules, transactions, events, audit logging
<domain>.controller.ts   permission checks + request/response shaping, reused by any route.ts
<domain>.schema.ts        Zod input/output schemas + a toXOutput() serializer
```

Domains: `patients`, `services`, `practitioners`, `appointments`, `consultations`,
`treatments`, `consents`, `files`, `inventory`, `purchasing`, `finance`, `packages`,
`notifications`, `reports`, `clinic`.

## The appointment engine (highest-risk module)

Double-booking is prevented at **two independent layers**, not one:

1. **Advisory lock** — `AppointmentService.createAppointment` takes
   `pg_advisory_xact_lock(hashtext(practitionerId || ':' || localDate))` as the first statement
   inside its transaction, serializing all mutations for one practitioner-day. Availability is
   re-checked *after* acquiring the lock.
2. **Database exclusion constraint** — a hand-written migration
   (`prisma/migrations/*_init/migration.sql`) adds
   `EXCLUDE USING gist ("practitionerId" WITH =, tstzrange("startTime","endTime",'[)') WITH &&)`
   on `appointments` (and the equivalent for `roomId`). This makes a true double-booking
   structurally impossible even if the application-level lock is bypassed. Prisma can't express
   this in `schema.prisma`, so it's raw SQL appended to the migration.

Availability itself (`src/modules/appointments/availability.ts`) intersects: clinic business
hours, clinic holidays, the practitioner's weekly schedule, approved leave, and existing
non-cancelled appointments — all evaluated in clinic-local time (`src/lib/tz.ts`) then stored as
UTC `timestamptz`.

Tested in `tests/modules/appointment.service.test.ts`, including the mandatory concurrency case:
two simultaneous `createAppointment` calls for the same slot → exactly one succeeds.

## Idempotency

`src/lib/idempotency.ts` — `withIdempotency(key, operation, payload, fn)`. The
`IdempotencyKey(key, operation)` unique constraint is the mutex: insert-first, so two concurrent
requests with the same key can't both proceed even under READ COMMITTED. A replay with the same
payload returns the stored response; a different payload under the same key is rejected as
`IDEMPOTENCY_KEY_REUSED`. Wraps `createPatient`, `createAppointment`, `recordPayment`.

## Events

Two tiers, deliberately not one:

- **In-process event bus** (`src/lib/events/bus.ts`) — audit logging and in-app notifications,
  where losing an event on a crash is acceptable.
- **Transactional outbox** (`src/lib/events/outbox.ts`, `OutboxEvent` table) — anything with an
  external side effect (email now, WhatsApp in Phase 2). Written inside the *same* transaction as
  the business mutation, then polled and dispatched by `src/jobs/outbox-worker.ts` with retry +
  dead-letter, so a crash between commit and delivery can't silently drop a notification.

## Auth — two modes, one guard

- **Human sessions** — Auth.js v5, JWT strategy (see note in `src/lib/auth/index.ts` on why not
  database sessions), cookie-based, used by the dashboard.
- **Machine clients** — `ApiClient` model, argon2-hashed API key, `Authorization: Bearer <key>`.
  This is Phase 2's entry point. Scopes are `ai.*` keys that map onto the same base permission
  keys the dashboard's roles use (`AI_TO_BASE_PERMISSION` in `src/lib/auth/permissions.ts`) —
  `requirePermission()` doesn't know or care which mode the caller used.

Sensitive operations (refunds, inventory writes, employee management) have no `ai.*` scope at
all, so no `ApiClient` can ever be granted them by mistake — see
`tests/modules/route-scopes.test.ts` and `tests/modules/permission-scopes.test.ts`.

## Multi-tenancy

Schema is multi-clinic-ready: every tenant-scoped model carries `clinicId`, indexes lead with it.
Phase 1 seeds a single clinic. Scoping today is enforced by repositories always filtering on
`ctx.clinicId` — there is no cross-cutting Prisma extension doing this automatically yet; if a
second clinic is onboarded, add one rather than relying on every repository method remembering.

## Deployment target

Target **A** (self-hosted Node, `next start`, long-lived process) — see
[ENVIRONMENT.md](ENVIRONMENT.md) for what changes on target B (serverless).
