const session = require("express-session");

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60, 
    httpOnly: true,
    secure: false, 
  },
});

module.exports = sessionMiddleware;
