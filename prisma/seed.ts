import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { Permission } from "../src/lib/auth/permissions";
import { generateApiKey, hashApiKey } from "../src/lib/auth/api-client";

const prisma = new PrismaClient();

const ALL_PERMISSIONS = Object.values(Permission);

const AI_SCOPES = ALL_PERMISSIONS.filter((p) => p.startsWith("ai."));

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS.filter((p) => !p.startsWith("ai.")),
  PRACTITIONER: [
    Permission.PATIENT_READ,
    Permission.SERVICE_READ,
    Permission.PRACTITIONER_READ,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_MANAGE,
    Permission.CLINIC_READ,
    Permission.CONSENT_READ,
    Permission.CONSENT_MANAGE,
  ],
  RECEPTIONIST: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.SERVICE_READ,
    Permission.PRACTITIONER_READ,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_RESCHEDULE,
    Permission.APPOINTMENT_CANCEL,
    Permission.CLINIC_READ,
    Permission.PACKAGE_READ,
    Permission.MEMBERSHIP_READ,
    Permission.FINANCE_READ,
  ],
  ACCOUNTANT: [
    Permission.FINANCE_READ,
    Permission.FINANCE_MANAGE,
    Permission.REFUND_MANAGE,
    Permission.REPORT_READ,
    Permission.PATIENT_READ,
  ],
};

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: "clinic-demo" },
    update: {},
    create: {
      id: "clinic-demo",
      name: "Fourix Aesthetic Clinic",
      timezone: "Asia/Karachi",
      currency: "PKR",
      addressLine1: "Block G3, Johar Town",
      city: "Lahore",
      country: "Pakistan",
      phone: "+924235123456",
      email: "front-desk@fourixclinic.com",
      website: "https://fourixclinic.com",
      cancellationPolicy:
        "Cancellations within 4 hours of the appointment time forfeit any advance payment.",
      paymentMethods: ["CASH", "CARD", "BANK_TRANSFER"],
    },
  });

  // Sunday(0) closed, Mon-Sat 09:00-18:00
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    await prisma.businessHours.upsert({
      where: { clinicId_dayOfWeek: { clinicId: clinic.id, dayOfWeek } },
      update: {},
      create: {
        clinicId: clinic.id,
        dayOfWeek,
        openTime: "09:00",
        closeTime: "18:00",
        isClosed: dayOfWeek === 0,
      },
    });
  }

  await prisma.clinicFaq.createMany({
    data: [
      {
        clinicId: clinic.id,
        question: "What are your opening hours?",
        answer: "We're open Monday to Saturday, 9 AM to 6 PM. Closed on Sundays.",
        sortOrder: 1,
      },
      {
        clinicId: clinic.id,
        question: "What is your cancellation policy?",
        answer: "Cancellations within 4 hours of the appointment time forfeit any advance payment.",
        sortOrder: 2,
      },
    ],
    skipDuplicates: true,
  });

  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { clinicId_name: { clinicId: clinic.id, name: roleName } },
      update: {},
      create: { clinicId: clinic.id, name: roleName, isSystem: true },
    });
    for (const key of permKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const adminPasswordHash = await argon2.hash("Admin@12345");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@fourixclinic.com" },
    update: {},
    create: {
      clinicId: clinic.id,
      name: "Clinic Admin",
      email: "admin@fourixclinic.com",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
    },
  });
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { clinicId_name: { clinicId: clinic.id, name: "ADMIN" } },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Disabled by default — Phase 2 is an enable-and-configure step, not an
  // auth rewrite. Print the plaintext key once; only the hash is stored.
  const existingAiClient = await prisma.apiClient.findUnique({
    where: { clinicId_name: { clinicId: clinic.id, name: "ai-receptionist" } },
  });
  if (!existingAiClient) {
    const { plaintext, prefix } = generateApiKey();
    await prisma.apiClient.create({
      data: {
        clinicId: clinic.id,
        name: "ai-receptionist",
        keyHash: await hashApiKey(plaintext),
        keyPrefix: prefix,
        scopes: AI_SCOPES,
        status: "DISABLED",
      },
    });
    console.log("\nSeeded ai-receptionist ApiClient (DISABLED). One-time plaintext key:");
    console.log(`  ${plaintext}\n`);
  }

  // Minimal service catalog + practitioners so the appointment engine has
  // something to book against out of the box.
  const categoryNames = ["Facials", "Injectables", "Laser"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.serviceCategory.upsert({
      where: { clinicId_name: { clinicId: clinic.id, name } },
      update: {},
      create: { clinicId: clinic.id, name },
    });
    categories[name] = cat.id;
  }

  const serviceDefs = [
    { name: "Hydrafacial", category: "Facials", duration: 60, price: 8000, requiresConsultation: false },
    { name: "Chemical Peel", category: "Facials", duration: 45, price: 6000, requiresConsultation: true },
    { name: "Botox (Forehead)", category: "Injectables", duration: 30, price: 15000, requiresConsultation: true, requiresConsent: true },
    { name: "Dermal Fillers (Lips)", category: "Injectables", duration: 45, price: 25000, requiresConsultation: true, requiresConsent: true },
    { name: "Laser Hair Removal (Full Face)", category: "Laser", duration: 30, price: 5000, requiresConsultation: false },
  ];
  for (const s of serviceDefs) {
    const existing = await prisma.service.findFirst({ where: { clinicId: clinic.id, name: s.name } });
    if (!existing) {
      await prisma.service.create({
        data: {
          clinicId: clinic.id,
          categoryId: categories[s.category],
          name: s.name,
          durationMinutes: s.duration,
          price: s.price,
          requiresConsultation: s.requiresConsultation ?? false,
          requiresConsent: s.requiresConsent ?? false,
          requiresPractitioner: true,
        },
      });
    }
  }

  const practitionerDefs = [
    { firstName: "Ayesha", lastName: "Raza", title: "Dr.", specialties: ["Injectables", "Consultations"] },
    { firstName: "Bilal", lastName: "Hassan", title: "Aesthetician", specialties: ["Facials", "Laser"] },
  ];
  for (const p of practitionerDefs) {
    const existingEmployee = await prisma.employee.findFirst({
      where: { clinicId: clinic.id, firstName: p.firstName, lastName: p.lastName },
    });
    if (existingEmployee) continue;
    const employee = await prisma.employee.create({
      data: { clinicId: clinic.id, firstName: p.firstName, lastName: p.lastName, role: "PRACTITIONER" },
    });
    const practitioner = await prisma.practitioner.create({
      data: { clinicId: clinic.id, employeeId: employee.id, title: p.title, specialties: p.specialties },
    });
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.practitionerSchedule.create({
        data: { practitionerId: practitioner.id, dayOfWeek, startTime: "09:00", endTime: "18:00" },
      });
    }
  }

  await prisma.room.upsert({
    where: { clinicId_name: { clinicId: clinic.id, name: "Treatment Room 1" } },
    update: {},
    create: { clinicId: clinic.id, name: "Treatment Room 1" },
  });
  await prisma.room.upsert({
    where: { clinicId_name: { clinicId: clinic.id, name: "Treatment Room 2" } },
    update: {},
    create: { clinicId: clinic.id, name: "Treatment Room 2" },
  });

  console.log("Seed complete.");
  console.log("Login: admin@fourixclinic.com / Admin@12345");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
