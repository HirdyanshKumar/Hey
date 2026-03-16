const prisma = require("../config/prisma");
const { getAIBotUser, generateSmartReplies, summarizeConversation, rephraseText, translateMessage } = require("../services/ai.service");

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

const summarizeChat = async (req, res) => {
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

        // Fetch last 50 messages for summarization
        const messages = await prisma.message.findMany({
            where: { conversationId, isDeleted: false, content: { not: null } },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: {
                sender: { select: { displayName: true } }
            }
        });

        if (messages.length === 0) {
            return res.status(200).json({ summary: "No messages to summarize in this conversation." });
        }

        const formattedMessages = messages
            .filter(m => m.content && m.content.trim())
            .map(m => ({
                senderName: m.sender.displayName,
                content: m.content
            }));

        if (formattedMessages.length === 0) {
            return res.status(200).json({ summary: "No text messages to summarize. The conversation only contains media." });
        }

        const summary = await summarizeConversation(formattedMessages);
        return res.status(200).json({ summary, messageCount: messages.length });

    } catch (error) {
        console.error("summarizeChat error:", error);
        return res.status(500).json({ error: "Failed to summarize conversation." });
    }
};

// POST /api/ai/rephrase
const rephrase = async (req, res) => {
    try {
        const { text, mode } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Text is required." });
        }

        const validModes = ["rephrase", "grammar", "formal", "casual", "professional"];
        const selectedMode = validModes.includes(mode) ? mode : "rephrase";

        const result = await rephraseText(text.trim(), selectedMode);

        if (!result) {
            return res.status(500).json({ error: "Failed to process text. Please try again." });
        }

        return res.status(200).json({ result, mode: selectedMode });

    } catch (error) {
        console.error("rephrase error:", error);
        return res.status(500).json({ error: "Failed to rephrase text." });
    }
};

// POST /api/ai/translate
const translate = async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Text is required." });
        }

        if (!targetLanguage || !targetLanguage.trim()) {
            return res.status(400).json({ error: "Target language is required." });
        }

        const result = await translateMessage(text.trim(), targetLanguage.trim());

        if (!result) {
            return res.status(500).json({ error: "Failed to translate. Please try again." });
        }

        return res.status(200).json({ translatedText: result, targetLanguage });

    } catch (error) {
        console.error("translate error:", error);
        return res.status(500).json({ error: "Failed to translate message." });
    }
};

module.exports = { getOrCreateAIBotConversation, getSmartReplies, summarizeChat, rephrase, translate };
