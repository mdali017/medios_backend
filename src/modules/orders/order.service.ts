import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { resolveOnlineOrderBranchId } from '../../utils/branch.helper'
import type { AuthUser } from '../../types'
import type { AssignDeliveryStaffInput, PlaceOnlineOrderInput, UpdateOrderStatusInput } from './order.validation'

export interface OrderItemRecord {
  id: string
  productId: string
  productName: string
  genericName: string
  brandName: string
  saleUnit: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderRecord {
  id: string
  orderNumber: string
  orderType: string
  status: string
  storeId: string
  branchId: string | null
  branchName: string | null
  customerId: string | null
  customerName: string | null
  deliveryStaffId: string | null
  deliveryStaffName: string | null
  deliveryAddress: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
  itemCount: number
  orderDate: string
  items?: OrderItemRecord[]
}

export interface DeliveryStaffRecord {
  id: string
  name: string
  email: string
  phone: string | null
}

type OrderRow = Record<string, unknown>

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'cancelled'],
  approved: ['in_delivery', 'cancelled'],
  in_delivery: ['completed'],
  completed: [],
  cancelled: [],
}

function mapOrderItemRow(row: OrderRow): OrderItemRecord {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    genericName: row.generic_name as string,
    brandName: row.brand_name as string,
    saleUnit: row.sale_unit as string,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  }
}

function mapOrderRow(
  row: OrderRow,
  customerName: string | null,
  deliveryStaffName: string | null,
  branchName: string | null,
  items?: OrderItemRecord[]
): OrderRecord {
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    orderType: row.order_type as string,
    status: row.status as string,
    storeId: row.store_id as string,
    branchId: (row.branch_id as string | null) ?? null,
    branchName,
    customerId: (row.customer_id as string | null) ?? null,
    customerName,
    deliveryStaffId: (row.delivery_staff_id as string | null) ?? null,
    deliveryStaffName,
    deliveryAddress: (row.delivery_address as string | null) ?? null,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    itemCount: Number(row.item_count),
    orderDate: row.created_at as string,
    items,
  }
}

function resolveStoreId(requester: AuthUser, storeIdFilter?: string): string | undefined {
  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    return requester.storeId
  }

  return storeIdFilter
}

async function getProfileName(profileId: string | null): Promise<string | null> {
  if (!profileId) return null

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('name')
    .eq('id', profileId)
    .maybeSingle()

  return data?.name ?? null
}

async function getOrderById(orderId: string, storeId?: string): Promise<OrderRow> {
  let query = supabaseAdmin.from('orders').select('*').eq('id', orderId)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new AppError(error.message, 400)
  }

  if (!data) {
    throw new AppError('Order not found', 404)
  }

  return data as OrderRow
}

export async function listOrders(
  requester: AuthUser,
  filters: { status?: string; search?: string; storeId?: string; branchId?: string }
): Promise<OrderRecord[]> {
  const storeId = resolveStoreId(requester, filters.storeId)

  let query = supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  const rows = (data || []) as OrderRow[]
  const profileIds = new Set<string>()
  const branchIds = new Set<string>()

  for (const row of rows) {
    if (row.customer_id) profileIds.add(row.customer_id as string)
    if (row.delivery_staff_id) profileIds.add(row.delivery_staff_id as string)
    if (row.branch_id) branchIds.add(row.branch_id as string)
  }

  const profileNames = new Map<string, string>()
  const branchNames = new Map<string, string>()

  if (profileIds.size > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .in('id', Array.from(profileIds))

    for (const profile of profiles || []) {
      profileNames.set(profile.id, profile.name)
    }
  }

  if (branchIds.size > 0) {
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .in('id', Array.from(branchIds))

    for (const branch of branches || []) {
      branchNames.set(branch.id, branch.name)
    }
  }

  let results = rows.map((row) =>
    mapOrderRow(
      row,
      row.customer_id ? profileNames.get(row.customer_id as string) ?? null : null,
      row.delivery_staff_id ? profileNames.get(row.delivery_staff_id as string) ?? null : null,
      row.branch_id ? branchNames.get(row.branch_id as string) ?? null : null
    )
  )

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase()
    results = results.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term) ||
        (order.customerName?.toLowerCase().includes(term) ?? false)
    )
  }

  return results
}

