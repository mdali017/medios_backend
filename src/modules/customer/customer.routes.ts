import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as customerController from './customer.controller'
import { matchMedicinesSchema } from './customer.validation'
import { placeOnlineOrderSchema } from '../orders/order.validation'

const router = Router()

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
