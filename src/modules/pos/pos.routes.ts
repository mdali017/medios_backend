import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { authorizePosAccess } from '../../middleware/posAccess'
import { validateBody } from '../../middleware/validate'
import * as productController from '../products/product.controller'
import * as posController from './pos.controller'
import { posCheckoutSchema } from './pos.validation'
import * as stockRequestController from '../stock-requests/stock-request.controller'
import { updateProductPositionSchema } from '../products/product.validation'
import {
  createBulkRestockSchema,
  createEmergencyNeedSchema,
} from '../stock-requests/stock-request.validation'

const router = Router()

router.get(
  '/products',
  authenticate,
  authorizePosAccess,
  productController.listPosProducts
)

router.patch(
  '/products/:id/position',
  authenticate,
  authorizePosAccess,
  validateBody(updateProductPositionSchema),
  productController.updateProductPosition
)

router.post(
  '/checkout',
  authenticate,
  authorizePosAccess,
  validateBody(posCheckoutSchema),
  posController.checkout
)

router.post(
  '/emergency-needs',
  authenticate,
  authorizePosAccess,
  validateBody(createEmergencyNeedSchema),
  stockRequestController.createEmergencyNeed
)

router.patch(
  '/emergency-needs/:id/fulfill',
  authenticate,
  authorizePosAccess,
  stockRequestController.fulfillEmergencyNeed
)

router.post(
  '/restock-requests',
  authenticate,
  authorizePosAccess,
  validateBody(createBulkRestockSchema),
  stockRequestController.createBulkRestockRequests
)

export default router
