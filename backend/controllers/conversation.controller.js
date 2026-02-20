const prisma = require("../config/prisma");

// POST /api/conversations — Create a 1-on-1 conversation
const createConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        const userId = req.user.id;

        if (!participantId) {
            return res.status(400).json({ error: "participantId is required." });
        }

        if (participantId === userId) {
            return res.status(400).json({ error: "Cannot create a conversation with yourself." });
        }

        // Check if participant exists
        const participant = await prisma.user.findUnique({ where: { id: participantId } });
        if (!participant) {
            return res.status(404).json({ error: "User not found." });
        }

        // Check if a 1-on-1 conversation already exists between these two users
        const existing = await prisma.conversation.findFirst({
            where: {
                isGroup: false,
                AND: [
                    { participants: { some: { userId } } },
                    { participants: { some: { userId: participantId } } },
                ],
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });

        if (existing) {
            return res.status(200).json({ conversation: existing });
        }

        // Create a new conversation
        const conversation = await prisma.conversation.create({
            data: {
                isGroup: false,
                participants: {
                    create: [
                        { userId },
                        { userId: participantId },
                    ],
                },
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });

        return res.status(201).json({ conversation });
    } catch (error) {
        console.error("createConversation error:", error);
        return res.status(500).json({ error: "Failed to create conversation." });
    }
};

// GET /api/conversations — List conversations for the authenticated user
const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: { some: { userId } },
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: { sender: { select: { id: true, displayName: true } } },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return res.status(200).json({ conversations });
    } catch (error) {
        console.error("getConversations error:", error);
        return res.status(500).json({ error: "Failed to fetch conversations." });
    }
};

// GET /api/conversations/:id — Get a conversation with messages
const getConversationById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                participants: { some: { userId } },
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
                messages: {
                    orderBy: { createdAt: "asc" },
                    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
                },
            },
        });

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found." });
        }

        return res.status(200).json({ conversation });
    } catch (error) {
        console.error("getConversationById error:", error);
        return res.status(500).json({ error: "Failed to fetch conversation." });
    }
};

module.exports = { createConversation, getConversations, getConversationById };
