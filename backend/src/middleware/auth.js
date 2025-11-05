const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ error: "No Authorization header" });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "Invalid token format (use Bearer <token>)" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN || "mysecretkey");
    console.log("Decoded Token:", decoded);  // Debug: Check { id: "...", username: "..." }
    if (!decoded.id) {
      throw new Error("Token missing user ID");
    }
    req.user = decoded;  // { id: "...", username: "..." }
    next();
  } catch (err) {
    console.error("Auth Error:", err.message);  // Log to server
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired – login again" });
    }
    res.status(401).json({ error: "Invalid token" });
  }
};