export async function getOrder(
  requester: AuthUser,
  orderId: string
): Promise<OrderRecord> {
  const storeId = resolveStoreId(requester)
  const row = await getOrderById(orderId, storeId)

  const { data: itemRows, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (itemsError) {
    throw new AppError(itemsError.message, 400)
  }

  const customerName = await getProfileName((row.customer_id as string | null) ?? null)
  const deliveryStaffName = await getProfileName((row.delivery_staff_id as string | null) ?? null)

  let branchName: string | null = null
  if (row.branch_id) {
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('name')
      .eq('id', row.branch_id as string)
      .maybeSingle()
    branchName = branch?.name ?? null
  }

  return mapOrderRow(
    row,
    customerName,
    deliveryStaffName,
    branchName,
    (itemRows || []).map((item) => mapOrderItemRow(item as OrderRow))
  )
}

export async function updateOrderStatus(
  requester: AuthUser,
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<OrderRecord> {
  const storeId = resolveStoreId(requester)
  const row = await getOrderById(orderId, storeId)
  const currentStatus = row.status as string

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || []

  if (!allowed.includes(input.status)) {
    throw new AppError(
      `Cannot change status from "${currentStatus}" to "${input.status}"`,
      400
    )
  }

  if (input.status === 'approved' && row.order_type === 'pos') {
    throw new AppError('POS orders are already completed at checkout', 400)
  }

  if (input.status === 'approved' && row.order_type === 'online') {
    await deductStockForOrder(orderId, row.store_id as string)
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: input.status })
    .eq('id', orderId)

  if (error) {
    throw new AppError(error.message, 400)
  }

  return getOrder(requester, orderId)
}

export async function assignDeliveryStaff(
  requester: AuthUser,
  orderId: string,
  input: AssignDeliveryStaffInput
): Promise<OrderRecord> {
  const storeId = resolveStoreId(requester)
  const row = await getOrderById(orderId, storeId)
  const currentStatus = row.status as string

  if (!['approved', 'in_delivery'].includes(currentStatus)) {
    throw new AppError('Delivery staff can only be assigned to approved orders', 400)
  }

  let staffQuery = supabaseAdmin
    .from('profiles')
    .select('id, name, role, store_id')
    .eq('id', input.deliveryStaffId)
    .eq('role', 'delivery_man')
    .maybeSingle()

  const { data: staff, error: staffError } = await staffQuery

  if (staffError) {
    throw new AppError(staffError.message, 400)
  }

  if (!staff) {
    throw new AppError('Delivery staff not found', 404)
  }

  if (storeId && staff.store_id && staff.store_id !== storeId) {
    throw new AppError('Delivery staff does not belong to this store', 400)
  }

  const updates: Record<string, unknown> = {
    delivery_staff_id: input.deliveryStaffId,
    status: 'in_delivery',
  }

  const { error } = await supabaseAdmin.from('orders').update(updates).eq('id', orderId)

  if (error) {
    throw new AppError(error.message, 400)
  }

  return getOrder(requester, orderId)
}

function getUnitPrice(product: Record<string, unknown>, saleUnit: string): number {
  if (saleUnit === 'strip') return Number(product.price_pata ?? product.price_single)
  if (saleUnit === 'box') return Number(product.price_box ?? product.price_single)
  return Number(product.price_single)
}

function getTabletsPerUnit(product: Record<string, unknown>, saleUnit: string): number {
  if (saleUnit === 'strip') return Number(product.tablets_per_strip)
  if (saleUnit === 'box') {
    return Number(product.tablets_per_strip) * Number(product.strips_per_box)
  }
  return 1
}

async function generateOnlineOrderNumber(storeId: string): Promise<string> {
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { data } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('store_id', storeId)
    .like('order_number', `ONL-${datePrefix}-%`)

  const seq = (data?.length ?? 0) + 1
  return `ONL-${datePrefix}-${String(seq).padStart(4, '0')}`
}

async function deductStockForOrder(orderId: string, storeId: string) {
  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('product_id, tablets_deducted')
    .eq('order_id', orderId)

  if (error) {
    throw new AppError(error.message, 400)
  }

  for (const item of items || []) {
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, stock_quantity, product_name')
      .eq('id', item.product_id)
      .eq('store_id', storeId)
      .single()

    if (productError || !product) {
      throw new AppError('Product not found for order item', 400)
    }

    if (product.stock_quantity < item.tablets_deducted) {
      throw new AppError(
        `Insufficient stock for "${product.product_name}". Available: ${product.stock_quantity}`,
        400
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: product.stock_quantity - item.tablets_deducted })
      .eq('id', product.id)

    if (updateError) {
      throw new AppError(updateError.message, 400)
    }
  }
}

export async function placeOnlineOrder(
  requester: AuthUser,
  input: PlaceOnlineOrderInput
): Promise<OrderRecord> {
  if (requester.role !== 'customer') {
    throw new AppError('Only customers can place online orders', 403)
  }

  const branchId = await resolveOnlineOrderBranchId(input.storeId, input.branchId)

  let subtotal = 0
  let tax = 0
  let itemCount = 0
  let unitCount = 0
  const lineItems: Array<Record<string, unknown>> = []

  for (const item of input.items) {
    let productQuery = supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', item.productId)
      .eq('store_id', input.storeId)
      .eq('status', 'active')

    if (branchId) {
      productQuery = productQuery.eq('branch_id', branchId)
    } else {
      productQuery = productQuery.is('branch_id', null)
    }

    const { data: product, error } = await productQuery.maybeSingle()

    if (error || !product) {
      throw new AppError(`Product not found: ${item.productId}`, 400)
    }

    const unitPrice = getUnitPrice(product, item.saleUnit)
    const tabletsPerUnit = getTabletsPerUnit(product, item.saleUnit)
    const taxPercent = Number(product.tax_percent)
    const unitTax = (unitPrice * taxPercent) / 100
    const lineSubtotal = unitPrice * item.quantity
    const lineTax = unitTax * item.quantity
    const tabletsDeducted = item.quantity * tabletsPerUnit

    if (product.stock_quantity < tabletsDeducted) {
      throw new AppError(
        `Insufficient stock for "${product.product_name}". Available: ${product.stock_quantity}`,
        400
      )
    }

    subtotal += lineSubtotal
    tax += lineTax
    itemCount += 1
    unitCount += item.quantity

    lineItems.push({
      product_id: product.id,
      product_name: product.product_name,
      generic_name: product.generic_name,
      brand_name: product.brand_name,
      sale_unit: item.saleUnit,
      quantity: item.quantity,
      unit_price: unitPrice,
      unit_tax: unitTax,
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: lineSubtotal + lineTax,
      tablets_per_unit: tabletsPerUnit,
      tablets_deducted: tabletsDeducted,
      batch_number: product.batch_number,
      expiry_date: product.expiry_date,
    })
  }

  const orderNumber = await generateOnlineOrderNumber(input.storeId)

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      store_id: input.storeId,
      branch_id: branchId,
      order_number: orderNumber,
      order_type: 'online',
      status: 'pending',
      sold_by: requester.id,
      customer_id: requester.id,
      subtotal,
      tax_amount: tax,
      total_amount: subtotal + tax,
      item_count: itemCount,
      unit_count: unitCount,
      delivery_address: input.deliveryAddress,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (orderError || !orderRow) {
    throw new AppError(orderError?.message || 'Failed to create order', 400)
  }

  const orderItems = lineItems.map((line) => ({
    ...line,
    order_id: orderRow.id,
  }))

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems)

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', orderRow.id)
    throw new AppError(itemsError.message, 400)
  }

  const customerName = await getProfileName(requester.id)

  let branchName: string | null = null
  if (branchId) {
    const { data: branch } = await supabaseAdmin
      .from('branches')
      .select('name')
      .eq('id', branchId)
      .maybeSingle()
    branchName = branch?.name ?? null
  }

  return mapOrderRow(
    orderRow as OrderRow,
    customerName,
    null,
    branchName,
    lineItems.map((line, index) =>
      mapOrderItemRow({
        id: `pending-${index}`,
        product_id: line.product_id,
        product_name: line.product_name,
        generic_name: line.generic_name,
        brand_name: line.brand_name,
        sale_unit: line.sale_unit,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
      } as OrderRow)
    )
  )
}

export async function listDeliveryStaff(requester: AuthUser): Promise<DeliveryStaffRecord[]> {
  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, email, phone')
    .eq('role', 'delivery_man')
    .order('name', { ascending: true })

  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    query = query.eq('store_id', requester.storeId)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
  }))
}
