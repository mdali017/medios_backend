import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as sellerService from './seller.service'

export async function listSellers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.listSellers(req.user!)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function createSeller(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await sellerService.createSeller(req.user!, req.body)
    return sendSuccess(res, data, 'Seller created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export async function deactivateSeller(req: Request, res: Response, next: NextFunction) {
  try {
    await sellerService.deactivateSeller(req.user!, String(req.params.id))
    return sendSuccess(res, null, 'Seller removed successfully')
  } catch (error) {
    next(error)
  }
}
