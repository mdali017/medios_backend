import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as customerController from './customer.controller'
import { matchMedicinesSchema } from './customer.validation'
import { placeOnlineOrderSchema } from '../orders/order.validation'

const router = Router()

router.get('/stores', customerController.listPublicStores)
router.get('/stores/:storeId/branches', customerController.listStoreBranches)

router.post(
  '/products/match',
  validateBody(matchMedicinesSchema),
  customerController.matchMedicines
)

router.post(
  '/orders',
  authenticate,
  validateBody(placeOnlineOrderSchema),
  customerController.placeOrder
)

export default router
