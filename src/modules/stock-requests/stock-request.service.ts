import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import type { AuthUser } from '../../types'
import type {
  CreateEmergencyNeedInput,
  UpdateEmergencyNeedStatusInput,
} from './stock-request.validation'

export interface StockRequestRecord {
  id: string
  storeId: string
  productId: string
  productName: string
  genericName: string
  brandName: string
  requestedBy: string
  requestedByName: string
  requestedQty: number
  requestType: 'emergency' | 'restock'
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  notes: string | null
  adminNote: string | null
  currentStock: number
  createdAt: string
  updatedAt: string
}

type StockRequestRow = Record<string, unknown>

function mapStockRequestRow(
  row: StockRequestRow,
  product?: Record<string, unknown>,
  requester?: Record<string, unknown>
): StockRequestRecord {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    productId: row.product_id as string,
    productName: (product?.product_name as string) ?? 'Unknown product',
    genericName: (product?.generic_name as string) ?? '',
    brandName: (product?.brand_name as string) ?? '',
    requestedBy: row.requested_by as string,
    requestedByName: (requester?.name as string) ?? 'Staff',
    requestedQty: Number(row.requested_qty),
    requestType: row.request_type as StockRequestRecord['requestType'],
    status: row.status as StockRequestRecord['status'],
    notes: (row.notes as string | null) ?? null,
    adminNote: (row.admin_note as string | null) ?? null,
    currentStock: Number(row.current_stock),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function resolveStoreIdForStaff(requester: AuthUser): string {
  if (requester.role === 'store_manager' || requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this user', 400)
    }
    return requester.storeId
  }

  throw new AppError('You do not have permission to manage stock requests', 403)
}

async function getProductInStore(productId: string, storeId: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, store_id, product_name, generic_name, brand_name, stock_quantity')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (error) {
    throw new AppError(error.message, 400)
  }

  if (!data) {
    throw new AppError('Product not found in your store', 404)
  }

  return data as Record<string, unknown>
}

async function createStockRequest(
  requester: AuthUser,
  input: CreateEmergencyNeedInput,
  requestType: 'emergency' | 'restock'
): Promise<StockRequestRecord> {
  const storeId = resolveStoreIdForStaff(requester)
  const product = await getProductInStore(input.productId, storeId)

  const { data, error } = await supabaseAdmin
    .from('stock_requests')
    .insert({
      store_id: storeId,
      product_id: input.productId,
      requested_by: requester.id,
      requested_qty: input.requestedQty,
      request_type: requestType,
      status: 'pending',
      notes: input.notes?.trim() || null,
      current_stock: Number(product.stock_quantity),
    })
    .select('*')
    .single()

  if (error) {
    throw new AppError(error.message, 400)
  }

  return mapStockRequestRow(data as StockRequestRow, product, { name: requester.name })
}

export async function createEmergencyNeed(
  requester: AuthUser,
  input: CreateEmergencyNeedInput
): Promise<StockRequestRecord> {
  return createStockRequest(requester, input, 'emergency')
}

export async function createBulkRestockRequests(
  requester: AuthUser,
  items: CreateEmergencyNeedInput[]
): Promise<StockRequestRecord[]> {
  const results: StockRequestRecord[] = []
  for (const item of items) {
    results.push(await createStockRequest(requester, item, 'restock'))
  }
  return results
}

