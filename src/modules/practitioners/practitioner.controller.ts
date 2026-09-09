import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { practitionerService } from "@/modules/practitioners/practitioner.service";
import {
  CreatePractitionerInput,
  PractitionerOutput,
  ScheduleEntryInput,
  UpdatePractitionerInput,
  toPractitionerOutput,
} from "@/modules/practitioners/practitioner.schema";

export const practitionerController = {
  async list(ctx: ActorContext, opts: { activeOnly?: boolean; serviceId?: string } = {}): Promise<PractitionerOutput[]> {
    requirePermission(ctx, Permission.PRACTITIONER_READ);
    const practitioners = await practitionerService.listPractitioners(ctx, opts);
    return practitioners.map(toPractitionerOutput);
  },

  async get(ctx: ActorContext, id: string): Promise<PractitionerOutput> {
    requirePermission(ctx, Permission.PRACTITIONER_READ);
    return toPractitionerOutput(await practitionerService.getPractitioner(ctx, id));
  },

  async create(ctx: ActorContext, input: CreatePractitionerInput): Promise<PractitionerOutput> {
    requirePermission(ctx, Permission.PRACTITIONER_MANAGE);
    return toPractitionerOutput(await practitionerService.createPractitioner(ctx, input));
  },

  async update(
    ctx: ActorContext,
    id: string,
    input: UpdatePractitionerInput,
  ): Promise<PractitionerOutput> {
    requirePermission(ctx, Permission.PRACTITIONER_MANAGE);
    return toPractitionerOutput(await practitionerService.updatePractitioner(ctx, id, input));
  },

  async remove(ctx: ActorContext, id: string): Promise<{ id: string }> {
    requirePermission(ctx, Permission.PRACTITIONER_MANAGE);
    return practitionerService.deletePractitioner(ctx, id);
  },

  async setSchedules(ctx: ActorContext, id: string, schedules: ScheduleEntryInput[]) {
    requirePermission(ctx, Permission.PRACTITIONER_MANAGE);
    return practitionerService.setSchedules(ctx, id, schedules);
  },
};
