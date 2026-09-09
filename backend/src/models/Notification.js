const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  type: {
    type: String,
    enum: ["invite", "comment", "mention"],
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },

  // IMPORTANT:
  // Stores the exact invitation associated with this notification.
  relatedInvite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invite",
    default: null,
  },

  message: {
    type: String,
  },

  read: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
