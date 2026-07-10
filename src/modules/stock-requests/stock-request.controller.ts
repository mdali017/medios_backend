import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as stockRequestService from './stock-request.service'

export async function createEmergencyNeed(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await stockRequestService.createEmergencyNeed(req.user!, req.body)
    return sendSuccess(res, data, 'Emergency need request submitted', 201)
  } catch (error) {
    next(error)
  }
}

export async function listEmergencyNeeds(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const requestType =
      req.query.requestType === 'restock' || req.query.requestType === 'emergency'
        ? req.query.requestType
        : 'emergency'

    const data = await stockRequestService.listStockRequests(req.user!, {
      storeId,
      branchId,
      status,
      requestType,
    })
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function createBulkRestockRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await stockRequestService.createBulkRestockRequests(req.user!, req.body.items)
    return sendSuccess(res, data, 'Restock request submitted', 201)
  } catch (error) {
    next(error)
  }
}

export async function updateEmergencyNeedStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const data = await stockRequestService.updateEmergencyNeedStatus(
      req.user!,
      requestId,
      req.body
    )
    return sendSuccess(res, data, 'Emergency request updated')
  } catch (error) {
    next(error)
  }
}

export async function fulfillEmergencyNeed(req: Request, res: Response, next: NextFunction) {
  try {
    const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const data = await stockRequestService.fulfillEmergencyNeed(req.user!, requestId)
    return sendSuccess(res, data, 'Emergency request marked as handled')
  } catch (error) {
    next(error)
  }
}
