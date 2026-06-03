// server.js

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const { createServer } = require("http");
const { Server } = require("socket.io");

dotenv.config();

const sessionMiddleware =
  require("./src/middleware/session.js");

const postRoutes =
  require("./src/routes/postRoute.js");

const userRoutes =
  require("./src/routes/userRoute.js");

const profileRoutes =
  require("./src/routes/profileRoute.js");

const feedRoute =
  require("./src/routes/feedRoute.js");

const authRoutes =
  require("./src/routes/authRoute.js");

const statsRoute =
  require("./src/routes/statsRoute.js");

const app = express();

const server =
  createServer(app);

// --------------------------------------
// CORS
// --------------------------------------

app.use(
  cors({
    origin:
      "http://localhost:3000",

    credentials:
      true,
  }),
);

// --------------------------------------
// BODY PARSER
// --------------------------------------

app.use(
  express.json(),
);

// --------------------------------------
// SESSION
// --------------------------------------

app.use(
  sessionMiddleware,
);

// --------------------------------------
// DATABASE
// --------------------------------------

mongoose
  .connect(
    process.env.MONGO_URL,
  )
  .then(() => {
    console.log(
      "Connected to MongoDB",
    );
  })
  .catch(
    console.error,
  );

// --------------------------------------
// ROUTES
// --------------------------------------

app.get(
  "/",
  (
    req,
    res,
  ) => {
    res.send(
      "Backend is Running!",
    );
  },
);

app.use(
  "/api/auth",
  authRoutes,
);

app.use(
  "/api/posts",
  postRoutes,
);

app.use(
  "/api/users",
  userRoutes,
);

app.use(
  "/api/profile",
  profileRoutes,
);

app.use(
  "/api/feed",
  feedRoute,
);

app.use(
  "/api/stats",
  statsRoute,
);

// --------------------------------------
// SOCKET.IO
// --------------------------------------

const io =
  new Server(
    server,
    {
      cors: {
        origin:
          "http://localhost:3000",

        credentials:
          true,
      },
    },
  );

// expose to controllers

app.set(
  "io",
  io,
);

const activeUsers =
  new Map();

app.set(
  "activeUsers",
  activeUsers,
);

// --------------------------------------
// COLLABORATION NAMESPACE
// --------------------------------------

const collaboration =
  io.of(
    "/collaboration",
  );

// --------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------

collaboration.use(
  (
    socket,
    next,
  ) => {

    sessionMiddleware(
      socket.request,
      {},
      (
        err,
      ) => {

        if (err) {
          return next(
            err,
          );
        }

        const session =
          socket.request
            .session;

        if (
          !session ||
          !session.user
        ) {
          console.log(
            "Unauthorized socket connection",
          );

          return next(
            new Error(
              "Unauthorized",
            ),
          );
        }

        socket.user =
          session.user;

        next();
      },
    );
  },
);

// --------------------------------------
// CONNECTION
// --------------------------------------

collaboration.on(
  "connection",
  (
    socket,
  ) => {

    console.log(
      "Socket connected:",
      socket.user
        .username,
    );

    // ---------------------------
    // REGISTER USER
    // ---------------------------

    socket.on(
      "register-user",
      (
        userId,
      ) => {

        if (
          !userId
        ) {
          return;
        }

        activeUsers.set(
          userId.toString(),
          socket.id,
        );

        console.log(
          "User registered:",
          userId.toString(),
        );

        console.log(
          "Active users:",
          activeUsers.size,
        );
      },
    );

    // ---------------------------
    // JOIN POST
    // ---------------------------

    socket.on(
      "join:post",
      ({
        postId,
      }) => {

        if (
          !postId
        ) {
          return;
        }

        socket.join(
          postId,
        );

        console.log(
          `Socket ${socket.id} joined post ${postId}`,
        );

        socket
          .to(
            postId,
          )
          .emit(
            "user:joined",
            {
              socketId:
                socket.id,

              username:
                socket.user
                  .username,
            },
          );
      },
    );

    // ---------------------------
    // LEAVE POST
    // ---------------------------

    socket.on(
      "leave:post",
      ({
        postId,
      }) => {

        if (
          !postId
        ) {
          return;
        }

        socket.leave(
          postId,
        );

        console.log(
          `Socket ${socket.id} left post ${postId}`,
        );
      },
    );

    // ---------------------------
    // EDITOR OPS
    // ---------------------------

    socket.on(
      "editor-operation",
      ({
        documentId,
        operation,
      }) => {

        if (
          !documentId ||
          !operation
        ) {
          return;
        }

        socket
          .to(
            documentId,
          )
          .emit(
            "receive-operation",
            operation,
          );
      },
    );

    // ---------------------------
    // CURSOR
    // ---------------------------

    socket.on(
      "cursor-update",
      ({
        documentId,
        cursor,
      }) => {

        if (
          !documentId ||
          !cursor
        ) {
          return;
        }

        socket
          .to(
            documentId,
          )
          .emit(
            "remote-cursor",
            {
              userId:
                socket.user
                  ._id,

              username:
                socket.user
                  .username,

              cursor,
            },
          );
      },
    );

    // ---------------------------
    // DISCONNECT
    // ---------------------------

    socket.on(
      "disconnect",
      () => {

        for (
          const [
            userId,
            socketId,
          ] of activeUsers.entries()
        ) {
          if (
            socketId ===
            socket.id
          ) {
            activeUsers.delete(
              userId,
            );

            break;
          }
        }

        console.log(
          "Socket disconnected:",
          socket.id,
        );

        console.log(
          "Remaining active users:",
          activeUsers.size,
        );
      },
    );
  },
);

// --------------------------------------
// START
// --------------------------------------

const PORT =
  process.env.PORT ||
  5000;

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`,
    );
  },
);