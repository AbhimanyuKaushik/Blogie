const express = require("express");
const auth = require("../middleware/auth.js");

const {
  acceptInvite,
  acceptInviteByToken,
  validateInviteToken,
  rejectInvite,
  getInvites,
  createInvite,
} = require("../controllers/inviteController.js");

const router = express.Router();

/* ============================================================
   INVITATIONS
============================================================ */

router.get("/", auth, getInvites);

router.post("/create/:postId", auth, createInvite);

router.patch("/:inviteId/accept", auth, acceptInvite);

router.patch("/:inviteId/reject", auth, rejectInvite);

router.post("/accept-token", auth, acceptInviteByToken);

router.get("/validate/:token", validateInviteToken);

module.exports = router;
