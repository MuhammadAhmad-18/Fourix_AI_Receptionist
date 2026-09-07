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
    return service;
  },
};
