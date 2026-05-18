const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

dotenv.config();

const sessionMiddleware = require("./src/middleware/session.js");
const postRoutes = require("./src/routes/postRoute.js");
const userRoutes = require("./src/routes/userRoute.js");
const profileRoutes = require("./src/routes/profileRoute.js");
const feedRoute = require("./src/routes/feedRoute.js");
const auth = require("./src/middleware/auth.js");
const authRoutes = require("./src/routes/authRoute.js");
const statsRoute = require("./src/routes/statsRoute.js");
const inviteRoute = require("./src/routes/inviteRoute.js");
const notificationRoute = require("./src/routes/notificationRoute.js");
const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(sessionMiddleware);
app.use("/api/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => res.send("Backend is Running!"));

app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/feed", feedRoute);
app.use("/api/stats", statsRoute);
app.use("/api/invites", auth, inviteRoute);
app.use("/api/notifications", auth, notificationRoute);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

const collaboration = io.of("/collaboration");

collaboration.use((socket, next) => {
  sessionMiddleware(socket.request,socket.request.res || {}, next);
});

collaboration.on("connection", (socket) => {
  const session = socket.request.session;

  if (!session || !session.user) {
    console.log("Unauthorized socket connection");
    socket.disconnect(true);
    return;
  }

  socket.user = session.user;

  console.log("Socket connected:", socket.user.username);

  // Join a specific post room
  socket.on("join:post", ({ postId }) => {
    socket.join(postId);
    socket.to(postId).emit("user:joined", {
      userId: socket.user._id,
      username: socket.user.username,
    });
  });

  // Broadcast real-time changes
  socket.on("post:update", ({ postId, changes }) => {
    socket.to(postId).emit("post:updated", {
      postId,
      changes,
      updatedBy: socket.user.username,
      timestamp: Date.now(),
    });
  });

  // Leave post
  socket.on("leave:post", ({ postId }) => {
    socket.leave(postId);
    socket.to(postId).emit("user:left", {
      username: socket.user.username,
    });
  });

  // Track cursor movements
  socket.on("cursor:move", ({ postId, blockId, cursorPos }) => {
    if (!postId || blockId === undefined || cursorPos === undefined) return;

    socket.to(postId).emit("cursor:moved", {
      username: socket.user.username,
      blockId,
      cursorPos,
      timestamp: Date.now(),
    });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User ${socket.user.username} disconnected`);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
