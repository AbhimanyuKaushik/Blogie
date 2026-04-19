const mongoose = require("mongoose");
const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Like = require("../models/Like.js");
const Comment = require("../models/Comment.js");
const CommentLike = require("../models/CommentLike.js");
const Invite = require("../models/Invite");
const Notification = require("../models/Notification");

// --------------------- CREATE POST ---------------------
exports.createPost = async (req, res) => {
  try {
    const { title, document, tags } = req.body;

    if (!title || !document)
      return res.status(400).json({ message: "Missing fields" });

    const newPost = new Post({
      title,
      document,
      author: req.session.user._id,
      tags: tags || [],
    });

    await newPost.save();
    await newPost.populate("author", "username profileImage");

    res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });

    console.log("SESSION USER:", req.session.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- GET POSTS ---------------------
exports.getAllPosts = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    console.log("SESSION USER IN GET ALL:", req.session.user);
    // Get posts as plain JS objects (important!)
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "username profileImage")
      .lean();

    if (userId) {
      const likedPosts = await Like.find({ user: userId }).select("post");
      const user = await User.findById(userId).select("savedPosts");

      const likedSet = new Set(likedPosts.map((l) => l.post.toString()));
      const savedSet = new Set(user?.savedPosts.map((p) => p.toString()) || []);

      posts.forEach((post) => {
        post.isLiked = likedSet.has(post._id.toString());
        post.isSaved = savedSet.has(post._id.toString());
      });
    }

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- GET SINGLE POST ---------------------
exports.getPostById = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    // Increment views and fetch updated post in ONE operation
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { $inc: { views: 1 } },
      { new: true }, // return updated document
    )
      .populate("author", "username profileImage")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    if (userId) {
      const liked = await Like.findOne({
        user: userId,
        post: post._id,
      });

      const user = await User.findById(userId).select("savedPosts");

      post.isLiked = !!liked;

      post.isSaved =
        user?.savedPosts
          .map((p) => p.toString())
          .includes(post._id.toString()) || false;
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// --------------------- UPDATE POST ---------------------
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, document, tags } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    const isOwner = post.author.toString() === userId;
    const isEditor = post.collaborators.some(
      (c) => c.user.toString() === userId && c.role === "editor",
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.versions.push({
      content: post.document,
      editedBy: userId,
    });

    if (title) post.title = title;
    if (document) post.document = document;
    if (tags) post.tags = tags;

    await post.save();

    res.json({ message: "Post updated", post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- DELETE POST ---------------------
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting post", error: error.message });
  }
};

// --------------------- LIKE POST ---------------------
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    const like = await Like.create({ user: userId, post: postId });

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true },
    ).select("likesCount");

    res.json({ liked: true, likesCount: post.likesCount });
  } catch (err) {
    if (err.code === 11000) {
      // Already liked → still return current count (nice for frontend)
      const post = await Post.findById(postId).select("likesCount");
      return res
        .status(200)
        .json({ liked: true, likesCount: post?.likesCount || 0 });
    }

    console.error(err);
    res.status(500).json({ message: "Error liking post" });
  }
};

// --------------------- UNLIKE POST ---------------------
exports.unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    const removed = await Like.findOneAndDelete({
      user: userId,
      post: postId,
    });

    if (!removed) {
      return res.status(400).json({ message: "Not liked yet" });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true },
    ).select("likesCount");

    res.status(200).json({
      liked: false,
      likesCount: post.likesCount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error unliking post",
      error: err.message,
    });
  }
};

// --------------------- GET PEOPLE WHO LIKED POST ---------------------
exports.getPeopleWhoLikedPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const likes = await Like.find({ post: postId })
      .populate("user", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Like.countDocuments({ post: postId });

    res.status(200).json({
      likers: likes.map((l) => ({
        _id: l.user._id,
        username: l.user.username,
        profileImage: l.user.profileImage,
        likedAt: l.createdAt,
      })),
      total,
      likesCount: post.likesCount,
      hasMore: skip + likes.length < total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- ADD COMMENT ---------------------
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;
    const { content, parentId } = req.body;

    if (!content || !content.trim())
      return res.status(400).json({ message: "Content is required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (parentId && !mongoose.Types.ObjectId.isValid(parentId))
      return res.status(400).json({ message: "Invalid parentId" });

    const newComment = await Comment.create({
      postId,
      userId,
      content: content.trim(),
      parentId: parentId || null,
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    await newComment.populate("userId", "username profileImage");

    res.status(201).json({ message: "Comment added", comment: newComment });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding comment", error: error.message });
  }
};

// --------------------- GET COMMENTS ---------------------
exports.getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, skip = 0, parentId } = req.query;

    const query = { postId };
    if (parentId) query.parentId = parentId;

    const comments = await Comment.find(query)
      .populate("userId", "username profileImage")
      .populate("parentId", "content")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.status(200).json({ comments, total });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- DELETE COMMENT ---------------------
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.session.user._id;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.userId.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });

    await Comment.findByIdAndDelete(commentId);
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- EDIT COMMENT ---------------------
exports.editComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.userId.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    comment.content = content || comment.content;
    comment.updatedAt = new Date();

    await comment.save();

    res.json({ message: "Comment updated", comment });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- LIKE COMMENT ---------------------
exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user._id;

    const existing = await CommentLike.findOne({
      user: userId,
      comment: commentId,
    });
    if (existing) return res.status(400).json({ message: "Already liked" });

    await new CommentLike({ user: userId, comment: commentId }).save();

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: 1 } },
      { new: true },
    ).select("likesCount");

    res.json({ message: "Comment liked", likesCount: updated.likesCount });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- UNLIKE COMMENT ---------------------
