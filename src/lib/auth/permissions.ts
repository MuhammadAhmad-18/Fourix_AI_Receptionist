import { AppError, ErrorCode } from "@/lib/errors/codes";
import { ActorContext, actorHasPermission } from "@/lib/auth/types";

/** Single guard used by both human sessions and machine ApiClient tokens. */
export function requirePermission(ctx: ActorContext, permission: string): void {
  if (!actorHasPermission(ctx, permission)) {
    throw new AppError(ErrorCode.FORBIDDEN, `Missing required permission: ${permission}`);
  }
}

export function requireAnyPermission(ctx: ActorContext, permissions: string[]): void {
  if (!permissions.some((p) => actorHasPermission(ctx, p))) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      `Missing one of required permissions: ${permissions.join(", ")}`,
    );
  }
}

// Canonical permission keys. Roles are assigned subsets of these; ai.* scopes
// are the subset ApiClient tokens (Phase 2 AI receptionist) may hold.
export const Permission = {
  PATIENT_READ: "patient.read",
  PATIENT_CREATE: "patient.create",
  PATIENT_UPDATE: "patient.update",

  SERVICE_READ: "service.read",
  SERVICE_MANAGE: "service.manage",

  PRACTITIONER_READ: "practitioner.read",
  PRACTITIONER_MANAGE: "practitioner.manage",

  APPOINTMENT_READ: "appointment.read",
  APPOINTMENT_CREATE: "appointment.create",
  APPOINTMENT_RESCHEDULE: "appointment.reschedule",
  APPOINTMENT_CANCEL: "appointment.cancel",
  APPOINTMENT_MANAGE: "appointment.manage",

  CLINIC_READ: "clinic.read",
  CLINIC_MANAGE: "clinic.manage",

  PACKAGE_READ: "package.read",
  PACKAGE_MANAGE: "package.manage",
  MEMBERSHIP_READ: "membership.read",
  MEMBERSHIP_MANAGE: "membership.manage",

  INVENTORY_READ: "inventory.read",
  INVENTORY_MANAGE: "inventory.manage",

  FINANCE_READ: "finance.read",
  FINANCE_MANAGE: "finance.manage",
  REFUND_MANAGE: "refund.manage",

  EMPLOYEE_MANAGE: "employee.manage",
  CONSENT_READ: "consent.read",
  CONSENT_MANAGE: "consent.manage",

  REPORT_READ: "report.read",

  // Phase 2 AI receptionist scope subset — never includes refunds, finance
  // writes, inventory writes, medical record edits, or employee management.
  AI_PATIENT_READ: "ai.patient.read",
  AI_PATIENT_CREATE: "ai.patient.create",
  AI_SERVICE_READ: "ai.service.read",
  AI_APPOINTMENT_READ: "ai.appointment.read",
  AI_APPOINTMENT_CREATE: "ai.appointment.create",
  AI_APPOINTMENT_RESCHEDULE: "ai.appointment.reschedule",
  AI_APPOINTMENT_CANCEL: "ai.appointment.cancel",
  AI_CLINIC_READ: "ai.clinic.read",
  AI_PACKAGE_READ: "ai.package.read",
  AI_MEMBERSHIP_READ: "ai.membership.read",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

// A dashboard permission and its ai.* analogue both satisfy the same
// underlying operation, so services should check the base key and callers
// (route handlers) map ai.* scopes onto it. Kept centralized here.
export const AI_TO_BASE_PERMISSION: Record<string, string> = {
  [Permission.AI_PATIENT_READ]: Permission.PATIENT_READ,
  [Permission.AI_PATIENT_CREATE]: Permission.PATIENT_CREATE,
  [Permission.AI_SERVICE_READ]: Permission.SERVICE_READ,
  [Permission.AI_APPOINTMENT_READ]: Permission.APPOINTMENT_READ,
  [Permission.AI_APPOINTMENT_CREATE]: Permission.APPOINTMENT_CREATE,
  [Permission.AI_APPOINTMENT_RESCHEDULE]: Permission.APPOINTMENT_RESCHEDULE,
  [Permission.AI_APPOINTMENT_CANCEL]: Permission.APPOINTMENT_CANCEL,
  [Permission.AI_CLINIC_READ]: Permission.CLINIC_READ,
  [Permission.AI_PACKAGE_READ]: Permission.PACKAGE_READ,
  [Permission.AI_MEMBERSHIP_READ]: Permission.MEMBERSHIP_READ,
};
