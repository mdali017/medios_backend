import { z } from 'zod'

const orderStatusSchema = z.enum([
  'pending',
  'approved',
  'in_delivery',
  'completed',
  'cancelled',
])

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
})

export const assignDeliveryStaffSchema = z.object({
  deliveryStaffId: z.string().uuid('Invalid delivery staff ID'),
})

export const placeOnlineOrderSchema = z.object({
  storeId: z.string().uuid('Store ID is required'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1),
        saleUnit: z.enum(['tablet', 'strip', 'box']).default('tablet'),
      })
    )
    .min(1, 'At least one item is required'),
  deliveryAddress: z.string().min(5, 'Delivery address is required'),
  notes: z.string().optional(),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type AssignDeliveryStaffInput = z.infer<typeof assignDeliveryStaffSchema>
export type PlaceOnlineOrderInput = z.infer<typeof placeOnlineOrderSchema>
