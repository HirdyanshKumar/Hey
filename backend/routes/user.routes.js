const express = require("express");
const multer = require("multer");
const { getProfile, updateProfile, updateAvatar } = require("../controllers/user.controller");
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

// Profile routes
router.get("/profile/:userId", getProfile);
router.put("/profile", updateProfile);
router.put("/avatar", upload.single("avatar"), updateAvatar);

module.exports = router;
