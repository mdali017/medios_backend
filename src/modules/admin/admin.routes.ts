import { Router } from 'express'
import { authenticate, authorize } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as authController from '../auth/auth.controller'
import { createUserSchema } from '../auth/auth.validation'
import * as storeManagerController from './store-manager.controller'
import { createStoreManagerSchema } from './store-manager.validation'
import * as productController from '../products/product.controller'
import { bulkUploadProductsSchema, updateProductSchema, bulkCollectProductsSchema, bulkImportProductsSchema } from '../products/product.validation'
import * as orderController from '../orders/order.controller'
import * as reportController from '../reports/report.controller'
import {
  assignDeliveryStaffSchema,
  updateOrderStatusSchema,
} from '../orders/order.validation'
import * as stockRequestController from '../stock-requests/stock-request.controller'
import { updateEmergencyNeedStatusSchema } from '../stock-requests/stock-request.validation'
import * as branchController from '../branches/branch.controller'
import { createBranchSchema, updateBranchSchema } from '../branches/branch.validation'
import * as branchManagerController from './branch-manager.controller'
import { createBranchManagerSchema } from './branch-manager.validation'
import * as googleSheetsController from '../google-sheets/google-sheets.controller'
import { exportGoogleSheetSchema } from '../google-sheets/google-sheets.validation'

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
  '/branches',
  authenticate,
  authorize('super_admin', 'admin'),
  branchController.listBranches
)

router.get(
  '/branches/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  branchController.getBranch
)

router.post(
  '/branches',
  authenticate,
  authorize('admin'),
  validateBody(createBranchSchema),
  branchController.createBranch
)

router.patch(
  '/branches/:id',
  authenticate,
  authorize('admin'),
  validateBody(updateBranchSchema),
  branchController.updateBranch
)

router.delete(
  '/branches/:id',
  authenticate,
  authorize('admin'),
  branchController.deactivateBranch
)

router.get(
  '/branch-managers',
  authenticate,
  authorize('super_admin', 'admin'),
  branchManagerController.listBranchManagers
)

router.post(
  '/branch-managers',
  authenticate,
  authorize('admin'),
  validateBody(createBranchManagerSchema),
  branchManagerController.createBranchManager
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

router.post(
  '/products/bulk-import',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(bulkImportProductsSchema),
  productController.bulkImportProducts
)

router.put(
  '/products/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(updateProductSchema),
  productController.updateProduct
)

router.post(
  '/products/bulk-collect',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(bulkCollectProductsSchema),
  productController.bulkCollectProducts
)

router.delete(
  '/products/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  productController.deleteProduct
)

router.get(
  '/google-sheets/connect',
  authenticate,
  authorize('super_admin', 'admin'),
  googleSheetsController.getConnectUrl
)

router.get(
  '/google-sheets/status',
  authenticate,
  authorize('super_admin', 'admin'),
  googleSheetsController.getStatus
)

router.delete(
  '/google-sheets/disconnect',
  authenticate,
  authorize('super_admin', 'admin'),
  googleSheetsController.disconnect
)

router.post(
  '/google-sheets/export',
  authenticate,
  authorize('super_admin', 'admin'),
  validateBody(exportGoogleSheetSchema),
  googleSheetsController.exportProducts
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
  '/reports/medicine-profit',
  authenticate,
  authorize('super_admin', 'admin'),
  reportController.getMedicineProfitList
)

router.get(
  '/reports/medicine-profit/:productId',
  authenticate,
  authorize('super_admin', 'admin'),
  reportController.getMedicineProfitDetail
)

router.get(
  '/emergency-needs',
  authenticate,
  authorize('super_admin', 'admin', 'store_manager', 'branch_manager'),
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
