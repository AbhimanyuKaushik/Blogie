const express = require("express");
const Post = require("../models/Post.js");
const Like = require("../models/Like.js");
const auth = require("../middleware/auth.js");
const router = express.Router();

// Create a new post
router.post("/", async (req, res) => {
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
    const posts = await Post.find().sort({ createdAt: -1 }).populate("author","username profileImage");
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single post by ID
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author","username profileImage");
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

// Like a post
router.post("/:id/like", auth,async (req, res) => {
  try {
    const { id } = req.params;
    const  userId  = req.user.id;

    const existingLike = await Like.findOne({user:userId,post:id});
    if(existingLike){
      return res.status(400).json({message:"Already liked"});
    }

    // Create like
    const like = new Like({user:userId,post:id});
    await like.save();

    //Update count
    await Post.findByIdAndUpdate(id, {$inc:{likesCount:1}});

    res.status(200).json({
      message:"Post liked successfully",
      likesCount:(await Post.findById(id).likesCount)
    });
  }catch(err){
    res.status(500).json({message:"Error liking post",error:err.message});
  }
});

// Unlike a post

router.delete("/:id/like",auth,async(req,res)=>{
  try{
    const {id} = req.params;
    const userId = req.user.id;

    // Delete like if exists
    const deleted = await Like.findOneAndDelete({user:userId,post:id});
    if(!deleted){
      return res.status(400).json({message:"Not liked yet"});
    }

    //Update count
    const post = await Post.findByIdAndUpdate(
      id,
      {$inc:{likesCount: -1}},
      {new:true}
    );
    if(post.likesCount<0){
      post.likesCount = 0;
      await post.save();
    }
    res.status(200).json({
      message:"Post unliked",
      likesCount:post.likesCount
    });
  } catch(err){
    res.status(500).json({message:"Error unliking post",error:err.message});
  }
})

module.exports = router;