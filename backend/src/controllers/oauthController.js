const crypto = require("crypto");
const { google } = require("googleapis");

const User = require("../models/User");
const googleOAuth2Client = require("../config/googleConfig.js");

exports.googleLogin = async (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in the user's session.
    req.session.oauthState = state;

    const authorizationUrl = googleOAuth2Client.generateAuthUrl({
      access_type: "offline",

      scope: ["openid", "email", "profile"],

      state,

      include_granted_scopes: true,
    });

    return res.redirect(authorizationUrl);
  } catch (error) {
    console.error("GOOGLE OAUTH START ERROR:", error);

    return res.status(500).json({
      message: "Failed to start Google authentication",
    });
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Google rejected/cancelled authentication
    if (error) {
      console.error("GOOGLE OAUTH ERROR:", error);

      return res.redirect("http://localhost:3000/login?error=google_denied");
    }

    if (!code) {
      return res.redirect("http://localhost:3000/login?error=missing_code");
    }

    // ============================================
    // VERIFY OAUTH STATE
    // ============================================

    if (!state || !req.session.oauthState || state !== req.session.oauthState) {
      console.error("OAUTH STATE MISMATCH");

      return res.status(403).json({
        message: "Invalid OAuth state",
      });
    }

    delete req.session.oauthState;

    // ============================================
    // CREATE REQUEST-SPECIFIC GOOGLE CLIENT
    // ============================================

    const { google } = require("googleapis");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );

    // ============================================
    // EXCHANGE CODE FOR TOKENS
    // ============================================

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // ============================================
    // GET GOOGLE USER
    // ============================================

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data: googleUser } = await oauth2.userinfo.get();

    console.log("GOOGLE USER:", googleUser);

    if (!googleUser.email) {
      return res.redirect("http://localhost:3000/login?error=no_google_email");
    }

    // ============================================
    // FIND OR CREATE BLOGIE USER
    // ============================================

    const User = require("../models/User");

    let user = await User.findOne({
      email: googleUser.email.toLowerCase(),
    });

    // --------------------------------------------
    // NEW GOOGLE USER
    // --------------------------------------------

    if (!user) {
      const baseUsername =
        googleUser.name
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 20) || "user";

      let username = baseUsername;
      let counter = 1;

      while (await User.exists({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await User.create({
        username,
        email: googleUser.email.toLowerCase(),

        // Google account
        authProvider: "google",

        // New Google users must complete onboarding
        isOnboarded: false,

        profileImage: googleUser.picture || null,
      });

      console.log("NEW GOOGLE USER CREATED:", user._id);
    } else {
      console.log("EXISTING BLOGIE USER:", user._id);
    }

    // ============================================
    // CREATE BLOGIE SESSION
    // ============================================

    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      isOnboarded: user.isOnboarded,
    };

    // ============================================
    // SAVE SESSION
    // ============================================

    req.session.save((sessionError) => {
      if (sessionError) {
        console.error("SESSION SAVE ERROR:", sessionError);

        return res.redirect("http://localhost:3000/login?error=session_failed");
      }

      console.log("GOOGLE LOGIN SUCCESS:", user.email);

      // ============================================
      // REDIRECT BASED ON ONBOARDING STATUS
      // ============================================

      if (user.isOnboarded) {
        return res.redirect("http://localhost:3000/feed");
      }

      return res.redirect("http://localhost:3000/Onboarding");
    });
  } catch (error) {
    console.error("GOOGLE OAUTH CALLBACK ERROR:", error);

    return res.redirect("http://localhost:3000/login?error=google_failed");
  }
};
