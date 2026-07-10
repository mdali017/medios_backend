import { Router } from 'express'
import { authenticate, authorize } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as sellerController from './seller.controller'
import { createSellerSchema } from './seller.validation'

const router = Router()

router.use(authenticate, authorize('branch_manager'))

router.get('/sellers', sellerController.listSellers)
router.post('/sellers', validateBody(createSellerSchema), sellerController.createSeller)
router.delete('/sellers/:id', sellerController.deactivateSeller)

export default router
