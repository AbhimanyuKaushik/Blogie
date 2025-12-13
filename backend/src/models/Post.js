const mongoose = require("mongoose");

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["editor", "commenter"],
      default: "editor",
    },
  },
  { _id: false }
);

const versionSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

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
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  collaborators: {
    type: [collaboratorSchema],
    default: [],
  },
  versions: {
    type: [versionSchema],
    default: [],
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  views: {
    type: Number,
    default: 0,
  },
  likesCount: {
    type: Number,
    default: 0,
  },
  commentCount: {
    type: Number,
    default: 0,
  },
  lastAutoSavedAt: {
    type: Date,
    default: null,
  },
});

postSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

postSchema.index({ author: 1, createdAt: -1 });

postSchema.index({
  title: "text",
  content: "text",
  tags: "text",
});

module.exports = mongoose.model("Post", postSchema);
