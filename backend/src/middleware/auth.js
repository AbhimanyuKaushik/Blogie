const dotenv = require("dotenv");
dotenv.config();

module.exports = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated. Please log in." });
  }
  next();
};