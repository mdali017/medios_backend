"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.posCheckoutSchema = exports.posCheckoutItemSchema = void 0;
const zod_1 = require("zod");
const saleUnitSchema = zod_1.z.enum(['tablet', 'strip', 'box']);
exports.posCheckoutItemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('Invalid product ID'),
    saleUnit: saleUnitSchema,
    quantity: zod_1.z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    unitPrice: zod_1.z.coerce.number().min(0, 'Unit price cannot be negative'),
    unitTax: zod_1.z.coerce.number().min(0, 'Unit tax cannot be negative').default(0),
    tabletsPerUnit: zod_1.z.coerce.number().int().min(1, 'Tablets per unit must be at least 1'),
});
exports.posCheckoutSchema = zod_1.z.object({
    items: zod_1.z.array(exports.posCheckoutItemSchema).min(1, 'Cart must contain at least one item'),
    notes: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=pos.validation.js.map