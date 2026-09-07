import { Prisma } from "@prisma/client";
import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { eventBus } from "@/lib/events/bus";
import { patientRepository } from "@/modules/patients/patient.repository";
import { serviceRepository } from "@/modules/services/service.repository";
import { packageRepository } from "@/modules/packages/package.repository";
import { CreateMembershipInput, CreatePackageInput } from "@/modules/packages/package.schema";

export const packageService = {
  async getPatientPackages(ctx: ActorContext, patientId: string) {
    return packageRepository.listForPatient(ctx.clinicId, patientId);
  },

  async getPackageBalance(ctx: ActorContext, packageId: string): Promise<number> {
    const pkg = await packageRepository.findById(ctx.clinicId, packageId);
    if (!pkg) throw new AppError(ErrorCode.NOT_FOUND, `Package ${packageId} not found`);
    return pkg.totalSessions - pkg.usedSessions;
  },

  async createPackage(ctx: ActorContext, input: CreatePackageInput) {
    const [patient, service] = await Promise.all([
      patientRepository.findById(ctx.clinicId, input.patientId),
      serviceRepository.findById(ctx.clinicId, input.serviceId),
    ]);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, "Patient not found");
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, "Service not found");

    const pkg = await packageRepository.create(ctx.clinicId, {
      patientId: input.patientId,
      serviceId: input.serviceId,
      totalSessions: input.totalSessions,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    eventBus.publish("PackagePurchased", ctx.clinicId, { packageId: pkg.id });
    return pkg;
  },

  async useSession(ctx: ActorContext, packageId: string, appointmentId?: string) {
    return packageRepository.runInTransaction(async (tx) => {
      const pkg = await packageRepository.findById(ctx.clinicId, packageId);
      if (!pkg) throw new AppError(ErrorCode.NOT_FOUND, `Package ${packageId} not found`);
      if (pkg.status !== "ACTIVE") {
        throw new AppError(ErrorCode.VALIDATION_ERROR, `Package is ${pkg.status.toLowerCase()}, not active`);
      }
      if (pkg.usedSessions >= pkg.totalSessions) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, "Package has no remaining sessions");
      }
      if (pkg.expiresAt && pkg.expiresAt < new Date()) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, "Package has expired");
      }
      const updated = await packageRepository.useSession(tx, ctx.clinicId, packageId, appointmentId);
      return updated!;
    });
  },

  async getPatientMembership(ctx: ActorContext, patientId: string) {
    return packageRepository.findMembershipForPatient(ctx.clinicId, patientId);
  },

  async createMembership(ctx: ActorContext, input: CreateMembershipInput) {
    const patient = await patientRepository.findById(ctx.clinicId, input.patientId);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, "Patient not found");

    return packageRepository.createMembership(ctx.clinicId, {
      patientId: input.patientId,
      planName: input.planName,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      benefits: input.benefits as Prisma.InputJsonValue | undefined,
    });
  },
};
