import { supabaseAdmin } from '../../config/supabase'
import { emitStockUpdated } from '../../config/socket'
import { AppError } from '../../utils/AppError'
import type { AuthUser } from '../../types'
import type { PosCheckoutInput } from './pos.validation'

export interface PosOrderItemRecord {
  id: string
  productId: string
  productName: string
  genericName: string
  brandName: string
  saleUnit: string
  quantity: number
  unitPrice: number
  unitTax: number
  lineSubtotal: number
  lineTax: number
  lineTotal: number
  tabletsPerUnit: number
  tabletsDeducted: number
}

export interface PosOrderRecord {
  id: string
  storeId: string
  orderNumber: string
  orderType: string
  status: string
  soldBy: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  itemCount: number
  unitCount: number
  notes: string | null
  createdAt: string
  items: PosOrderItemRecord[]
}

function mapOrderItemRow(row: Record<string, unknown>): PosOrderItemRecord {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    genericName: row.generic_name as string,
    brandName: row.brand_name as string,
    saleUnit: row.sale_unit as string,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    unitTax: Number(row.unit_tax),
    lineSubtotal: Number(row.line_subtotal),
    lineTax: Number(row.line_tax),
    lineTotal: Number(row.line_total),
    tabletsPerUnit: Number(row.tablets_per_unit),
    tabletsDeducted: Number(row.tablets_deducted),
  }
}

function mapOrderRow(
  row: Record<string, unknown>,
  items: PosOrderItemRecord[]
): PosOrderRecord {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    orderNumber: row.order_number as string,
    orderType: row.order_type as string,
    status: row.status as string,
    soldBy: row.sold_by as string,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    itemCount: Number(row.item_count),
    unitCount: Number(row.unit_count),
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    items,
  }
}

export async function checkoutPosOrder(
  requester: AuthUser,
  input: PosCheckoutInput
): Promise<PosOrderRecord> {
  if (requester.role !== 'store_manager' && requester.role !== 'admin') {
    throw new AppError('You do not have permission to checkout POS orders', 403)
  }

  if (!requester.storeId) {
    throw new AppError('Store not assigned to this user', 400)
  }

  const rpcItems = input.items.map((item) => ({
    productId: item.productId,
    saleUnit: item.saleUnit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitTax: item.unitTax ?? 0,
    tabletsPerUnit: item.tabletsPerUnit,
  }))

  const { data: orderId, error: rpcError } = await supabaseAdmin.rpc('create_pos_order', {
    p_store_id: requester.storeId,
    p_sold_by: requester.id,
    p_items: rpcItems,
    p_notes: input.notes ?? null,
  })

  if (rpcError) {
    throw new AppError(rpcError.message, 400)
  }

  if (!orderId) {
    throw new AppError('Failed to create order', 500)
  }

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !orderRow) {
    throw new AppError(orderError?.message || 'Order created but could not be loaded', 500)
  }

  const { data: itemRows, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (itemsError) {
    throw new AppError(itemsError.message, 500)
  }

  const items = (itemRows || []).map((row) =>
    mapOrderItemRow(row as Record<string, unknown>)
  )
  const order = mapOrderRow(orderRow as Record<string, unknown>, items)

  const productIds = [...new Set(items.map((item) => item.productId))]
  if (productIds.length > 0 && requester.storeId) {
    const { data: stockRows } = await supabaseAdmin
      .from('products')
      .select('id, stock_quantity')
      .in('id', productIds)

    if (stockRows?.length) {
      emitStockUpdated(requester.storeId, {
        updates: stockRows.map((row) => ({
          productId: row.id as string,
          stockQuantity: Number(row.stock_quantity),
        })),
        source: 'checkout',
        orderId: order.id,
        orderNumber: order.orderNumber,
      })
    }
  }

  return order
}
