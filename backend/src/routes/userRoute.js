const express = require("express");
const auth = require("../middleware/auth.js");
const userController = require("../controllers/userController.js");

const router = express.Router();

// Onboarding Completion
router.patch("/onboarding", auth, userController.completeOnboarding);

// Search Users
router.get("/search", userController.searchUsers);

// Get User's saved posts
router.get("/me/saved", auth, userController.savedPosts);

// Follow User
router.post("/:id/follow", auth, userController.followUser);

// Unfollow User
router.post("/:id/unfollow", auth, userController.unfollowUser);

module.exports = router;