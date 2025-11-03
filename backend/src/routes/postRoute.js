const express = require("express");
const Post = require("../models/Post.js");

const router = express.Router();

// Create a new post
router.post("/", async (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    const newPost = new Post({ title, content, author, tags });

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
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single post by ID
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    res.status(200).json(post);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching post", error: err.message });
  }
});

// Update a post
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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

// Like/Unlike a post
router.post("/:id/act", async (req, res) => {
  try {
    const {action} = req.body;

    if (action != "Like" && action != "Unlike") {
      return res
        .status(400)
        .json({ message: "Invalid action. Use 'Like' or 'Unlike'." });
    }

    const counter = action === "Like" ? 1 : -1;

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { likesCount: counter } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.likesCount < 0) {
      post.likesCount = 0;
      await post.save();
    }

    res
      .status(200)
      .json({
        message: `Post ${action === "Like" ? "liked" : "unliked"} successfully`,
        likesCount: post.likesCount,
      });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating like status", error: err.message });
  }
});

module.exports = router;
