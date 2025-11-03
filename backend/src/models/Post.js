const mongoose = require("mongoose");
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    default: "Anonymous",
  },
  tags: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likesCount:{
    type: Number,
    default: 0,
  },
  commentCount:{
    type: Number,
    default: 0,
  }
});

module.exports = mongoose.model("Post", postSchema);