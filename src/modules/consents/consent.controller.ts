import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { consentService } from "@/modules/consents/consent.service";
import { CreateConsentInput, toConsentOutput } from "@/modules/consents/consent.schema";

export const consentController = {
  async listForPatient(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.CONSENT_READ);
    const consents = await consentService.listForPatient(ctx, patientId);
    return consents.map(toConsentOutput);
  },
  async create(ctx: ActorContext, input: CreateConsentInput) {
    requirePermission(ctx, Permission.CONSENT_MANAGE);
    return toConsentOutput(await consentService.createConsent(ctx, input));
  },
};
