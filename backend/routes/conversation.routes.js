const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const {
    createConversation,
    getConversations,
    getConversationById,
    deleteConversation,
} = require("../controllers/conversation.controller");

router.use(authMiddleware);

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:id", getConversationById);
router.delete("/:id", deleteConversation);

module.exports = router;
