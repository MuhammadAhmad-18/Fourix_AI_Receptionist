import { z } from "zod";
import { EmployeeRole, Practitioner, Employee } from "@prisma/client";

export const createPractitionerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  specialties: z.array(z.string()).default([]),
  bio: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
});
export type CreatePractitionerInput = z.infer<typeof createPractitionerSchema>;

export const updatePractitionerSchema = createPractitionerSchema
  .partial()
  .extend({ active: z.boolean().optional() });
export type UpdatePractitionerInput = z.infer<typeof updatePractitionerSchema>;

export const scheduleEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;

export const setSchedulesSchema = z.object({ schedules: z.array(scheduleEntrySchema) });

export const practitionerOutputSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  title: z.string().nullable(),
  specialties: z.array(z.string()),
  bio: z.string().nullable(),
  active: z.boolean(),
});
export type PractitionerOutput = z.infer<typeof practitionerOutputSchema>;

export function toPractitionerOutput(p: Practitioner & { employee: Employee }): PractitionerOutput {
  return {
    id: p.id,
    employeeId: p.employeeId,
    firstName: p.employee.firstName,
    lastName: p.employee.lastName,
    title: p.title,
    specialties: p.specialties,
    bio: p.bio,
    active: p.active,
  };
}

export const EMPLOYEE_ROLE_PRACTITIONER: EmployeeRole = "PRACTITIONER";
