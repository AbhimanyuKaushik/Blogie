const express = require("express");
const auth = require("../middleware/auth.js");
const userController = require("../controllers/userController.js");

const router = express.Router();

// Register User
router.post("/register", userController.registerUser);

// Login User
router.post("/login", userController.loginUser);

// Logout User
router.post("/logout", auth, userController.logoutUser);

// Search Users
router.get("/search", userController.searchUsers);

// Get User's saved posts
router.get("/me/saved", auth, userController.savedPosts);

// Follow User
router.post("/:id/follow", auth, userController.followUser);

// Unfollow User
router.post("/:id/unfollow", auth, userController.unfollowUser);

module.exports = router;