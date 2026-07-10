import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { branchBelongsToStore } from '../../utils/branch.helper'
import type { AuthUser } from '../../types'
import type { ReportDateRange } from './report.service'

export interface MedicineProfitSummaryItem {
  productId: string
  productName: string
  genericName: string
  brandName: string
  unitsSold: number
  tabletsSold: number
  totalRevenue: number
  totalCost: number | null
  totalProfit: number | null
  avgSellPrice: number
  avgCostPerTablet: number | null
  marginPercent: number | null
  hasCostData: boolean
}

export interface MedicineProfitListResponse {
  storeId: string
  branchId: string | null
  dateRange: ReportDateRange
  items: MedicineProfitSummaryItem[]
  totals: {
    totalRevenue: number
    totalCost: number | null
    totalProfit: number | null
    marginPercent: number | null
  }
}

export interface MedicineProfitSaleLine {
  orderItemId: string
  orderId: string
  orderNumber: string
  orderType: string
  orderDate: string
  saleUnit: string
  quantity: number
  tabletsDeducted: number
  unitSellPrice: number
  lineRevenue: number
  unitCostPerTablet: number | null
  lineCost: number | null
  lineProfit: number | null
}

export interface MedicineProfitDetailResponse {
  productId: string
  productName: string
  genericName: string
  brandName: string
  storeId: string
  branchId: string | null
  dateRange: ReportDateRange
  summary: MedicineProfitSummaryItem
  sales: MedicineProfitSaleLine[]
}

interface MedicineProfitFilters {
  storeId?: string
  branchId?: string
  startDate?: string
  endDate?: string
}

interface RevenueOrderRow {
  id: string
  order_number: string
  order_type: string
  status: string
  created_at: string
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  product_name: string
  generic_name: string
  brand_name: string
  sale_unit: string
  quantity: number
  unit_price: number
  line_subtotal: number
  tablets_deducted: number
}

function resolveStoreId(requester: AuthUser, storeIdFilter?: string): string {
  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    return requester.storeId
  }

  if (!storeIdFilter) {
    throw new AppError('Store ID is required', 400)
  }

  return storeIdFilter
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateOnly(value: string, label: string): Date {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`Invalid ${label}. Use YYYY-MM-DD format.`, 400)
  }
  return date
}

function resolveMedicineProfitDateRange(startDate?: string, endDate?: string): {
  start: Date
  end: Date
  startDate: string
  endDate: string
  periodDays: number
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let resolvedEnd: Date
  let resolvedStart: Date

  if (!startDate && !endDate) {
    resolvedStart = new Date(today.getFullYear(), today.getMonth(), 1)
    resolvedEnd = new Date(today.getFullYear(), today.getMonth(), 7)
  } else {
    resolvedEnd = endDate ? parseDateOnly(endDate, 'endDate') : new Date(today)
    resolvedStart = startDate
      ? parseDateOnly(startDate, 'startDate')
      : new Date(resolvedEnd.getFullYear(), resolvedEnd.getMonth(), 1)
  }

  if (resolvedStart > resolvedEnd) {
    throw new AppError('startDate must be on or before endDate', 400)
  }

  const periodDays =
    Math.floor((resolvedEnd.getTime() - resolvedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

  if (periodDays > 365) {
    throw new AppError('Date range cannot exceed 365 days', 400)
  }

  return {
    start: resolvedStart,
    end: resolvedEnd,
    startDate: toDateKey(resolvedStart),
    endDate: toDateKey(resolvedEnd),
    periodDays,
  }
}

function isRevenueOrder(row: RevenueOrderRow): boolean {
  return row.status === 'completed' || row.order_type === 'pos'
}

function isOrderInRange(createdAt: string, start: Date, end: Date): boolean {
  const orderDay = new Date(createdAt)
  orderDay.setHours(0, 0, 0, 0)
  return orderDay >= start && orderDay <= end
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2))
}

