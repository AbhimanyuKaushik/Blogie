const express = require("express");
const mongoose = require("mongoose");

const Post = require("../models/Post");
const User = require("../models/User");
const Like = require("../models/Like");
const auth = require("../middleware/auth");

const router = express.Router();

const CANDIDATE_POOL = 300; // newest published posts considered for ranking
const DAY_MS = 24 * 60 * 60 * 1000;

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// "tech" matches "technology", "Technology" matches "technology", etc.
const matchesInterest = (tag, interest) => {
  if (!tag || !interest) return false;
  if (tag === interest) return true;
  if (tag.length >= 3 && interest.includes(tag)) return true;
  if (interest.length >= 3 && tag.includes(interest)) return true;
  return false;
};

function scorePost(post, ctx) {
  let score = 0;
  const reasons = [];

  const authorId = post.author?._id?.toString();

  // 1. Following (strongest signal)
  if (authorId && ctx.followingSet.has(authorId)) {
    score += 50;
    reasons.push("following");
  }

  // 2. Interest match on tags (+30 each, max 3), then title as a weaker signal
  const tags = (post.tags || []).map(normalize);
  const tagMatches = tags.filter((tag) =>
    ctx.interests.some((interest) => matchesInterest(tag, interest)),
  );

  if (tagMatches.length > 0) {
    score += Math.min(tagMatches.length, 3) * 30;
    reasons.push("interest");
  } else {
    const title = normalize(post.title);
    if (
      ctx.interests.some(
        (interest) => interest.length >= 4 && title.includes(interest),
      )
    ) {
      score += 15;
      reasons.push("interest");
    }
  }

  // 3. Engagement, capped so one viral post can't dominate
  const engagement =
    (post.likesCount || 0) * 2 +
    (post.commentCount || 0) * 3 +
    (post.views || 0) * 0.2;
  score += Math.min(engagement, 40);

  // 4. Recency: worth up to 30 points, fading over a few weeks
  const ageDays = (Date.now() - new Date(post.createdAt).getTime()) / DAY_MS;
  score += 30 * Math.exp(-Math.max(ageDays, 0) / 14);

  // 5. Your own posts stay visible but sink
  if (authorId === ctx.userId) score -= 25;

  return { score, reasons };
}

// GET /api/feed?limit=10&skip=0
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const parsedSkip = Number.parseInt(req.query.skip, 10);
    const limit = Math.min(
      Math.max(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 1),
      50,
    );
    const skip = Math.max(Number.isNaN(parsedSkip) ? 0 : parsedSkip, 0);

    const currentUser = await User.findById(userId)
      .select("following interests savedPosts")
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userIdStr = userId.toString();

    const ctx = {
      userId: userIdStr,
      followingSet: new Set(
        (currentUser.following || []).map((id) => id.toString()),
      ),
      interests: (currentUser.interests || []).map(normalize).filter(Boolean),
    };

    // Candidate pool: newest published posts
    const candidates = await Post.find({ status: "published" })
      .select("-versions")
      .populate("author", "username profileImage")
      .sort({ createdAt: -1, _id: -1 })
      .limit(CANDIDATE_POOL)
      .lean();

    // Rank
    const ranked = candidates
      .map((post) => ({ post, ...scorePost(post, ctx) }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.post.createdAt) - new Date(a.post.createdAt),
      );

    const total = ranked.length;
    const pageItems = ranked.slice(skip, skip + limit);

    // Liked / saved flags for this page only
    const pagePostIds = pageItems.map((item) => item.post._id);

    let likedPostIds = new Set();
    if (pagePostIds.length > 0) {
      const likes = await Like.find({
        user: userId,
        post: { $in: pagePostIds },
      })
        .select("post")
        .lean();
      likedPostIds = new Set(likes.map((like) => like.post.toString()));
    }

    const savedPostIds = new Set(
      (currentUser.savedPosts || []).map((id) => id.toString()),
    );

    const posts = pageItems.map(({ post, reasons }) => ({
      ...post,
      isLiked: likedPostIds.has(post._id.toString()),
      isSaved: savedPostIds.has(post._id.toString()),
      feedReasons: reasons, // e.g. ["following", "interest"] for UI labels
    }));

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      posts,
      total,
      hasMore: skip + posts.length < total,
      personalized: ctx.followingSet.size > 0 || ctx.interests.length > 0,
    });
  } catch (error) {
    console.error("Feed Error:", error);
    return res.status(500).json({ message: "Failed to fetch feed" });
  }
});

module.exports = router;
