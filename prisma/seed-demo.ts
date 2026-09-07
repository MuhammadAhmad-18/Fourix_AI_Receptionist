// Comprehensive demo data (Section 36): run after prisma/seed.ts.
// Deliberately goes through the service layer (not raw Prisma writes) for
// everything with business rules — this doubles as an integration smoke
// test of AppointmentService, FinanceService, InventoryService, and
// PackageService under realistic volume.
import { PrismaClient, Channel, PatientSource } from "@prisma/client";
import { ActorContext } from "../src/lib/auth/types";
import { patientService } from "../src/modules/patients/patient.service";
import { practitionerService } from "../src/modules/practitioners/practitioner.service";
import { serviceCatalogService } from "../src/modules/services/service.service";
import { appointmentService } from "../src/modules/appointments/appointment.service";
import { inventoryService } from "../src/modules/inventory/inventory.service";
import { purchasingService } from "../src/modules/purchasing/purchasing.service";
import { financeService } from "../src/modules/finance/finance.service";
import { packageService } from "../src/modules/packages/package.service";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Ayesha", "Bilal", "Sana", "Hamza", "Zara", "Ali", "Mahnoor", "Usman", "Fatima", "Omar",
  "Hira", "Ahmed", "Iqra", "Danish", "Nida", "Zeeshan", "Amna", "Faisal", "Rabia", "Kashif",
  "Mariam", "Adeel", "Saba", "Waqas", "Aliya", "Noman", "Sadia", "Rashid", "Farah", "Tariq",
  "Anum", "Salman",
];
const LAST_NAMES = [
  "Khan", "Ahmed", "Raza", "Hassan", "Malik", "Iqbal", "Sheikh", "Butt", "Chaudhry", "Qureshi",
  "Baig", "Farooq", "Javed", "Siddiqui", "Abbasi",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function randPhone(seed: number): string {
  return `03${String(seed).padStart(2, "0")}${String(1000000 + seed * 37).slice(0, 7)}`;
}
function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const clinic = await prisma.clinic.findFirstOrThrow({ where: { name: "Fourix Aesthetic Clinic" } });
  const ctx: ActorContext = {
    actorId: null,
    actorType: "SYSTEM",
    clinicId: clinic.id,
    source: Channel.DASHBOARD,
    permissions: ["*"],
  };

  // ── Practitioners (top up to 5) ──────────────────────────────────────
  const existingPractitioners = await practitionerService.listPractitioners(ctx);
  const extraNeeded = Math.max(0, 5 - existingPractitioners.length);
  const extraPractitionerDefs = [
    { firstName: "Sana", lastName: "Iqbal", title: "Dr.", specialties: ["Consultations", "Injectables"] },
    { firstName: "Danish", lastName: "Malik", title: "Aesthetician", specialties: ["Body", "Laser"] },
    { firstName: "Mahnoor", lastName: "Siddiqui", title: "Dr.", specialties: ["Facials"] },
  ];
  for (let i = 0; i < extraNeeded; i++) {
    const def = extraPractitionerDefs[i];
    const p = await practitionerService.createPractitioner(ctx, def);
    await practitionerService.setSchedules(
      ctx,
      p.id,
      Array.from({ length: 6 }, (_, d) => ({ dayOfWeek: d + 1, startTime: "09:00", endTime: "18:00" })),
    );
  }
  const practitioners = await practitionerService.listPractitioners(ctx);
  console.log(`Practitioners: ${practitioners.length}`);

  // ── Services (top up to 20+) ──────────────────────────────────────────
  const extraServiceDefs = [
    { name: "Skin Consultation", duration: 20, price: 1500, requiresConsultation: false },
    { name: "LED Light Therapy", duration: 30, price: 4000 },
    { name: "Microneedling", duration: 60, price: 12000, requiresConsultation: true, requiresConsent: true },
    { name: "PRP Facial", duration: 75, price: 20000, requiresConsultation: true, requiresConsent: true },
    { name: "Carbon Laser Peel", duration: 45, price: 9000 },
    { name: "Body Contouring", duration: 90, price: 30000, requiresConsultation: true },
    { name: "Laser Hair Removal (Underarms)", duration: 20, price: 3000 },
    { name: "Laser Hair Removal (Full Body)", duration: 90, price: 18000 },
    { name: "Dermal Fillers (Cheeks)", duration: 45, price: 30000, requiresConsultation: true, requiresConsent: true },
    { name: "Dermal Fillers (Jawline)", duration: 45, price: 28000, requiresConsultation: true, requiresConsent: true },
    { name: "Botox (Crows Feet)", duration: 20, price: 12000, requiresConsultation: true, requiresConsent: true },
    { name: "Mesotherapy", duration: 40, price: 15000, requiresConsultation: true },
    { name: "Oxygen Facial", duration: 45, price: 6500 },
    { name: "Anti-Aging Facial", duration: 60, price: 9500 },
    { name: "Acne Treatment", duration: 45, price: 5500, requiresConsultation: true },
  ];
  for (const s of extraServiceDefs) {
    const existing = await prisma.service.findFirst({ where: { clinicId: clinic.id, name: s.name } });
    if (existing) continue;
    await serviceCatalogService.createService(ctx, {
      name: s.name,
      durationMinutes: s.duration,
      price: s.price,
      requiresConsultation: s.requiresConsultation ?? false,
      requiresConsent: s.requiresConsent ?? false,
      requiresPractitioner: true,
    });
  }
  const services = await serviceCatalogService.listServices(ctx, { activeOnly: true });
  console.log(`Services: ${services.length}`);

  // ── Patients (32) ─────────────────────────────────────────────────────
  const existingPatients = await prisma.patient.count({ where: { clinicId: clinic.id } });
  const sources: PatientSource[] = ["WALK_IN", "REFERRAL", "WEBSITE", "PHONE", "WHATSAPP", "INSTAGRAM", "OTHER"];
  const patientsNeeded = Math.max(0, 32 - existingPatients);
  for (let i = 0; i < patientsNeeded; i++) {
    const firstName = pick(FIRST_NAMES, i);
    const lastName = pick(LAST_NAMES, i + 3);
    await patientService.createPatient(ctx, {
      firstName,
      lastName,
      gender: i % 3 === 0 ? "MALE" : "FEMALE",
      source: pick(sources, i),
      phone: randPhone(i + 1),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
    });
  }
  const patients = await prisma.patient.findMany({ where: { clinicId: clinic.id } });
  console.log(`Patients: ${patients.length}`);

  // ── Suppliers ─────────────────────────────────────────────────────────
  const supplierDefs = ["MedSupply Co.", "DermaTech Distributors", "Aesthetics Wholesale PK"];
  for (const name of supplierDefs) {
    const existing = (await purchasingService.listSuppliers(ctx)).find((s) => s.name === name);
    if (!existing) await purchasingService.createSupplier(ctx, { name, phone: "+924211234567" });
  }
  const suppliers = await purchasingService.listSuppliers(ctx);

  // ── Inventory products (30+), with low-stock and expiring batches ─────
  const productDefs = [
    "Botox Vial 100u", "Hyaluronic Filler 1ml", "Hyaluronic Filler 2ml", "PRP Tube Kit", "Numbing Cream",
    "Hydrafacial Serum Set", "Chemical Peel Solution 30%", "Chemical Peel Solution 20%", "Microneedling Cartridge",
    "LED Mask Filter", "Laser Gel", "Vitamin C Serum", "Retinol Serum", "Sunscreen SPF50", "Cleanser 500ml",
    "Toner 500ml", "Moisturizer 250ml", "Collagen Mask (Box of 10)", "Under-eye Patches (Box)", "Lip Filler 1ml",
    "Jawline Filler 2ml", "Mesotherapy Cocktail Vial", "Dermaroller 0.5mm", "Dermaroller 1.0mm", "Gauze Pads (Box)",
    "Gloves (Box)", "Alcohol Swabs (Box)", "Syringes 1ml (Box)", "Cannula 25G (Box)", "Aftercare Balm",
  ];
  const existingProductCount = (await inventoryService.listProducts(ctx)).length;
  for (let i = 0; i < productDefs.length; i++) {
    const name = productDefs[i];
    if ((await inventoryService.listProducts(ctx)).some((p) => p.name === name)) continue;
    const unit = name.includes("ml") || name.includes("Serum") || name.includes("Solution") ? "ML" : name.includes("Vial") ? "VIAL" : "UNIT";
    const reorderLevel = 5 + (i % 5);
    const product = await inventoryService.createProduct(ctx, { name, unit: unit as never, reorderLevel });

    // Most products: healthy stock. Every 4th: low stock. Every 7th: an expiring batch.
    const isLow = i % 4 === 0;
    const isExpiring = i % 7 === 0;
    await inventoryService.receiveBatch(ctx, {
      productId: product.id,
      batchNumber: `B-${1000 + i}`,
      quantity: isLow ? Math.max(1, reorderLevel - 2) : reorderLevel + 20,
      costPrice: 500 + i * 25,
      expiryDate: isExpiring ? daysFromNow(15).toISOString().slice(0, 10) : daysFromNow(365).toISOString().slice(0, 10),
    });
  }
  console.log(`Products: ${(await inventoryService.listProducts(ctx)).length} (started with ${existingProductCount})`);

  if (suppliers[0]) {
    const products = await inventoryService.listProducts(ctx);
    await purchasingService.createPurchaseOrder(ctx, {
      supplierId: suppliers[0].id,
      items: products.slice(0, 3).map((p) => ({ productId: p.id, quantity: 10, unitCost: 800 })),
    });
  }

  // ── Appointments spread across a 4-week window, non-overlapping per practitioner ──
  const existingAppointments = await prisma.appointment.count({ where: { clinicId: clinic.id } });
  if (existingAppointments < 20) {
    let created = 0;
    for (let dayOffset = -14; dayOffset <= 14 && created < 40; dayOffset++) {
      const date = daysFromNow(dayOffset);
      const dow = date.getDay();
      if (dow === 0) continue; // clinic closed Sundays
      const dateStr = date.toISOString().slice(0, 10);

      for (let slot = 0; slot < 2 && created < 40; slot++) {
        const practitioner = practitioners[(dayOffset + slot + 14) % practitioners.length];
        const service = services[(dayOffset + slot + 7) % services.length];
        const patient = patients[(dayOffset + slot + 11) % patients.length];
        const hour = 10 + slot * 3;
        const startTime = `${dateStr}T${String(hour).padStart(2, "0")}:00:00+05:00`;

        try {
          const appt = await appointmentService.createAppointment(ctx, {
            patientId: patient.id,
            practitionerId: practitioner.id,
            serviceId: service.id,
            startTime,
            source: dayOffset % 5 === 0 ? "WHATSAPP" : "DASHBOARD",
          });
          created++;

          // Past appointments: walk through the full lifecycle and bill them.
          if (dayOffset < 0) {
            await appointmentService.confirmAppointment(ctx, appt.id);
            await appointmentService.checkInAppointment(ctx, appt.id);
            await appointmentService.startTreatment(ctx, appt.id);
            await appointmentService.completeAppointment(ctx, appt.id);

            const treatment = await prisma.treatment.create({
              data: {
                clinicId: clinic.id,
                patientId: patient.id,
                practitionerId: practitioner.id,
                serviceId: service.id,
                appointmentId: appt.id,
                completedAt: new Date(),
              },
            });
            void treatment;

            const invoice = await financeService.createInvoice(ctx, {
              patientId: patient.id,
              appointmentId: appt.id,
              items: [{ description: service.name, quantity: 1, unitPrice: Number(service.price) }],
            });
            // ~80% paid in full, ~20% left partially outstanding.
            const payAmount = created % 5 === 0 ? Math.round(Number(invoice.total) * 0.5) : Number(invoice.total);
            await financeService.recordPayment(ctx, { invoiceId: invoice.id, amount: payAmount, method: "CASH" });
          } else if (dayOffset === 0) {
            await appointmentService.confirmAppointment(ctx, appt.id);
          }
        } catch {
          // Slot collision from the modulo scheduling above — skip, demo data doesn't need every slot filled.
        }
      }
    }
    console.log(`Appointments created: ${created}`);
  }

  // ── Packages & Memberships ────────────────────────────────────────────
  const existingPackages = await prisma.package.count({ where: { clinicId: clinic.id } });
  if (existingPackages === 0) {
    for (let i = 0; i < 5; i++) {
      await packageService.createPackage(ctx, {
        patientId: patients[i * 3].id,
        serviceId: services[i].id,
        totalSessions: 5,
        expiresAt: daysFromNow(180).toISOString(),
      });
    }
  }
  const existingMemberships = await prisma.membership.count({ where: { clinicId: clinic.id } });
  if (existingMemberships === 0) {
    for (let i = 0; i < 3; i++) {
      await packageService.createMembership(ctx, {
        patientId: patients[i * 5 + 1].id,
        planName: i === 0 ? "Gold Membership" : i === 1 ? "Silver Membership" : "VIP Membership",
        expiresAt: daysFromNow(365).toISOString(),
        benefits: { discountPercent: 10 + i * 5 },
      });
    }
  }

  // ── Expenses ──────────────────────────────────────────────────────────
  const existingExpenses = await prisma.expense.count({ where: { clinicId: clinic.id } });
  if (existingExpenses === 0) {
    const expenseDefs: { category: "RENT" | "UTILITIES" | "SALARIES" | "SUPPLIES" | "MARKETING" | "MAINTENANCE" | "OTHER"; amount: number; daysAgo: number }[] = [
      { category: "RENT", amount: 150000, daysAgo: 30 },
      { category: "UTILITIES", amount: 25000, daysAgo: 28 },
      { category: "SALARIES", amount: 400000, daysAgo: 25 },
      { category: "SUPPLIES", amount: 60000, daysAgo: 20 },
      { category: "MARKETING", amount: 35000, daysAgo: 15 },
      { category: "MAINTENANCE", amount: 12000, daysAgo: 10 },
      { category: "OTHER", amount: 8000, daysAgo: 5 },
    ];
    for (const e of expenseDefs) {
      await financeService.createExpense(ctx, {
        category: e.category,
        amount: e.amount,
        incurredAt: daysFromNow(-e.daysAgo).toISOString(),
        description: `${e.category} expense`,
      });
    }
  }

  console.log("Demo data seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
