import { Router } from 'express'
import { authenticate, authorize } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as storeController from './store.controller'
import {
  createStoreAdminSchema,
  createStoreSchema,
  updateStoreSchema,
} from './store.validation'

const router = Router()

router.use(authenticate, authorize('super_admin'))

router.get('/stores', storeController.listStores)
router.get('/stores/:id', storeController.getStore)
router.post('/stores', validateBody(createStoreSchema), storeController.createStore)
router.put('/stores/:id', validateBody(updateStoreSchema), storeController.updateStore)
router.delete('/stores/:id', storeController.deleteStore)
router.post('/store-admins', validateBody(createStoreAdminSchema), storeController.createStoreAdmin)

export default router
