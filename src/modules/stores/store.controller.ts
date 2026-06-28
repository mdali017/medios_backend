import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as storeService from './store.service'
import type { StoreStatus } from './store.service'

function formatStore(store: storeService.StoreWithAdmin) {
  return {
    id: store.id,
    name: store.name,
    address: store.address,
    city: store.city,
    phone: store.phone,
    licenseNumber: store.license_number,
    logoUrl: store.logo_url,
    status: store.status,
    subscriptionId: store.subscription_id,
    createdAt: store.created_at,
    updatedAt: store.updated_at,
    storeAdmin: store.storeAdmin,
  }
}

export async function listStores(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as StoreStatus | undefined
    const stores = await storeService.listStores(status)
    return sendSuccess(res, stores.map(formatStore))
  } catch (error) {
    next(error)
  }
}

export async function getStore(req: Request, res: Response, next: NextFunction) {
  try {
    const store = await storeService.getStoreById(String(req.params.id))
    return sendSuccess(res, formatStore(store))
  } catch (error) {
    next(error)
  }
}

export async function createStore(req: Request, res: Response, next: NextFunction) {
  try {
    const store = await storeService.createStore(req.body)
    return sendSuccess(res, formatStore(store), 'Store created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export async function updateStore(req: Request, res: Response, next: NextFunction) {
  try {
    const store = await storeService.updateStore(String(req.params.id), req.body)
    return sendSuccess(res, formatStore(store), 'Store updated successfully')
  } catch (error) {
    next(error)
  }
}

export async function deleteStore(req: Request, res: Response, next: NextFunction) {
  try {
    await storeService.deleteStore(String(req.params.id))
    return sendSuccess(res, null, 'Store deleted successfully')
  } catch (error) {
    next(error)
  }
}

export async function createStoreAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await storeService.assignStoreAdmin(req.body)
    return sendSuccess(res, admin, 'Store admin assigned successfully', 201)
  } catch (error) {
    next(error)
  }
}
