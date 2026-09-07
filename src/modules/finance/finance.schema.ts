import { z } from "zod";
import { ExpenseCategory, PaymentMethod } from "@prisma/client";

export const createInvoiceSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string().optional(),
        treatmentId: z.string().optional(),
        description: z.string().min(1),
        quantity: z.coerce.number().int().min(1).default(1),
        unitPrice: z.coerce.number().min(0),
      }),
    )
    .min(1),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
});
// A hand-written type (not z.infer, whose defaults make discount/tax
// non-optional in the output) so direct service callers — tests, seed
// scripts, Server Actions — can omit them. The service defaults them itself.
// The API route still parses through the schema, which produces a
// structurally compatible object.
export interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string;
  items: {
    serviceId?: string;
    treatmentId?: string;
    description: string;
    quantity?: number;
    unitPrice: number;
  }[];
  discount?: number;
  tax?: number;
}

export const recordPaymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const createRefundSchema = z.object({
  invoiceId: z.string(),
  paymentId: z.string().optional(),
  amount: z.coerce.number().positive(),
  reason: z.string().optional(),
});
export type CreateRefundInput = z.infer<typeof createRefundSchema>;

export const createExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  incurredAt: z.string(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
