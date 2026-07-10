import { z } from 'zod'

export const matchMedicinesSchema = z.object({
  storeId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  medicines: z
    .array(
      z.object({
        name: z.string().min(1, 'Medicine name is required'),
        strength: z.string().optional(),
      })
    )
    .min(1, 'At least one medicine is required'),
})

export type MatchMedicinesInput = z.infer<typeof matchMedicinesSchema>
