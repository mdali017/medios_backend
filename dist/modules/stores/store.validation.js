"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeIdParamSchema = exports.createStoreAdminSchema = exports.updateStoreSchema = exports.createStoreSchema = exports.storeStatusEnum = void 0;
const zod_1 = require("zod");
exports.storeStatusEnum = zod_1.z.enum(['live', 'suspended', 'inactive', 'pending']);
exports.createStoreSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Store name must be at least 2 characters'),
    address: zod_1.z.string().min(5, 'Address is required'),
    city: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    licenseNumber: zod_1.z.string().min(3, 'License number is required'),
    logoUrl: zod_1.z.string().url('Invalid logo URL').optional().or(zod_1.z.literal('')).transform((v) => v || undefined),
    status: exports.storeStatusEnum.optional(),
});
exports.updateStoreSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    address: zod_1.z.string().min(5).optional(),
    city: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    licenseNumber: zod_1.z.string().min(3).optional(),
    logoUrl: zod_1.z.string().url('Invalid logo URL').optional().or(zod_1.z.literal('')).transform((v) => v || undefined),
    status: exports.storeStatusEnum.optional(),
});
exports.createStoreAdminSchema = zod_1.z.object({
    storeId: zod_1.z.string().uuid('Invalid store ID'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    phone: zod_1.z.string().optional(),
});
exports.storeIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid store ID'),
});
//# sourceMappingURL=store.validation.js.map