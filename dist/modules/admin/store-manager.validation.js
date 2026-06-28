"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreManagerSchema = void 0;
const zod_1 = require("zod");
exports.createStoreManagerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    phone: zod_1.z.string().optional(),
    storeId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=store-manager.validation.js.map