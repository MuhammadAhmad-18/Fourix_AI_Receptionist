import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/reset-db";
import { financeService } from "@/modules/finance/finance.service";
import { ActorContext } from "@/lib/auth/types";
import { Channel } from "@prisma/client";

let ctx: ActorContext;
let patientId: string;

beforeEach(async () => {
  await resetDb();
  const clinic = await prisma.clinic.create({ data: { name: "Test Clinic" } });
  const patient = await prisma.patient.create({ data: { clinicId: clinic.id, firstName: "A", lastName: "One" } });
  patientId = patient.id;
  ctx = { actorId: null, actorType: "SYSTEM", clinicId: clinic.id, source: Channel.DASHBOARD, permissions: ["*"] };
});

describe("financeService invoicing and payments", () => {
  it("computes subtotal/total correctly and marks PAID once fully paid", async () => {
    const invoice = await financeService.createInvoice(ctx, {
      patientId,
      items: [{ description: "Hydrafacial", quantity: 1, unitPrice: 8000 }],
      discount: 500,
      tax: 0,
    });
    expect(Number(invoice.total)).toBe(7500);
    expect(invoice.status).toBe("ISSUED");

    await financeService.recordPayment(ctx, { invoiceId: invoice.id, amount: 3000, method: "CASH" });
    let balance = await financeService.calculateOutstandingBalance(ctx, invoice.id);
    expect(balance).toBe(4500);

    await financeService.recordPayment(ctx, { invoiceId: invoice.id, amount: 4500, method: "CASH" });
    balance = await financeService.calculateOutstandingBalance(ctx, invoice.id);
    expect(balance).toBe(0);

    const updated = await financeService.getInvoice(ctx, invoice.id);
    expect(updated.status).toBe("PAID");
  });

  it("repeated recordPayment with the same idempotency key creates one payment", async () => {
    const invoice = await financeService.createInvoice(ctx, {
      patientId,
      items: [{ description: "Consultation", quantity: 1, unitPrice: 2000 }],
    });
    const input = { invoiceId: invoice.id, amount: 2000, method: "CASH" as const, idempotencyKey: "pay-key-1" };

    await financeService.recordPayment(ctx, input);
    await financeService.recordPayment(ctx, input);

    const count = await prisma.payment.count({ where: { invoiceId: invoice.id } });
    expect(count).toBe(1);
  });

  it("rejects a refund larger than the amount paid", async () => {
    const invoice = await financeService.createInvoice(ctx, {
      patientId,
      items: [{ description: "Botox", quantity: 1, unitPrice: 15000 }],
    });
    await financeService.recordPayment(ctx, { invoiceId: invoice.id, amount: 5000, method: "CASH" });

    await expect(
      financeService.createRefund(ctx, { invoiceId: invoice.id, amount: 10000, reason: "test" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("applies a valid refund and recomputes the invoice balance", async () => {
    const invoice = await financeService.createInvoice(ctx, {
      patientId,
      items: [{ description: "Botox", quantity: 1, unitPrice: 15000 }],
    });
    await financeService.recordPayment(ctx, { invoiceId: invoice.id, amount: 15000, method: "CASH" });
    await financeService.createRefund(ctx, { invoiceId: invoice.id, amount: 5000, reason: "patient dissatisfied" });

    const balance = await financeService.calculateOutstandingBalance(ctx, invoice.id);
    expect(balance).toBe(5000); // total 15000, amountPaid reduced to 10000 after the 5000 refund
    const updated = await financeService.getInvoice(ctx, invoice.id);
    expect(updated.status).toBe("PARTIALLY_PAID");
  });

  it("aggregates outstanding balance across multiple invoices for a patient", async () => {
    const inv1 = await financeService.createInvoice(ctx, { patientId, items: [{ description: "A", quantity: 1, unitPrice: 1000 }] });
    await financeService.createInvoice(ctx, { patientId, items: [{ description: "B", quantity: 1, unitPrice: 2000 }] });
    await financeService.recordPayment(ctx, { invoiceId: inv1.id, amount: 1000, method: "CASH" });

    const balance = await financeService.getPatientBalance(ctx, patientId);
    expect(balance).toBe(2000);
  });
});
