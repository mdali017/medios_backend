import { z } from 'zod'

export const exportGoogleSheetSchema = z.object({
  storeId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  filter: z.enum(['all', 'low_stock', 'expiring', 'out_of_stock', 'in_stock']),
  searchQuery: z.string().max(200).optional(),
})

export type ExportGoogleSheetInput = z.infer<typeof exportGoogleSheetSchema>
