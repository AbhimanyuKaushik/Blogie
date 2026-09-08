const express = require("express");
const { Liveblocks } = require("@liveblocks/node");
const Post = require("../models/Post.js");

const router = express.Router();

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});

router.post("/auth", async (req, res) => {
  console.log("\n========================================");
  console.log("         LIVEBLOCKS AUTH REQUEST");
  console.log("========================================");

  console.log("Session ID:", req.sessionID);
  console.log("Has session:", !!req.session);
  console.log("Session user:", req.session?.user);
  console.log("req.user:", req.user);
  console.log("Cookie:", req.headers.cookie);
  console.log("Origin:", req.headers.origin);
  console.log("Body:", req.body);

  console.log("========================================\n");

  try {
    // --------------------------------------------------
    // 1. Get authenticated user
    // --------------------------------------------------

    console.log("[LIVEBLOCKS DEBUG]", {
      sessionID: req.sessionID,
      session: req.session,
      sessionUser: req.session?.user,
      sessionUserId: req.session?.userId,
      sessionUserID: req.session?.userID,
      reqUser: req.user,
      cookie: req.headers.cookie,
    });

    const user = req.session?.user || req.user || null;

    if (!user?._id) {
      console.error("[LIVEBLOCKS] Authentication failed.");

      console.error("Session exists:", !!req.session);

      console.error("Session user:", req.session?.user);

      console.error("Cookie received:", !!req.headers.cookie);

      return res.status(401).json({
        error: "Not authenticated. Please log in.",
      });
    }

    // --------------------------------------------------
    // 2. Get room
    // --------------------------------------------------

    const { room } = req.body;

    if (!room) {
      return res.status(400).json({
        error: "Liveblocks room is required.",
      });
    }

    if (!room.startsWith("post:")) {
      return res.status(400).json({
        error: "Invalid Liveblocks room.",
      });
    }

    const postId = room.substring(5);

    // --------------------------------------------------
    // 3. Find post
    // --------------------------------------------------

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found.",
      });
    }

    // --------------------------------------------------
    // 4. Determine user ID
    // --------------------------------------------------

    const userId = user._id?.toString();

    if (!userId) {
      return res.status(401).json({
        error: "Authenticated user has no valid ID.",
      });
    }

    // --------------------------------------------------
    // 5. Check owner
    // --------------------------------------------------

    const isOwner = post.author?.toString() === userId;

    // --------------------------------------------------
    // 6. Check collaborator
    // --------------------------------------------------

    const collaborator = Array.isArray(post.collaborators)
      ? post.collaborators.find((item) => item.user?.toString() === userId)
      : null;

    // --------------------------------------------------
    // 7. Check access
    // --------------------------------------------------

    if (!isOwner && !collaborator) {
      console.warn("[LIVEBLOCKS] User has no access:", {
        userId,
        postId,
      });

      return res.status(403).json({
        error: "You do not have access to collaborate on this post.",
      });
    }

    // --------------------------------------------------
    // 8. Prepare Liveblocks session
    // --------------------------------------------------

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: user.username || user.name || "User",
      },
    });

    // --------------------------------------------------
    // 9. Permissions
    // --------------------------------------------------

    if (isOwner || collaborator?.role === "editor") {
      // Owner/editor:
      // read + write
      session.allow(room, ["*:write"]);

      console.log("[LIVEBLOCKS] WRITE ACCESS:", {
        userId,
        room,
        role: isOwner ? "owner" : "editor",
      });
    } else {
      // Commenter:
      // read only
      session.allow(room, ["*:read"]);

      console.log("[LIVEBLOCKS] READ ACCESS:", {
        userId,
        room,
        role: "commenter",
      });
    }

    // --------------------------------------------------
    // 10. Authorize Liveblocks session
    // --------------------------------------------------

    const { status, body } = await session.authorize();

    console.log("[LIVEBLOCKS] Authorization successful:", {
      userId,
      room,
      status,
    });

    return res.status(status).send(body);
  } catch (error) {
    console.error("\n========================================");

    console.error("[LIVEBLOCKS AUTH ERROR]");

    console.error(error);

    console.error("========================================\n");

    return res.status(500).json({
      error: error.message || "Liveblocks authentication failed.",
    });
  }
});

module.exports = router;
