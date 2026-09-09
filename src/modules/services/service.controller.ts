import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { serviceCatalogService } from "@/modules/services/service.service";
import { CreateServiceInput, ServiceOutput, UpdateServiceInput, toServiceOutput } from "@/modules/services/service.schema";

export const serviceController = {
  async list(ctx: ActorContext, activeOnly = false): Promise<ServiceOutput[]> {
    requirePermission(ctx, Permission.SERVICE_READ);
    const services = await serviceCatalogService.listServices(ctx, { activeOnly });
    return services.map(toServiceOutput);
  },

  async get(ctx: ActorContext, id: string): Promise<ServiceOutput> {
    requirePermission(ctx, Permission.SERVICE_READ);
    return toServiceOutput(await serviceCatalogService.getService(ctx, id));
  },

  async create(ctx: ActorContext, input: CreateServiceInput): Promise<ServiceOutput> {
    requirePermission(ctx, Permission.SERVICE_MANAGE);
    return toServiceOutput(await serviceCatalogService.createService(ctx, input));
  },

  async update(ctx: ActorContext, id: string, input: UpdateServiceInput): Promise<ServiceOutput> {
    requirePermission(ctx, Permission.SERVICE_MANAGE);
    return toServiceOutput(await serviceCatalogService.updateService(ctx, id, input));
  },

  async remove(ctx: ActorContext, id: string): Promise<{ id: string }> {
    requirePermission(ctx, Permission.SERVICE_MANAGE);
    return serviceCatalogService.deleteService(ctx, id);
  },
};
