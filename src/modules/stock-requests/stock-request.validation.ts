import { z } from 'zod'

export const createEmergencyNeedSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  requestedQty: z.number().int().positive('Quantity must be at least 1'),
  notes: z.string().max(500).optional(),
})

export const updateEmergencyNeedStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'fulfilled']),
  adminNote: z.string().max(500).optional(),
})

export const createBulkRestockSchema = z.object({
  items: z.array(createEmergencyNeedSchema).min(1, 'At least one item is required').max(50),
})

export type CreateEmergencyNeedInput = z.infer<typeof createEmergencyNeedSchema>
export type CreateBulkRestockInput = z.infer<typeof createBulkRestockSchema>
export type UpdateEmergencyNeedStatusInput = z.infer<typeof updateEmergencyNeedStatusSchema>
