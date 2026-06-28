"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.bulkUploadProductsSchema = exports.bulkProductItemSchema = void 0;
const zod_1 = require("zod");
const unitTypeSchema = zod_1.z.enum([
    'tablet',
    'capsule',
    'syrup',
    'injection',
    'cream',
    'drops',
    'other',
]);
exports.bulkProductItemSchema = zod_1.z.object({
    productName: zod_1.z.string().min(1, 'Product name is required'),
    genericName: zod_1.z.string().min(1, 'Generic name is required'),
    brandName: zod_1.z.string().min(1, 'Brand name is required'),
    category: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    unitType: unitTypeSchema.default('tablet'),
    description: zod_1.z.string().optional(),
    priceSingle: zod_1.z.coerce.number().positive('Price single must be greater than 0'),
    pricePata: zod_1.z.coerce.number().positive().optional().nullable(),
    priceBox: zod_1.z.coerce.number().positive().optional().nullable(),
    costPriceSingle: zod_1.z.coerce.number().positive().optional().nullable(),
    taxPercent: zod_1.z.coerce.number().min(0).max(100).optional().default(0),
    tabletsPerStrip: zod_1.z.coerce.number().int().min(1).optional().default(10),
    stripsPerBox: zod_1.z.coerce.number().int().min(1).optional().default(10),
    stockQuantity: zod_1.z.coerce.number().int().min(0, 'Stock quantity cannot be negative'),
    batchNumber: zod_1.z.string().min(1, 'Batch number is required'),
    expiryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD'),
    entryDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Entry date must be YYYY-MM-DD')
        .optional(),
    imageUrl: zod_1.z
        .string()
        .url('Invalid image URL')
        .optional()
        .or(zod_1.z.literal(''))
        .transform((v) => v || undefined),
});
exports.bulkUploadProductsSchema = zod_1.z.object({
    storeId: zod_1.z.string().uuid().optional(),
    products: zod_1.z.array(exports.bulkProductItemSchema).min(1, 'At least one product is required').max(2000),
});
exports.updateProductSchema = exports.bulkProductItemSchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required to update' });
//# sourceMappingURL=product.validation.js.map