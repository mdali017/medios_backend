"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.listPosProducts = listPosProducts;
exports.bulkUploadProducts = bulkUploadProducts;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const apiResponse_1 = require("../../utils/apiResponse");
const productService = __importStar(require("./product.service"));
async function listProducts(req, res, next) {
    try {
        const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined;
        const data = await productService.listProducts(req.user, storeId);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function listPosProducts(req, res, next) {
    try {
        const data = await productService.listPosProducts(req.user);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function bulkUploadProducts(req, res, next) {
    try {
        const data = await productService.bulkUploadProducts(req.user, req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, `${data.inserted} product(s) uploaded successfully`, 201);
    }
    catch (error) {
        next(error);
    }
}
async function updateProduct(req, res, next) {
    try {
        const data = await productService.updateProduct(req.user, String(req.params.id), req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Product updated successfully');
    }
    catch (error) {
        next(error);
    }
}
async function deleteProduct(req, res, next) {
    try {
        await productService.deleteProduct(req.user, String(req.params.id));
        return (0, apiResponse_1.sendSuccess)(res, null, 'Product deleted successfully');
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=product.controller.js.map