const express = require("express");

const router = express.Router();
const userController = require("../controllers/userController.js");
const oauthController = require("../controllers/oauthController.js");
// Register new user
router.post("/register", userController.registerUser);

// -----------------------------------
// REGISTER
// -----------------------------------

router.post(
  "/register",
  userController.registerUser,
);

// -----------------------------------
// LOGIN
// -----------------------------------

router.post(
  "/login",
  userController.loginUser,
);

// -----------------------------------
// LOGOUT
// -----------------------------------

router.post(
  "/logout",
  userController.logoutUser,
);

// -----------------------------------
// CURRENT USER
// -----------------------------------

router.get(
  "/me",
  (req, res) => {

    if (
      !req.session.user
    ) {
      return res
        .status(401)
        .json({
          authenticated:
            false,
        });
    }

    return res.json({
      authenticated:
        true,

      _id:
        req.session.user
          ._id,

      user: {
        _id:
          req.session.user
            ._id,

        username:
          req.session.user
            .username,

        email:
          req.session.user
            .email,

        profileImage:
          req.session.user
            .profileImage || null,

        isOnboarded:
          req.session.user
            .isOnboarded,
      },
    });
  },
);

router.get("/google", oauthController.googleLogin);

router.get("/google/callback", oauthController.googleCallback);

module.exports = router;
