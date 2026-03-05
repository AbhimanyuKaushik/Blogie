const Post = require("../models/Post");

exports.getAuthorStats = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const posts = await Post.find({ author: userId }).lean();

    const totalPosts = posts.length;

    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
    const totalComments = posts.reduce(
      (sum, p) => sum + (p.commentCount || 0),
      0
    );

    const totalReach = totalViews; // simple reach metric

    res.json({
      summary: {
        totalPosts,
        totalViews,
        totalLikes,
        totalComments,
        totalReach,
      },
      posts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};