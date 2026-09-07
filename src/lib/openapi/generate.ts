import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "@/lib/openapi/registry";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Fourix Clinic API",
      version: "1.0.0",
      description:
        "Aesthetic clinic management API — the same contract the dashboard, and eventually the Phase 2 AI receptionist, both consume. See AI_INTEGRATION.md for the full integration guide, authentication modes, and error codes.",
    },
    servers: [{ url: "/" }],
  });
}
