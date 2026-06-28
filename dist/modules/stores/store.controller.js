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
exports.listStores = listStores;
exports.getStore = getStore;
exports.createStore = createStore;
exports.updateStore = updateStore;
exports.deleteStore = deleteStore;
exports.createStoreAdmin = createStoreAdmin;
const apiResponse_1 = require("../../utils/apiResponse");
const storeService = __importStar(require("./store.service"));
function formatStore(store) {
    return {
        id: store.id,
        name: store.name,
        address: store.address,
        city: store.city,
        phone: store.phone,
        licenseNumber: store.license_number,
        logoUrl: store.logo_url,
        status: store.status,
        subscriptionId: store.subscription_id,
        createdAt: store.created_at,
        updatedAt: store.updated_at,
        storeAdmin: store.storeAdmin,
    };
}
async function listStores(req, res, next) {
    try {
        const status = req.query.status;
        const stores = await storeService.listStores(status);
        return (0, apiResponse_1.sendSuccess)(res, stores.map(formatStore));
    }
    catch (error) {
        next(error);
    }
}
async function getStore(req, res, next) {
    try {
        const store = await storeService.getStoreById(String(req.params.id));
        return (0, apiResponse_1.sendSuccess)(res, formatStore(store));
    }
    catch (error) {
        next(error);
    }
}
async function createStore(req, res, next) {
    try {
        const store = await storeService.createStore(req.body);
        return (0, apiResponse_1.sendSuccess)(res, formatStore(store), 'Store created successfully', 201);
    }
    catch (error) {
        next(error);
    }
}
async function updateStore(req, res, next) {
    try {
        const store = await storeService.updateStore(String(req.params.id), req.body);
        return (0, apiResponse_1.sendSuccess)(res, formatStore(store), 'Store updated successfully');
    }
    catch (error) {
        next(error);
    }
}
async function deleteStore(req, res, next) {
    try {
        await storeService.deleteStore(String(req.params.id));
        return (0, apiResponse_1.sendSuccess)(res, null, 'Store deleted successfully');
    }
    catch (error) {
        next(error);
    }
}
async function createStoreAdmin(req, res, next) {
    try {
        const admin = await storeService.assignStoreAdmin(req.body);
        return (0, apiResponse_1.sendSuccess)(res, admin, 'Store admin assigned successfully', 201);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=store.controller.js.map