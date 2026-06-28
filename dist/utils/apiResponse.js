"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, message, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        ...(message ? { message } : {}),
        data,
    });
}
function sendError(res, message, statusCode = 500) {
    return res.status(statusCode).json({
        success: false,
        message,
    });
}
//# sourceMappingURL=apiResponse.js.map