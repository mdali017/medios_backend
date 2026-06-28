"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchMedicinesSchema = void 0;
const zod_1 = require("zod");
exports.matchMedicinesSchema = zod_1.z.object({
    storeId: zod_1.z.string().uuid().optional(),
    medicines: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1, 'Medicine name is required'),
        strength: zod_1.z.string().optional(),
    }))
        .min(1, 'At least one medicine is required'),
});
//# sourceMappingURL=customer.validation.js.map