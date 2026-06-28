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
exports.register = register;
exports.login = login;
exports.me = me;
exports.refreshToken = refreshToken;
exports.logout = logout;
exports.createUser = createUser;
const apiResponse_1 = require("../../utils/apiResponse");
const authService = __importStar(require("./auth.service"));
async function register(req, res, next) {
    try {
        const data = await authService.registerUser(req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Registration successful. Please verify your email.', 201);
    }
    catch (error) {
        next(error);
    }
}
async function login(req, res, next) {
    try {
        const data = await authService.loginUser(req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'Login successful');
    }
    catch (error) {
        next(error);
    }
}
async function me(req, res, next) {
    try {
        const data = await authService.getCurrentUser(req.user.id);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function refreshToken(req, res, next) {
    try {
        const data = await authService.refreshAccessToken(req.body);
        return (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
}
async function logout(req, res, next) {
    try {
        await authService.logoutUser(req.accessToken);
        return (0, apiResponse_1.sendSuccess)(res, null, 'Logged out successfully');
    }
    catch (error) {
        next(error);
    }
}
async function createUser(req, res, next) {
    try {
        const data = await authService.createInternalUser(req.body);
        return (0, apiResponse_1.sendSuccess)(res, data, 'User created successfully', 201);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=auth.controller.js.map