import { EventEmitter } from "node:events";

// In-process event bus. Fine for audit logging and in-app notifications,
// where losing an event on process crash is acceptable. Anything with an
// external side effect (email, and later WhatsApp/SMS) must NOT rely solely
// on this — write an OutboxEvent row in the same transaction instead (see
// lib/events/outbox.ts) so a worker can retry after a crash.
export type DomainEventName =
  | "PatientCreated"
  | "AppointmentCreated"
  | "AppointmentConfirmed"
  | "AppointmentCancelled"
  | "AppointmentCompleted"
  | "TreatmentCompleted"
  | "InvoiceCreated"
  | "PaymentReceived"
  | "InventoryLow"
  | "InventoryExpired"
  | "PackagePurchased";

export interface DomainEvent<T = unknown> {
  name: DomainEventName;
  clinicId: string;
  payload: T;
  occurredAt: Date;
}

class EventBus extends EventEmitter {
  publish<T>(name: DomainEventName, clinicId: string, payload: T) {
    const event: DomainEvent<T> = { name, clinicId, payload, occurredAt: new Date() };
    this.emit(name, event);
    this.emit("*", event);
  }

  onEvent<T>(name: DomainEventName, handler: (event: DomainEvent<T>) => void) {
    this.on(name, handler);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __eventBus: EventBus | undefined;
}

export const eventBus = global.__eventBus ?? new EventBus();
if (process.env.NODE_ENV !== "production") global.__eventBus = eventBus;
