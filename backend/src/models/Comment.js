const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  parentId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Comment",
    default:null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt:{
    type: Date,
    default: Date.now,
  }
});

CommentSchema.index({postId:1,createdAt:-1});
CommentSchema.index({userId:1});
CommentSchema.index({parentId:1});

module.exports = mongoose.model("Comment", CommentSchema);