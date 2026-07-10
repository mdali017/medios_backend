import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as branchService from './branch.service'
import type { BranchRecord } from './branch.service'

function formatBranch(branch: BranchRecord) {
  return {
    id: branch.id,
    storeId: branch.store_id,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    status: branch.status,
    createdAt: branch.created_at,
    updatedAt: branch.updated_at,
  }
}

export async function listBranches(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined
    const branches = await branchService.listBranches(req.user!, storeId)
    return sendSuccess(res, branches.map(formatBranch))
  } catch (error) {
    next(error)
  }
}

export async function getBranch(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.getBranchById(req.user!, String(req.params.id))
    return sendSuccess(res, formatBranch(branch))
  } catch (error) {
    next(error)
  }
}

export async function createBranch(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.createBranch(req.user!, req.body)
    return sendSuccess(res, formatBranch(branch), 'Branch created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export async function updateBranch(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.updateBranch(req.user!, String(req.params.id), req.body)
    return sendSuccess(res, formatBranch(branch), 'Branch updated successfully')
  } catch (error) {
    next(error)
  }
}

export async function deactivateBranch(req: Request, res: Response, next: NextFunction) {
  try {
    await branchService.deactivateBranch(req.user!, String(req.params.id))
    return sendSuccess(res, null, 'Branch deactivated successfully')
  } catch (error) {
    next(error)
  }
}
