import { z } from 'zod'

const unitTypeSchema = z.enum([
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'cream',
  'drops',
  'other',
])

export const bulkProductItemSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  genericName: z.string().min(1, 'Generic name is required'),
  brandName: z.string().min(1, 'Brand name is required'),
  category: z.string().optional(),
  company: z.string().optional(),
  positionName: z.string().optional(),
  unitType: unitTypeSchema.default('tablet'),
  description: z.string().optional(),
  priceSingle: z.coerce.number().positive('Price single must be greater than 0'),
  pricePata: z.coerce.number().positive().optional().nullable(),
  priceBox: z.coerce.number().positive().optional().nullable(),
  costPriceSingle: z.coerce.number().positive().optional().nullable(),
  taxPercent: z.coerce.number().min(0).max(100).optional().default(0),
  tabletsPerStrip: z.coerce.number().int().min(1).optional().default(10),
  stripsPerBox: z.coerce.number().int().min(1).optional().default(10),
  stockQuantity: z.coerce.number().int().min(0, 'Stock quantity cannot be negative'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD'),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date must be YYYY-MM-DD')
    .optional(),
  imageUrl: z
    .string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
})

export const bulkUploadProductsSchema = z.object({
  storeId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  products: z.array(bulkProductItemSchema).min(1, 'At least one product is required').max(2000),
})

export const updateProductSchema = bulkProductItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required to update' }
)

export type BulkProductItemInput = z.infer<typeof bulkProductItemSchema>
export type BulkUploadProductsInput = z.infer<typeof bulkUploadProductsSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>

export const updateProductPositionSchema = z.object({
  positionName: z.string().optional(),
})

export type UpdateProductPositionInput = z.infer<typeof updateProductPositionSchema>

export const bulkCollectProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product is required').max(500),
})

export type BulkCollectProductsInput = z.infer<typeof bulkCollectProductsSchema>
