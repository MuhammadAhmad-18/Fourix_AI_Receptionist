import { InvoiceStatus } from "@prisma/client";
import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { writeAuditLog } from "@/lib/audit";
import { writeOutboxEvent } from "@/lib/events/outbox";
import { eventBus } from "@/lib/events/bus";
import { withIdempotency } from "@/lib/idempotency";
import { patientRepository } from "@/modules/patients/patient.repository";
import { financeRepository } from "@/modules/finance/finance.repository";
import { CreateExpenseInput, CreateInvoiceInput, CreateRefundInput, RecordPaymentInput } from "@/modules/finance/finance.schema";

function invoiceStatusForBalance(total: number, amountPaid: number): InvoiceStatus {
  if (amountPaid <= 0) return "ISSUED";
  if (amountPaid >= total) return "PAID";
  return "PARTIALLY_PAID";
}

export const financeService = {
  async getInvoice(ctx: ActorContext, id: string) {
    const invoice = await financeRepository.findInvoiceById(ctx.clinicId, id);
    if (!invoice) throw new AppError(ErrorCode.INVOICE_NOT_FOUND, `Invoice ${id} not found`);
    return invoice;
  },

  async listInvoicesForPatient(ctx: ActorContext, patientId: string) {
    return financeRepository.listInvoicesForPatient(ctx.clinicId, patientId);
  },

  async createInvoice(ctx: ActorContext, input: CreateInvoiceInput) {
    const patient = await patientRepository.findById(ctx.clinicId, input.patientId);
    if (!patient) throw new AppError(ErrorCode.PATIENT_NOT_FOUND, "Patient not found");

    const discount = input.discount ?? 0;
    const tax = input.tax ?? 0;
    const subtotal = input.items.reduce((sum, i) => sum + (i.quantity ?? 1) * i.unitPrice, 0);
    const total = subtotal - discount + tax;
    if (total < 0) throw new AppError(ErrorCode.VALIDATION_ERROR, "Invoice total cannot be negative");

    return financeRepository.runInTransaction(async (tx) => {
      const invoice = await financeRepository.createInvoice(
        tx,
        {
          clinicId: ctx.clinicId,
          patientId: input.patientId,
          appointmentId: input.appointmentId ?? null,
          status: "ISSUED",
          subtotal,
          discount,
          tax,
          total,
          amountPaid: 0,
          issuedAt: new Date(),
        },
        input.items.map((i) => ({
          serviceId: i.serviceId ?? null,
          treatmentId: i.treatmentId ?? null,
          description: i.description,
          quantity: i.quantity ?? 1,
          unitPrice: i.unitPrice,
          total: (i.quantity ?? 1) * i.unitPrice,
        })),
      );
      await writeAuditLog(tx, ctx, "invoice.create", "Invoice", invoice.id, { total });
      await writeOutboxEvent(tx, ctx.clinicId, "InvoiceCreated", { invoiceId: invoice.id });
      return invoice;
    });
  },

  async calculateOutstandingBalance(ctx: ActorContext, invoiceId: string): Promise<number> {
    const invoice = await this.getInvoice(ctx, invoiceId);
    return Number(invoice.total) - Number(invoice.amountPaid);
  },

  async getPatientBalance(ctx: ActorContext, patientId: string): Promise<number> {
    const invoices = await financeRepository.outstandingInvoicesForPatient(ctx.clinicId, patientId);
    return invoices.reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.amountPaid)), 0);
  },

  async recordPayment(ctx: ActorContext, input: RecordPaymentInput) {
    return withIdempotency(input.idempotencyKey, "recordPayment", input, async () => {
      return financeRepository.runInTransaction(async (tx) => {
        const invoice = await financeRepository.findInvoiceForUpdate(tx, ctx.clinicId, input.invoiceId);
        if (!invoice) throw new AppError(ErrorCode.INVOICE_NOT_FOUND, `Invoice ${input.invoiceId} not found`);
        if (invoice.status === "VOID") {
          throw new AppError(ErrorCode.PAYMENT_FAILED, "Cannot record a payment against a void invoice");
        }

        const newAmountPaid = Number(invoice.amountPaid) + input.amount;
        const payment = await financeRepository.createPayment(tx, {
          clinicId: ctx.clinicId,
          invoiceId: invoice.id,
          amount: input.amount,
          method: input.method,
          status: "COMPLETED",
          reference: input.reference ?? null,
        });
        await financeRepository.updateInvoiceStatus(tx, invoice.id, {
          amountPaid: newAmountPaid,
          status: invoiceStatusForBalance(Number(invoice.total), newAmountPaid),
        });
        await writeAuditLog(tx, ctx, "payment.record", "Payment", payment.id, { amount: input.amount });
        await writeOutboxEvent(tx, ctx.clinicId, "PaymentReceived", { paymentId: payment.id, invoiceId: invoice.id });

        eventBus.publish("PaymentReceived", ctx.clinicId, { paymentId: payment.id });
        return payment;
      });
    });
  },

  /** Refunds are never granted to the AI receptionist scope set — see AI_TO_BASE_PERMISSION. */
  async createRefund(ctx: ActorContext, input: CreateRefundInput) {
    return financeRepository.runInTransaction(async (tx) => {
      const invoice = await financeRepository.findInvoiceForUpdate(tx, ctx.clinicId, input.invoiceId);
      if (!invoice) throw new AppError(ErrorCode.INVOICE_NOT_FOUND, `Invoice ${input.invoiceId} not found`);
      if (input.amount > Number(invoice.amountPaid)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, "Refund amount exceeds amount paid on this invoice");
      }
      if (input.paymentId) {
        const payment = await financeRepository.findPayment(tx, ctx.clinicId, input.paymentId);
        if (!payment) throw new AppError(ErrorCode.NOT_FOUND, `Payment ${input.paymentId} not found`);
        if (input.amount > Number(payment.amount)) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, "Refund amount exceeds the payment amount");
        }
      }

      const refund = await financeRepository.createRefund(tx, {
        clinicId: ctx.clinicId,
        invoiceId: invoice.id,
        paymentId: input.paymentId ?? null,
        amount: input.amount,
        reason: input.reason ?? null,
        status: "COMPLETED",
      });

      const newAmountPaid = Number(invoice.amountPaid) - input.amount;
      await financeRepository.updateInvoiceStatus(tx, invoice.id, {
        amountPaid: newAmountPaid,
        status: invoiceStatusForBalance(Number(invoice.total), newAmountPaid),
      });
      await writeAuditLog(tx, ctx, "refund.create", "Refund", refund.id, { amount: input.amount });
      return refund;
    });
  },

  async createExpense(ctx: ActorContext, input: CreateExpenseInput) {
    return financeRepository.createExpense(ctx.clinicId, {
      category: input.category,
      description: input.description ?? null,
      amount: input.amount,
      incurredAt: new Date(input.incurredAt),
    });
  },
};
