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
exports.listStoreManagers = listStoreManagers;
exports.createStoreManager = createStoreManager;
const supabase_1 = require("../../config/supabase");
const AppError_1 = require("../../utils/AppError");
const authService = __importStar(require("../auth/auth.service"));
async function getStoreName(storeId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .maybeSingle();
    return data?.name ?? null;
}
async function listStoreManagers(requester, storeIdFilter) {
    let query = supabase_1.supabaseAdmin
        .from('profiles')
        .select('id, name, email, phone, store_id, is_verified, created_at')
        .eq('role', 'store_manager')
        .order('created_at', { ascending: false });
    if (requester.role === 'admin') {
        if (!requester.storeId) {
            throw new AppError_1.AppError('Store not assigned to this admin', 400);
        }
        query = query.eq('store_id', requester.storeId);
    }
    else if (storeIdFilter) {
        query = query.eq('store_id', storeIdFilter);
    }
    const { data, error } = await query;
    if (error) {
        throw new AppError_1.AppError(error.message, 400);
    }
    const managers = data || [];
    const storeNames = new Map();
    const results = [];
    for (const manager of managers) {
        let storeName = null;
        if (manager.store_id) {
            if (!storeNames.has(manager.store_id)) {
                storeNames.set(manager.store_id, (await getStoreName(manager.store_id)) || '');
            }
            storeName = storeNames.get(manager.store_id) || null;
        }
        results.push({
            id: manager.id,
            name: manager.name,
            email: manager.email,
            phone: manager.phone,
            storeId: manager.store_id,
            storeName,
            isVerified: manager.is_verified,
            createdAt: manager.created_at,
        });
    }
    return results;
}
async function createStoreManager(requester, input) {
    const storeId = requester.role === 'admin' ? requester.storeId : input.storeId ?? null;
    if (!storeId) {
        throw new AppError_1.AppError('Store ID is required', 400);
    }
    if (requester.role === 'admin' && requester.storeId !== storeId) {
        throw new AppError_1.AppError('You can only add managers to your own store', 403);
    }
    const { data: existingEmail } = await supabase_1.supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .maybeSingle();
    if (existingEmail) {
        throw new AppError_1.AppError('Email is already registered', 400);
    }
    const user = await authService.createInternalUser({
        name: input.name,
        email: input.email,
        password: input.password,
        phone: input.phone,
        role: 'store_manager',
        storeId,
    });
    const storeName = await getStoreName(storeId);
    return {
        ...user,
        storeId,
        storeName,
    };
}
//# sourceMappingURL=store-manager.service.js.map