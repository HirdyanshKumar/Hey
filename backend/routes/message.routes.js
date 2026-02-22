const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { getMessages, editMessage, deleteForSelf, deleteForEveryone, searchMessages } = require("../controllers/message.controller");

router.use(authMiddleware);

router.get("/search/all", searchMessages);
router.get("/:conversationId", getMessages);
router.put("/:id", editMessage);
router.delete("/:id/self", deleteForSelf);
router.delete("/:id/everyone", deleteForEveryone);

module.exports = router;
