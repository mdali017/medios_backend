import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import type { AuthUser } from '../../types'
import type { BulkProductItemInput, BulkUploadProductsInput, UpdateProductInput } from './product.validation'

export interface ProductRecord {
  id: string
  storeId: string
  productName: string
  genericName: string
  brandName: string
  category: string | null
  company: string | null
  unitType: string
  description: string | null
  priceSingle: number
  pricePata: number | null
  priceBox: number | null
  costPriceSingle: number | null
  taxPercent: number
  tabletsPerStrip: number
  stripsPerBox: number
  stockQuantity: number
  batchNumber: string
  expiryDate: string
  entryDate: string
  imageUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
}

function mapProductRow(row: Record<string, unknown>): ProductRecord {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    productName: row.product_name as string,
    genericName: row.generic_name as string,
    brandName: row.brand_name as string,
    category: (row.category as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    unitType: row.unit_type as string,
    description: (row.description as string | null) ?? null,
    priceSingle: Number(row.price_single),
    pricePata: row.price_pata != null ? Number(row.price_pata) : null,
    priceBox: row.price_box != null ? Number(row.price_box) : null,
    costPriceSingle: row.cost_price_single != null ? Number(row.cost_price_single) : null,
    taxPercent: Number(row.tax_percent),
    tabletsPerStrip: Number(row.tablets_per_strip),
    stripsPerBox: Number(row.strips_per_box),
    stockQuantity: Number(row.stock_quantity),
    batchNumber: row.batch_number as string,
    expiryDate: row.expiry_date as string,
    entryDate: row.entry_date as string,
    imageUrl: (row.image_url as string | null) ?? null,
    status: row.status as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function resolveStoreId(requester: AuthUser, inputStoreId?: string): string {
  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    return requester.storeId
  }

  if (!inputStoreId) {
    throw new AppError('Store ID is required', 400)
  }

  return inputStoreId
}

function toDbRow(storeId: string, item: BulkProductItemInput) {
  return {
    store_id: storeId,
    product_name: item.productName.trim(),
    generic_name: item.genericName.trim(),
    brand_name: item.brandName.trim(),
    category: item.category?.trim() || null,
    company: item.company?.trim() || null,
    unit_type: item.unitType,
    description: item.description?.trim() || null,
    price_single: item.priceSingle,
    price_pata: item.pricePata ?? null,
    price_box: item.priceBox ?? null,
    cost_price_single: item.costPriceSingle ?? null,
    tax_percent: item.taxPercent ?? 0,
    tablets_per_strip: item.tabletsPerStrip ?? 10,
    strips_per_box: item.stripsPerBox ?? 10,
    stock_quantity: item.stockQuantity,
    batch_number: item.batchNumber.trim(),
    expiry_date: item.expiryDate,
    entry_date: item.entryDate || new Date().toISOString().slice(0, 10),
    image_url: item.imageUrl || null,
    status: 'active',
  }
}

export async function listProducts(
  requester: AuthUser,
  storeIdFilter?: string
): Promise<ProductRecord[]> {
  let storeId: string | undefined

  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    storeId = requester.storeId
  } else if (storeIdFilter) {
    storeId = storeIdFilter
  }

  let query = supabaseAdmin
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  return (data || []).map(mapProductRow)
}

