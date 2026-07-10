import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as branchManagerService from './branch-manager.service'

export async function listBranchManagers(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined
    const data = await branchManagerService.listBranchManagers(req.user!, { storeId, branchId })
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function createBranchManager(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await branchManagerService.createBranchManager(req.user!, req.body)
    return sendSuccess(res, data, 'Branch manager created successfully', 201)
  } catch (error) {
    next(error)
  }
}
