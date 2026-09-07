# Database

PostgreSQL 18 + Prisma 6. Full model: `prisma/schema.prisma`. This file covers what isn't
obvious from reading the schema.

## Timestamps & timezone

Every `DateTime` is `@db.Timestamptz(6)` — stored and compared in UTC, always. `Clinic.timezone`
(default `Asia/Karachi`) is the only source of "local time" — business hours, holidays, and
availability windows are evaluated in clinic-local time via `src/lib/tz.ts`, then converted.
`ClinicHoliday.date` is a plain `@db.Date` (a calendar date, not an instant) since a holiday is a
clinic-local day, not a UTC moment. Pakistan doesn't observe DST today, but the availability
engine doesn't assume that.

## Multi-tenancy

Every tenant-scoped model carries `clinicId` as the first field of its composite indexes. Phase 1
seeds one clinic (`prisma/seed.ts`); the schema doesn't need a migration to add a second.

## The appointment overlap constraint (not in schema.prisma)

`prisma/migrations/20260907183845_init/migration.sql` appends, after Prisma's generated SQL:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT appointment_no_overlap_practitioner
  EXCLUDE USING gist (
    "practitionerId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));

ALTER TABLE "appointments" ADD CONSTRAINT appointment_no_overlap_room
  EXCLUDE USING gist (
    "roomId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status NOT IN ('CANCELLED', 'NO_SHOW') AND "roomId" IS NOT NULL);
```

Prisma has no syntax for exclusion constraints, so this is hand-written and must be preserved (or
re-added) if the `appointments` table is ever migrated with `prisma db push` or a schema reset
that regenerates migrations. It's the backstop behind the advisory lock in
`AppointmentService.createAppointment` — see ARCHITECTURE.md.

## Patient identity

`Patient.phoneRaw` (as entered) vs `Patient.phoneE164` (normalized, `src/lib/phone.ts`,
`libphonenumber-js`, default region `PK`). Normalization happens in `PatientService`, not in the
form, because Phase 2's AI receptionist will submit numbers in arbitrary formats and must hit the
same normalizer. `phoneE164` is indexed but **not unique** — family members can legitimately
share a number; `@@index([clinicId, phoneE164])` supports lookup, duplicates are a UI/AI
judgment call, not a constraint violation.

`PatientExternalIdentity` is deliberately a separate table (`platform`, `externalUserId`,
`externalPhone`, `externalUsername`) rather than fields on `Patient` — a WhatsApp/Instagram/
Messenger user ID is never assumed to equal the clinic's own patient ID, and one patient can hold
multiple external identities across platforms.

## Idempotency

`IdempotencyKey` — unique on `(key, operation)`, which is the actual mutex (see
`src/lib/idempotency.ts`): the insert either succeeds (caller proceeds) or hits the unique
constraint (caller gets the stored result or a conflict). 24h TTL, purged by
`src/jobs/idempotency-cleanup.ts`.

## Outbox

`OutboxEvent` — written inside the same transaction as the triggering mutation (never after
commit — see `src/lib/events/outbox.ts`), polled by `src/jobs/outbox-worker.ts`. `attempts` +
`lastError` + exponential `availableAt` backoff, `DEAD_LETTER` after 5 attempts.

## Audit

`AuditLog` — `actorType` is `USER | SYSTEM | AI_AGENT | API_CLIENT` so Phase 2's actions are
always distinguishable from a human's, even though nothing writes `AI_AGENT` yet. `source` is the
same `Channel` enum used on `Appointment.source` and `Patient.source` (see below) — one enum,
not three ad-hoc string columns.

## Enums instead of hard-coded strings

`Channel` (`DASHBOARD | PHONE | WALK_IN | WEBSITE | WHATSAPP | INSTAGRAM | MESSENGER | AI_AGENT`)
and `PatientSource` are used consistently on `Appointment.source`, `Patient.source`,
`AuditLog.source`, `Conversation.platform` — never a free-text column that Phase 2 would have to
guess the valid values for.

## Conversations — schema only

`Conversation`, `ConversationParticipant`, `ConversationMessage` are migrated in Phase 1 but
nothing writes to them yet. They exist so Phase 2 doesn't need a schema migration to start
logging AI/WhatsApp conversations against a `Patient`.

## Running migrations

```bash
npx prisma migrate dev       # dev: creates + applies a migration
npx prisma migrate deploy    # CI/prod: applies existing migrations only
```

If you hand-edit a migration's `migration.sql` (as the exclusion constraint above does), Prisma
won't know — it only diffs `schema.prisma`. Don't run `prisma migrate reset` without first
confirming the hand-written SQL is still present in the regenerated migration, or copy it back in.
