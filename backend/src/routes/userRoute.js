const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const dotenv = require("dotenv");
const auth = require("../middleware/auth.js");
const Post = require("../models/Post.js");
const userController = require("../controllers/userController.js");
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_TOKEN;

// Register User

router.post("/register", userController.registerUser);

// Login User

router.post("/login", userController.loginUser);

// Logout User

router.post("/logout", userController.logoutUser);

// Get User's saved posts
router.get("/me/saved", auth, userController.savedPosts);

module.exports = router;
