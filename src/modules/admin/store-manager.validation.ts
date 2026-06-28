import { z } from 'zod'

export const createStoreManagerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  storeId: z.string().uuid().optional(),
})

export type CreateStoreManagerInput = z.infer<typeof createStoreManagerSchema>
