const mongoose = require("mongoose");
const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Like = require("../models/Like.js");
const Comment = require("../models/Comment.js");
const CommentLike = require("../models/CommentLike.js");

// --------------------- CREATE POST ---------------------
exports.createPost = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const newPost = new Post({
      title,
      content,
      author: req.session.user._id,
      tags,
    });

    await newPost.save();
    await newPost.populate("author", "username profileImage");

    res.status(201).json({ message: "Post created successfully", post: newPost });
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

    await Post.findByIdAndUpdate(req.params.postId, { $inc: { views: 1 } });

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error: error.message });
  }
};

// --------------------- UPDATE POST ---------------------
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, tags } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    const isOwner = post.author.toString() === userId;
    const isEditor = post.collaborators.some(
      (c) => c.user.toString() === userId && c.role === "editor"
    );

    if (!isOwner && !isEditor) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Versioning
    post.versions.push({
      content: post.content,
      editedBy: userId,
    });

    if (title) post.title = title;
    if (content) post.content = content;
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
    res.status(500).json({ message: "Error deleting post", error: error.message });
  }
};

// --------------------- LIKE POST ---------------------
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    const existing = await Like.findOne({ user: userId, post: postId });
    if (existing) return res.status(400).json({ message: "Already liked" });

    await new Like({ user: userId, post: postId }).save();

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select("likesCount");

    res.status(200).json({ message: "Post liked", likesCount: post.likesCount });
  } catch (error) {
    res.status(500).json({ message: "Error liking post", error: error.message });
  }
};

// --------------------- UNLIKE POST ---------------------
exports.unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

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
    res.status(500).json({ message: "Error unliking post", error: error.message });
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
    res.status(500).json({ message: "Error adding comment", error: error.message });
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

    const existing = await CommentLike.findOne({ user: userId, comment: commentId });
    if (existing) return res.status(400).json({ message: "Already liked" });

    await new CommentLike({ user: userId, comment: commentId }).save();

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: 1 } },
      { new: true }
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
      { new: true }
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
      (p) => p.toString() !== postId.toString()
    );

    if (user.savedPosts.length === before)
      return res.status(400).json({ message: "Post not saved yet" });

    await user.save();

    res.json({ message: "Post unsaved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error });
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
        { content: { $regex: q, $options: "i" } },
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
    const { collaboratorId } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const already = post.collaborators.some(
      (c) => c.user.toString() === collaboratorId
    );

    if (already)
      return res.status(400).json({ message: "Already a collaborator" });

    post.collaborators.push({ user: collaboratorId, role: "editor" });
    await post.save();

    res.json({ message: "Collaborator added", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- REMOVE COLLABORATOR ---------------------
exports.removeCollaborator = async (req, res) => {
  try {
    const { postId } = req.params;
    const { collaboratorId } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const before = post.collaborators.length;

    post.collaborators = post.collaborators.filter(
      (c) => c.user.toString() !== collaboratorId.toString()
    );

    if (post.collaborators.length === before)
      return res.status(400).json({ message: "User is not a collaborator" });

    await post.save();
    res.json({ message: "Collaborator removed", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- UPDATE COLLABORATOR ROLE ---------------------
exports.updateCollaboratorRole = async (req, res) => {
  try {
    const { postId } = req.params;
    const { collaboratorId, role } = req.body;

    const validRoles = ["editor", "commenter"];
    if (!validRoles.includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.session.user._id.toString())

      return res.status(403).json({ message: "Not authorized" });

    const collab = post.collaborators.find(
      (c) => c.user.toString() === collaboratorId
    );

    if (!collab)
      return res.status(400).json({ message: "Not a collaborator" });

    collab.role = role;
    await post.save();

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
    const { content } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    const isOwner = post.author.toString() === userId;
    const isEditor = post.collaborators.some(
      (c) => c.user.toString() === userId && c.role === "editor"
    );

    if (!isOwner && !isEditor)
      return res.status(403).json({ message: "Not authorized" });

    post.content = content;
    post.lastAutoSavedAt = new Date();

    await post.save();

    res.json({ message: "Autosaved", post, lastSaved: post.lastAutoSavedAt });
  } catch (error) {
    res.status(500).json({ error });
  }
};
