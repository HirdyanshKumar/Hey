const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { getOrCreateAIBotConversation, getSmartReplies } = require("../controllers/ai.controller");

router.use(authMiddleware);

router.post("/bot/conversation", getOrCreateAIBotConversation);
router.get("/smart-replies/:conversationId", getSmartReplies);

module.exports = router;
