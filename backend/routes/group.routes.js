const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const {
    createGroup,
    updateGroup,
    addMembers,
    removeMember,
    promoteMember,
    demoteMember,
    leaveGroup,
    deleteGroup,
} = require("../controllers/group.controller");

router.use(authMiddleware);

router.post("/", createGroup);
router.put("/:groupId", updateGroup);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members/:userId", removeMember);
router.put("/:groupId/members/:userId/promote", promoteMember);
router.put("/:groupId/members/:userId/demote", demoteMember);
router.post("/:groupId/leave", leaveGroup);
router.delete("/:groupId", deleteGroup);

module.exports = router;
