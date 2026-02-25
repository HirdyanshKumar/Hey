const { getGeminiModel } = require("../config/gemini");
const prisma = require("../config/prisma");

const AI_BOT_EMAIL = "ai@hey.app";
const AI_BOT_NAME = "Hey AI";

const getAIBotUser = async () => {
    let aiUser = await prisma.user.findUnique({ where: { email: AI_BOT_EMAIL } });
    if (!aiUser) {
        // Hash password just in case, though it won't login directly
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
        aiUser = await prisma.user.create({
            data: {
                email: AI_BOT_EMAIL,
                password: hashedPassword,
                displayName: AI_BOT_NAME,
                avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=HeyAI", // simple bot avatar
                isOnline: true,
            },
        });
    }
    return aiUser;
};

// Generate an AI response based on conversation history
const generateAIResponse = async (history, newPrompt) => {
    try {
        const model = getGeminiModel("gemini-2.0-flash"); // using 2.0-flash as it's defined in config

        // Format history for Gemini
        // Gemini expects array of { role: "user" | "model", parts: [{text: ""}] }
        const formattedHistory = history.map(msg => ({
            role: msg.isUser ? "user" : "model",
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(newPrompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I'm having trouble connecting to my AI brain right now. Please try again later.";
    }
};

const generateSmartReplies = async (recentMessages) => {
    try {
        const model = getGeminiModel("gemini-2.0-flash");

        const prompt = `
You are a helpful assistant suggesting context-aware smart replies for a chat application.
Based on the following recent chat messages, suggest 3 short, natural, and distinct quick replies the current user could send next.
Format the output strictly as a JSON array of 3 strings exactly (e.g. ["Reply 1", "Reply 2", "Reply 3"]). Do not include any markdown syntax, code blocks, or explanatory text. Just the raw JSON array.

Recent messages:
${recentMessages.map(m => `${m.senderName}: ${m.content}`).join("\n")}
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        // Remove markdown formatting if present
        if (text.startsWith("\`\`\`json")) {
            text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
        } else if (text.startsWith("\`\`\`")) {
            text = text.replace(/\`\`\`/g, "").trim();
        }

        const replies = JSON.parse(text);
        return Array.isArray(replies) ? replies.slice(0, 3) : [];
    } catch (error) {
        console.error("Smart Replies Error:", error);
        return [];
    }
};

module.exports = { getAIBotUser, generateAIResponse, generateSmartReplies };
