"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const AppError_1 = require("../utils/AppError");
const apiResponse_1 = require("../utils/apiResponse");
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError_1.AppError) {
        return (0, apiResponse_1.sendError)(res, err.message, err.statusCode);
    }
    console.error(err);
    return (0, apiResponse_1.sendError)(res, 'Internal server error', 500);
}
function notFoundHandler(_req, res) {
    return (0, apiResponse_1.sendError)(res, 'Route not found', 404);
}
//# sourceMappingURL=errorHandler.js.map