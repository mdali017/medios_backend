import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as reportService from './report.service'

export async function getStoreReports(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined

    const data = await reportService.getStoreReports(req.user!, {
      storeId,
      startDate,
      endDate,
    })
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}
