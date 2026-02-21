const prisma = require("../config/prisma");

const EDIT_WINDOW_MS = 15 * 60 * 1000;     // 15 minutes
const DELETE_WINDOW_MS = 60 * 60 * 1000;   // 1 hour

// ── Shared include for replyTo ────────────────────────
const replyToInclude = {
    replyTo: {
        select: {
            id: true,
            content: true,
            isDeleted: true,
            sender: { select: { id: true, displayName: true } },
        },
    },
};

// GET /api/messages/:conversationId?cursor=<messageId>&limit=50
const getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const cursor = req.query.cursor;

        // Verify user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId, userId },
        });

        if (!participant) {
            return res.status(403).json({ error: "Not a participant of this conversation." });
        }

        const queryOptions = {
            where: {
                conversationId,
                NOT: { deletedByUserIds: { has: userId } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
                ...replyToInclude,
            },
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1;
        }

        const messages = await prisma.message.findMany(queryOptions);

        // Reverse so they come in chronological order
        messages.reverse();

        const hasMore = messages.length === limit;

        return res.status(200).json({
            messages,
            hasMore,
            nextCursor: messages.length > 0 ? messages[0].id : null,
        });
    } catch (error) {
        console.error("getMessages error:", error);
        return res.status(500).json({ error: "Failed to fetch messages." });
    }
};

// PUT /api/messages/:id — Edit a message
const editMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ error: "Message content is required." });
        }

        const message = await prisma.message.findUnique({ where: { id } });

        if (!message) {
            return res.status(404).json({ error: "Message not found." });
        }

        if (message.senderId !== userId) {
            return res.status(403).json({ error: "You can only edit your own messages." });
        }

        if (message.isDeleted) {
            return res.status(400).json({ error: "Cannot edit a deleted message." });
        }

        // Check edit time window
        const elapsed = Date.now() - new Date(message.createdAt).getTime();
        if (elapsed > EDIT_WINDOW_MS) {
            return res.status(400).json({ error: "Edit window has expired (15 minutes)." });
        }

        const updated = await prisma.message.update({
            where: { id },
            data: {
                content: content.trim(),
                isEdited: true,
                editedAt: new Date(),
            },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
                ...replyToInclude,
            },
        });

        // Broadcast edit via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${message.conversationId}`).emit("message:edited", {
                conversationId: message.conversationId,
                message: updated,
            });
        }

        return res.status(200).json({ message: updated });
    } catch (error) {
        console.error("editMessage error:", error);
        return res.status(500).json({ error: "Failed to edit message." });
    }
};

// DELETE /api/messages/:id/self — Delete message for self only
const deleteForSelf = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const message = await prisma.message.findUnique({ where: { id } });

        if (!message) {
            return res.status(404).json({ error: "Message not found." });
        }

        // Verify user is a participant of the conversation
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: message.conversationId, userId },
        });

        if (!participant) {
            return res.status(403).json({ error: "Not a participant of this conversation." });
        }

        // Add userId to deletedByUserIds if not already present
        const updatedIds = message.deletedByUserIds.includes(userId)
            ? message.deletedByUserIds
            : [...message.deletedByUserIds, userId];

        await prisma.message.update({
            where: { id },
            data: { deletedByUserIds: updatedIds },
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("deleteForSelf error:", error);
        return res.status(500).json({ error: "Failed to delete message." });
    }
};

// DELETE /api/messages/:id/everyone — Delete message for everyone
const deleteForEveryone = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const message = await prisma.message.findUnique({ where: { id } });

        if (!message) {
            return res.status(404).json({ error: "Message not found." });
        }

        if (message.senderId !== userId) {
            return res.status(403).json({ error: "You can only delete your own messages for everyone." });
        }

        // Check delete time window
        const elapsed = Date.now() - new Date(message.createdAt).getTime();
        if (elapsed > DELETE_WINDOW_MS) {
            return res.status(400).json({ error: "Delete window has expired (1 hour)." });
        }

        const updated = await prisma.message.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedForAll: true,
                content: "",
            },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        // Broadcast deletion via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${message.conversationId}`).emit("message:deleted", {
                conversationId: message.conversationId,
                messageId: id,
                deletedForAll: true,
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("deleteForEveryone error:", error);
        return res.status(500).json({ error: "Failed to delete message." });
    }
};

module.exports = { getMessages, editMessage, deleteForSelf, deleteForEveryone };
