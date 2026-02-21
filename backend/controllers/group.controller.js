const prisma = require("../config/prisma");

// POST /api/groups — Create a group conversation
const createGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, memberIds } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: "Group name is required." });
        }

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
            return res.status(400).json({ error: "At least one member is required." });
        }

        // Remove duplicates and self from memberIds
        const uniqueMembers = [...new Set(memberIds.filter((id) => id !== userId))];

        // Verify all members exist
        const existingUsers = await prisma.user.findMany({
            where: { id: { in: uniqueMembers } },
            select: { id: true },
        });

        if (existingUsers.length !== uniqueMembers.length) {
            return res.status(400).json({ error: "Some members were not found." });
        }

        // Create group conversation
        const group = await prisma.conversation.create({
            data: {
                isGroup: true,
                name: name.trim(),
                description: description?.trim() || null,
                createdById: userId,
                participants: {
                    create: [
                        { userId, role: "admin" },
                        ...uniqueMembers.map((id) => ({ userId: id, role: "member" })),
                    ],
                },
            },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });

        // Notify members via Socket.IO to join the room
        const io = req.app.get("io");
        if (io) {
            for (const memberId of uniqueMembers) {
                io.to(`user:${memberId}`).emit("group:created", { conversation: group });
            }
        }

        return res.status(201).json({ conversation: group });
    } catch (error) {
        console.error("createGroup error:", error);
        return res.status(500).json({ error: "Failed to create group." });
    }
};

// PUT /api/groups/:groupId — Update group info (admin only)
const updateGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const { groupId } = req.params;
        const { name, description } = req.body;

        // Verify conversation exists and is a group
        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });

        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        // Verify user is admin
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: groupId, userId, role: "admin" },
        });

        if (!participant) {
            return res.status(403).json({ error: "Only admins can update group info." });
        }

        const updateData = {};
        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ error: "Group name cannot be empty." });
            updateData.name = name.trim();
        }
        if (description !== undefined) {
            updateData.description = description.trim() || null;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields to update." });
        }

        const updated = await prisma.conversation.update({
            where: { id: groupId },
            data: updateData,
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
            },
        });

        // Broadcast update to group room
        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${groupId}`).emit("group:updated", { conversation: updated });
        }

        return res.status(200).json({ conversation: updated });
    } catch (error) {
        console.error("updateGroup error:", error);
        return res.status(500).json({ error: "Failed to update group." });
    }
};

// POST /api/groups/:groupId/members — Add members (admin only)
const addMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { groupId } = req.params;
        const { memberIds } = req.body;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
            return res.status(400).json({ error: "memberIds array is required." });
        }

        // Verify group exists
        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        // Verify user is admin
        const adminCheck = await prisma.conversationParticipant.findFirst({
            where: { conversationId: groupId, userId, role: "admin" },
        });
        if (!adminCheck) {
            return res.status(403).json({ error: "Only admins can add members." });
        }

        // Filter out existing participants
        const existing = await prisma.conversationParticipant.findMany({
            where: { conversationId: groupId, userId: { in: memberIds } },
            select: { userId: true },
        });
        const existingIds = existing.map((e) => e.userId);
        const newMemberIds = memberIds.filter((id) => !existingIds.includes(id));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ error: "All users are already members." });
        }

        // Verify new members exist
        const users = await prisma.user.findMany({
            where: { id: { in: newMemberIds } },
            select: { id: true },
        });
        if (users.length !== newMemberIds.length) {
            return res.status(400).json({ error: "Some users were not found." });
        }

        // Add new participants
        await prisma.conversationParticipant.createMany({
            data: newMemberIds.map((id) => ({
                conversationId: groupId,
                userId: id,
                role: "member",
            })),
        });

        // Fetch updated conversation
        const updated = await prisma.conversation.findUnique({
            where: { id: groupId },
            include: {
                participants: {
                    include: { user: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true } } },
                },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });

        // Notify via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${groupId}`).emit("group:memberAdded", {
                conversationId: groupId,
                memberIds: newMemberIds,
                conversation: updated,
            });
        }

        return res.status(200).json({ conversation: updated });
    } catch (error) {
        console.error("addMembers error:", error);
        return res.status(500).json({ error: "Failed to add members." });
    }
};

// DELETE /api/groups/:groupId/members/:userId — Remove a member (admin only)
const removeMember = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { groupId, userId: targetUserId } = req.params;

        // Verify group exists
        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        // Can't remove the group creator
        if (targetUserId === conversation.createdById) {
            return res.status(400).json({ error: "Cannot remove the group creator." });
        }

        // Verify current user is admin
        const adminCheck = await prisma.conversationParticipant.findFirst({
            where: { conversationId: groupId, userId: currentUserId, role: "admin" },
        });
        if (!adminCheck) {
            return res.status(403).json({ error: "Only admins can remove members." });
        }

        // Remove the participant
        const deleted = await prisma.conversationParticipant.deleteMany({
            where: { conversationId: groupId, userId: targetUserId },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: "User is not a member of this group." });
        }

        // Notify via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${groupId}`).emit("group:memberRemoved", {
                conversationId: groupId,
                userId: targetUserId,
            });
        }

        return res.status(200).json({ message: "Member removed." });
    } catch (error) {
        console.error("removeMember error:", error);
        return res.status(500).json({ error: "Failed to remove member." });
    }
};

