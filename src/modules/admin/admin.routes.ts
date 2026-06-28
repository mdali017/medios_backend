import { Router } from 'express'
import { authenticate, authorize } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as authController from '../auth/auth.controller'
import { createUserSchema } from '../auth/auth.validation'
import * as storeManagerController from './store-manager.controller'
import { createStoreManagerSchema } from './store-manager.validation'
import * as productController from '../products/product.controller'
import { bulkUploadProductsSchema, updateProductSchema } from '../products/product.validation'
import * as orderController from '../orders/order.controller'
import * as reportController from '../reports/report.controller'
import {
  assignDeliveryStaffSchema,
  updateOrderStatusSchema,
} from '../orders/order.validation'
import * as stockRequestController from '../stock-requests/stock-request.controller'
import { updateEmergencyNeedStatusSchema } from '../stock-requests/stock-request.validation'

const router = Router()

router.post(
  '/users',
  authenticate,
  authorize('super_admin'),
  validateBody(createUserSchema),
  authController.createUser
)

router.get(
  '/store-managers',
  authenticate,
  authorize('super_admin', 'admin'),
  storeManagerController.listStoreManagers
)

router.post(
  '/store-managers',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(createStoreManagerSchema),
  storeManagerController.createStoreManager
)

router.get(
  '/products',
  authenticate,
  authorize('super_admin', 'admin'),
  productController.listProducts
)

router.post(
  '/products/bulk-upload',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(bulkUploadProductsSchema),
  productController.bulkUploadProducts
)

router.put(
  '/products/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(updateProductSchema),
  productController.updateProduct
)

router.delete(
  '/products/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  productController.deleteProduct
)

router.get(
  '/orders',
  authenticate,
  authorize('super_admin', 'admin'),
  orderController.listOrders
)

router.get(
  '/orders/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  orderController.getOrder
)

router.patch(
  '/orders/:id/status',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
)

router.patch(
  '/orders/:id/delivery-staff',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(assignDeliveryStaffSchema),
  orderController.assignDeliveryStaff
)

router.get(
  '/delivery-staff',
  authenticate,
  authorize('super_admin', 'admin'),
  orderController.listDeliveryStaff
)

router.get(
  '/reports',
  authenticate,
  authorize('super_admin', 'admin'),
  reportController.getStoreReports
)

router.get(
  '/emergency-needs',
  authenticate,
  authorize('super_admin', 'admin', 'store_manager'),
  stockRequestController.listEmergencyNeeds
)

router.patch(
  '/emergency-needs/:id/status',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(updateEmergencyNeedStatusSchema),
  stockRequestController.updateEmergencyNeedStatus
)

export default router
