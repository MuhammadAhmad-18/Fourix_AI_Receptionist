import { ActorContext } from "@/lib/auth/types";
import { requirePermission } from "@/lib/auth/permissions";
import { Permission } from "@/lib/auth/permissions";
import { patientService } from "@/modules/patients/patient.service";
import {
  CreatePatientInput,
  PatientOutput,
  SearchPatientInput,
  UpdatePatientInput,
  toPatientOutput,
} from "@/modules/patients/patient.schema";

export const patientController = {
  async list(ctx: ActorContext, input: SearchPatientInput): Promise<PatientOutput[]> {
    requirePermission(ctx, Permission.PATIENT_READ);
    const patients = await patientService.searchPatient(ctx, input);
    return patients.map(toPatientOutput);
  },

  async get(ctx: ActorContext, id: string): Promise<PatientOutput> {
    requirePermission(ctx, Permission.PATIENT_READ);
    const patient = await patientService.getPatient(ctx, id);
    return toPatientOutput(patient);
  },

  async create(ctx: ActorContext, input: CreatePatientInput): Promise<PatientOutput> {
    requirePermission(ctx, Permission.PATIENT_CREATE);
    return patientService.createPatient(ctx, input);
  },

  async update(ctx: ActorContext, id: string, input: UpdatePatientInput): Promise<PatientOutput> {
    requirePermission(ctx, Permission.PATIENT_UPDATE);
    const patient = await patientService.updatePatient(ctx, id, input);
    return toPatientOutput(patient);
  },
};
