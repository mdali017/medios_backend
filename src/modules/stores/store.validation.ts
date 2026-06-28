import { z } from 'zod'

export const storeStatusEnum = z.enum(['live', 'suspended', 'inactive', 'pending'])

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().min(3, 'License number is required'),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')).transform((v) => v || undefined),
  status: storeStatusEnum.optional(),
})

export const updateStoreSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().min(3).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')).transform((v) => v || undefined),
  status: storeStatusEnum.optional(),
})

export const createStoreAdminSchema = z.object({
  storeId: z.string().uuid('Invalid store ID'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
})

export const storeIdParamSchema = z.object({
  id: z.string().uuid('Invalid store ID'),
})

export type CreateStoreInput = z.infer<typeof createStoreSchema>
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>
export type CreateStoreAdminInput = z.infer<typeof createStoreAdminSchema>
