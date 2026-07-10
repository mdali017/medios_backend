import { z } from 'zod'

const saleUnitSchema = z.enum(['tablet', 'strip', 'box'])

export const posCheckoutItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  saleUnit: saleUnitSchema,
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  unitTax: z.coerce.number().min(0, 'Unit tax cannot be negative').default(0),
  tabletsPerUnit: z.coerce.number().int().min(1, 'Tablets per unit must be at least 1'),
})

export const posCheckoutSchema = z.object({
  items: z.array(posCheckoutItemSchema).min(1, 'Cart must contain at least one item'),
  notes: z.string().max(500).optional(),
  branchId: z.string().uuid().optional(),
})

export type PosCheckoutInput = z.infer<typeof posCheckoutSchema>
export type PosCheckoutItemInput = z.infer<typeof posCheckoutItemSchema>
