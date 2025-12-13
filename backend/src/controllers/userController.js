const bcrypt = require("bcrypt");
const User = require("../models/User.js");
const dotenv = require("dotenv");
const Post = require("../models/Post.js");
dotenv.config();

exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
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
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(password, user.password, isMatch);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
    };

    res.json({
      message: "Logged in successfully",
      username: req.session.user.username,
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
    const userId = req.session.user._id;
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit); // Missing line

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

exports.searchUsers = async (req, res) => {
  try {
    const { query, limit = 10, skip = 0 } = req.query;

    if (!query || query.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Query must be at least 2 characters" });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("-password -email") // Don't expose email in search results
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await User.countDocuments({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    });

    res.json({ users, total, hasMore: parseInt(skip) + users.length < total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
