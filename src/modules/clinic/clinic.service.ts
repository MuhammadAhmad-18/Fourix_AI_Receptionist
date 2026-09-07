import { ActorContext } from "@/lib/auth/types";
import { clinicRepository } from "@/modules/clinic/clinic.repository";

// Database-driven clinic configuration (Section 16 / 10): the future AI
// receptionist answers "what are your hours / how much is X / where are you"
// from these, never from hard-coded prompt text.
export const clinicService = {
  async getClinicInformation(ctx: ActorContext) {
    return clinicRepository.getById(ctx.clinicId);
  },

  async getBusinessHours(ctx: ActorContext) {
    return clinicRepository.businessHours(ctx.clinicId);
  },

  async getPolicies(ctx: ActorContext) {
    const clinic = await clinicRepository.getById(ctx.clinicId);
    return { cancellationPolicy: clinic.cancellationPolicy, paymentMethods: clinic.paymentMethods };
  },

  async getLocation(ctx: ActorContext) {
    const clinic = await clinicRepository.getById(ctx.clinicId);
    return {
      addressLine1: clinic.addressLine1,
      addressLine2: clinic.addressLine2,
      city: clinic.city,
      country: clinic.country,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
    };
  },

  async getContactInformation(ctx: ActorContext) {
    const clinic = await clinicRepository.getById(ctx.clinicId);
    return { phone: clinic.phone, email: clinic.email, website: clinic.website };
  },

  async getFaqs(ctx: ActorContext) {
    return clinicRepository.faqs(ctx.clinicId);
  },
};