export async function listStockRequests(
  requester: AuthUser,
  filters?: { storeId?: string; status?: string; requestType?: 'emergency' | 'restock' }
): Promise<StockRequestRecord[]> {
  let storeId: string | undefined

  if (requester.role === 'admin' || requester.role === 'store_manager') {
    storeId = resolveStoreIdForStaff(requester)
  } else if (requester.role === 'super_admin') {
    storeId = filters?.storeId
  } else {
    throw new AppError('You do not have permission to view stock requests', 403)
  }

  const requestType = filters?.requestType ?? 'emergency'

  let query = supabaseAdmin
    .from('stock_requests')
    .select('*')
    .eq('request_type', requestType)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  const rows = (data || []) as StockRequestRow[]
  if (rows.length === 0) return []

  const productIds = [...new Set(rows.map((row) => row.product_id as string))]
  const requesterIds = [...new Set(rows.map((row) => row.requested_by as string))]

  const [{ data: products }, { data: requesters }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, product_name, generic_name, brand_name')
      .in('id', productIds),
    supabaseAdmin.from('profiles').select('id, name').in('id', requesterIds),
  ])

  const productById = new Map(
    (products || []).map((product) => [product.id as string, product as Record<string, unknown>])
  )
  const requesterById = new Map(
    (requesters || []).map((profile) => [profile.id as string, profile as Record<string, unknown>])
  )

  return rows.map((row) =>
    mapStockRequestRow(
      row,
      productById.get(row.product_id as string),
      requesterById.get(row.requested_by as string)
    )
  )
}

export async function listEmergencyNeeds(
  requester: AuthUser,
  filters?: { storeId?: string; status?: string }
): Promise<StockRequestRecord[]> {
  return listStockRequests(requester, { ...filters, requestType: 'emergency' })
}

export async function updateEmergencyNeedStatus(
  requester: AuthUser,
  requestId: string,
  input: UpdateEmergencyNeedStatusInput
): Promise<StockRequestRecord> {
  if (requester.role !== 'admin' && requester.role !== 'super_admin') {
    throw new AppError('Only store admins can update emergency requests', 403)
  }

  const storeId = requester.role === 'admin' ? resolveStoreIdForStaff(requester) : undefined

  let query = supabaseAdmin.from('stock_requests').select('*').eq('id', requestId)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: existing, error: fetchError } = await query.maybeSingle()

  if (fetchError) {
    throw new AppError(fetchError.message, 400)
  }

  if (!existing) {
    throw new AppError('Emergency request not found', 404)
  }

  const row = existing as StockRequestRow

  if (row.status !== 'pending' && input.status !== 'fulfilled') {
    throw new AppError('Only pending requests can be approved or rejected', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('stock_requests')
    .update({
      status: input.status,
      admin_note: input.adminNote?.trim() || null,
    })
    .eq('id', requestId)
    .select('*')
    .single()

  if (error) {
    throw new AppError(error.message, 400)
  }

  const product = await getProductInStore(row.product_id as string, row.store_id as string).catch(
    () => null
  )

  return mapStockRequestRow(
    data as StockRequestRow,
    product ?? undefined,
    { name: requester.name }
  )
}

export async function fulfillEmergencyNeed(
  requester: AuthUser,
  requestId: string
): Promise<StockRequestRecord> {
  if (requester.role !== 'store_manager' && requester.role !== 'admin') {
    throw new AppError('Only store staff can mark emergency requests as handled', 403)
  }

  const storeId = resolveStoreIdForStaff(requester)

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('stock_requests')
    .select('*')
    .eq('id', requestId)
    .eq('store_id', storeId)
    .eq('request_type', 'emergency')
    .maybeSingle()

  if (fetchError) {
    throw new AppError(fetchError.message, 400)
  }

  if (!existing) {
    throw new AppError('Emergency request not found', 404)
  }

  const row = existing as StockRequestRow

  if (row.status !== 'pending') {
    throw new AppError('This request has already been handled', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('stock_requests')
    .update({ status: 'fulfilled' })
    .eq('id', requestId)
    .select('*')
    .single()

  if (error) {
    throw new AppError(error.message, 400)
  }

  const product = await getProductInStore(row.product_id as string, row.store_id as string).catch(
    () => null
  )

  const requesterProfile = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('id', row.requested_by as string)
    .maybeSingle()

  return mapStockRequestRow(
    data as StockRequestRow,
    product ?? undefined,
    (requesterProfile.data as Record<string, unknown> | null) ?? undefined
  )
}
