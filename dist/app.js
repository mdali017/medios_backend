"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const store_routes_1 = __importDefault(require("./modules/stores/store.routes"));
const pos_routes_1 = __importDefault(require("./modules/pos/pos.routes"));
const customer_routes_1 = __importDefault(require("./modules/customer/customer.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.frontendUrl,
    credentials: true,
}));
app.use((0, morgan_1.default)(env_1.env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'MediOS API is running' });
});
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/admin', admin_routes_1.default);
app.use('/api/v1/pos', pos_routes_1.default);
app.use('/api/v1/super-admin', store_routes_1.default);
app.use('/api/v1/customer', customer_routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map