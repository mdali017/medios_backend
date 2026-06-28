import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as storeManagerService from './store-manager.service'

export async function listStoreManagers(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined
    const data = await storeManagerService.listStoreManagers(req.user!, storeId)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function createStoreManager(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await storeManagerService.createStoreManager(req.user!, req.body)
    return sendSuccess(res, data, 'Store manager created successfully', 201)
  } catch (error) {
    next(error)
  }
}
