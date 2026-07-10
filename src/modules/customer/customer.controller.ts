import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { listActiveBranchesForStore } from '../../utils/branch.helper'
import * as productService from '../products/product.service'
import * as orderService from '../orders/order.service'

export async function listPublicStores(_req: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await supabaseAdmin
      .from('stores')
      .select('id, name, city, address')
      .eq('status', 'live')
      .order('name', { ascending: true })

    if (error) {
      throw new AppError(error.message, 400)
    }

    return sendSuccess(res, data || [])
  } catch (error) {
    next(error)
  }
}

export async function listStoreBranches(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = String(req.params.storeId)
    const branches = await listActiveBranchesForStore(storeId)
    return sendSuccess(res, branches)
  } catch (error) {
    next(error)
  }
}

export async function matchMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const { storeId, branchId, medicines } = req.body
    const data = await productService.matchMedicines(medicines, storeId, branchId)
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
