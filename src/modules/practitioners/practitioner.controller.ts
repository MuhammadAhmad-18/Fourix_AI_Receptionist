import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { practitionerService } from "@/modules/practitioners/practitioner.service";
import {
  CreatePractitionerInput,
  PractitionerOutput,
  ScheduleEntryInput,
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

  async setSchedules(ctx: ActorContext, id: string, schedules: ScheduleEntryInput[]) {
    requirePermission(ctx, Permission.PRACTITIONER_MANAGE);
    return practitionerService.setSchedules(ctx, id, schedules);
  },
};
