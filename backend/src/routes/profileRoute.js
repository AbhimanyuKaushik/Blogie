const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const userController = require("../controllers/userController");
const router = express.Router();
const upload = require("../middleware/multer");
const mongoose = require("mongoose");

// Get current user's profile
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile retrieved", profile: user });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get any user's public profile
router.get("/:userId", auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.session.user._id;

    // Validate target user ID
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(targetUserId).select(
      "username profileImage bio age location social interests followers following",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check whether the logged-in user already follows this profile
    const isFollowing = user.followers.some(
      (followerId) => followerId.toString() === currentUserId.toString(),
    );

    return res.status(200).json({
      message: "Profile retrieved",
      profile: user,
      isFollowing,
    });
  } catch (err) {
    console.error("Public profile error:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// Update current user's profile
router.patch("/me", auth, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { username, age, profileImage, bio, location, social, interests } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (username) user.username = username;
    if (age !== undefined) user.age = age;
    if (profileImage) user.profileImage = profileImage;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (social) user.social = { ...user.social, ...social };
    if (interests) user.interests = interests;

    await user.save();

    res.json({ message: "Profile updated successfully", profile: user });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/upload-profile-image",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      const userId = req.session.user._id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.profileImage = req.file.path;
      await user.save();
      res.json({
        message: "Profile Updated!",
        profileImage: user.profileImage,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Onboarding Completion
router.patch("/onboarding", auth, userController.completeOnboarding);

module.exports = router;
