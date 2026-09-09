import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { serviceRepository } from "@/modules/services/service.repository";
import { CreateServiceInput, UpdateServiceInput } from "@/modules/services/service.schema";

export const serviceCatalogService = {
  async listServices(ctx: ActorContext, opts: { activeOnly?: boolean } = {}) {
    return serviceRepository.list(ctx.clinicId, opts);
  },

  async getService(ctx: ActorContext, id: string) {
    const service = await serviceRepository.findById(ctx.clinicId, id);
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, `Service ${id} not found`);
    return service;
  },

  async getServicePrice(ctx: ActorContext, id: string): Promise<number> {
    const service = await this.getService(ctx, id);
    return Number(service.price);
  },

  async createService(ctx: ActorContext, input: CreateServiceInput) {
    return prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: { clinicId: ctx.clinicId, ...input },
      });
      await writeAuditLog(tx, ctx, "service.create", "Service", service.id);
      return service;
    });
  },

  async updateService(ctx: ActorContext, id: string, input: UpdateServiceInput) {
    const service = await serviceRepository.update(ctx.clinicId, id, input);
    if (!service) throw new AppError(ErrorCode.SERVICE_NOT_FOUND, `Service ${id} not found`);
    await prisma.$transaction((tx) => writeAuditLog(tx, ctx, "service.update", "Service", id));
    return service;
  },

  /**
   * Permanent delete, allowed only while nothing references the service.
   * Once it has been booked, treated, packaged or invoiced, the row is part of
   * the clinic's history — callers are told to deactivate it instead.
   */
  async deleteService(ctx: ActorContext, id: string) {
    const service = await this.getService(ctx, id);
    const refs = await serviceRepository.countReferences(id);
    const total = refs.appointments + refs.treatments + refs.packages + refs.invoiceItems;

    if (total > 0) {
      const parts = [
        refs.appointments && `${refs.appointments} appointment(s)`,
        refs.treatments && `${refs.treatments} treatment(s)`,
        refs.packages && `${refs.packages} package(s)`,
        refs.invoiceItems && `${refs.invoiceItems} invoice line(s)`,
      ].filter(Boolean);
      throw new AppError(
        ErrorCode.SERVICE_IN_USE,
        `"${service.name}" is used by ${parts.join(", ")} and cannot be deleted. Deactivate it instead to stop offering it.`,
        refs
      );
    }

    await serviceRepository.delete(id);
    await prisma.$transaction((tx) =>
      writeAuditLog(tx, ctx, "service.delete", "Service", id, { name: service.name })
    );
    return { id };
  },
};