function buildSummaryFromLines(
  productId: string,
  productName: string,
  genericName: string,
  brandName: string,
  lines: Array<{
    quantity: number
    tabletsDeducted: number
    lineRevenue: number
    lineCost: number | null
    lineProfit: number | null
  }>
): MedicineProfitSummaryItem {
  let unitsSold = 0
  let tabletsSold = 0
  let totalRevenue = 0
  let totalCost = 0
  let totalProfit = 0
  let hasCostData = true

  for (const line of lines) {
    unitsSold += line.quantity
    tabletsSold += line.tabletsDeducted
    totalRevenue += line.lineRevenue

    if (line.lineCost == null || line.lineProfit == null) {
      hasCostData = false
    } else {
      totalCost += line.lineCost
      totalProfit += line.lineProfit
    }
  }

  const avgSellPrice = unitsSold > 0 ? roundMoney(totalRevenue / unitsSold) : 0
  const avgCostPerTablet =
    hasCostData && tabletsSold > 0 ? roundMoney(totalCost / tabletsSold) : null
  const marginPercent =
    hasCostData && totalRevenue > 0
      ? Number(((totalProfit / totalRevenue) * 100).toFixed(1))
      : null

  return {
    productId,
    productName,
    genericName,
    brandName,
    unitsSold,
    tabletsSold,
    totalRevenue: roundMoney(totalRevenue),
    totalCost: hasCostData ? roundMoney(totalCost) : null,
    totalProfit: hasCostData ? roundMoney(totalProfit) : null,
    avgSellPrice,
    avgCostPerTablet,
    marginPercent,
    hasCostData,
  }
}

async function fetchProfitContext(
  requester: AuthUser,
  filters: MedicineProfitFilters
): Promise<{
  storeId: string
  branchId: string | null
  dateRange: ReturnType<typeof resolveMedicineProfitDateRange>
  orderById: Map<string, RevenueOrderRow>
  costByProductId: Map<string, number | null>
}> {
  const storeId = resolveStoreId(requester, filters.storeId)
  let branchId: string | null = null

  if (filters.branchId) {
    const valid = await branchBelongsToStore(filters.branchId, storeId)
    if (!valid) {
      throw new AppError('Invalid branch for this store', 400)
    }
    branchId = filters.branchId
  }

  const dateRange = resolveMedicineProfitDateRange(filters.startDate, filters.endDate)
  const rangeEndExclusive = new Date(dateRange.end)
  rangeEndExclusive.setHours(23, 59, 59, 999)

  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('id, order_number, order_type, status, created_at')
    .eq('store_id', storeId)
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', rangeEndExclusive.toISOString())

  if (branchId) {
    ordersQuery = ordersQuery.eq('branch_id', branchId)
  }

  const { data: orders, error: ordersError } = await ordersQuery

  if (ordersError) {
    throw new AppError(ordersError.message, 400)
  }

  const orderById = new Map<string, RevenueOrderRow>()

  for (const row of (orders || []) as RevenueOrderRow[]) {
    if (!isRevenueOrder(row)) continue
    if (!isOrderInRange(row.created_at, dateRange.start, dateRange.end)) continue
    orderById.set(row.id, row)
  }

  let productsQuery = supabaseAdmin
    .from('products')
    .select('id, cost_price_single')
    .eq('store_id', storeId)

  if (branchId) {
    productsQuery = productsQuery.eq('branch_id', branchId)
  }

  const { data: products, error: productsError } = await productsQuery

  if (productsError) {
    throw new AppError(productsError.message, 400)
  }

  const costByProductId = new Map<string, number | null>()
  for (const product of products || []) {
    costByProductId.set(
      product.id as string,
      product.cost_price_single != null ? Number(product.cost_price_single) : null
    )
  }

  return { storeId, branchId, dateRange, orderById, costByProductId }
}

function mapItemRow(
  item: OrderItemRow,
  order: RevenueOrderRow,
  costByProductId: Map<string, number | null>
): MedicineProfitSaleLine {
  const unitCostPerTablet = costByProductId.get(item.product_id) ?? null
  const lineRevenue = Number(item.line_subtotal)
  const lineCost =
    unitCostPerTablet != null ? unitCostPerTablet * Number(item.tablets_deducted) : null
  const lineProfit = lineCost != null ? lineRevenue - lineCost : null

  return {
    orderItemId: item.id,
    orderId: item.order_id,
    orderNumber: order.order_number,
    orderType: order.order_type,
    orderDate: order.created_at,
    saleUnit: item.sale_unit,
    quantity: Number(item.quantity),
    tabletsDeducted: Number(item.tablets_deducted),
    unitSellPrice: Number(item.unit_price),
    lineRevenue: roundMoney(lineRevenue),
    unitCostPerTablet,
    lineCost: lineCost != null ? roundMoney(lineCost) : null,
    lineProfit: lineProfit != null ? roundMoney(lineProfit) : null,
  }
}

async function fetchOrderItems(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select(
      'id, order_id, product_id, product_name, generic_name, brand_name, sale_unit, quantity, unit_price, line_subtotal, tablets_deducted'
    )
    .in('order_id', orderIds)

  if (error) {
    throw new AppError(error.message, 400)
  }

  return (data || []) as OrderItemRow[]
}

