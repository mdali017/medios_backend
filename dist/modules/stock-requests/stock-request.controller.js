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
exports.createEmergencyNeed = createEmergencyNeed;
exports.listEmergencyNeeds = listEmergencyNeeds;
exports.createBulkRestockRequests = createBulkRestockRequests;
exports.updateEmergencyNeedStatus = updateEmergencyNeedStatus;
exports.fulfillEmergencyNeed = fulfillEmergencyNeed;
const apiResponse_1 = require("../../utils/apiResponse");
const stockRequestService = __importStar(require("./stock-request.service"));
async function createEmergencyNeed(req, res, next) {
    try {
        const data = await stockRequestService.createEmergencyNeed(req.user, req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Emergency need request submitted', 201);
    }
    catch (error) {
        next(error);
    }
}
async function listEmergencyNeeds(req, res, next) {
    try {
        const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const requestType = req.query.requestType === 'restock' || req.query.requestType === 'emergency'
            ? req.query.requestType
            : 'emergency';
        const data = await stockRequestService.listStockRequests(req.user, {
            storeId,
            status,
            requestType,
        });
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function createBulkRestockRequests(req, res, next) {
    try {
        const data = await stockRequestService.createBulkRestockRequests(req.user, req.body.items);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Restock request submitted', 201);
    }
    catch (error) {
        next(error);
    }
}
async function updateEmergencyNeedStatus(req, res, next) {
    try {
        const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await stockRequestService.updateEmergencyNeedStatus(req.user, requestId, req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Emergency request updated');
    }
    catch (error) {
        next(error);
    }
}
async function fulfillEmergencyNeed(req, res, next) {
    try {
        const requestId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const data = await stockRequestService.fulfillEmergencyNeed(req.user, requestId);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Emergency request marked as handled');
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=stock-request.controller.js.map