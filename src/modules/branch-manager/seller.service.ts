import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { storeHasBranches } from '../../utils/branch.helper'
import type { AuthUser } from '../../types'
import * as authService from '../auth/auth.service'
import type { CreateSellerInput } from './seller.validation'

export interface SellerRecord {
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

function assertBranchManager(requester: AuthUser) {
  if (requester.role !== 'branch_manager') {
    throw new AppError('Only branch managers can manage sellers', 403)
  }

  if (!requester.storeId || !requester.branchId) {
    throw new AppError('Branch not assigned to this manager', 400)
  }
}

export async function listSellers(requester: AuthUser): Promise<SellerRecord[]> {
  assertBranchManager(requester)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, phone, store_id, branch_id, is_verified, created_at')
    .eq('role', 'seller')
    .eq('branch_id', requester.branchId!)
    .order('created_at', { ascending: false })

  if (error) {
    throw new AppError(error.message, 400)
  }

  const storeName = requester.storeId ? await getStoreName(requester.storeId) : null
  const branchName = requester.branchId ? await getBranchName(requester.branchId) : null

  return (data || []).map((seller) => ({
    id: seller.id,
    name: seller.name,
    email: seller.email,
    phone: seller.phone,
    storeId: seller.store_id,
    storeName,
    branchId: seller.branch_id,
    branchName,
    isVerified: seller.is_verified,
    createdAt: seller.created_at,
  }))
}

export async function createSeller(requester: AuthUser, input: CreateSellerInput) {
  assertBranchManager(requester)

  const hasBranches = await storeHasBranches(requester.storeId!)
  if (!hasBranches) {
    throw new AppError('Sellers can only be created when the store has branches', 400)
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
    role: 'seller',
    storeId: requester.storeId!,
    branchId: requester.branchId!,
  })

  const storeName = await getStoreName(requester.storeId!)
  const branchName = await getBranchName(requester.branchId!)

  return {
    ...user,
    storeId: requester.storeId,
    storeName,
    branchId: requester.branchId,
    branchName,
  }
}

export async function deactivateSeller(requester: AuthUser, sellerId: string): Promise<void> {
  assertBranchManager(requester)

  const { data: seller, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, branch_id')
    .eq('id', sellerId)
    .maybeSingle()

  if (error || !seller) {
    throw new AppError('Seller not found', 404)
  }

  if (seller.role !== 'seller' || seller.branch_id !== requester.branchId) {
    throw new AppError('You can only remove sellers from your own branch', 403)
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(sellerId)

  if (deleteError) {
    throw new AppError(deleteError.message, 400)
  }
}
