import { Router } from 'express'
import { authenticate, authorize } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as productController from '../products/product.controller'
import * as posController from './pos.controller'
import { posCheckoutSchema } from './pos.validation'
import * as stockRequestController from '../stock-requests/stock-request.controller'
import {
  createBulkRestockSchema,
  createEmergencyNeedSchema,
} from '../stock-requests/stock-request.validation'

const router = Router()

router.get(
  '/products',
  authenticate,
  authorize('store_manager', 'admin'),
  productController.listPosProducts
)

router.post(
  '/checkout',
  authenticate,
  authorize('store_manager', 'admin'),
  validateBody(posCheckoutSchema),
  posController.checkout
)

router.post(
  '/emergency-needs',
  authenticate,
  authorize('store_manager', 'admin'),
  validateBody(createEmergencyNeedSchema),
  stockRequestController.createEmergencyNeed
)

router.patch(
  '/emergency-needs/:id/fulfill',
  authenticate,
  authorize('store_manager', 'admin'),
  stockRequestController.fulfillEmergencyNeed
)

router.post(
  '/restock-requests',
  authenticate,
  authorize('store_manager', 'admin'),
  validateBody(createBulkRestockSchema),
  stockRequestController.createBulkRestockRequests
)

export default router
