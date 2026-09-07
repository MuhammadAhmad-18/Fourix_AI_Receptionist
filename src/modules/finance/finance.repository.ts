// ONLY file in the finance module allowed to import PrismaClient.
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type TxClient = Prisma.TransactionClient | PrismaClient;

export const financeRepository = {
  findInvoiceById(clinicId: string, id: string) {
    return prisma.invoice.findFirst({ where: { id, clinicId }, include: { items: true, payments: true, refunds: true } });
  },

  listInvoicesForPatient(clinicId: string, patientId: string) {
    return prisma.invoice.findMany({ where: { clinicId, patientId }, orderBy: { createdAt: "desc" } });
  },

  outstandingInvoicesForPatient(clinicId: string, patientId: string) {
    return prisma.invoice.findMany({
      where: { clinicId, patientId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
    });
  },

  createInvoice(
    tx: TxClient,
    data: Prisma.InvoiceUncheckedCreateInput,
    items: Omit<Prisma.InvoiceItemUncheckedCreateInput, "invoiceId">[],
  ) {
    return tx.invoice.create({
      data: { ...data, items: { create: items } },
      include: { items: true },
    });
  },

  async findInvoiceForUpdate(tx: TxClient, clinicId: string, id: string) {
    return tx.invoice.findFirst({ where: { id, clinicId } });
  },

  updateInvoiceStatus(tx: TxClient, id: string, data: Prisma.InvoiceUncheckedUpdateInput) {
    return tx.invoice.update({ where: { id }, data });
  },

  createPayment(tx: TxClient, data: Prisma.PaymentUncheckedCreateInput) {
    return tx.payment.create({ data });
  },

  findPayment(tx: TxClient, clinicId: string, id: string) {
    return tx.payment.findFirst({ where: { id, clinicId } });
  },

  createRefund(tx: TxClient, data: Prisma.RefundUncheckedCreateInput) {
    return tx.refund.create({ data });
  },

  createExpense(clinicId: string, data: Omit<Prisma.ExpenseUncheckedCreateInput, "clinicId">) {
    return prisma.expense.create({ data: { ...data, clinicId } });
  },

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },
};
