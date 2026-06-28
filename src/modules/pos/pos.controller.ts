import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as posService from './pos.service'

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await posService.checkoutPosOrder(req.user!, req.body)
    return sendSuccess(res, data, 'Order completed successfully', 201)
  } catch (error) {
    next(error)
  }
}
