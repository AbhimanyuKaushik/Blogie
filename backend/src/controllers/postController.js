const mongoose = require("mongoose");
const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Like = require("../models/Like.js");
const Comment = require("../models/Comment.js");
const CommentLike = require("../models/CommentLike.js");

// --------------------- CREATE POST ---------------------
exports.createPost = async (req, res) => {
  try {
    //New post and its id stored in session
    req.session.lastAction = "createdPost";
    req.session.lastPostId = newPost._id;
    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });

    const { title, content, tags } = req.body;
    const newPost = new Post({ title, content, author: req.user.id, tags });

    await newPost.save();
    await newPost.populate("author", "username profileImage");

    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- GET POSTS ---------------------
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "username profileImage");
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- GET SINGLE POST ---------------------
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate(
      "author",
      "username profileImage"
    );

    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json(post);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching post", error: error.message });
  }
};

// --------------------- UPDATE POST ---------------------
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    const updatedPost = await Post.findByIdAndUpdate(postId, req.body, {
      new: true,
    });
    res.json({ message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating post", error: error.message });
  }
};

// --------------------- DELETE POST ---------------------
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await Post.findByIdAndDelete(postId);
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
    const userId = req.user.id;

    const existing = await Like.findOne({ user: userId, post: postId });
    if (existing) return res.status(400).json({ message: "Already liked" });

    await new Like({ user: userId, post: postId }).save();

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select("likesCount");

    res
      .status(200)
      .json({
        message: "Post liked successfully",
        likesCount: post.likesCount,
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error liking post", error: error.message });
  }
};

// --------------------- UNLIKE POST ---------------------
exports.unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const deleted = await Like.findOneAndDelete({ user: userId, post: postId });
    if (!deleted) return res.status(400).json({ message: "Not liked yet" });

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true }
    ).select("likesCount");

    if (post.likesCount < 0) {
      post.likesCount = 0;
      await post.save();
    }

    res.json({ message: "Post unliked", likesCount: post.likesCount });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error unliking post", error: error.message });
  }
};

// --------------------- PEOPLE WHO LIKED POST ---------------------
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

    const likers = likes.map((like) => ({
      _id: like.user._id,
      username: like.user.username,
      profileImage: like.user.profileImage,
      likedAt: like.createdAt,
    }));

    res.status(200).json({
      likers,
      total,
      likesCount: post.likesCount,
      hasMore: skip + likers.length < total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- COMMENTS ---------------------
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const { content, parentId } = req.body;

    if (!content || typeof content !== "string" || !content.trim())
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
    res.status(500).json({ error: error.message });
  }
};

// --------------------- DELETE COMMENT ---------------------
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== userId)
      return res.status(403).json({ message: "Not authorized" });

    await Comment.findByIdAndDelete(commentId);
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- EDIT COMMENT ---------------------
exports.editComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== userId)
      return res.status(403).json({ message: "Not authorized" });

    comment.content = content || comment.content;
    comment.updatedAt = new Date();
    await comment.save();

    res.json({ message: "Comment updated", comment });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating comment", error: error.message });
  }
};

// --------------------- LIKE COMMENT ---------------------
exports.likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const existing = await CommentLike.findOne({
      user: userId,
      comment: commentId,
    });
    if (existing) return res.status(400).json({ message: "Already liked" });

    await new CommentLike({ user: userId, comment: commentId }).save();

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select("likesCount");

    res.json({ message: "Comment liked", likesCount: updated.likesCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- UNLIKE COMMENT ---------------------
exports.unlikeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const deleted = await CommentLike.findOneAndDelete({
      user: userId,
      comment: commentId,
    });
    if (!deleted) return res.status(400).json({ message: "Not liked yet" });

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: -1 } },
      { new: true }
    ).select("likesCount");

    if (updated.likesCount < 0) {
      updated.likesCount = 0;
      await updated.save();
    }

    res.json({ message: "Comment unliked", likesCount: updated.likesCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- SAVE / UNSAVE POST ---------------------
exports.savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.user.id);

    if (user.savedPosts.includes(postId))
      return res.status(400).json({ message: "Post already saved" });

    user.savedPosts.push(postId);
    await user.save();

    res.json({ message: "Post saved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unsavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.user.id);

    const index = user.savedPosts.indexOf(postId);
    if (index === -1)
      return res.status(400).json({ message: "Post not saved yet" });

    user.savedPosts.splice(index, 1);
    await user.save();

    res.json({ message: "Post unsaved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- GET SAVED POSTS ---------------------
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "savedPosts",
      populate: { path: "author", select: "username profileImage" },
    });

    res.json({
      savedPosts: user.savedPosts,
      total: user.savedPosts.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
