"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeOnlineOrderSchema = exports.assignDeliveryStaffSchema = exports.updateOrderStatusSchema = void 0;
const zod_1 = require("zod");
const orderStatusSchema = zod_1.z.enum([
    'pending',
    'approved',
    'in_delivery',
    'completed',
    'cancelled',
]);
exports.updateOrderStatusSchema = zod_1.z.object({
    status: orderStatusSchema,
});
exports.assignDeliveryStaffSchema = zod_1.z.object({
    deliveryStaffId: zod_1.z.string().uuid('Invalid delivery staff ID'),
});
exports.placeOnlineOrderSchema = zod_1.z.object({
    storeId: zod_1.z.string().uuid('Store ID is required'),
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().min(1),
        saleUnit: zod_1.z.enum(['tablet', 'strip', 'box']).default('tablet'),
    }))
        .min(1, 'At least one item is required'),
    deliveryAddress: zod_1.z.string().min(5, 'Delivery address is required'),
    notes: zod_1.z.string().optional(),
});
//# sourceMappingURL=order.validation.js.map