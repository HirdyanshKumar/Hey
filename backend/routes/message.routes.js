const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { getMessages } = require("../controllers/message.controller");

router.use(authMiddleware);

router.get("/:conversationId", getMessages);

module.exports = router;
