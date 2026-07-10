import { z } from 'zod'

export const branchStatusEnum = z.enum(['active', 'inactive'])

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().optional(),
  phone: z.string().optional(),
})

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  status: branchStatusEnum.optional(),
})

export type CreateBranchInput = z.infer<typeof createBranchSchema>
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>
