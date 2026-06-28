import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../utils/AppError'

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const message = result.error.errors.map((err) => err.message).join(', ')
      return next(new AppError(message, 400))
    }

    req.body = result.data
    next()
  }
}
