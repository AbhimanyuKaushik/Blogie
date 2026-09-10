const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { Liveblocks } = require("@liveblocks/node");

const Post = require("../models/Post");

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});

/* ============================================================
   CURSOR COLORS
============================================================ */

const CURSOR_COLORS = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#9333EA",
  "#EA580C",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
];

const getCursorColor = (userId) => {
  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

/* ============================================================
   USER ROLE
============================================================ */

const getUserRole = (post, userId) => {
  if (!post || !userId) {
    return null;
  }

  const normalizedUserId = userId.toString();

  if (post.author?.toString() === normalizedUserId) {
    return "owner";
  }

  const collaborator = (post.collaborators || []).find(
    (entry) => entry.user && entry.user.toString() === normalizedUserId,
  );

  return collaborator?.role || null;
};

/* ============================================================
   LIVEBLOCKS AUTH
============================================================ */

router.post("/auth", async (req, res) => {
  try {
    console.log("\n========================================");
    console.log("        LIVEBLOCKS AUTH");
    console.log("========================================");

    const room = req.body?.room;

    console.log("[LIVEBLOCKS] Requested room:", room);

    /* ----------------------------------------------------------
       1. Validate room
    ---------------------------------------------------------- */

    if (typeof room !== "string" || !room.trim()) {
      return res.status(400).json({
        error: "Room ID is required.",
      });
    }

    /*
     * Supported room formats:
     *
     * post:<postId>
     * post:<postId>:body
     * post:<postId>:title
     *
     * Example:
     *
     * post:6aa12b12ff3f743c7c67a056:body
     *
     * We MUST NOT do:
     *
     * room.replace("post:", "")
     *
     * because that would produce:
     *
     * 6aa12b12ff3f743c7c67a056:body
     *
     * which is not a MongoDB ObjectId.
     */

    const roomMatch = room.match(/^post:([a-fA-F0-9]{24})(?::(body|title))?$/);

    if (!roomMatch) {
      console.error("[LIVEBLOCKS] Invalid room:", room);

      return res.status(400).json({
        error:
          "Invalid room ID. Expected post:<postId>, post:<postId>:body, or post:<postId>:title.",
      });
    }

    const postId = roomMatch[1];
    const roomType = roomMatch[2] || "body";

    console.log("[LIVEBLOCKS] Parsed room:", {
      room,
      postId,
      roomType,
    });

    /* ----------------------------------------------------------
       2. Validate MongoDB ObjectId
    ---------------------------------------------------------- */

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        error: "Invalid post ID.",
      });
    }

    /* ----------------------------------------------------------
       3. Validate authenticated user
    ---------------------------------------------------------- */

    const sessionUser = req.session?.user;
    const reqUser = req.user;

    const user = sessionUser || reqUser;

    console.log("[LIVEBLOCKS] session user:", sessionUser);
    console.log("[LIVEBLOCKS] req.user:", reqUser);

    if (!user?._id) {
      console.error("[LIVEBLOCKS] Authentication failed.");

      return res.status(401).json({
        error: "Authentication required.",
      });
    }

    const userId = user._id.toString();

    /* ----------------------------------------------------------
       4. Load post
    ---------------------------------------------------------- */

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        error: "Post not found.",
      });
    }

    /* ----------------------------------------------------------
       5. Determine role
    ---------------------------------------------------------- */

    const role = getUserRole(post, userId);

    console.log("[LIVEBLOCKS] Access check:", {
      userId,
      username: user.username,
      postId,
      room,
      roomType,
      role,
    });

    /* ----------------------------------------------------------
       6. Reject users who aren't collaborators
    ---------------------------------------------------------- */

    if (!role) {
      console.error("[LIVEBLOCKS] Access denied:", {
        userId,
        postId,
        room,
      });

      return res.status(403).json({
        error: "You do not have access to this collaboration room.",
      });
    }

    /* ----------------------------------------------------------
       7. Prepare Liveblocks session
    ---------------------------------------------------------- */

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: user.username || user.name || "User",

        color: getCursorColor(userId),
      },
    });

    /* ----------------------------------------------------------
       8. Set permissions
    ---------------------------------------------------------- */

    if (role === "owner" || role === "editor") {
      console.log("[LIVEBLOCKS] WRITE ACCESS:", {
        userId,
        username: user.username,
        postId,
        room,
        roomType,
        role,
      });

      session.allow(room, ["*:write"]);
    } else if (role === "commenter") {
      console.log("[LIVEBLOCKS] READ ACCESS:", {
        userId,
        username: user.username,
        postId,
        room,
        roomType,
        role,
      });

      session.allow(room, ["*:read"]);
    } else {
      return res.status(403).json({
        error: "Invalid collaboration role.",
      });
    }

    /* ----------------------------------------------------------
       9. Authorize
    ---------------------------------------------------------- */

    const { status, body } = await session.authorize();

    console.log("[LIVEBLOCKS] Authorization:", {
      userId,
      postId,
      room,
      roomType,
      role,
      status,
    });

    return res.status(status).send(body);
  } catch (error) {
    console.error("\n========================================");
    console.error("       LIVEBLOCKS AUTH ERROR");
    console.error("========================================");

    console.error(error);

    return res.status(500).json({
      error: "Liveblocks authentication failed.",
      message: error.message,
    });
  }
});

module.exports = router;
