import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import type { AuthUser } from '../../types'
import type { CreateBranchInput, UpdateBranchInput } from './branch.validation'

export type BranchStatus = 'active' | 'inactive'

export interface BranchRecord {
  id: string
  store_id: string
  name: string
  address: string
  city: string | null
  phone: string | null
  status: BranchStatus
  created_at: string
  updated_at: string
}

function resolveStoreId(requester: AuthUser, storeIdFilter?: string): string | null {
  if (requester.role === 'admin') {
    return requester.storeId ?? null
  }

  if (requester.role === 'super_admin') {
    return storeIdFilter ?? null
  }

  return null
}

function assertAdminCanAccessStore(requester: AuthUser, storeId: string) {
  if (requester.role === 'admin' && requester.storeId !== storeId) {
    throw new AppError('You can only manage branches for your own store', 403)
  }
}

async function getBranchRow(branchId: string): Promise<BranchRecord> {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .maybeSingle()

  if (error) {
    if (error.message.includes('Could not find the table')) {
      throw new AppError('Branches table not found. Run supabase/phase1_branches.sql first.', 500)
    }
    throw new AppError(error.message, 400)
  }

  if (!data) {
    throw new AppError('Branch not found', 404)
  }

  return data as BranchRecord
}

export async function listBranches(
  requester: AuthUser,
  storeIdFilter?: string
): Promise<BranchRecord[]> {
  const storeId = resolveStoreId(requester, storeIdFilter)

  if (requester.role === 'admin' && !storeId) {
    throw new AppError('Store not assigned to this admin', 400)
  }

  let query = supabaseAdmin
    .from('branches')
    .select('*')
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    if (error.message.includes('Could not find the table')) {
      throw new AppError('Branches table not found. Run supabase/phase1_branches.sql first.', 500)
    }
    throw new AppError(error.message, 400)
  }

  return (data || []) as BranchRecord[]
}

export async function getBranchById(
  requester: AuthUser,
  branchId: string
): Promise<BranchRecord> {
  const branch = await getBranchRow(branchId)
  assertAdminCanAccessStore(requester, branch.store_id)
  return branch
}

export async function createBranch(
  requester: AuthUser,
  input: CreateBranchInput
): Promise<BranchRecord> {
  if (requester.role !== 'admin' || !requester.storeId) {
    throw new AppError('Only store admin can create branches', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert({
      store_id: requester.storeId,
      name: input.name,
      address: input.address,
      city: input.city ?? null,
      phone: input.phone ?? null,
      status: 'active',
    })
    .select('*')
    .single()

  if (error) {
    throw new AppError(error.message, 400)
  }

  return data as BranchRecord
}

export async function updateBranch(
  requester: AuthUser,
  branchId: string,
  input: UpdateBranchInput
): Promise<BranchRecord> {
  if (requester.role !== 'admin' || !requester.storeId) {
    throw new AppError('Only store admin can update branches', 403)
  }

  const existing = await getBranchRow(branchId)
  assertAdminCanAccessStore(requester, existing.store_id)

  const payload: Record<string, unknown> = {}

  if (input.name !== undefined) payload.name = input.name
  if (input.address !== undefined) payload.address = input.address
  if (input.city !== undefined) payload.city = input.city || null
  if (input.phone !== undefined) payload.phone = input.phone || null
  if (input.status !== undefined) payload.status = input.status

  if (Object.keys(payload).length === 0) {
    return existing
  }

  const { data, error } = await supabaseAdmin
    .from('branches')
    .update(payload)
    .eq('id', branchId)
    .select('*')
    .single()

  if (error) {
    throw new AppError(error.message, 400)
  }

  return data as BranchRecord
}

export async function deactivateBranch(
  requester: AuthUser,
  branchId: string
): Promise<void> {
  if (requester.role !== 'admin' || !requester.storeId) {
    throw new AppError('Only store admin can deactivate branches', 403)
  }

  const existing = await getBranchRow(branchId)
  assertAdminCanAccessStore(requester, existing.store_id)

  const { error } = await supabaseAdmin
    .from('branches')
    .update({ status: 'inactive' })
    .eq('id', branchId)

  if (error) {
    throw new AppError(error.message, 400)
  }
}
