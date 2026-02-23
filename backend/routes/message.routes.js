const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const { getMessages, editMessage, deleteForSelf, deleteForEveryone, searchMessages, uploadMedia } = require("../controllers/message.controller");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.use(authMiddleware);

router.post("/upload", upload.single("media"), uploadMedia);
router.get("/search/all", searchMessages);
router.get("/:conversationId", getMessages);
router.put("/:id", editMessage);
router.delete("/:id/self", deleteForSelf);
router.delete("/:id/everyone", deleteForEveryone);

module.exports = router;