export async function getMedicineProfitList(
  requester: AuthUser,
  filters: MedicineProfitFilters
): Promise<MedicineProfitListResponse> {
  const { storeId, branchId, dateRange, orderById, costByProductId } =
    await fetchProfitContext(requester, filters)

  const orderIds = Array.from(orderById.keys())
  const items = await fetchOrderItems(orderIds)

  const linesByProduct = new Map<
    string,
    {
      productName: string
      genericName: string
      brandName: string
      lines: Array<{
        quantity: number
        tabletsDeducted: number
        lineRevenue: number
        lineCost: number | null
        lineProfit: number | null
      }>
    }
  >()

  for (const item of items) {
    const order = orderById.get(item.order_id)
    if (!order) continue

    const saleLine = mapItemRow(item, order, costByProductId)
    const existing = linesByProduct.get(item.product_id)

    const lineData = {
      quantity: saleLine.quantity,
      tabletsDeducted: saleLine.tabletsDeducted,
      lineRevenue: saleLine.lineRevenue,
      lineCost: saleLine.lineCost,
      lineProfit: saleLine.lineProfit,
    }

    if (existing) {
      existing.lines.push(lineData)
    } else {
      linesByProduct.set(item.product_id, {
        productName: item.product_name,
        genericName: item.generic_name,
        brandName: item.brand_name,
        lines: [lineData],
      })
    }
  }

  const summaryItems: MedicineProfitSummaryItem[] = Array.from(linesByProduct.entries())
    .map(([productId, data]) =>
      buildSummaryFromLines(
        productId,
        data.productName,
        data.genericName,
        data.brandName,
        data.lines
      )
    )
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  let grandRevenue = 0
  let grandCost = 0
  let grandProfit = 0
  let allHaveCost = summaryItems.length > 0

  for (const item of summaryItems) {
    grandRevenue += item.totalRevenue
    if (!item.hasCostData || item.totalCost == null || item.totalProfit == null) {
      allHaveCost = false
    } else {
      grandCost += item.totalCost
      grandProfit += item.totalProfit
    }
  }

  return {
    storeId,
    branchId,
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      periodDays: dateRange.periodDays,
    },
    items: summaryItems,
    totals: {
      totalRevenue: roundMoney(grandRevenue),
      totalCost: allHaveCost ? roundMoney(grandCost) : null,
      totalProfit: allHaveCost ? roundMoney(grandProfit) : null,
      marginPercent:
        allHaveCost && grandRevenue > 0
          ? Number(((grandProfit / grandRevenue) * 100).toFixed(1))
          : null,
    },
  }
}

export async function getMedicineProfitDetail(
  requester: AuthUser,
  productId: string,
  filters: MedicineProfitFilters
): Promise<MedicineProfitDetailResponse> {
  const { storeId, branchId, dateRange, orderById, costByProductId } =
    await fetchProfitContext(requester, filters)

  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, product_name, generic_name, brand_name, store_id')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (productError) {
    throw new AppError(productError.message, 400)
  }

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  const orderIds = Array.from(orderById.keys())
  if (orderIds.length === 0) {
    const emptySummary = buildSummaryFromLines(
      productId,
      product.product_name as string,
      product.generic_name as string,
      product.brand_name as string,
      []
    )

    return {
      productId,
      productName: product.product_name as string,
      genericName: product.generic_name as string,
      brandName: product.brand_name as string,
      storeId,
      branchId,
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        periodDays: dateRange.periodDays,
      },
      summary: emptySummary,
      sales: [],
    }
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select(
      'id, order_id, product_id, product_name, generic_name, brand_name, sale_unit, quantity, unit_price, line_subtotal, tablets_deducted'
    )
    .in('order_id', orderIds)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (itemsError) {
    throw new AppError(itemsError.message, 400)
  }

  const sales: MedicineProfitSaleLine[] = []
  const summaryLines: Array<{
    quantity: number
    tabletsDeducted: number
    lineRevenue: number
    lineCost: number | null
    lineProfit: number | null
  }> = []

  for (const item of (items || []) as OrderItemRow[]) {
    const order = orderById.get(item.order_id)
    if (!order) continue

    const saleLine = mapItemRow(item, order, costByProductId)
    sales.push(saleLine)
    summaryLines.push({
      quantity: saleLine.quantity,
      tabletsDeducted: saleLine.tabletsDeducted,
      lineRevenue: saleLine.lineRevenue,
      lineCost: saleLine.lineCost,
      lineProfit: saleLine.lineProfit,
    })
  }

  const summary = buildSummaryFromLines(
    productId,
    product.product_name as string,
    product.generic_name as string,
    product.brand_name as string,
    summaryLines
  )

  return {
    productId,
    productName: product.product_name as string,
    genericName: product.generic_name as string,
    brandName: product.brand_name as string,
    storeId,
    branchId,
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      periodDays: dateRange.periodDays,
    },
    summary,
    sales,
  }
}
