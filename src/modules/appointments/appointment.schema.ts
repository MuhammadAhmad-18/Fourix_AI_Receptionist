import { z } from "zod";
import { Appointment, AppointmentStatus, Channel } from "@prisma/client";

export const checkAvailabilitySchema = z.object({
  practitionerId: z.string(),
  serviceId: z.string(),
  startTime: z.string(), // ISO-8601 with explicit offset
  roomId: z.string().optional(),
});
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

export const getAvailableSlotsSchema = z.object({
  practitionerId: z.string(),
  serviceId: z.string(),
  date: z.string().date(), // clinic-local calendar date, YYYY-MM-DD
});
export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;

export const createAppointmentSchema = z.object({
  patientId: z.string(),
  serviceId: z.string(),
  practitionerId: z.string(),
  startTime: z.string(),
  roomId: z.string().optional(),
  notes: z.string().optional(),
  source: z.nativeEnum(Channel).default(Channel.DASHBOARD),
  idempotencyKey: z.string().optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  startTime: z.string(),
  idempotencyKey: z.string().optional(),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const appointmentOutputSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  practitionerId: z.string(),
  serviceId: z.string(),
  roomId: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.nativeEnum(AppointmentStatus),
  source: z.nativeEnum(Channel),
  notes: z.string().nullable(),
  cancelReason: z.string().nullable(),
});
export type AppointmentOutput = z.infer<typeof appointmentOutputSchema>;

export function toAppointmentOutput(a: Appointment): AppointmentOutput {
  return {
    id: a.id,
    patientId: a.patientId,
    practitionerId: a.practitionerId,
    serviceId: a.serviceId,
    roomId: a.roomId,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    status: a.status,
    source: a.source,
    notes: a.notes,
    cancelReason: a.cancelReason,
  };
}
