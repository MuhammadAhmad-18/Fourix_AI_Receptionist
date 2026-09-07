import { z } from "zod";
import { Product, ProductUnit } from "@prisma/client";

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.UNIT),
  reorderLevel: z.coerce.number().min(0).default(0),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const receiveBatchSchema = z.object({
  productId: z.string(),
  batchNumber: z.string(),
  quantity: z.coerce.number().positive(),
  costPrice: z.coerce.number().min(0).optional(),
  expiryDate: z.string().date().optional(),
});
export type ReceiveBatchInput = z.infer<typeof receiveBatchSchema>;

export const recordStockUsageSchema = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  quantity: z.coerce.number().positive(),
  reason: z.string().optional(),
});
export type RecordStockUsageInput = z.infer<typeof recordStockUsageSchema>;

export const adjustStockSchema = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  delta: z.coerce.number().refine((v) => v !== 0, "delta must be non-zero"),
  reason: z.string().min(1),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const productOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  unit: z.nativeEnum(ProductUnit),
  reorderLevel: z.number(),
  active: z.boolean(),
  quantityOnHand: z.number(),
});
export type ProductOutput = z.infer<typeof productOutputSchema>;

export function toProductOutput(p: Product & { batches?: { quantityOnHand: unknown }[] }): ProductOutput {
  const quantityOnHand = (p.batches ?? []).reduce((sum, b) => sum + Number(b.quantityOnHand), 0);
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    reorderLevel: Number(p.reorderLevel),
    active: p.active,
    quantityOnHand,
  };
}
