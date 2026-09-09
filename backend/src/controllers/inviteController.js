const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Invite = require("../models/Invite.js");
const Notification = require("../models/Notification.js");
const crypto = require("crypto");

/* ============================================================
   ACCEPT INVITATION BY TOKEN
============================================================ */

exports.acceptInviteByToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Token is required",
      });
    }

    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    /* ----------------------------------------------------------
       FIND INVITATION
    ---------------------------------------------------------- */

    const invite = await Invite.findOne({ token });

    if (!invite) {
      return res.status(404).json({
        message: "Invalid invitation token",
      });
    }

    /* ----------------------------------------------------------
       CHECK STATUS
    ---------------------------------------------------------- */

    if (invite.status !== "pending") {
      return res.status(400).json({
        message: "Invitation is no longer valid",
      });
    }

    /* ----------------------------------------------------------
       CHECK EXPIRATION
    ---------------------------------------------------------- */

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    /* ----------------------------------------------------------
       VERIFY RECEIVER
    ---------------------------------------------------------- */

    if (invite.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "This invitation is for another user",
      });
    }

    /* ----------------------------------------------------------
       FIND POST
    ---------------------------------------------------------- */

    const post = await Post.findById(invite.post);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    /* ----------------------------------------------------------
       ADD COLLABORATOR
    ---------------------------------------------------------- */

    const alreadyCollaborator =
      Array.isArray(post.collaborators) &&
      post.collaborators.some(
        (collaborator) => collaborator.user?.toString() === userId.toString(),
      );

    if (!alreadyCollaborator) {
      post.collaborators.push({
        user: userId,
        role: invite.role || "editor",
      });
    }

    /* ----------------------------------------------------------
       MAKE SURE COLLABORATION IS ENABLED
    ---------------------------------------------------------- */

    post.collaborationEnabled = true;

    await post.save();

    /* ----------------------------------------------------------
       ACCEPT INVITE
    ---------------------------------------------------------- */

    invite.status = "accepted";

    await invite.save();

    /* ----------------------------------------------------------
       MARK RELATED NOTIFICATION READ
    ---------------------------------------------------------- */

    await Notification.updateMany(
      {
        receiver: userId,
        relatedInvite: invite._id,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    /* ----------------------------------------------------------
       RESPONSE
    ---------------------------------------------------------- */

    return res.status(200).json({
      success: true,
      message: "Invitation accepted",
      postId: post._id.toString(),
      role: invite.role || "editor",
      post: {
        _id: post._id,
        title: post.title,
      },
    });
  } catch (error) {
    console.error("[ACCEPT INVITE BY TOKEN ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ============================================================
   VALIDATE INVITATION TOKEN
============================================================ */

exports.validateInviteToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token })
      .populate("post", "title collaborationEnabled")
      .populate("sender", "username")
      .populate("receiver", "username");

    if (!invite) {
      return res.status(404).json({
        message: "Invalid invitation token",
      });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({
        message: "Invitation is no longer valid",
      });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      invite: {
        _id: invite._id,
        role: invite.role,
        status: invite.status,
        post: invite.post,
        sender: invite.sender,
        receiver: invite.receiver,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error("[VALIDATE INVITE TOKEN ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ============================================================
   ACCEPT INVITATION
============================================================ */

exports.acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;

    const userId = req.session?.user?._id;

    /* ----------------------------------------------------------
       AUTHENTICATION
    ---------------------------------------------------------- */

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    /* ----------------------------------------------------------
       FIND INVITATION
    ---------------------------------------------------------- */

    const invite = await Invite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({
        message: "Invitation not found.",
      });
    }

    /* ----------------------------------------------------------
       VERIFY RECEIVER
    ---------------------------------------------------------- */

    if (invite.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to accept this invitation.",
      });
    }

    /* ----------------------------------------------------------
       CHECK STATUS
    ---------------------------------------------------------- */

    if (invite.status !== "pending") {
      return res.status(400).json({
        message: "This invitation is no longer pending.",
      });
    }

    /* ----------------------------------------------------------
       CHECK EXPIRATION
    ---------------------------------------------------------- */

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(400).json({
        message: "This invitation has expired.",
      });
    }

    /* ----------------------------------------------------------
       FIND POST
    ---------------------------------------------------------- */

    const post = await Post.findById(invite.post);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    /* ----------------------------------------------------------
       CHECK EXISTING COLLABORATOR
    ---------------------------------------------------------- */

    const alreadyCollaborator =
      Array.isArray(post.collaborators) &&
      post.collaborators.some(
        (collaborator) => collaborator.user?.toString() === userId.toString(),
      );

    /* ----------------------------------------------------------
       ADD COLLABORATOR
    ---------------------------------------------------------- */

    if (!alreadyCollaborator) {
      post.collaborators.push({
        user: userId,
        role: invite.role || "editor",
      });
    }

    /* ----------------------------------------------------------
       ENABLE COLLABORATION
    ---------------------------------------------------------- */

    post.collaborationEnabled = true;

    await post.save();

    /* ----------------------------------------------------------
       MARK INVITE ACCEPTED
    ---------------------------------------------------------- */

    invite.status = "accepted";

    await invite.save();

    /* ----------------------------------------------------------
       MARK RELATED NOTIFICATION AS READ
    ---------------------------------------------------------- */

    await Notification.updateMany(
      {
        receiver: userId,
        relatedInvite: invite._id,
        type: "invite",
      },
      {
        $set: {
          read: true,
        },
      },
    );

    /* ----------------------------------------------------------
       RESPONSE
    ---------------------------------------------------------- */

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully.",

      postId: post._id.toString(),

      role: invite.role || "editor",

      post: {
        _id: post._id,
        title: post.title,
      },
    });
  } catch (error) {
    console.error("[ACCEPT INVITE ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to accept invitation.",
    });
  }
};

