import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as productService from '../products/product.service'
import * as orderService from '../orders/order.service'

export async function matchMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId, medicines } = req.body
    const data = await productService.matchMedicines(medicines, storeId)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function placeOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await orderService.placeOnlineOrder(req.user!, req.body)
    return sendSuccess(res, data, 'Order placed successfully. Awaiting approval.', 201)
  } catch (error) {
    next(error)
  }
}
