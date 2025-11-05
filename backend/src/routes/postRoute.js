const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post.js");
const Like = require("../models/Like.js");
const Comment = require("../models/Comment.js");
const auth = require("../middleware/auth.js");
const router = express.Router();

// Create a new post
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const newPost = new Post({ title, content, author: req.user.id, tags });

    await newPost.save();
    res
      .status(201)
      .json({ message: "Post created successfully", post: newPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "username profileImage");
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single post by ID
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "author",
      "username profileImage"
    );
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.status(200).json(post);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching post", error: err.message });
  }
});

// Update a post
router.put("/:id", auth , async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedPost)
      return res.status(404).json({ message: "Post not found" });

    res.json({ message: "Post updated successfully", post: updatedPost });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating post", error: err.message });
  }
});

// Delete a post
router.delete("/:id", auth, async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost)
      return res.status(404).json({ message: "Post not found" });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting post", error: err.message });
  }
});

// Like a post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingLike = await Like.findOne({ user: userId, post: id });
    if (existingLike) {
      return res.status(400).json({ message: "Already liked" });
    }

    // Create like
    const like = new Like({ user: userId, post: id });
    await like.save();

    //Update count
    await Post.findByIdAndUpdate(id, { $inc: { likesCount: 1 } });

    res.status(200).json({
      message: "Post liked successfully",
      likesCount: await Post.findById(id).likesCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Error liking post", error: err.message });
  }
});

// Unlike a post

router.delete("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Delete like if exists
    const deleted = await Like.findOneAndDelete({ user: userId, post: id });
    if (!deleted) {
      return res.status(400).json({ message: "Not liked yet" });
    }

    //Update count
    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { likesCount: -1 } },
      { new: true }
    );
    if (post.likesCount < 0) {
      post.likesCount = 0;
      await post.save();
    }
    res.status(200).json({
      message: "Post unliked",
      likesCount: post.likesCount,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error unliking post", error: err.message });
  }
});

// Comment on a post
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let { content, parentId } = req.body || {};  // Fallback if body undefined

    // Fix: Validate content before trim
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ 
        message: "Content is required and must be a non-empty string" 
      });
    }

    const trimmedContent = content.trim();

    // Validate parentId if provided
    let validatedParentId = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
      validatedParentId = parentId;
      // Optional: Verify parent exists and belongs to post
      const parent = await Comment.findOne({ _id: parentId, postId: id });
      if (!parent) {
        return res.status(400).json({ message: "Invalid parent comment" });
      }
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create and save in separate Comment collection (fix: use schema fields postId, userId)
    const newComment = new Comment({
      postId: id,
      userId: userId,
      content: trimmedContent,
      parentId: validatedParentId
    });
    await newComment.save();

    // Increment count in Post
    post.commentCount += 1;
    await post.save();

    // Populate for response
    await Comment.populate(newComment, { 
      path: "userId", 
      select: "username profileImage" 
    });
    if (newComment.parentId) {
      await Comment.populate(newComment, { 
        path: "parentId", 
        populate: { path: "userId", select: "username" },
        select: "content createdAt" 
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: newComment,
      commentCount: post.commentCount
    });
  } catch (err) {
    console.error("Comment Error:", err);
    res.status(500).json({ message: "Error adding comment", error: err.message });
  }
});

// Get comments for a post with pagination

router.get("/:id/comments", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, skip = 0, parentId } = req.query;  // Pagination + filter replies

    const query = { post: id };
    if (parentId) query.parentId = parentId;

    const comments = await Comment.find(query)
      .populate("user", "username profileImage")
      .populate("parentId", "content user")  // For context
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.status(200).json({ comments, total, commentCount: (await Post.findById(id)).commentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
