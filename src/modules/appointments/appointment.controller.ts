import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { appointmentService } from "@/modules/appointments/appointment.service";
import {
  AppointmentOutput,
  CheckAvailabilityInput,
  CreateAppointmentInput,
  GetAvailableSlotsInput,
} from "@/modules/appointments/appointment.schema";

export const appointmentController = {
  async checkAvailability(ctx: ActorContext, input: CheckAvailabilityInput) {
    requirePermission(ctx, Permission.APPOINTMENT_READ);
    const available = await appointmentService.checkAvailability(ctx, input);
    return { available };
  },

  async getAvailableSlots(ctx: ActorContext, input: GetAvailableSlotsInput) {
    requirePermission(ctx, Permission.APPOINTMENT_READ);
    const slots = await appointmentService.getAvailableSlots(ctx, input);
    return { slots };
  },

  async get(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_READ);
    return appointmentService.getAppointment(ctx, id);
  },

  async listForPatient(ctx: ActorContext, patientId: string): Promise<AppointmentOutput[]> {
    requirePermission(ctx, Permission.APPOINTMENT_READ);
    return appointmentService.getPatientAppointments(ctx, patientId);
  },

  async create(ctx: ActorContext, input: CreateAppointmentInput): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_CREATE);
    return appointmentService.createAppointment(ctx, input);
  },

  async reschedule(ctx: ActorContext, id: string, startTime: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_RESCHEDULE);
    return appointmentService.rescheduleAppointment(ctx, id, startTime);
  },

  async cancel(ctx: ActorContext, id: string, reason?: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_CANCEL);
    return appointmentService.cancelAppointment(ctx, id, reason);
  },

  async confirm(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return appointmentService.confirmAppointment(ctx, id);
  },
  async checkIn(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return appointmentService.checkInAppointment(ctx, id);
  },
  async start(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return appointmentService.startTreatment(ctx, id);
  },
  async complete(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return appointmentService.completeAppointment(ctx, id);
  },
  async noShow(ctx: ActorContext, id: string): Promise<AppointmentOutput> {
    requirePermission(ctx, Permission.APPOINTMENT_MANAGE);
    return appointmentService.markNoShow(ctx, id);
  },
};
