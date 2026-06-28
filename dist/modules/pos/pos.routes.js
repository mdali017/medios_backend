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
const productController = __importStar(require("../products/product.controller"));
const posController = __importStar(require("./pos.controller"));
const pos_validation_1 = require("./pos.validation");
const stockRequestController = __importStar(require("../stock-requests/stock-request.controller"));
const stock_request_validation_1 = require("../stock-requests/stock-request.validation");
const router = (0, express_1.Router)();
router.get('/products', auth_1.authenticate, (0, auth_1.authorize)('store_manager', 'admin'), productController.listPosProducts);
router.post('/checkout', auth_1.authenticate, (0, auth_1.authorize)('store_manager', 'admin'), (0, validate_1.validateBody)(pos_validation_1.posCheckoutSchema), posController.checkout);
router.post('/emergency-needs', auth_1.authenticate, (0, auth_1.authorize)('store_manager', 'admin'), (0, validate_1.validateBody)(stock_request_validation_1.createEmergencyNeedSchema), stockRequestController.createEmergencyNeed);
router.patch('/emergency-needs/:id/fulfill', auth_1.authenticate, (0, auth_1.authorize)('store_manager', 'admin'), stockRequestController.fulfillEmergencyNeed);
router.post('/restock-requests', auth_1.authenticate, (0, auth_1.authorize)('store_manager', 'admin'), (0, validate_1.validateBody)(stock_request_validation_1.createBulkRestockSchema), stockRequestController.createBulkRestockRequests);
exports.default = router;
//# sourceMappingURL=pos.routes.js.map