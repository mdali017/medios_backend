"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkRestockSchema = exports.updateEmergencyNeedStatusSchema = exports.createEmergencyNeedSchema = void 0;
const zod_1 = require("zod");
exports.createEmergencyNeedSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('Invalid product ID'),
    requestedQty: zod_1.z.number().int().positive('Quantity must be at least 1'),
    notes: zod_1.z.string().max(500).optional(),
});
exports.updateEmergencyNeedStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['approved', 'rejected', 'fulfilled']),
    adminNote: zod_1.z.string().max(500).optional(),
});
exports.createBulkRestockSchema = zod_1.z.object({
    items: zod_1.z.array(exports.createEmergencyNeedSchema).min(1, 'At least one item is required').max(50),
});
//# sourceMappingURL=stock-request.validation.js.map