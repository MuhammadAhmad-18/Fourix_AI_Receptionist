import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { packageService } from "@/modules/packages/package.service";
import { CreateMembershipInput, CreatePackageInput } from "@/modules/packages/package.schema";

export const packageController = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.PACKAGE_READ);
    return packageService.getPatientPackages(ctx, patientId);
  },
  async balance(ctx: ActorContext, id: string) {
    requirePermission(ctx, Permission.PACKAGE_READ);
    const remainingSessions = await packageService.getPackageBalance(ctx, id);
    return { packageId: id, remainingSessions };
  },
  async create(ctx: ActorContext, input: CreatePackageInput) {
    requirePermission(ctx, Permission.PACKAGE_MANAGE);
    return packageService.createPackage(ctx, input);
  },
  async useSession(ctx: ActorContext, id: string, appointmentId?: string) {
    requirePermission(ctx, Permission.PACKAGE_MANAGE);
    return packageService.useSession(ctx, id, appointmentId);
  },
  async getMembership(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.MEMBERSHIP_READ);
    return packageService.getPatientMembership(ctx, patientId);
  },
  async createMembership(ctx: ActorContext, input: CreateMembershipInput) {
    requirePermission(ctx, Permission.MEMBERSHIP_MANAGE);
    return packageService.createMembership(ctx, input);
  },
};
