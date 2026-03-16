const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { getOrCreateAIBotConversation, getSmartReplies, summarizeChat, rephrase, translate } = require("../controllers/ai.controller");

router.use(authMiddleware);

router.post("/bot/conversation", getOrCreateAIBotConversation);
router.get("/smart-replies/:conversationId", getSmartReplies);


router.post("/summarize/:conversationId", summarizeChat);
router.post("/rephrase", rephrase);
router.post("/translate", translate);

module.exports = router;