export async function listPosProducts(requester: AuthUser): Promise<ProductRecord[]> {
  if (requester.role !== 'store_manager' && requester.role !== 'admin') {
    throw new AppError('You do not have permission to access POS products', 403)
  }

  if (!requester.storeId) {
    throw new AppError('Store not assigned to this user', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('store_id', requester.storeId)
    .eq('status', 'active')
    .order('product_name', { ascending: true })

  if (error) {
    throw new AppError(error.message, 400)
  }

  return (data || []).map(mapProductRow)
}

export async function bulkUploadProducts(
  requester: AuthUser,
  input: BulkUploadProductsInput
): Promise<{ inserted: number; products: ProductRecord[] }> {
  const storeId = resolveStoreId(requester, input.storeId)

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .maybeSingle()

  if (!store) {
    throw new AppError('Store not found', 404)
  }

  const rows = input.products.map((item) => toDbRow(storeId, item))

  const { data, error } = await supabaseAdmin.from('products').insert(rows).select('*')

  if (error) {
    throw new AppError(error.message, 400)
  }

  return {
    inserted: data?.length ?? 0,
    products: (data || []).map(mapProductRow),
  }
}

async function getProductForRequester(requester: AuthUser, productId: string) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle()

  if (error) {
    throw new AppError(error.message, 400)
  }

  if (!data) {
    throw new AppError('Product not found', 404)
  }

  if (requester.role === 'admin') {
    if (!requester.storeId) {
      throw new AppError('Store not assigned to this admin', 400)
    }
    if (data.store_id !== requester.storeId) {
      throw new AppError('You can only manage products from your own store', 403)
    }
  }

  return mapProductRow(data)
}

function toUpdateRow(input: UpdateProductInput) {
  const updates: Record<string, unknown> = {}

  if (input.productName !== undefined) updates.product_name = input.productName.trim()
  if (input.genericName !== undefined) updates.generic_name = input.genericName.trim()
  if (input.brandName !== undefined) updates.brand_name = input.brandName.trim()
  if (input.category !== undefined) updates.category = input.category.trim() || null
  if (input.company !== undefined) updates.company = input.company.trim() || null
  if (input.unitType !== undefined) updates.unit_type = input.unitType
  if (input.description !== undefined) updates.description = input.description.trim() || null
  if (input.priceSingle !== undefined) updates.price_single = input.priceSingle
  if (input.pricePata !== undefined) updates.price_pata = input.pricePata
  if (input.priceBox !== undefined) updates.price_box = input.priceBox
  if (input.costPriceSingle !== undefined) updates.cost_price_single = input.costPriceSingle
  if (input.taxPercent !== undefined) updates.tax_percent = input.taxPercent
  if (input.tabletsPerStrip !== undefined) updates.tablets_per_strip = input.tabletsPerStrip
  if (input.stripsPerBox !== undefined) updates.strips_per_box = input.stripsPerBox
  if (input.stockQuantity !== undefined) updates.stock_quantity = input.stockQuantity
  if (input.batchNumber !== undefined) updates.batch_number = input.batchNumber.trim()
  if (input.expiryDate !== undefined) updates.expiry_date = input.expiryDate
  if (input.entryDate !== undefined) updates.entry_date = input.entryDate
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl || null

  return updates
}

export async function updateProduct(
  requester: AuthUser,
  productId: string,
  input: UpdateProductInput
): Promise<ProductRecord> {
  await getProductForRequester(requester, productId)

  const updates = toUpdateRow(input)
  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select('*')
    .single()

  if (error) {
    throw new AppError(error.message, 400)
  }

  return mapProductRow(data)
}

export async function deleteProduct(requester: AuthUser, productId: string): Promise<void> {
  await getProductForRequester(requester, productId)

  const { error } = await supabaseAdmin.from('products').delete().eq('id', productId)

  if (error) {
    throw new AppError(error.message, 400)
  }
}

export interface MedicineMatchInput {
  name: string
  strength?: string
}

export interface MedicineMatchResult {
  query: string
  matched: boolean
  productId?: string
  productName?: string
  genericName?: string
  brandName?: string
  priceSingle?: number
  pricePata?: number | null
  priceBox?: number | null
  stockQuantity?: number
  matchScore?: number
  matchField?: string
  priceSource: 'local' | 'external'
}

function normalizeMedicineName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMedicineMatch(query: string, product: ProductRecord): { score: number; field: string } {
  const normalizedQuery = normalizeMedicineName(query)
  if (!normalizedQuery || normalizedQuery.length < 3) {
    return { score: 0, field: '' }
  }

  const fields = [
    { value: product.productName, field: 'productName', weight: 1 },
    { value: product.genericName, field: 'genericName', weight: 0.95 },
    { value: product.brandName, field: 'brandName', weight: 0.9 },
  ]

  let best = { score: 0, field: '' }

  for (const { value, field, weight } of fields) {
    const normalizedValue = normalizeMedicineName(value)
    if (!normalizedValue) continue

    if (normalizedValue === normalizedQuery) {
      return { score: weight, field }
    }

    if (normalizedQuery.length >= 4) {
      if (normalizedValue.includes(normalizedQuery) || normalizedQuery.includes(normalizedValue)) {
        const score =
          (Math.min(normalizedQuery.length, normalizedValue.length) /
            Math.max(normalizedQuery.length, normalizedValue.length)) *
          weight
        if (score > best.score) best = { score, field }
      }
    }

    const queryWords = normalizedQuery.split(' ').filter((word) => word.length >= 3)
    const valueWords = normalizedValue.split(' ').filter((word) => word.length >= 3)
    if (queryWords.length === 0) continue

    const overlap = queryWords.filter((word) =>
      valueWords.some(
        (valueWord) =>
          valueWord === word ||
          (word.length >= 4 && (valueWord.includes(word) || word.includes(valueWord)))
      )
    ).length

    if (overlap > 0) {
      const score = (overlap / queryWords.length) * weight
      if (score > best.score) best = { score, field }
    }
  }

  return best
}

const MATCH_THRESHOLD = 0.65

export async function matchMedicines(
  medicines: MedicineMatchInput[],
  storeId?: string
): Promise<MedicineMatchResult[]> {
  let query = supabaseAdmin.from('products').select('*').eq('status', 'active')

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query

  if (error) {
    throw new AppError(error.message, 400)
  }

  const products = (data || []).map(mapProductRow)

  return medicines.map((medicine) => {
    const fullQuery = medicine.strength ? `${medicine.name} ${medicine.strength}` : medicine.name
    let bestProduct: ProductRecord | null = null
    let bestScore = 0
    let bestField = ''

    for (const product of products) {
      const fullMatch = scoreMedicineMatch(fullQuery, product)
      const nameMatch = scoreMedicineMatch(medicine.name, product)
      const finalScore = Math.max(fullMatch.score, nameMatch.score)
      const finalField = fullMatch.score >= nameMatch.score ? fullMatch.field : nameMatch.field

      if (finalScore > bestScore) {
        bestScore = finalScore
        bestProduct = product
        bestField = finalField
      }
    }

    if (bestProduct && bestScore >= MATCH_THRESHOLD) {
      return {
        query: medicine.name,
        matched: true,
        productId: bestProduct.id,
        productName: bestProduct.productName,
        genericName: bestProduct.genericName,
        brandName: bestProduct.brandName,
        priceSingle: bestProduct.priceSingle,
        pricePata: bestProduct.pricePata,
        priceBox: bestProduct.priceBox,
        stockQuantity: bestProduct.stockQuantity,
        matchScore: bestScore,
        matchField: bestField,
        priceSource: 'local' as const,
      }
    }

    return {
      query: medicine.name,
      matched: false,
      priceSource: 'external' as const,
    }
  })
}