// PUT /api/groups/:groupId/members/:userId/promote — Promote to admin
const promoteMember = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { groupId, userId: targetUserId } = req.params;

        // Verify group
        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        // Verify current user is admin
        const adminCheck = await prisma.conversationParticipant.findFirst({
            where: { conversationId: groupId, userId: currentUserId, role: "admin" },
        });
        if (!adminCheck) {
            return res.status(403).json({ error: "Only admins can promote members." });
        }

        // Update target's role
        const updated = await prisma.conversationParticipant.updateMany({
            where: { conversationId: groupId, userId: targetUserId, role: "member" },
            data: { role: "admin" },
        });

        if (updated.count === 0) {
            return res.status(400).json({ error: "User not found or already an admin." });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${groupId}`).emit("group:roleChanged", {
                conversationId: groupId,
                userId: targetUserId,
                role: "admin",
            });
        }

        return res.status(200).json({ message: "Member promoted to admin." });
    } catch (error) {
        console.error("promoteMember error:", error);
        return res.status(500).json({ error: "Failed to promote member." });
    }
};

// PUT /api/groups/:groupId/members/:userId/demote — Demote to member
const demoteMember = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { groupId, userId: targetUserId } = req.params;

        // Verify group
        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        // Can't demote the group creator
        if (targetUserId === conversation.createdById) {
            return res.status(400).json({ error: "Cannot demote the group creator." });
        }

        // Verify current user is admin
        const adminCheck = await prisma.conversationParticipant.findFirst({
            where: { conversationId: groupId, userId: currentUserId, role: "admin" },
        });
        if (!adminCheck) {
            return res.status(403).json({ error: "Only admins can demote members." });
        }

        const updated = await prisma.conversationParticipant.updateMany({
            where: { conversationId: groupId, userId: targetUserId, role: "admin" },
            data: { role: "member" },
        });

        if (updated.count === 0) {
            return res.status(400).json({ error: "User not found or already a member." });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${groupId}`).emit("group:roleChanged", {
                conversationId: groupId,
                userId: targetUserId,
                role: "member",
            });
        }

        return res.status(200).json({ message: "Admin demoted to member." });
    } catch (error) {
        console.error("demoteMember error:", error);
        return res.status(500).json({ error: "Failed to demote member." });
    }
};

// POST /api/groups/:groupId/leave — Leave a group
const leaveGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const { groupId } = req.params;

        // Verify group
        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });
        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        // Check if user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: groupId, userId },
        });
        if (!participant) {
            return res.status(400).json({ error: "You are not a member of this group." });
        }

        // If user is admin and the only admin, promote the next member
        if (participant.role === "admin") {
            const adminCount = await prisma.conversationParticipant.count({
                where: { conversationId: groupId, role: "admin" },
            });

            if (adminCount === 1) {
                // Find next member to promote
                const nextMember = await prisma.conversationParticipant.findFirst({
                    where: { conversationId: groupId, userId: { not: userId } },
                    orderBy: { joinedAt: "asc" },
                });

                if (nextMember) {
                    await prisma.conversationParticipant.update({
                        where: { id: nextMember.id },
                        data: { role: "admin" },
                    });
                }
            }
        }

        // Remove user from group
        await prisma.conversationParticipant.delete({
            where: { id: participant.id },
        });

        // Check if group is now empty
        const remainingCount = await prisma.conversationParticipant.count({
            where: { conversationId: groupId },
        });

        if (remainingCount === 0) {
            // Delete the group if no members remain
            await prisma.conversation.delete({ where: { id: groupId } });
        } else {
            // Notify remaining members
            const io = req.app.get("io");
            if (io) {
                io.to(`conv:${groupId}`).emit("group:memberRemoved", {
                    conversationId: groupId,
                    userId,
                });
            }
        }

        return res.status(200).json({ message: "Left the group." });
    } catch (error) {
        console.error("leaveGroup error:", error);
        return res.status(500).json({ error: "Failed to leave group." });
    }
};

// DELETE /api/groups/:groupId — Delete a group (creator only)
const deleteGroup = async (req, res) => {
    try {
        const userId = req.user.id;
        const { groupId } = req.params;

        const conversation = await prisma.conversation.findFirst({
            where: { id: groupId, isGroup: true },
        });

        if (!conversation) {
            return res.status(404).json({ error: "Group not found." });
        }

        if (conversation.createdById !== userId) {
            return res.status(403).json({ error: "Only the group creator can delete the group." });
        }

        // Notify members before deletion
        const io = req.app.get("io");
        if (io) {
            io.to(`conv:${groupId}`).emit("group:deleted", { conversationId: groupId });
        }

        // Delete the conversation (cascade deletes participants and messages)
        await prisma.conversation.delete({ where: { id: groupId } });

        return res.status(200).json({ message: "Group deleted." });
    } catch (error) {
        console.error("deleteGroup error:", error);
        return res.status(500).json({ error: "Failed to delete group." });
    }
};

module.exports = {
    createGroup,
    updateGroup,
    addMembers,
    removeMember,
    promoteMember,
    demoteMember,
    leaveGroup,
    deleteGroup,
};
