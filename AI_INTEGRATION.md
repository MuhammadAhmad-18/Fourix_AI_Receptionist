# AI Integration (Phase 2 guide)

This describes how a future AI receptionist (Gemini-based, per the product plan) consumes this
system. **None of the AI logic itself exists yet** — no Gemini calls, no WhatsApp/Instagram/
Messenger webhooks, no voice pipeline. What exists is the contract Phase 2 will call into.

## The one invariant

> The AI is a client, not the brain. It decides *what the user wants* and *which tool to call*.
> The management system decides *whether the operation is actually valid* (availability, price,
> patient identity, permissions). The AI never computes a price, never confirms a booking it
> hasn't gotten a `201`/`available:true` back for, and never has direct database access.

## Authentication

The AI receptionist authenticates as an **`ApiClient`** (not a human session):

```
Authorization: Bearer <api-key>
```

`prisma/seed.ts` already creates one, named `ai-receptionist`, **status `DISABLED`**, with every
`ai.*` scope pre-attached. Enabling Phase 2 is:

1. Flip its `status` to `ACTIVE` (`ApiClient.status` in the DB, or add an admin UI action — none
   exists yet).
2. Retrieve/rotate its key (the plaintext is printed once at seed time; only the argon2 hash is
   stored — if lost, generate a new key via `src/lib/auth/api-client.ts#generateApiKey` and update
   the row's `keyHash`/`keyPrefix`).
3. Point the Phase 2 service at `/api/v1` with that bearer token.

No code changes are required to *authenticate* — this is deliberately an enable-and-configure
step, not an auth rewrite.

## Authorization: what the AI can and cannot do

Scopes are `ai.*` permission keys, mapped 1:1 onto the same base permission keys the dashboard's
roles use (`AI_TO_BASE_PERMISSION` in `src/lib/auth/permissions.ts`). The seeded client has:

```
ai.patient.read           ai.patient.create
ai.service.read
ai.appointment.read       ai.appointment.create
ai.appointment.reschedule ai.appointment.cancel
ai.clinic.read
ai.package.read           ai.membership.read
```

**Never granted, by construction** (no `ai.*` scope exists for them at all — not a
policy that could be misconfigured, an absence in the permission table):

- Refunds (`refund.manage`)
- Any finance write (`finance.manage`) — the AI can read a patient's balance
  (`GET /patients/{id}/balance`) but never records a payment or issues a refund
- Inventory writes (`inventory.manage`)
- Medical record edits, consent management
- Employee management

Verified by `tests/modules/route-scopes.test.ts` (HTTP-level: a token scoped only to
`ai.appointment.create` gets `403 FORBIDDEN` from `/api/v1/refunds` and
`/api/v1/products/adjust`) and `tests/modules/permission-scopes.test.ts` (unit-level mapping).

## The tool contract

Each Phase 2 "tool" the LLM calls should be a thin wrapper translating a structured tool-call into
one HTTP request below. Full request/response shapes: `/api/v1/openapi.json` (`/api/v1/docs` for
the browsable version).

| Tool | HTTP call |
|---|---|
| `search_patient` | `GET /api/v1/patients?phone=...` |
| `get_patient` | `GET /api/v1/patients/{id}` |
| `create_patient` | `POST /api/v1/patients` |
| `list_services` / `get_service_details` | `GET /api/v1/services`, `GET /api/v1/services/{id}` |
| `get_practitioners` | `GET /api/v1/practitioners?serviceId=...` |
| `check_appointment_availability` | `GET /api/v1/appointments/availability?practitionerId=&serviceId=&startTime=` |
| `get_available_slots` | `GET /api/v1/appointments/slots?practitionerId=&serviceId=&date=` |
| `book_appointment` | `POST /api/v1/appointments` (send `Idempotency-Key`) |
| `get_patient_appointments` | `GET /api/v1/appointments?patientId=...` |
| `reschedule_appointment` | `POST /api/v1/appointments/{id}/reschedule` |
| `cancel_appointment` | `POST /api/v1/appointments/{id}/cancel` |
| `get_patient_packages` | `GET /api/v1/packages?patientId=...` |
| `get_package_balance` | `GET /api/v1/packages/{id}/balance` |
| `get_membership_details` | `GET /api/v1/memberships?patientId=...` |
| `get_clinic_info` / `get_business_hours` / `get_policies` | driven by `ClinicService` — no route yet; add thin `GET /api/v1/clinic/*` wrappers around `src/modules/clinic/clinic.service.ts` when Phase 2 starts (the service methods already exist: `getClinicInformation`, `getBusinessHours`, `getPolicies`, `getLocation`, `getContactInformation`, `getFaqs`) |

`book_appointment` example, end to end:

```
Gemini decides: "book Hydrafacial for patient P-1024 tomorrow at 10am with Dr. Raza"
  → book_appointment tool
  → POST /api/v1/appointments
      Authorization: Bearer <ai-receptionist key>
      Idempotency-Key: <uuid the AI generates per user turn>
      { "patientId": "P-1024", "serviceId": "...", "practitionerId": "...",
        "startTime": "2026-09-10T10:00:00+05:00", "source": "AI_AGENT" }
  → AppointmentService.createAppointment()
      (advisory lock + availability re-check + DB exclusion constraint — see ARCHITECTURE.md)
  → 201 { success: true, data: { id, status: "REQUESTED", ... } }
      or 409 { success: false, error: { code: "APPOINTMENT_CONFLICT", ... } }
```

The AI must treat `409 APPOINTMENT_CONFLICT` as "tell the user that slot just got taken, offer
`GET /appointments/slots` alternatives" — never retry-until-success, and never fabricate a
confirmation without a `201`.

## Idempotency (why the AI specifically needs this)

A phone/WhatsApp channel can retry silently on a network blip, and an LLM tool-call loop can
retry on its own timeout. Send a fresh `Idempotency-Key` (UUID) **per user intent**, not per HTTP
retry — i.e., generate one when the user says "book it," and reuse that same key for automatic
retries of that same request, not a new key each time. See API.md for the exact semantics
(same key + same body → replay; same key + different body → `409 IDEMPOTENCY_KEY_REUSED`).

## Patient identity across channels

`PatientExternalIdentity` (`platform`, `externalUserId`, `externalPhone`, `externalUsername`)
exists in the schema for exactly this: a WhatsApp sender ID is never assumed to be the clinic's
patient ID. The resolution flow Phase 2 should implement:

```
Inbound message arrives with an external user ID + phone
  → normalize the phone (same normalizer as PatientService — src/lib/phone.ts)
  → look up PatientExternalIdentity by (platform, externalUserId), or by externalPhone
  → found: use that Patient
  → not found: search_patient by phone; if still not found, create_patient, then create a
    PatientExternalIdentity row linking it (no route yet — direct write via a future
    ExternalIdentityService, or extend PatientController)
```

No code currently writes to `PatientExternalIdentity` — this section documents the intended
resolution flow for whoever builds Phase 2's identity-linking step.

## Conversations — schema only

`Conversation` / `ConversationParticipant` / `ConversationMessage` are migrated but unused. Phase
2's channel adapters (WhatsApp/Instagram/Messenger webhooks, voice) are expected to populate these
directly — no service currently wraps them, and none of today's code assumes they're empty in a
way that would break if they weren't.

## Error codes the AI must handle explicitly

`APPOINTMENT_CONFLICT`, `INVALID_APPOINTMENT_TIME`, `PATIENT_NOT_FOUND`, `SERVICE_NOT_FOUND`,
`PRACTITIONER_NOT_FOUND`, `IDEMPOTENCY_KEY_REUSED`, `FORBIDDEN` (means the AI's scope doesn't
cover this — never work around it, surface "I can't do that, let me get a staff member"),
`RATE_LIMITED` (back off, don't hammer). Full list and HTTP status mapping: API.md.

## What Phase 2 still needs to build (not in this repo)

Gemini integration, the tool-calling loop itself, WhatsApp/Instagram/Messenger webhook receivers,
voice/telephony pipeline, `PatientExternalIdentity` writes, `Conversation*` writes, and the small
number of `GET /api/v1/clinic/*` route wrappers noted above (the underlying service methods
already exist).
