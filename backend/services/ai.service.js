const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require("../config/prisma");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const AI_BOT_EMAIL = "ai@hey.app";
const AI_BOT_NAME = "Hey AI";

const getAIBotUser = async () => {
    let aiUser = await prisma.user.findUnique({ where: { email: AI_BOT_EMAIL } });
    if (!aiUser) {

        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
        aiUser = await prisma.user.create({
            data: {
                email: AI_BOT_EMAIL,
                password: hashedPassword,
                displayName: AI_BOT_NAME,
                avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=HeyAI",
                isOnline: true,
            },
        });
    }
    return aiUser;
};


const generateAIResponse = async (history, newPrompt) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are 'Hey AI', a friendly, concise, and helpful conversational chat companion. Keep your responses short, natural, and conversational, like you are texting a friend. Avoid long, essay-like explanations, excessive bullet points, or dictionary-style definitions unless explicitly asked. Be warm and human-like. IMPORTANT: You are strictly forbidden from using any markdown formatting like **bold** or *italics* or bullet points or numbered lists. Your entire output must be 100% plain text. Use natural paragraphs and emojis instead."
        });


        const formattedHistory = [];
        for (const msg of history) {
            const role = msg.isUser ? "user" : "model";
            if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
                formattedHistory[formattedHistory.length - 1].parts[0].text += `\n${msg.content}`;
            } else {
                formattedHistory.push({ role, parts: [{ text: msg.content }] });
            }
        }


        if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
            formattedHistory.shift();
        }

        const chatSession = model.startChat({
            history: formattedHistory,
        });

        const result = await chatSession.sendMessage(newPrompt);
        let rawText = result.response.text();


        rawText = rawText.replace(/[*#]/g, "");

        return rawText;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I'm having trouble connecting to my AI brain right now. Please try again later.";
    }
};

const generateSmartReplies = async (recentMessages) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
You are a helpful assistant suggesting context-aware smart replies for a chat application.
Based on the following recent chat messages, suggest 3 short, natural, and distinct quick replies the current user could send next.
Format the output strictly as a JSON array of 3 strings exactly (e.g. ["Reply 1", "Reply 2", "Reply 3"]). Do not include any markdown syntax, code blocks, or explanatory text. Just the raw JSON array.

Recent messages:
${recentMessages.map(m => `${m.senderName}: ${m.content}`).join("\n")}
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();


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




const summarizeConversation = async (messages) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const conversation = messages
            .map(m => `${m.senderName}: ${m.content}`)
            .join("\n");

        const prompt = `
You are a helpful assistant that summarizes chat conversations.
Summarize the following conversation concisely in 3-5 sentences. Capture the key topics discussed, any decisions made, and important details.
Do NOT use any markdown formatting (no bold, italics, bullet points, or headers). Write in plain text only.

Conversation:
${conversation}
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/[*#]/g, "");
        return text;
    } catch (error) {
        console.error("Summarize Error:", error);
        return "Sorry, I couldn't generate a summary right now. Please try again later.";
    }
};


const rephraseText = async (text, mode = "rephrase") => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const modeInstructions = {
            rephrase: "Rephrase the following text in a different way while keeping the same meaning. Keep the same language as the original.",
            grammar: "Fix any grammar, spelling, and punctuation errors in the following text. Keep the same tone and meaning. Keep the same language as the original.",
            formal: "Rewrite the following text in a formal, professional tone. Keep the same meaning. Keep the same language as the original.",
            casual: "Rewrite the following text in a casual, friendly tone. Keep the same meaning. Keep the same language as the original.",
            professional: "Rewrite the following text in a polished, professional business tone. Keep the same meaning. Keep the same language as the original.",
        };

        const instruction = modeInstructions[mode] || modeInstructions.rephrase;

        const prompt = `
${instruction}
Do NOT use any markdown formatting. Return only the rephrased text as plain text, nothing else.

Text: "${text}"
`;

        const result = await model.generateContent(prompt);
        let output = result.response.text().trim();
        output = output.replace(/[*#]/g, "");

        if ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'"))) {
            output = output.slice(1, -1);
        }
        return output;
    } catch (error) {
        console.error("Rephrase Error:", error);
        return null;
    }
};


const translateMessage = async (text, targetLanguage) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
Translate the following text to ${targetLanguage}.
Return ONLY the translated text, nothing else. No explanations, no markdown, no formatting.

Text: "${text}"
`;

        const result = await model.generateContent(prompt);
        let output = result.response.text().trim();
        output = output.replace(/[*#]/g, "");
        if ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'"))) {
            output = output.slice(1, -1);
        }
        return output;
    } catch (error) {
        console.error("Translate Error:", error);
        return null;
    }
};

module.exports = { getAIBotUser, generateAIResponse, generateSmartReplies, summarizeConversation, rephraseText, translateMessage };
