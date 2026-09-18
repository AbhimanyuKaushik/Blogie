const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const { createServer } = require("http");

// ─── Middleware ────────────────────────────────────────────────
const sessionMiddleware = require("./src/middleware/session.js");
const auth = require("./src/middleware/auth.js");

// ─── Routes ───────────────────────────────────────────────────
const authRoutes = require("./src/routes/authRoute.js");
const postRoutes = require("./src/routes/postRoute.js");
const userRoutes = require("./src/routes/userRoute.js");
const profileRoutes = require("./src/routes/profileRoute.js");
const feedRoute = require("./src/routes/feedRoute.js");
const statsRoute = require("./src/routes/statsRoute.js");
const inviteRoute = require("./src/routes/inviteRoute.js");
const notificationRoute = require("./src/routes/notificationRoute.js");
const liveblocksRoute = require("./src/routes/liveblocksRoute.js");

// ──────────────────────────────────────────────────────────────
// APP
// ──────────────────────────────────────────────────────────────

const app = express();

const server =
  createServer(app);

// --------------------------------------
// CORS
// --------------------------------------

// ──────────────────────────────────────────────────────────────
// CORS
// ──────────────────────────────────────────────────────────────

app.use(
  cors({
    origin:
      "http://localhost:3000",

    credentials:
      true,
  }),
);

// ──────────────────────────────────────────────────────────────
// BODY PARSING
// ──────────────────────────────────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────────────────────
// SESSION
// ──────────────────────────────────────────────────────────────

app.use(sessionMiddleware);

// ──────────────────────────────────────────────────────────────
// AUTH ROUTES
// ──────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);

// ──────────────────────────────────────────────────────────────
// DATABASE
// ──────────────────────────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// ──────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Blogie backend is running",
  });
});

// ──────────────────────────────────────────────────────────────
// PUBLIC / NORMAL API ROUTES
// ──────────────────────────────────────────────────────────────

app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/feed", feedRoute);
app.use("/api/stats", statsRoute);

// ──────────────────────────────────────────────────────────────
// AUTHENTICATED ROUTES
// ──────────────────────────────────────────────────────────────

app.use("/api/invites", auth, inviteRoute);

app.use("/api/notifications", auth, notificationRoute);

// ──────────────────────────────────────────────────────────────
// LIVEBLOCKS AUTHENTICATION
// ──────────────────────────────────────────────────────────────
//
// The frontend calls:
//
// POST /api/liveblocks/auth
//
// The `auth` middleware authenticates the Blogie user first.
// The Liveblocks controller then checks whether that user:
//
// owner    -> write
// editor   -> write
// commenter -> read
//
// IMPORTANT:
// The Liveblocks secret key NEVER goes to the frontend.
//

app.use("/api/liveblocks", liveblocksRoute);

// ──────────────────────────────────────────────────────────────
// 404 HANDLER
// ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ──────────────────────────────────────────────────────────────
// ERROR HANDLER
// ──────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Unhandled backend error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ──────────────────────────────────────────────────────────────
// HTTP SERVER
// ──────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8080;

server.listen(PORT, () => {
  console.log("======================================");
  console.log(`Blogie backend running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/`);
  console.log(`Liveblocks: http://localhost:${PORT}/api/liveblocks/auth`);
  console.log("Realtime: Liveblocks");
  console.log("======================================");
});

// ──────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ──────────────────────────────────────────────────────────────

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down...`);

  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      process.exit(0);
    } catch (error) {
      console.error("Error closing MongoDB:", error);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