/* ============================================================
   REJECT INVITATION
============================================================ */

exports.rejectInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;

    const userId = req.session?.user?._id;

    /* ----------------------------------------------------------
       AUTHENTICATION
    ---------------------------------------------------------- */

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    /* ----------------------------------------------------------
       FIND INVITATION
    ---------------------------------------------------------- */

    const invite = await Invite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({
        message: "Invitation not found.",
      });
    }

    /* ----------------------------------------------------------
       VERIFY RECEIVER
    ---------------------------------------------------------- */

    if (invite.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized.",
      });
    }

    /* ----------------------------------------------------------
       CHECK STATUS
    ---------------------------------------------------------- */

    if (invite.status !== "pending") {
      return res.status(400).json({
        message: "Invitation is no longer pending.",
      });
    }

    /* ----------------------------------------------------------
       MARK REJECTED
    ---------------------------------------------------------- */

    invite.status = "rejected";

    await invite.save();

    /* ----------------------------------------------------------
       MARK RELATED NOTIFICATION READ
    ---------------------------------------------------------- */

    await Notification.updateMany(
      {
        receiver: userId,
        relatedInvite: invite._id,
        type: "invite",
      },
      {
        $set: {
          read: true,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Invitation rejected.",
    });
  } catch (error) {
    console.error("[REJECT INVITE ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject invitation.",
    });
  }
};

/* ============================================================
   GET PENDING INVITATIONS
============================================================ */

exports.getInvites = async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const invites = await Invite.find({
      receiver: userId,
      status: "pending",
    })
      .populate("post", "title")
      .populate("sender", "username")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error("[GET INVITES ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ============================================================
   CREATE INVITATION
============================================================ */

exports.createInvite = async (req, res) => {
  try {
    const { postId } = req.params;
    const { receiverId, role } = req.body;

    const senderId = req.session?.user?._id;

    if (!senderId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    /* ----------------------------------------------------------
       VALIDATE ROLE
    ---------------------------------------------------------- */

    const inviteRole = role === "commenter" ? "commenter" : "editor";

    /* ----------------------------------------------------------
       FIND POST
    ---------------------------------------------------------- */

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    /* ----------------------------------------------------------
       FIND RECEIVER
    ---------------------------------------------------------- */

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /* ----------------------------------------------------------
       PREVENT SELF INVITE
    ---------------------------------------------------------- */

    if (receiver._id.toString() === senderId.toString()) {
      return res.status(400).json({
        message: "You cannot invite yourself.",
      });
    }

    /* ----------------------------------------------------------
       CHECK EXISTING COLLABORATOR
    ---------------------------------------------------------- */

    const alreadyCollaborator =
      Array.isArray(post.collaborators) &&
      post.collaborators.some(
        (collaborator) =>
          collaborator.user?.toString() === receiverId.toString(),
      );

    if (alreadyCollaborator) {
      return res.status(400).json({
        message: "This user is already a collaborator.",
      });
    }

    /* ----------------------------------------------------------
       CHECK EXISTING INVITATION
    ---------------------------------------------------------- */

    const existingInvite = await Invite.findOne({
      post: postId,
      receiver: receiverId,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(400).json({
        message: "Invite already exists",
      });
    }

    /* ----------------------------------------------------------
       CREATE INVITATION
    ---------------------------------------------------------- */

    const invite = await Invite.create({
      post: postId,
      sender: senderId,
      receiver: receiverId,
      role: inviteRole,
      token: crypto.randomUUID(),
      status: "pending",
    });

    /* ----------------------------------------------------------
       CREATE NOTIFICATION
       
       IMPORTANT:
       relatedInvite stores the exact invite ID.
    ---------------------------------------------------------- */

    await Notification.create({
      receiver: receiverId,
      sender: senderId,
      type: "invite",
      post: post._id,
      relatedInvite: invite._id,
      message: `${req.session.user.username} invited you to collaborate on "${
        post.title
      }"`,
      read: false,
    });

    /* ----------------------------------------------------------
       POPULATE RESPONSE
    ---------------------------------------------------------- */

    await invite.populate("receiver", "username email");

    await invite.populate("sender", "username");

    await invite.populate("post", "title");

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully.",
      invite,
    });
  } catch (error) {
    console.error("[CREATE INVITE ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
