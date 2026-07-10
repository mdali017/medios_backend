import { supabaseAdmin } from '../config/supabase'
import { AppError } from './AppError'
import type { AuthUser } from '../types'

/** Whether the store has at least one active branch. */
export async function storeHasBranches(storeId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'active')

  if (error) {
    return false
  }

  return (count ?? 0) > 0
}

/** Verify branch belongs to the given store and is active. */
export async function branchBelongsToStore(
  branchId: string,
  storeId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('store_id', storeId)
    .eq('status', 'active')
    .maybeSingle()

  return !!data
}

export interface ProductBranchScope {
  storeId: string
  branchId: string | null
  hasBranches: boolean
}

/** Resolve store/branch scope for product inventory operations. */
export async function resolveProductBranchScope(
  requester: AuthUser,
  options?: { storeIdFilter?: string; branchIdFilter?: string }
): Promise<ProductBranchScope> {
  if (requester.role === 'branch_manager' || requester.role === 'seller') {
    if (!requester.storeId || !requester.branchId) {
      throw new AppError('Branch not assigned to this user', 400)
    }

    return {
      storeId: requester.storeId,
      branchId: requester.branchId,
      hasBranches: true,
    }
  }

  let storeId: string | undefined

  if (requester.role === 'admin') {
    storeId = requester.storeId ?? undefined
  } else if (requester.role === 'super_admin') {
    storeId = options?.storeIdFilter
  } else if (requester.role === 'store_manager') {
    storeId = requester.storeId ?? undefined
  }

  if (!storeId) {
    throw new AppError('Store ID is required', 400)
  }

  const hasBranches = await storeHasBranches(storeId)

  if (!hasBranches) {
    return { storeId, branchId: null, hasBranches: false }
  }

  if (requester.role === 'store_manager') {
    throw new AppError('Store managers cannot access branch-scoped inventory', 403)
  }

  if (options?.branchIdFilter) {
    const valid = await branchBelongsToStore(options.branchIdFilter, storeId)
    if (!valid) {
      throw new AppError('Invalid branch for this store', 400)
    }

    return {
      storeId,
      branchId: options.branchIdFilter,
      hasBranches: true,
    }
  }

  return { storeId, branchId: null, hasBranches: true }
}

/** Resolve branch ID used at POS checkout. */
export async function resolveCheckoutBranchId(
  requester: AuthUser,
  inputBranchId?: string | null
): Promise<string | null> {
  if (!requester.storeId) {
    throw new AppError('Store not assigned to this user', 400)
  }

  const hasBranches =
    requester.storeHasBranches ?? (await storeHasBranches(requester.storeId))

  if (!hasBranches) {
    return null
  }

  if (requester.role === 'seller' || requester.role === 'branch_manager') {
    if (!requester.branchId) {
      throw new AppError('Branch not assigned to this user', 400)
    }
    return requester.branchId
  }

  if (requester.role === 'admin' || requester.role === 'super_admin') {
    if (!inputBranchId) {
      throw new AppError('Branch ID is required for checkout when store has branches', 400)
    }

    const valid = await branchBelongsToStore(inputBranchId, requester.storeId)
    if (!valid) {
      throw new AppError('Invalid branch for this store', 400)
    }

    return inputBranchId
  }

  return null
}

export interface PublicBranchRecord {
  id: string
  name: string
  address: string
  city: string | null
  phone: string | null
}

/** Active branches for customer-facing store selection. */
export async function listActiveBranchesForStore(
  storeId: string
): Promise<PublicBranchRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('id, name, address, city, phone')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) {
    throw new AppError(error.message, 400)
  }

  return (data || []) as PublicBranchRecord[]
}

/** Resolve branch for online orders — required when store has branches. */
export async function resolveOnlineOrderBranchId(
  storeId: string,
  branchId?: string
): Promise<string | null> {
  const hasBranches = await storeHasBranches(storeId)

  if (!hasBranches) {
    return null
  }

  if (!branchId) {
    throw new AppError('Branch ID is required for online orders when store has branches', 400)
  }

  const valid = await branchBelongsToStore(branchId, storeId)
  if (!valid) {
    throw new AppError('Invalid branch for this store', 400)
  }

  return branchId
}
