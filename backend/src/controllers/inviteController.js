const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Invite = require("../models/Invite.js");
const mongoose = require("mongoose");
const Notification = require("../models/Notification.js");
const crypto = require("crypto");

exports.acceptInviteByToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const invite = await Invite.findOne({ token });

    if (!invite) {
      return res.status(404).json({ message: "Invalid invitation token" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Invitation is no longer valid" });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    if (invite.receiver.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ message: "This invitation is for another user" });
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
      await post.save();
    }

    invite.status = "accepted";
    await invite.save();

    res.json({
      message: "Invitation accepted",
      postId: post._id.toString(),
      post,
    });
  } catch (error) {
    console.error("Accept invite by token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token })
      .populate("post", "title collaborationEnabled")
      .populate("sender", "username")
      .populate("receiver", "username");

    if (!invite) {
      return res.status(404).json({ message: "Invalid invitation token" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Invitation is no longer valid" });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    res.json({
      valid: true,
      invite: {
        _id: invite._id,
        role: invite.role,
        status: invite.status,
        post: invite.post,
        sender: invite.sender,
        receiver: invite.receiver,
      },
    });
  } catch (error) {
    console.error("Validate invite token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

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
