"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoreRoom = getStoreRoom;
exports.initSocket = initSocket;
exports.getIo = getIo;
exports.emitStockUpdated = emitStockUpdated;
const socket_io_1 = require("socket.io");
const supabase_1 = require("./supabase");
const env_1 = require("./env");
const auth_1 = require("../middleware/auth");
let io = null;
function getStoreRoom(storeId) {
    return `store:${storeId}`;
}
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_1.env.frontendUrl,
            credentials: true,
        },
    });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const { data, error } = await supabase_1.supabaseAnon.auth.getUser(token);
            if (error || !data.user) {
                return next(new Error('Invalid or expired token'));
            }
            const profile = await (0, auth_1.getProfileById)(data.user.id);
            if (!profile) {
                return next(new Error('User profile not found'));
            }
            const user = await (0, auth_1.profileToAuthUser)(profile);
            socket.data.user = user;
            next();
        }
        catch {
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        const { user } = socket.data;
        if (user.storeId &&
            (user.role === 'store_manager' || user.role === 'admin')) {
            socket.join(getStoreRoom(user.storeId));
        }
        socket.on('disconnect', () => {
            if (user.storeId) {
                socket.leave(getStoreRoom(user.storeId));
            }
        });
    });
    return io;
}
function getIo() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}
function emitStockUpdated(storeId, payload) {
    getIo().to(getStoreRoom(storeId)).emit('stock:updated', {
        storeId,
        ...payload,
    });
}
//# sourceMappingURL=socket.js.map