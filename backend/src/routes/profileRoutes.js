const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

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
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "username profileImage bio age location social interests followers following"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile retrieved", profile: user });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update current user's profile
router.put("/me", auth, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { username, age, profileImage, bio, location, social, interests } = req.body;

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

module.exports = router;