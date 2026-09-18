const dns = require("node:dns");

// Force Node to use Google's DNS
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils");

require("dotenv").config();

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
const yjsServer = createServer();

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

const wss = new WebSocketServer({ server: yjsServer });

wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});


server.listen(process.env.PORT || 8080, () => {
  console.log(`Server running on port ${process.env.PORT || 8080}`);
});

yjsServer.listen(5000, () => {
  console.log("Yjs websocket server running on port 5000");
});
