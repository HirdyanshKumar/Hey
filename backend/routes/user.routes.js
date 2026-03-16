const express = require("express");
const multer = require("multer");
const { getProfile, updateProfile, updateAvatar, searchUsers, blockUser, unblockUser, getBlockedUsers, updateReadReceiptsSetting, updatePreferredLanguage } = require("../controllers/user.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

// Multer — store in memory buffer for Cloudinary upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."), false);
        }
    },
});

// All routes require authentication
router.use(authMiddleware);

// Search users
router.get("/search", searchUsers);

// Block management
router.get("/blocked", getBlockedUsers);
router.post("/block/:userId", blockUser);
router.delete("/block/:userId", unblockUser);

// Profile routes
router.get("/profile/:userId", getProfile);
router.put("/profile", updateProfile);
router.put("/avatar", upload.single("avatar"), updateAvatar);

// Read receipt settings
router.put("/settings/read-receipts", updateReadReceiptsSetting);


router.put("/settings/preferred-language", updatePreferredLanguage);

module.exports = router;
