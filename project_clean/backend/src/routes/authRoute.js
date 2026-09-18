const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Register new user
router.post("/register", userController.registerUser);

// Login user (creates session)
router.post("/login", userController.loginUser);

// Logout user (destroys session)
router.post("/logout", userController.logoutUser);

// Get currently logged-in user (session check)
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  res.json({
    authenticated: true,
    user: req.session.user,
  });
});

module.exports = router;
