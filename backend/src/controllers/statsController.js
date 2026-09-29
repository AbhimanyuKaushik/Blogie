const Post = require("../models/Post");

exports.getCreatorStats = async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // IMPORTANT:
    // Replace `isPublished: true` with your actual
    // published field if your Post model uses another name.
    const posts = await Post.find({
      author: userId,
      isPublished: true,
    })
      .select("_id title views likesCount commentCount createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const totalPosts = posts.length;

    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);

    const totalLikes = posts.reduce(
      (sum, post) => sum + (post.likesCount || 0),
      0,
    );

    const totalComments = posts.reduce(
      (sum, post) => sum + (post.commentCount || 0),
      0,
    );

    /*
     * If your Post model has a `reach` field,
     * calculate this properly here.
     *
     * For now we use total views as reach.
     */
    const totalReach = totalViews;

    const averageViews = totalPosts > 0 ? totalViews / totalPosts : 0;

    const averageLikes = totalPosts > 0 ? totalLikes / totalPosts : 0;

    const averageComments = totalPosts > 0 ? totalComments / totalPosts : 0;

    /*
     * Engagement rate:
     *
     * (likes + comments) / views * 100
     */
    const engagementRate =
      totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

    /*
     * Top posts by views
     */
    const topPosts = [...posts]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    return res.status(200).json({
      summary: {
        totalPosts,
        totalViews,
        totalLikes,
        totalComments,
        totalReach,

        averageViews,
        averageLikes,
        averageComments,

        engagementRate,
      },

      posts,

      topPosts,
    });
  } catch (error) {
    console.error("CREATOR STATS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch creator statistics.",
      error: error.message,
    });
  }
};
