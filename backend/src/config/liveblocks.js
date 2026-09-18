const { Liveblocks } = require("@liveblocks/node");

if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  throw new Error("LIVEBLOCKS_SECRET_KEY is not configured");
}

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});

module.exports = liveblocks;
