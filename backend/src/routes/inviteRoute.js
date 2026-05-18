const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/inviteController.js");

router.get("/", inviteController.getInvites);
router.post("/:postId", inviteController.createInvite);
router.patch("/:inviteId/accept", inviteController.acceptInvite);
router.patch("/:inviteId/reject", inviteController.rejectInvite);

module.exports = router;