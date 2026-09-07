import { ActorContext } from "@/lib/auth/types";
import { requirePermission, Permission } from "@/lib/auth/permissions";
import { financeService } from "@/modules/finance/finance.service";
import { CreateExpenseInput, CreateInvoiceInput, CreateRefundInput, RecordPaymentInput } from "@/modules/finance/finance.schema";

export const financeController = {
  async getInvoice(ctx: ActorContext, id: string) {
    requirePermission(ctx, Permission.FINANCE_READ);
    return financeService.getInvoice(ctx, id);
  },
  async listForPatient(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.FINANCE_READ);
    return financeService.listInvoicesForPatient(ctx, patientId);
  },
  async patientBalance(ctx: ActorContext, patientId: string) {
    requirePermission(ctx, Permission.FINANCE_READ);
    const balance = await financeService.getPatientBalance(ctx, patientId);
    return { patientId, balance };
  },
  async createInvoice(ctx: ActorContext, input: CreateInvoiceInput) {
    requirePermission(ctx, Permission.FINANCE_MANAGE);
    return financeService.createInvoice(ctx, input);
  },
  async recordPayment(ctx: ActorContext, input: RecordPaymentInput) {
    requirePermission(ctx, Permission.FINANCE_MANAGE);
    return financeService.recordPayment(ctx, input);
  },
  async createRefund(ctx: ActorContext, input: CreateRefundInput) {
    requirePermission(ctx, Permission.REFUND_MANAGE);
    return financeService.createRefund(ctx, input);
  },
  async createExpense(ctx: ActorContext, input: CreateExpenseInput) {
    requirePermission(ctx, Permission.FINANCE_MANAGE);
    return financeService.createExpense(ctx, input);
  },
};
