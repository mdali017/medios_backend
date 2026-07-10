import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/AppError'
import { storeHasBranches } from '../utils/branch.helper'

/** POS + stock-request access based on branch mode. */
export async function authorizePosAccess(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const user = req.user

    if (!user) {
      return next(new AppError('Authentication required', 401))
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      return next()
    }

    if (!user.storeId) {
      return next(new AppError('Store not assigned to this user', 400))
    }

    const hasBranches = user.storeHasBranches ?? (await storeHasBranches(user.storeId))

    if (hasBranches) {
      if (user.role === 'seller' || user.role === 'branch_manager') {
        if (!user.branchId) {
          return next(new AppError('Branch not assigned to this user', 400))
        }
        return next()
      }

      if (user.role === 'store_manager') {
        return next(
          new AppError(
            'POS access is handled by branch staff when your store has branches',
            403
          )
        )
      }
    } else {
      if (user.role === 'store_manager') {
        return next()
      }

      if (user.role === 'seller' || user.role === 'branch_manager') {
        return next(
          new AppError('Branch staff roles are only active when the store has branches', 403)
        )
      }
    }

    return next(new AppError('You do not have permission to access POS', 403))
  } catch (error) {
    next(error)
  }
}
