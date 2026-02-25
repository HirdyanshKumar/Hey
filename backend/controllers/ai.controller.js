const prisma = require("../config/prisma");
const { getAIBotUser, generateSmartReplies } = require("../services/ai.service");

// GET /api/ai/bot/conversation
const getOrCreateAIBotConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const aiBot = await getAIBotUser();

        // Check if conversation already exists
        const existingConvs = await prisma.conversation.findMany({
            where: {
                isGroup: false,
                participants: {
                    some: { userId: userId }
                }
            },
            include: {
                participants: { select: { userId: true } }
            }
        });

        let aiConvId = null;
        for (const conv of existingConvs) {
            if (conv.participants.some(p => p.userId === aiBot.id)) {
                aiConvId = conv.id;
                break;
            }
        }

        if (aiConvId) {
            const conversation = await prisma.conversation.findUnique({
                where: { id: aiConvId },
                include: {
                    participants: {
                        include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } }
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1
                    }
                }
            });
            return res.status(200).json({ conversation });
        }

        // Create new conversation
        const newConversation = await prisma.conversation.create({
            data: {
                isGroup: false,
                participants: {
                    create: [
                        { userId: userId },
                        { userId: aiBot.id }
                    ]
                }
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } }
                }
            }
        });

        return res.status(200).json({ conversation: newConversation });
    } catch (error) {
        console.error("getOrCreateAIBotConversation error:", error);
        return res.status(500).json({ error: "Failed to create AI bot conversation." });
    }
};

// GET /api/ai/smart-replies/:conversationId
const getSmartReplies = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // Ensure user is participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId, userId }
        });
        if (!participant) {
            return res.status(403).json({ error: "Not a participant." });
        }

        // Fetch last 5 messages
        const recentMessages = await prisma.message.findMany({
            where: { conversationId, isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                sender: { select: { displayName: true } }
            }
        });

        if (recentMessages.length === 0) {
            return res.status(200).json({ replies: ["Hello!", "Hi there!", "How are you?"] });
        }

        // Don't generate if last message is from me
        if (recentMessages[0].senderId === userId) {
            return res.status(200).json({ replies: [] });
        }

        recentMessages.reverse(); // Chronological

        const formattedForAI = recentMessages.map(m => ({
            senderName: m.sender.displayName,
            content: m.content || "[Media]"
        }));

        const replies = await generateSmartReplies(formattedForAI);
        return res.status(200).json({ replies });

    } catch (error) {
        console.error("getSmartReplies error:", error);
        return res.status(500).json({ error: "Failed to generate smart replies." });
    }
};

module.exports = { getOrCreateAIBotConversation, getSmartReplies };
