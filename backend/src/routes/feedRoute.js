const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.session.user._id;
    let limit = parseInt(req.query.limit, 10) || 10;
    let skip = parseInt(req.query.skip, 10) || 0;

    
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    if (skip < 0) skip = 0;

    // Get current user's following list + interests
    const currentUser = await User.findById(userId).select("following interests");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const following = Array.isArray(currentUser.following) ? currentUser.following : [];

    // Exclude current user: we only want other users' posts
    const feedAuthorIds = following.filter(id => id.toString() !== userId.toString());

    if (feedAuthorIds.length === 0) {
      return res.json({ posts: [], total: 0, hasMore: false });
    }

    // If user has interests, restrict posts to those matching at least one interest
    const interests = Array.isArray(currentUser.interests) ? currentUser.interests : [];
    const tagFilter = interests.length ? { tags: { $in: interests } } : {};

    const query = {
      author: { $in: feedAuthorIds },
      ...tagFilter,
    };

    // Run queries in parallel
    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(query),
    ]);

    res.json({
      posts,
      total,
      hasMore: skip + posts.length < total,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Feed Error:", error);
    } else {
      console.error("Feed Error:", error.message);
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;