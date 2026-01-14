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

const app = express();
const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
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


const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

const collaboration = io.of("/collaboration");

collaboration.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
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

  socket.on("join:post", ({ postId }) => {
    if (!postId) return;

    socket.join(postId);

    console.log(`Socket ${socket.id} joined post ${postId}`);

    socket.to(postId).emit("user:joined", {
      socketId: socket.id,
      username: socket.user.username,
    });
  });

  socket.on("leave:post", ({ postId }) => {
    if (!postId) return;

    socket.leave(postId);

    console.log(` Socket ${socket.id} left post ${postId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
