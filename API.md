# API

Base path: `/api/v1`. Full machine-readable spec: `/api/v1/openapi.json` (Swagger UI at
`/api/v1/docs`). This file covers conventions the spec doesn't narrate on its own.

## Authentication

Two modes, resolved by `getActorContextFromRequest` (`src/lib/auth/actor-context.ts`):

1. **`Authorization: Bearer <key>`** — a machine `ApiClient` (Phase 2's entry point). Scopes are
   `ai.*` permission keys.
2. **Session cookie** — a human dashboard user, set by Auth.js at `/api/auth/*`.

If neither resolves, requests get `401 UNAUTHORIZED`.

## Response envelope

Success:

```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

Failure:

```json
{ "success": false, "error": { "code": "APPOINTMENT_CONFLICT", "message": "...", "details": ... } }
```

Always check `success`, never assume 2xx means success was in the body — though HTTP status does
track the error code (see `src/lib/errors/codes.ts` for the status each code maps to).

## Error codes

`PATIENT_NOT_FOUND` `PATIENT_ALREADY_EXISTS` `SERVICE_NOT_FOUND` `PRACTITIONER_NOT_FOUND`
`APPOINTMENT_NOT_FOUND` `APPOINTMENT_CONFLICT` `INVALID_APPOINTMENT_TIME` `INSUFFICIENT_STOCK`
`INVOICE_NOT_FOUND` `PAYMENT_FAILED` `UNAUTHORIZED` `FORBIDDEN` `VALIDATION_ERROR` `NOT_FOUND`
`IDEMPOTENCY_KEY_REUSED` `IDEMPOTENT_REQUEST_IN_PROGRESS` `INTERNAL_ERROR` `RATE_LIMITED`

Handle by code, not by parsing `message` — messages may change wording, codes won't.

## Idempotency

`POST` routes that mutate state accept an `Idempotency-Key` header (patients, appointments,
payments). Same key + same request body → the original response is replayed, no new row created.
Same key + a **different** body → `409 IDEMPOTENCY_KEY_REUSED`. Keys expire after 24h. Always send
one from a client that might retry on timeout (that's the whole point — see ARCHITECTURE.md).

## Datetimes

Every datetime field is ISO-8601 **with an explicit UTC offset** (`2026-09-09T10:00:00+05:00` or
`...Z`). A naive datetime (no offset) is rejected as `422 INVALID_APPOINTMENT_TIME` — the server
never guesses a timezone for you.

## Key endpoints by domain

| Domain | Endpoints |
|---|---|
| Patients | `GET/POST /patients`, `GET/PATCH /patients/{id}`, `GET /patients/{id}/balance` |
| Services | `GET/POST /services`, `GET/PATCH /services/{id}` |
| Practitioners | `GET/POST /practitioners`, `GET /practitioners/{id}` |
| Appointments | `GET /appointments/availability`, `GET /appointments/slots`, `GET/POST /appointments`, `GET /appointments/{id}`, `POST /appointments/{id}/{reschedule,cancel,confirm,check-in,complete,no-show}` |
| Consultations | `GET/POST /consultations`, `GET /consultations/{id}` |
| Treatments | `GET/POST /treatments`, `GET /treatments/{id}`, `POST /treatments/{id}/complete` |
| Consents | `GET/POST /consents` |
| Files | `POST /files` (multipart), `GET /files/{id}` (authorized stream, never public) |
| Inventory | `GET/POST /products`, `GET /products/{id}`, `GET /products/low-stock`, `GET /products/expiring`, `POST /products/{receive-batch,usage,adjust}` |
| Purchasing | `GET/POST /suppliers`, `GET/POST /purchase-orders`, `POST /purchase-orders/{id}/receive` |
| Finance | `GET/POST /invoices`, `GET /invoices/{id}`, `POST /payments`, `POST /refunds`, `POST /expenses` |
| Packages | `GET/POST /packages`, `GET /packages/{id}/balance`, `POST /packages/{id}/use-session` |
| Memberships | `GET/POST /memberships` |

Every one of these is callable by both the dashboard session and a scoped `ApiClient` key — the
route handler doesn't know or care which. See AI_INTEGRATION.md for the subset actually granted
to `ai.*` scopes.

## Rate limiting

In-memory, per-key, fixed window (`src/lib/rate-limit.ts`) — valid for deployment target A
(single long-lived process). Target B (serverless/multi-instance) needs an external store; see
ENVIRONMENT.md.
