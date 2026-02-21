const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");

// GET /api/users/profile/:userId
const getProfile = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                readReceiptsEnabled: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ user });
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/profile
const updateProfile = async (req, res, next) => {
    try {
        const { displayName, bio } = req.body;

        // Build update data — only include fields that were sent
        const updateData = {};

        if (displayName !== undefined) {
            if (displayName.trim().length < 2) {
                return res.status(400).json({ error: "Display name must be at least 2 characters." });
            }
            updateData.displayName = displayName.trim();
        }

        if (bio !== undefined) {
            if (bio.length > 200) {
                return res.status(400).json({ error: "Bio must be 200 characters or less." });
            }
            updateData.bio = bio.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update." });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                readReceiptsEnabled: true,
                createdAt: true,
            },
        });

        res.json({ message: "Profile updated successfully.", user: updatedUser });
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/avatar
const updateAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided." });
        }

        // Convert buffer to base64 data URI for Cloudinary upload
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "hey_avatars",
            transformation: [
                { width: 300, height: 300, crop: "fill", gravity: "face" },
                { quality: "auto", fetch_format: "auto" },
            ],
        });

        // Update user avatar URL in DB
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: result.secure_url },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                createdAt: true,
            },
        });

        res.json({ message: "Avatar updated successfully.", user: updatedUser });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/search?q=...
const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 1) {
            return res.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: req.user.id } },
                    {
                        OR: [
                            { displayName: { contains: q.trim(), mode: "insensitive" } },
                            { email: { contains: q.trim(), mode: "insensitive" } },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
            },
            take: 20,
        });

        res.json({ users });
    } catch (error) {
        next(error);
    }
};

// POST /api/users/block/:userId — Block a user
const blockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const blockerId = req.user.id;

        if (userId === blockerId) {
            return res.status(400).json({ error: "Cannot block yourself." });
        }

        // Check if target user exists
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found." });
        }

        // Check if already blocked
        const existing = await prisma.blockedUser.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId: userId } },
        });

        if (existing) {
            return res.status(400).json({ error: "User already blocked." });
        }

        await prisma.blockedUser.create({
            data: { blockerId, blockedId: userId },
        });

        res.json({ message: "User blocked successfully." });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/block/:userId — Unblock a user
const unblockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const blockerId = req.user.id;

        const existing = await prisma.blockedUser.findUnique({
            where: { blockerId_blockedId: { blockerId, blockedId: userId } },
        });

        if (!existing) {
            return res.status(404).json({ error: "User is not blocked." });
        }

        await prisma.blockedUser.delete({
            where: { id: existing.id },
        });

        res.json({ message: "User unblocked successfully." });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/blocked — Get list of blocked users
const getBlockedUsers = async (req, res, next) => {
    try {
        const blocked = await prisma.blockedUser.findMany({
            where: { blockerId: req.user.id },
            include: {
                blocked: {
                    select: { id: true, displayName: true, avatarUrl: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const users = blocked.map((b) => b.blocked);
        res.json({ users });
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/settings/read-receipts — Toggle read receipts
const updateReadReceiptsSetting = async (req, res, next) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== "boolean") {
            return res.status(400).json({ error: "'enabled' must be a boolean." });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { readReceiptsEnabled: enabled },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
                readReceiptsEnabled: true,
                createdAt: true,
            },
        });

        res.json({ message: `Read receipts ${enabled ? "enabled" : "disabled"}.`, user: updatedUser });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, updateProfile, updateAvatar, searchUsers, blockUser, unblockUser, getBlockedUsers, updateReadReceiptsSetting };
