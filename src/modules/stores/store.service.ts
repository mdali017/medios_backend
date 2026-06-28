import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import type { CreateStoreAdminInput, CreateStoreInput, UpdateStoreInput } from './store.validation'

export type StoreStatus = 'live' | 'suspended' | 'inactive' | 'pending'

export interface StoreRecord {
  id: string
  name: string
  address: string
  city: string | null
  phone: string | null
  license_number: string
  logo_url: string | null
  status: StoreStatus
  subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface StoreAdminInfo {
  id: string
  name: string
  email: string
}

export interface StoreWithAdmin extends StoreRecord {
  storeAdmin: StoreAdminInfo | null
}

function mapStoreRow(row: StoreRecord): StoreRecord {
  return row
}

async function getStoreAdmin(storeId: string): Promise<StoreAdminInfo | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email')
    .eq('store_id', storeId)
    .eq('role', 'admin')
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    email: data.email,
  }
}

async function attachAdmin(store: StoreRecord): Promise<StoreWithAdmin> {
  const storeAdmin = await getStoreAdmin(store.id)
  return { ...mapStoreRow(store), storeAdmin }
}

export async function listStores(status?: StoreStatus): Promise<StoreWithAdmin[]> {
  let query = supabaseAdmin
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    if (error.message.includes('Could not find the table')) {
      throw new AppError('Stores table not found. Run supabase/stores.sql first.', 500)
    }
    throw new AppError(error.message, 400)
  }

  const stores = (data || []) as StoreRecord[]
  return Promise.all(stores.map(attachAdmin))
}

export async function getStoreById(id: string): Promise<StoreWithAdmin> {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new AppError('Store not found', 404)
  }

  return attachAdmin(data as StoreRecord)
}

export async function createStore(input: CreateStoreInput): Promise<StoreWithAdmin> {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .insert({
      name: input.name,
      address: input.address,
      city: input.city || null,
      phone: input.phone || null,
      license_number: input.licenseNumber,
      logo_url: input.logoUrl || null,
      status: input.status || 'pending',
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to create store', 400)
  }

  return attachAdmin(data as StoreRecord)
}

export async function updateStore(id: string, input: UpdateStoreInput): Promise<StoreWithAdmin> {
  await getStoreById(id)

  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) updates.name = input.name
  if (input.address !== undefined) updates.address = input.address
  if (input.city !== undefined) updates.city = input.city || null
  if (input.phone !== undefined) updates.phone = input.phone || null
  if (input.licenseNumber !== undefined) updates.license_number = input.licenseNumber
  if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl || null
  if (input.status !== undefined) updates.status = input.status

  const { data, error } = await supabaseAdmin
    .from('stores')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    throw new AppError(error?.message || 'Failed to update store', 400)
  }

  return attachAdmin(data as StoreRecord)
}

export async function deleteStore(id: string): Promise<void> {
  await getStoreById(id)

  await supabaseAdmin
    .from('profiles')
    .update({ store_id: null })
    .eq('store_id', id)

  const { error } = await supabaseAdmin.from('stores').delete().eq('id', id)

  if (error) {
    throw new AppError(error.message, 400)
  }
}

export async function assignStoreAdmin(input: CreateStoreAdminInput) {
  const store = await getStoreById(input.storeId)

  const existingAdmin = await getStoreAdmin(input.storeId)
  if (existingAdmin) {
    throw new AppError('This store already has an admin assigned', 400)
  }

  const { data: existingEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', input.email)
    .maybeSingle()

  if (existingEmail) {
    throw new AppError('Email is already registered', 400)
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      role: 'admin',
      store_id: input.storeId,
    },
  })

  if (authError || !authData.user) {
    throw new AppError(authError?.message || 'Failed to create store admin', 400)
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: authData.user.id,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    role: 'admin',
    store_id: input.storeId,
    is_verified: true,
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new AppError(profileError.message, 400)
  }

  if (store.status === 'pending') {
    await supabaseAdmin.from('stores').update({ status: 'live' }).eq('id', input.storeId)
  }

  return {
    id: authData.user.id,
    name: input.name,
    email: input.email,
    role: 'admin',
    storeId: input.storeId,
    storeName: store.name,
  }
}
