import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as productService from './product.service'

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined
    const data = await productService.listProducts(req.user!, { storeId, branchId })
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function listPosProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productService.listPosProducts(req.user!)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function bulkUploadProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productService.bulkUploadProducts(req.user!, req.body)
    return sendSuccess(res, data, `${data.inserted} product(s) uploaded successfully`, 201)
  } catch (error) {
    next(error)
  }
}

export async function bulkImportProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productService.bulkImportProducts(req.user!, req.body)
    const parts = []
    if (data.updated > 0) parts.push(`${data.updated} updated`)
    if (data.inserted > 0) parts.push(`${data.inserted} added`)
    const message = parts.length > 0 ? parts.join(', ') : 'No products imported'
    return sendSuccess(res, data, `${message} successfully`, 201)
  } catch (error) {
    next(error)
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productService.updateProduct(req.user!, String(req.params.id), req.body)
    return sendSuccess(res, data, 'Product updated successfully')
  } catch (error) {
    next(error)
  }
}

export async function updateProductPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productService.updateProductPosition(
      req.user!,
      String(req.params.id),
      req.body.positionName
    )
    return sendSuccess(res, data, 'Product position updated successfully')
  } catch (error) {
    next(error)
  }
}

export async function bulkCollectProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productService.bulkCollectProducts(req.user!, req.body.productIds)
    return sendSuccess(res, data, `${data.collected} product(s) marked as collected`)
  } catch (error) {
    next(error)
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await productService.deleteProduct(req.user!, String(req.params.id))
    return sendSuccess(res, null, 'Product deleted successfully')
  } catch (error) {
    next(error)
  }
}
