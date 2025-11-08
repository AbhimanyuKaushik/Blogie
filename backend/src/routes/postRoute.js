const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post.js");
const Like = require("../models/Like.js");
const Comment = require("../models/Comment.js");
const auth = require("../middleware/auth.js");
const CommentLike = require("../models/CommentLike.js");
const router = express.Router();

// Create a new post
router.post("/", auth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const newPost = new Post({ title, content, author: req.user.id, tags });

    //New post and its id stored in session
    req.session.lastAction="createdPost"
    req.session.lastPostId=newPost._id;

    await newPost.save();
    await newPost.populate("author", "username profileImage");
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
router.put("/:id", auth, async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedPost)
      return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this post" });
    }
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
    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this post" });
    }
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

    // Prevent duplicate like
    const existingLike = await Like.findOne({ user: userId, post: id });
    if (existingLike) {
      return res.status(400).json({ message: "Already liked" });
    }

    // Create like
    await new Like({ user: userId, post: id }).save();

    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select("likesCount");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      message: "Post liked successfully",
      likesCount: post.likesCount,
    });
  } catch (err) {
    console.error("Like Error:", err);
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
    ).select("likesCount");

    if (post.likesCount < 0) {
      post.likesCount = 0;
      await post.save();
    }

    res.json({ message: "Post unliked", likesCount: post.likesCount });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error unliking post", error: err.message });
  }
});

// Get people who liked a post
router.get("/:postId/likes",async(req,res)=>{
  try {
    const {postId} = req.params;
    const {limit = 10,skip=0} = req.query;

    //Validate post exists
    const post = await Post.findById(postId);
    if(!post){
      return res.status(404).json({message:"Page not found"});
    }

    // Fetch likes with user data
    const likes =  await Like.find({post:postId})
    .populate("user","username profileImage")
    .sort({createdAt:-1})
    .skip(parseInt(skip))
    .limit(parseInt(limit));

    const total = await Like.countDocuments({post:postId});

    // Format response 
    const likers = likes.map(like=>({
      _id: like.user._id,
      username:like.user.username,
      profileImage:like.user.profileImage,
      likedAt:like.createdAt,
    }));

    res.status(200).json({
      likers,
      total,
      likesCount:post.likesCount,
      hasmore:skip+likers.length<total,
    });
  } catch (error) {
    console.error("Get Likers Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Comment on a post
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let { content, parentId } = req.body || {};

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Content is required and must be a non-empty string",
      });
    }

    const trimmedContent = content.trim();

    let validatedParentId = null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
      validatedParentId = parentId;

      const parent = await Comment.findOne({ _id: parentId, postId: id });
      if (!parent) {
        return res.status(400).json({ message: "Invalid parent comment" });
      }
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newComment = new Comment({
      postId: id,
      userId: userId,
      content: trimmedContent,
      parentId: validatedParentId,
    });
    await newComment.save();

    post.commentCount += 1;
    await post.save();

    await Comment.populate(newComment, {
      path: "userId",
      select: "username profileImage",
    });
    if (newComment.parentId) {
      await Comment.populate(newComment, {
        path: "parentId",
        populate: { path: "userId", select: "username" },
        select: "content createdAt",
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: newComment,
      commentCount: post.commentCount,
    });
  } catch (err) {
    console.error("Comment Error:", err);
    res
      .status(500)
      .json({ message: "Error adding comment", error: err.message });
  }
});

// Get comments for a post with pagination
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, skip = 0, parentId } = req.query;

    const query = { postId: id };
    if (parentId) query.parentId = parentId;

    const comments = await Comment.find({ postId: id })
      .populate("userId", "username profileImage")
      .populate("parentId", "content")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments(query);

    res.status(200).json({
      comments,
      total,
      commentCount: (await Post.findById(id)).commentCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Comment by ID
router.delete("/:postId/comments/:commentId", auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Comment.deleteOne({ _id: commentId });
    await Post.findByIdAndUpdate(postId, { $INC: { commentCount: -1 } });

    res.json({ message: "Comment Deleted" });
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
});

// Edit comment by ID
router.put("/:postId/commnets/:commentId", auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      req.body,
      {
        new: true,
      }
    );
    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating comment", error: err.message });
  }
});

// Like a Comment
router.post("/:postId/comments/:commentId/like", auth, async (req, res) => {
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

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: 1 } },
      { new: true }
    ).select("likesCount");

    res.json({
      message: "Comment liked",
      likesCount: updatedComment.likesCount,
    });
  } catch (err) {
    console.error("Comment Like Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Unlike a Comment
router.delete("/:postId/comments/:commentId/like", auth, async (req, res) => {
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

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: -1 } },
      { new: true }
    ).select("likedCount");

    if (updatedComment.likesCount < 0) {
      updatedComment.likesCount = 0;
      await updatedComment.save();
    }

    res.json({
      message: "Comment unliked",
      likesCount: updatedComment.likesCount,
    });
  } catch (error) {
    console.error("Comment Unlike Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
