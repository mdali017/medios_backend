"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
const AppError_1 = require("../utils/AppError");
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.errors.map((err) => err.message).join(', ');
            return next(new AppError_1.AppError(message, 400));
        }
        req.body = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map