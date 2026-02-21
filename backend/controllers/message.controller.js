const prisma = require("../config/prisma");

// GET /api/messages/:conversationId?cursor=<messageId>&limit=50
const getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const cursor = req.query.cursor; // message ID to paginate from

        // Verify user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId, userId },
        });

        if (!participant) {
            return res.status(403).json({ error: "Not a participant of this conversation." });
        }

        const queryOptions = {
            where: { conversationId },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor };
            queryOptions.skip = 1; // skip the cursor itself
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

module.exports = { getMessages };
