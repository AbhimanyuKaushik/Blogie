const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/feed",auth, async(req,res)=>{
    try {
        const userId = req.user.id;
        const {limit = 10, skip = 0} = req.query;

        // Get current user's following list
        const currentUser = await User.findById(userId).select("following");
        if(!currentUser) return res.status(404).json({message:"User not found"});

        const followingIds = currentUser.following.map(id=>id.toString());

        // Include current user + poeple they follow
        const feedAuthorIds = [userId, ...followingIds];

        // Fetch posts from these authors
        const posts = await Post.find({ author: {$in: feedAuthorIds}})
            .populate("author","username profileImage")
            .sort({createdAt:-1})
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        // Total count for pagination
        const total = await Post.countDocuments({ author: { $in: feedAuthorIds}});

        res.json({
            posts,
            total,
            hasMore: parseInt(skip) + posts.length < total,
        });
    } catch (error) {
        console.error("Feed Error:",error);
        res.status(500).json({ error: error.message})
    }
});

module.exports = router;