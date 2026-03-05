const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const Like = require("../models/Like");
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

    const currentUser = await User.findById(userId).select(
      "following interests savedPosts",
    );
    if (!currentUser)
      return res.status(404).json({ message: "User not found" });

    const following = Array.isArray(currentUser.following)
      ? currentUser.following
      : [];
    const interests = Array.isArray(currentUser.interests)
      ? currentUser.interests
      : [];
    const savedSet = new Set(
      currentUser.savedPosts?.map((p) => p.toString()) || [],
    );

    const feedAuthorIds = following.filter(
      (id) => id.toString() !== userId.toString(),
    );
    const tagFilter = interests.length ? { tags: { $in: interests } } : {};

    let query =
      feedAuthorIds.length > 0
        ? { author: { $in: feedAuthorIds }, ...tagFilter }
        : { ...tagFilter, author: { $ne: userId } };

    // Fetch posts + count in parallel
    const [rawPosts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(query),
    ]);

    // Compute isLiked for current user (very efficient)
    let posts = rawPosts;
    if (rawPosts.length > 0) {
      const postIds = rawPosts.map((p) => p._id);

      const userLikes = await Like.find({
        user: userId,
        post: { $in: postIds },
      })
        .select("post")
        .lean();

      const likedPostIds = new Set(
        userLikes.map((like) => like.post.toString()),
      );
      // Get saved posts for current user
      const savedPosts = await User.findById(userId)
        .select("savedPosts")
        .lean();

      const savedSet = new Set(
        savedPosts?.savedPosts.map((p) => p.toString()) || [],
      );

      // Override isLiked on each post
      posts = rawPosts.map((post) => {
        const postObj = post.toObject();
        postObj.isLiked = likedPostIds.has(post._id.toString());
        postObj.isSaved = savedSet.has(post._id.toString());
        return postObj;
      });
    }

    // Optional: temporary debug log (remove later)
    // console.log("First post isLiked:", posts[0]?.isLiked);

    res.json({
      posts,
      total,
      hasMore: skip + rawPosts.length < total,
    });
  } catch (error) {
    console.error(
      "Feed Error:",
      process.env.NODE_ENV === "production" ? error.message : error,
    );
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
