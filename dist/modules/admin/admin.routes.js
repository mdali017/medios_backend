"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const authController = __importStar(require("../auth/auth.controller"));
const auth_validation_1 = require("../auth/auth.validation");
const storeManagerController = __importStar(require("./store-manager.controller"));
const store_manager_validation_1 = require("./store-manager.validation");
const productController = __importStar(require("../products/product.controller"));
const product_validation_1 = require("../products/product.validation");
const orderController = __importStar(require("../orders/order.controller"));
const reportController = __importStar(require("../reports/report.controller"));
const order_validation_1 = require("../orders/order.validation");
const stockRequestController = __importStar(require("../stock-requests/stock-request.controller"));
const stock_request_validation_1 = require("../stock-requests/stock-request.validation");
const router = (0, express_1.Router)();
router.post('/users', auth_1.authenticate, (0, auth_1.authorize)('super_admin'), (0, validate_1.validateBody)(auth_validation_1.createUserSchema), authController.createUser);
router.get('/store-managers', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), storeManagerController.listStoreManagers);
router.post('/store-managers', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), (0, validate_1.validateBody)(store_manager_validation_1.createStoreManagerSchema), storeManagerController.createStoreManager);
router.get('/products', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), productController.listProducts);
router.post('/products/bulk-upload', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), (0, validate_1.validateBody)(product_validation_1.bulkUploadProductsSchema), productController.bulkUploadProducts);
router.put('/products/:id', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), (0, validate_1.validateBody)(product_validation_1.updateProductSchema), productController.updateProduct);
router.delete('/products/:id', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), productController.deleteProduct);
router.get('/orders', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), orderController.listOrders);
router.get('/orders/:id', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), orderController.getOrder);
router.patch('/orders/:id/status', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), (0, validate_1.validateBody)(order_validation_1.updateOrderStatusSchema), orderController.updateOrderStatus);
router.patch('/orders/:id/delivery-staff', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), (0, validate_1.validateBody)(order_validation_1.assignDeliveryStaffSchema), orderController.assignDeliveryStaff);
router.get('/delivery-staff', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), orderController.listDeliveryStaff);
router.get('/reports', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), reportController.getStoreReports);
router.get('/emergency-needs', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin', 'store_manager'), stockRequestController.listEmergencyNeeds);
router.patch('/emergency-needs/:id/status', auth_1.authenticate, (0, auth_1.authorize)('super_admin', 'admin'), (0, validate_1.validateBody)(stock_request_validation_1.updateEmergencyNeedStatusSchema), stockRequestController.updateEmergencyNeedStatus);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map