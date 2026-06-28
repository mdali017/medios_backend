import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import type { AuthUser } from '../../types'
import * as authService from '../auth/auth.service'
import type { CreateStoreManagerInput } from './store-manager.validation'

export interface StoreManagerRecord {
  id: string
  name: string
  email: string
  phone: string | null
  storeId: string | null
  storeName: string | null
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

export async function listStoreManagers(
  requester: AuthUser,
  storeIdFilter?: string
): Promise<StoreManagerRecord[]> {
  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, email, phone, store_id, is_verified, created_at')
    .eq('role', 'store_manager')
    .order('created_at', { ascending: false })

  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    query = query.eq('store_id', requester.storeId)
  } else if (storeIdFilter) {
    query = query.eq('store_id', storeIdFilter)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  const managers = data || []
  const storeNames = new Map<string, string>()

  const results: StoreManagerRecord[] = []

  for (const manager of managers) {
    let storeName: string | null = null

    if (manager.store_id) {
      if (!storeNames.has(manager.store_id)) {
        storeNames.set(manager.store_id, (await getStoreName(manager.store_id)) || '')
      }
      storeName = storeNames.get(manager.store_id) || null
    }

    results.push({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      storeId: manager.store_id,
      storeName,
      isVerified: manager.is_verified,
      createdAt: manager.created_at,
    })
  }

  return results
}

export async function createStoreManager(
  requester: AuthUser,
  input: CreateStoreManagerInput
) {
  const storeId =
    requester.role === 'admin' ? requester.storeId : input.storeId ?? null

  if (!storeId) {
    throw new AppError('Store ID is required', 400)
  }

  if (requester.role === 'admin' && requester.storeId !== storeId) {
    throw new AppError('You can only add managers to your own store', 403)
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
    role: 'store_manager',
    storeId,
  })

  const storeName = await getStoreName(storeId)

  return {
    ...user,
    storeId,
    storeName,
  }
}
