import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/AppError'
import { sendError } from '../utils/apiResponse'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode)
  }

  console.error(err)
  return sendError(res, 'Internal server error', 500)
}

export function notFoundHandler(_req: Request, res: Response) {
  return sendError(res, 'Route not found', 404)
}