exports.unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user._id;

    const deleted = await CommentLike.findOneAndDelete({
      user: userId,
      comment: commentId,
    });

    if (!deleted) return res.status(400).json({ message: "Not liked yet" });

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: -1 } },
      { new: true },
    ).select("likesCount");

    res.json({ message: "Comment unliked", likesCount: updated.likesCount });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- SAVE / UNSAVE POST ---------------------
exports.savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.session.user._id);

    if (user.savedPosts.includes(postId))
      return res.status(400).json({ message: "Post already saved" });
    user.savedPosts.push(postId);
    await user.save();

    res.json({ message: "Post saved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error });
  }
};

exports.unsavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.session.user._id);

    const before = user.savedPosts.length;

    user.savedPosts = user.savedPosts.filter(
      (p) => p.toString() !== postId.toString(),
    );

    if (user.savedPosts.length === before)
      return res.status(400).json({ message: "Post not saved yet" });

    await user.save();

    res.json({ message: "Post unsaved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- GET SAVED POSTS ---------------------
exports.getSavedPosts = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId)
      .populate({
        path: "savedPosts",
        populate: {
          path: "author",
          select: "username profileImage",
        },
      })
      .lean();

    const posts = user?.savedPosts || [];

    if (posts.length > 0) {
      const postIds = posts.map((p) => p._id);

      const likes = await Like.find({
        user: userId,
        post: { $in: postIds },
      })
        .select("post")
        .lean();

      const likedSet = new Set(likes.map((l) => l.post.toString()));

      posts.forEach((post) => {
        post.isLiked = likedSet.has(post._id.toString());
        post.isSaved = true; // Since these are saved posts
      });
    }
    res.json(user.savedPosts || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- SEARCH POSTS ---------------------
exports.searchPosts = async (req, res) => {
  try {
    const { q, tag, limit = 10, skip = 0 } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);

    res.json({ posts, total, hasMore: skip + posts.length < total });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- ADD COLLABORATOR ---------------------
exports.addCollaborator = async (req, res) => {
  try {
    const { postId } = req.params;
    const { username, role } = req.body;

    const post = await Post.findById(postId);
    const user = await User.findOne({ username });

    if (!post || !user) {
      return res.status(404).json({ message: "Post or user not found" });
    }

    const invite = await Invite.create({
      post: postId,
      sender: req.session.user._id,
      receiver: user._id,
      role,
    });

    await Notification.create({
      receiver: user._id,
      sender: req.session.user._id,
      type: "invite",
      post: post._id,
      message: `${req.session.user.username} invited you to collaborate on "${post.title}"`,
    });

    res.json({
      message: "Invitation sent",
      invite,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// --------------------- REMOVE COLLABORATOR ---------------------
exports.removeCollaborator = async (req, res) => {
  try {
    const { postId } = req.params;
    const { username } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const before = post.collaborators.length;

    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ message: "User not found" });

    post.collaborators = post.collaborators.filter(
      (c) => c.user.toString() !== user._id.toString(),
    );

    if (post.collaborators.length === before)
      return res.status(400).json({ message: "User is not a collaborator" });

    await post.save();

    await post.populate("collaborators.user", "username");
    res.json({ message: "Collaborator removed", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- UPDATE COLLABORATOR ROLE ---------------------
exports.updateCollaboratorRole = async (req, res) => {
  try {
    const { postId } = req.params;
    const { username, role } = req.body;

    const validRoles = ["editor", "commenter"];
    if (!validRoles.includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ message: "User not found" });

    const collab = post.collaborators.find(
      (c) => c.user.toString() === user._id.toString(),
    );

    if (!collab) return res.status(400).json({ message: "Not a collaborator" });

    collab.role = role;
    await post.save();
    await post.populate("collaborators.user", "username");

    res.json({ message: "Collaborator role updated", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- PUBLISH / UNPUBLISH POST ---------------------
exports.publishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    post.status = "published";
    await post.save();

    res.json({ message: "Post published", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

exports.unpublishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    post.status = "draft";
    await post.save();

    res.json({ message: "Post unpublished", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- AUTOSAVE ---------------------
exports.autoSave = async (req, res) => {
  try {
    const { postId } = req.params;
    const { document } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    const isOwner = post.author.toString() === userId;
    const isEditor = post.collaborators.some(
      (c) => c.user.toString() === userId && c.role === "editor",
    );

    if (!isOwner && !isEditor)
      return res.status(403).json({ message: "Not authorized" });

    post.document = document;
    post.lastAutoSavedAt = new Date();

    await post.save();

    res.json({ message: "Autosaved", post, lastSaved: post.lastAutoSavedAt });
  } catch (error) {
    res.status(500).json({ error });
  }
};
