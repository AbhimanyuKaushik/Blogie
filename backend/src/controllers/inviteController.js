const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Invite = require("../models/Invite.js");
const mongoose = require("mongoose");
const Notification = require("../models/Notification.js");

exports.acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;

    const invite = await Invite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (invite.receiver.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const post = await Post.findById(invite.post);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const already = post.collaborators.some(
      (c) => c.user.toString() === invite.receiver.toString(),
    );

    if (!already) {
      post.collaborators.push({
        user: invite.receiver,
        role: invite.role,
      });
    }

    invite.status = "accepted";

    await invite.save();
    await post.save();

    res.json({ message: "Invitation accepted", post });
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.rejectInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;

    const invite = await Invite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    invite.status = "rejected";
    await invite.save();

    res.json({ message: "Invite rejected" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvites = async (req, res) => {
  try {
    const invites = await Invite.find({
      receiver: req.session.user._id,
      status: "pending",
    })
      .populate("post", "title")
      .populate("sender", "username");

    res.json(invites);
  } catch (error) {
    console.error("Get invites error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createInvite = async (req, res) => {
  try {
    const { postId } = req.params;
    const { receiverId, role } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingInvite = await Invite.findOne({
      post: postId,
      receiver: receiverId,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(400).json({ message: "Invite already exists" });
    }

    const invite = new Invite({
      post: postId,
      sender: req.session.user._id,
      receiver: receiverId,
      role: role || "viewer",
    });

    await invite.save();
    await invite.populate("receiver", "username email");
    await invite.populate("sender", "username");

    res.status(201).json(invite);
  } catch (error) {
    console.error("Create invite error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
