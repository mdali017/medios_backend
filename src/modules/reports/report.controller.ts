import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as reportService from './report.service'
import * as medicineProfitService from './medicine-profit.service'

function parseReportFilters(req: Request) {
  return {
    storeId: typeof req.query.storeId === 'string' ? req.query.storeId : undefined,
    branchId: typeof req.query.branchId === 'string' ? req.query.branchId : undefined,
    startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
    endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
  }
}

export async function getStoreReports(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseReportFilters(req)

    const data = await reportService.getStoreReports(req.user!, filters)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function getMedicineProfitList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await medicineProfitService.getMedicineProfitList(req.user!, parseReportFilters(req))
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function getMedicineProfitDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await medicineProfitService.getMedicineProfitDetail(
      req.user!,
      String(req.params.productId),
      parseReportFilters(req)
    )
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}
