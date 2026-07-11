export type StockFilter = 'all' | 'low_stock' | 'expiring' | 'out_of_stock' | 'in_stock'
export type StockStatus = 'Low Stock' | 'Expiring Soon' | 'Stock Out' | 'In Stock'

export interface ProductStockInput {
  stockQuantity: number
  expiryDate: string
  productName: string
  genericName: string
  brandName: string
  batchNumber: string
  positionName?: string | null
}

export function getProductStockStatus(product: Pick<ProductStockInput, 'stockQuantity' | 'expiryDate'>): StockStatus {
  if (product.stockQuantity === 0) return 'Stock Out'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(product.expiryDate)
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) return 'Expiring Soon'
  if (product.stockQuantity <= 20) return 'Low Stock'
  return 'In Stock'
}

export function matchesStockFilter(status: StockStatus, filter: StockFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'low_stock') return status === 'Low Stock'
  if (filter === 'expiring') return status === 'Expiring Soon'
  if (filter === 'out_of_stock') return status === 'Stock Out'
  if (filter === 'in_stock') return status === 'In Stock'
  return true
}

export function filterLabelForExport(filter: StockFilter): string {
  switch (filter) {
    case 'all':
      return 'All Products'
    case 'low_stock':
      return 'Low Stock'
    case 'expiring':
      return 'Expiry Soon'
    case 'out_of_stock':
      return 'Stock Out'
    case 'in_stock':
      return 'In Stock'
    default:
      return 'Products'
  }
}

export function matchesProductSearch(product: ProductStockInput, searchQuery?: string): boolean {
  const q = searchQuery?.trim().toLowerCase()
  if (!q) return true

  return (
    product.productName.toLowerCase().includes(q) ||
    product.genericName.toLowerCase().includes(q) ||
    product.brandName.toLowerCase().includes(q) ||
    product.batchNumber.toLowerCase().includes(q) ||
    (product.positionName?.toLowerCase().includes(q) ?? false)
  )
}
