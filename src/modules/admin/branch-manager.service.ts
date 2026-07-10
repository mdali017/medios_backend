import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { branchBelongsToStore, storeHasBranches } from '../../utils/branch.helper'
import type { AuthUser } from '../../types'
import * as authService from '../auth/auth.service'
import type { CreateBranchManagerInput } from './branch-manager.validation'

export interface BranchManagerRecord {
  id: string
  name: string
  email: string
  phone: string | null
  storeId: string | null
  storeName: string | null
  branchId: string | null
  branchName: string | null
  isVerified: boolean
  createdAt: string
}

async function getStoreName(storeId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .maybeSingle()

  return data?.name ?? null
}

async function getBranchName(branchId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .maybeSingle()

  return data?.name ?? null
}

export async function listBranchManagers(
  requester: AuthUser,
  filters?: { storeId?: string; branchId?: string }
): Promise<BranchManagerRecord[]> {
  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, email, phone, store_id, branch_id, is_verified, created_at')
    .eq('role', 'branch_manager')
    .order('created_at', { ascending: false })

  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    query = query.eq('store_id', requester.storeId)
  } else if (filters?.storeId) {
    query = query.eq('store_id', filters.storeId)
  }

  if (filters?.branchId) {
    query = query.eq('branch_id', filters.branchId)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  const managers = data || []
  const storeNames = new Map<string, string>()
  const branchNames = new Map<string, string>()
  const results: BranchManagerRecord[] = []

  for (const manager of managers) {
    let storeName: string | null = null
    let branchName: string | null = null

    if (manager.store_id) {
      if (!storeNames.has(manager.store_id)) {
        storeNames.set(manager.store_id, (await getStoreName(manager.store_id)) || '')
      }
      storeName = storeNames.get(manager.store_id) || null
    }

    if (manager.branch_id) {
      if (!branchNames.has(manager.branch_id)) {
        branchNames.set(manager.branch_id, (await getBranchName(manager.branch_id)) || '')
      }
      branchName = branchNames.get(manager.branch_id) || null
    }

    results.push({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      storeId: manager.store_id,
      storeName,
      branchId: manager.branch_id,
      branchName,
      isVerified: manager.is_verified,
      createdAt: manager.created_at,
    })
  }

  return results
}

export async function createBranchManager(
  requester: AuthUser,
  input: CreateBranchManagerInput
) {
  const storeId =
    requester.role === 'admin' ? requester.storeId : input.storeId ?? null

  if (!storeId) {
    throw new AppError('Store ID is required', 400)
  }

  if (requester.role === 'admin' && requester.storeId !== storeId) {
    throw new AppError('You can only add branch managers to your own store', 403)
  }

  const hasBranches = await storeHasBranches(storeId)
  if (!hasBranches) {
    throw new AppError('Create at least one branch before assigning a branch manager', 400)
  }

  const branchValid = await branchBelongsToStore(input.branchId, storeId)
  if (!branchValid) {
    throw new AppError('Branch not found or does not belong to this store', 400)
  }

  const { data: existingManager } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'branch_manager')
    .eq('branch_id', input.branchId)
    .maybeSingle()

  if (existingManager) {
    throw new AppError('This branch already has a branch manager assigned', 400)
  }

  const { data: existingEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', input.email)
    .maybeSingle()

  if (existingEmail) {
    throw new AppError('Email is already registered', 400)
  }

  const user = await authService.createInternalUser({
    name: input.name,
    email: input.email,
    password: input.password,
    phone: input.phone,
    role: 'branch_manager',
    storeId,
    branchId: input.branchId,
  })

  const storeName = await getStoreName(storeId)
  const branchName = await getBranchName(input.branchId)

  return {
    ...user,
    storeId,
    storeName,
    branchId: input.branchId,
    branchName,
  }
}
