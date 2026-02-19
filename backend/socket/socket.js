const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// Map<userId, Set<socketId>> — supports multiple tabs/windows
const onlineUsers = new Map();

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const initializeSocket = (io) => {
    // ── JWT Auth Middleware for Socket.IO ──────────────────
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(" ")[1];

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (error) {
            next(new Error("Invalid or expired token"));
        }
    });

    // ── Connection Handler ────────────────────────────────
    io.on("connection", async (socket) => {
        const userId = socket.userId;
        console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

        // Track this socket
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // If this is the first socket for the user → mark online
        if (onlineUsers.get(userId).size === 1) {
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { isOnline: true },
                });
            } catch (err) {
                console.error("Failed to update online status:", err.message);
            }

            // Broadcast to all other users
            socket.broadcast.emit("user:online", { userId });
        }

        // Send the list of currently online users to the newly connected client
        socket.emit("users:online", getOnlineUserIds());

        // ── Disconnect ────────────────────────────────────
        socket.on("disconnect", async () => {
            console.log(`❌ User disconnected: ${userId} (socket: ${socket.id})`);

            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);

                // If no more sockets → user is fully offline
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);

                    try {
                        await prisma.user.update({
                            where: { id: userId },
                            data: { isOnline: false, lastSeen: new Date() },
                        });
                    } catch (err) {
                        console.error("Failed to update offline status:", err.message);
                    }

                    io.emit("user:offline", { userId });
                }
            }
        });
    });
};

module.exports = { initializeSocket, getOnlineUserIds };
