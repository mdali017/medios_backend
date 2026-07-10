import { z } from 'zod'

export const createBranchManagerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  branchId: z.string().uuid('Invalid branch ID'),
  storeId: z.string().uuid().optional(),
})

export type CreateBranchManagerInput = z.infer<typeof createBranchManagerSchema>
