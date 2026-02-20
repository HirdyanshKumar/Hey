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

        // ── Auto-join conversation rooms ──────────────────
        try {
            const participations = await prisma.conversationParticipant.findMany({
                where: { userId },
                select: { conversationId: true },
            });

            for (const p of participations) {
                socket.join(`conv:${p.conversationId}`);
            }
            console.log(`📦 User ${userId} joined ${participations.length} conversation rooms`);
        } catch (err) {
            console.error("Failed to auto-join conversation rooms:", err.message);
        }

        // ── Join a specific conversation room ─────────────
        socket.on("join:conversation", async ({ conversationId }) => {
            try {
                // Verify user is a participant
                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId },
                });

                if (!participant) {
                    return socket.emit("error", { message: "Not a participant of this conversation." });
                }

                socket.join(`conv:${conversationId}`);
                console.log(`📥 User ${userId} joined room conv:${conversationId}`);
            } catch (err) {
                console.error("join:conversation error:", err.message);
            }
        });

        // ── Leave a conversation room ─────────────────────
        socket.on("leave:conversation", ({ conversationId }) => {
            socket.leave(`conv:${conversationId}`);
            console.log(`📤 User ${userId} left room conv:${conversationId}`);
        });

        // ── Send a message ────────────────────────────────
        socket.on("send:message", async ({ conversationId, content }) => {
            try {
                if (!content?.trim()) return;

                // Verify user is a participant
                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId },
                });

                if (!participant) {
                    return socket.emit("error", { message: "Not a participant of this conversation." });
                }

                // Persist message to DB
                const message = await prisma.message.create({
                    data: {
                        conversationId,
                        senderId: userId,
                        content: content.trim(),
                    },
                    include: {
                        sender: { select: { id: true, displayName: true, avatarUrl: true } },
                    },
                });

                // Update conversation's updatedAt timestamp
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                });

                // Broadcast message to all users in the conversation room
                io.to(`conv:${conversationId}`).emit("new:message", {
                    conversationId,
                    message,
                });

                console.log(`💬 Message from ${userId} in conv:${conversationId}`);
            } catch (err) {
                console.error("send:message error:", err.message);
                socket.emit("error", { message: "Failed to send message." });
            }
        });

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
