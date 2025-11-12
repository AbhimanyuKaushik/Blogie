const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const dotenv = require("dotenv");
const auth = require("../middleware/auth.js");
const Post = require("../models/Post.js");
dotenv.config();

const JWT_SECRET = process.env.JWT_TOKEN;

exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hashSync(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    req.session.user = username;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.hashSync(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Logged in successfully",
      token,
      username: user.username,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logoutUser = async (req, res) => {
  req.session.destroy();
  return res.json({ message: "Logged out" });
};

exports.savedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, page = 1 } = req.query;

    const user = await User.findById(userId).select("savedPosts savedCount");
    const total = user.savedPosts.length;

    const savedPosts = await Post.find({ _id: { $in: user.savedPosts } })
      .populate("author", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    res.json({
      posts: savedPosts,
      total,
      savedCount: user.savedCount,
      hasMore: skip + savedPosts.length < total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
