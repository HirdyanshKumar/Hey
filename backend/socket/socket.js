const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { getAIBotUser, generateAIResponse } = require("../services/ai.service");

const onlineUsers = new Map();

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const initializeSocket = (io) => {

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


    io.on("connection", async (socket) => {
        const userId = socket.userId;



        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);


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

        socket.emit("users:online", getOnlineUserIds());


        try {
            const participations = await prisma.conversationParticipant.findMany({
                where: { userId },
                select: { conversationId: true },
            });

            for (const p of participations) {
                socket.join(`conv:${p.conversationId}`);
            }

        } catch (err) {
            console.error("Failed to auto-join conversation rooms:", err.message);
        }


        try {
            const participations = await prisma.conversationParticipant.findMany({
                where: { userId },
                select: { conversationId: true },
            });

            const conversationIds = participations.map((p) => p.conversationId);

            if (conversationIds.length > 0) {

                const undeliveredMessages = await prisma.message.findMany({
                    where: {
                        conversationId: { in: conversationIds },
                        senderId: { not: userId },
                        status: "sent",
                    },
                    select: { id: true, conversationId: true, senderId: true },
                });

                if (undeliveredMessages.length > 0) {
                    const messageIds = undeliveredMessages.map((m) => m.id);


                    await prisma.message.updateMany({
                        where: { id: { in: messageIds } },
                        data: { status: "delivered" },
                    });


                    const byConversation = {};
                    for (const msg of undeliveredMessages) {
                        if (!byConversation[msg.conversationId]) {
                            byConversation[msg.conversationId] = [];
                        }
                        byConversation[msg.conversationId].push(msg.id);
                    }

                    for (const [convId, msgIds] of Object.entries(byConversation)) {
                        io.to(`conv:${convId}`).emit("message:statusUpdate", {
                            conversationId: convId,
                            messageIds: msgIds,
                            status: "delivered",
                        });
                    }


                }
            }
        } catch (err) {
            console.error("Failed to auto-deliver messages:", err.message);
        }


        socket.on("join:conversation", async ({ conversationId }) => {
            try {

                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId },
                });

                if (!participant) {
                    return socket.emit("error", { message: "Not a participant of this conversation." });
                }

                socket.join(`conv:${conversationId}`);

            } catch (err) {
                console.error("join:conversation error:", err.message);
            }
        });


        socket.on("leave:conversation", ({ conversationId }) => {
            socket.leave(`conv:${conversationId}`);

        });


        socket.on("group:joinRoom", ({ conversationId }) => {
            socket.join(`conv:${conversationId}`);

        });


        socket.on("group:leaveRoom", ({ conversationId }) => {
            socket.leave(`conv:${conversationId}`);

        });


        socket.on("typing:start", ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit("typing:start", {
                conversationId,
                userId,
            });
        });

        socket.on("typing:stop", ({ conversationId }) => {
            socket.to(`conv:${conversationId}`).emit("typing:stop", {
                conversationId,
                userId,
            });
        });


        socket.on("send:message", async ({ conversationId, content, replyToId, fileUrl, fileType, fileName, fileSize }) => {
            try {
                if (!content?.trim() && !fileUrl) return;


                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId },
                });

                if (!participant) {
                    return socket.emit("error", { message: "Not a participant of this conversation." });
                }


                const otherParticipants = await prisma.conversationParticipant.findMany({
                    where: { conversationId, userId: { not: userId } },
                    select: { userId: true },
                });


                for (const other of otherParticipants) {
                    const blocked = await prisma.blockedUser.findFirst({
                        where: {
                            OR: [
                                { blockerId: other.userId, blockedId: userId },
                                { blockerId: userId, blockedId: other.userId },
                            ],
                        },
                    });

                    if (blocked) {
                        return socket.emit("error", { message: "Cannot send messages. User has been blocked." });
                    }
                }

                // Check if any recipient is currently in the conversation room
                const room = io.sockets.adapter.rooms.get(`conv:${conversationId}`);
                let anyRecipientInRoom = false;
                if (room) {
                    for (const other of otherParticipants) {
                        const otherSockets = onlineUsers.get(other.userId);
                        if (otherSockets) {
                            for (const sid of otherSockets) {
                                if (room.has(sid)) {
                                    anyRecipientInRoom = true;
                                    break;
                                }
                            }
                        }
                        if (anyRecipientInRoom) break;
                    }
                }

                const initialStatus = anyRecipientInRoom ? "delivered" : "sent";

                // Build message data
                const messageData = {
                    conversationId,
                    senderId: userId,
                    content: content?.trim() || null,
                    status: initialStatus,
                };

                if (fileUrl) {
                    messageData.fileUrl = fileUrl;
                    messageData.fileType = fileType;
                    messageData.fileName = fileName;
                    messageData.fileSize = fileSize;
                }

                // Add replyToId if provided
                if (replyToId) {
                    messageData.replyToId = replyToId;
                }

                // Persist message to DB
                const message = await prisma.message.create({
                    data: messageData,
                    include: {
                        sender: { select: { id: true, displayName: true, avatarUrl: true } },
                        replyTo: {
                            select: {
                                id: true,
                                content: true,
                                isDeleted: true,
                                sender: { select: { id: true, displayName: true } },
                            },
                        },
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

                // Auto-stop typing for this user
                socket.to(`conv:${conversationId}`).emit("typing:stop", {
                    conversationId,
                    userId,
                });

                // --- AI BOT INTEGRATION ---
                const aiBot = await getAIBotUser();
                const isAIBotInConv = otherParticipants.some(p => p.userId === aiBot.id);

                if (isAIBotInConv && userId !== aiBot.id) {
                    // Simulate bot typing
                    io.to(`conv:${conversationId}`).emit("typing:start", {
                        conversationId,
                        userId: aiBot.id,
                    });

                    setImmediate(async () => {
                        try {
                            const history = await prisma.message.findMany({
                                where: { conversationId, isDeleted: false },
                                orderBy: { createdAt: "desc" },
                                take: 20
                            });
                            history.reverse();

                            // Remove the just-sent message to act as context
                            const previousMessages = history.slice(0, -1);
                            const formattedHistory = previousMessages.map(m => ({
                                isUser: m.senderId !== aiBot.id,
                                content: m.content || "[Media]"
                            }));

                            const aiReplyContent = await generateAIResponse(formattedHistory, content || "[Media attachment sent]");

                            const aiMessage = await prisma.message.create({
                                data: {
                                    conversationId,
                                    senderId: aiBot.id,
                                    content: aiReplyContent,
                                    status: "delivered",
                                },
                                include: {
                                    sender: { select: { id: true, displayName: true, avatarUrl: true } },
                                },
                            });

                            await prisma.conversation.update({
                                where: { id: conversationId },
                                data: { updatedAt: new Date() },
                            });

                            io.to(`conv:${conversationId}`).emit("new:message", {
                                conversationId,
                                message: aiMessage,
                            });

                            io.to(`conv:${conversationId}`).emit("typing:stop", {
                                conversationId,
                                userId: aiBot.id,
                            });
                        } catch (aiErr) {
                            console.error("AI Reply Error:", aiErr);
                            io.to(`conv:${conversationId}`).emit("typing:stop", {
                                conversationId,
                                userId: aiBot.id,
                            });
                        }
                    });
                }



            } catch (err) {
                console.error("send:message error:", err.message);
                socket.emit("error", { message: "Failed to send message." });
            }
        });


        socket.on("message:edit", async ({ messageId, content }) => {
            try {
                if (!content?.trim()) return;

                const message = await prisma.message.findUnique({ where: { id: messageId } });
                if (!message || message.senderId !== userId || message.isDeleted) return;

                const elapsed = Date.now() - new Date(message.createdAt).getTime();
                if (elapsed > 15 * 60 * 1000) {
                    return socket.emit("error", { message: "Edit window has expired." });
                }

                const updated = await prisma.message.update({
                    where: { id: messageId },
                    data: { content: content.trim(), isEdited: true, editedAt: new Date() },
                    include: {
                        sender: { select: { id: true, displayName: true, avatarUrl: true } },
                        replyTo: {
                            select: {
                                id: true,
                                content: true,
                                isDeleted: true,
                                sender: { select: { id: true, displayName: true } },
                            },
                        },
                    },
                });

                io.to(`conv:${message.conversationId}`).emit("message:edited", {
                    conversationId: message.conversationId,
                    message: updated,
                });


            } catch (err) {
                console.error("message:edit error:", err.message);
            }
        });


        socket.on("message:deleteForEveryone", async ({ messageId }) => {
            try {
                const message = await prisma.message.findUnique({ where: { id: messageId } });
                if (!message || message.senderId !== userId) return;

                const elapsed = Date.now() - new Date(message.createdAt).getTime();
                if (elapsed > 60 * 60 * 1000) {
                    return socket.emit("error", { message: "Delete window has expired." });
                }

                await prisma.message.update({
                    where: { id: messageId },
                    data: { isDeleted: true, deletedForAll: true, content: "" },
                });

                io.to(`conv:${message.conversationId}`).emit("message:deleted", {
                    conversationId: message.conversationId,
                    messageId,
                    deletedForAll: true,
                });


            } catch (err) {
                console.error("message:deleteForEveryone error:", err.message);
            }
        });


        socket.on("message:delivered", async ({ messageIds, conversationId }) => {
            try {
                if (!messageIds?.length || !conversationId) return;

                // Verify participant
                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId },
                });
                if (!participant) return;


                await prisma.message.updateMany({
                    where: {
                        id: { in: messageIds },
                        conversationId,
                        senderId: { not: userId },
                        status: "sent",
                    },
                    data: { status: "delivered" },
                });


                io.to(`conv:${conversationId}`).emit("message:statusUpdate", {
                    conversationId,
                    messageIds,
                    status: "delivered",
                });
            } catch (err) {
                console.error("message:delivered error:", err.message);
            }
        });


        socket.on("message:read", async ({ conversationId }) => {
            try {
                if (!conversationId) return;

                // Verify participant
                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId },
                });
                if (!participant) return;


                const unreadMessages = await prisma.message.findMany({
                    where: {
                        conversationId,
                        senderId: { not: userId },
                        status: { not: "read" },
                    },
                    select: { id: true, senderId: true },
                });

                if (unreadMessages.length === 0) return;

                const messageIds = unreadMessages.map((m) => m.id);
                const now = new Date();


                await prisma.message.updateMany({
                    where: { id: { in: messageIds } },
                    data: { status: "read", readAt: now },
                });


                const currentUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { readReceiptsEnabled: true },
                });


                if (currentUser?.readReceiptsEnabled) {
                    io.to(`conv:${conversationId}`).emit("message:statusUpdate", {
                        conversationId,
                        messageIds,
                        status: "read",
                        readAt: now.toISOString(),
                    });
                }


            } catch (err) {
                console.error("message:read error:", err.message);
            }
        });


        socket.on("disconnect", async () => {


            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);


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

module.exports = { initializeSocket, getOnlineUserIds, onlineUsers };
