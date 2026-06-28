import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as orderService from './order.service'

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined

    const data = await orderService.listOrders(req.user!, { status, search, storeId })
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await orderService.getOrder(req.user!, String(req.params.id))
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await orderService.updateOrderStatus(req.user!, String(req.params.id), req.body)
    return sendSuccess(res, data, `Order status updated to ${req.body.status}`)
  } catch (error) {
    next(error)
  }
}

export async function assignDeliveryStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await orderService.assignDeliveryStaff(req.user!, String(req.params.id), req.body)
    return sendSuccess(res, data, 'Delivery staff assigned successfully')
  } catch (error) {
    next(error)
  }
}

export async function listDeliveryStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await orderService.listDeliveryStaff(req.user!)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}
