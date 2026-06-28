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
exports.listOrders = listOrders;
exports.getOrder = getOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.assignDeliveryStaff = assignDeliveryStaff;
exports.listDeliveryStaff = listDeliveryStaff;
const apiResponse_1 = require("../../utils/apiResponse");
const orderService = __importStar(require("./order.service"));
async function listOrders(req, res, next) {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined;
        const data = await orderService.listOrders(req.user, { status, search, storeId });
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function getOrder(req, res, next) {
    try {
        const data = await orderService.getOrder(req.user, String(req.params.id));
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function updateOrderStatus(req, res, next) {
    try {
        const data = await orderService.updateOrderStatus(req.user, String(req.params.id), req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, `Order status updated to ${req.body.status}`);
    }
    catch (error) {
        next(error);
    }
}
async function assignDeliveryStaff(req, res, next) {
    try {
        const data = await orderService.assignDeliveryStaff(req.user, String(req.params.id), req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Delivery staff assigned successfully');
    }
    catch (error) {
        next(error);
    }
}
async function listDeliveryStaff(req, res, next) {
    try {
        const data = await orderService.listDeliveryStaff(req.user);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=order.controller.js.map