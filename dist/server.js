"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const socket_1 = require("./config/socket");
const httpServer = (0, http_1.createServer)(app_1.default);
(0, socket_1.initSocket)(httpServer);
httpServer.listen(env_1.env.port, () => {
    console.log(`MediOS API running on http://localhost:${env_1.env.port}`);
});
//# sourceMappingURL=server.js.map