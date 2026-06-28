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
exports.matchMedicines = matchMedicines;
exports.placeOrder = placeOrder;
const apiResponse_1 = require("../../utils/apiResponse");
const productService = __importStar(require("../products/product.service"));
const orderService = __importStar(require("../orders/order.service"));
async function matchMedicines(req, res, next) {
    try {
        const { storeId, medicines } = req.body;
        const data = await productService.matchMedicines(medicines, storeId);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function placeOrder(req, res, next) {
    try {
        const data = await orderService.placeOnlineOrder(req.user, req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Order placed successfully. Awaiting approval.', 201);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=customer.controller.js.map