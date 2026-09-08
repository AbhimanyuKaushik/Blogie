const mongoose = require("mongoose");
const crypto = require("crypto");
const Post = require("../models/Post.js");
const User = require("../models/User.js");
const Like = require("../models/Like.js");
const Comment = require("../models/Comment.js");
const CommentLike = require("../models/CommentLike.js");
const Invite = require("../models/Invite.js");
const Notification = require("../models/Notification.js");
const {
  canEditPost,
  canManageCollaborators,
  getUserRole,
} = require("../utils/collaboration.js");

// --------------------- CREATE POST ---------------------
exports.createPost = async (req, res) => {
  try {
    const { title, document, tags } = req.body;

    if (!title || !document)
      return res.status(400).json({ message: "Missing fields" });

    const newPost = new Post({
      title,
      document,
      author: req.session.user._id,
      tags: tags || [],
    });

    await newPost.save();
    await newPost.populate("author", "username profileImage");

    res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });

    console.log("SESSION USER:", req.session.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- CREATE COLLABORATIVE DRAFT ---------------------
exports.createDraft = async (req, res) => {
  try {
    const { title, document, tags } = req.body;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!document) {
      return res.status(400).json({ message: "Document is required" });
    }

    if (
      typeof document.schemaVersion !== "number" ||
      !Array.isArray(document.blocks)
    ) {
      return res.status(400).json({
        message:
          "Invalid document format. schemaVersion and blocks are required.",
      });
    }

    const draft = new Post({
      title:
        typeof title === "string" && title.trim()
          ? title.trim()
          : "Untitled draft",
      document,
      author: userId,
      tags: Array.isArray(tags) ? tags : [],
      status: "draft",
      collaborationEnabled: true,
      collaborators: [],
    });

    await draft.save();
    await draft.populate("author", "username profileImage");

    return res.status(201).json({
      message: "Collaborative draft created",
      post: draft,
    });
  } catch (error) {
    console.error("CREATE DRAFT ERROR:", error);
    return res.status(500).json({
      message: "Failed to create collaborative draft",
      error: error.message,
    });
  }
};

// --------------------- GET POSTS ---------------------
exports.getAllPosts = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    console.log("SESSION USER IN GET ALL:", req.session.user);
    // Get posts as plain JS objects (important!)
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", "username profileImage")
      .lean();

    if (userId) {
      const likedPosts = await Like.find({ user: userId }).select("post");
      const user = await User.findById(userId).select("savedPosts");

      const likedSet = new Set(likedPosts.map((l) => l.post.toString()));
      const savedSet = new Set(user?.savedPosts.map((p) => p.toString()) || []);

      posts.forEach((post) => {
        post.isLiked = likedSet.has(post._id.toString());
        post.isSaved = savedSet.has(post._id.toString());
      });
    }

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- GET SINGLE POST ---------------------
exports.getPostById = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    // Increment views and fetch updated post in ONE operation
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { $inc: { views: 1 } },
      { new: true }, // return updated document
    )
      .populate("author", "username profileImage")
      .populate("collaborators.user", "username profileImage")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });

    if (userId) {
      const liked = await Like.findOne({
        user: userId,
        post: post._id,
      });

      const user = await User.findById(userId).select("savedPosts");

      post.isLiked = !!liked;

      post.isSaved =
        user?.savedPosts
          .map((p) => p.toString())
          .includes(post._id.toString()) || false;

      post.currentUserRole = getUserRole(post, userId);
      post.canEdit = canEditPost(post, userId);
      post.canManageCollaborators = canManageCollaborators(post, userId);
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// --------------------- UPDATE POST ---------------------
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, document, tags } = req.body;

    if (
      !document ||
      typeof document.schemaVersion !== "number" ||
      !Array.isArray(document.blocks)
    ) {
      return res.status(400).json({
        message:
          "Invalid document format. schemaVersion and blocks are required.",
      });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    if (!canEditPost(post, userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    post.versions.push({
      document: post.document,
      editedBy: userId,
    });

    post.document = document;
    if (typeof title === "string") {
      post.title = title.trim() || "Untitled draft";
    }
    if (Array.isArray(tags)) {
      post.tags = tags;
    }

    await post.save();
    await post.populate("author", "username profileImage");
    await post.populate("collaborators.user", "username profileImage");

    return res.json({ message: "Post updated", post });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    return res.status(500).json({
      message: "Failed to update post",
      error: error.message,
    });
  }
};

// --------------------- DELETE POST ---------------------
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting post", error: error.message });
  }
};

// --------------------- LIKE POST ---------------------
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    const like = await Like.create({ user: userId, post: postId });

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: 1 } },
      { new: true },
    ).select("likesCount");

    res.json({ liked: true, likesCount: post.likesCount });
  } catch (err) {
    if (err.code === 11000) {
      // Already liked → still return current count (nice for frontend)
      const post = await Post.findById(postId).select("likesCount");
      return res
        .status(200)
        .json({ liked: true, likesCount: post?.likesCount || 0 });
    }

    console.error(err);
    res.status(500).json({ message: "Error liking post" });
  }
};

// --------------------- UNLIKE POST ---------------------
exports.unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    const removed = await Like.findOneAndDelete({
      user: userId,
      post: postId,
    });

    if (!removed) {
      return res.status(400).json({ message: "Not liked yet" });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true },
    ).select("likesCount");

    res.status(200).json({
      liked: false,
      likesCount: post.likesCount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error unliking post",
      error: err.message,
    });
  }
};

// --------------------- GET PEOPLE WHO LIKED POST ---------------------
exports.getPeopleWhoLikedPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const likes = await Like.find({ post: postId })
      .populate("user", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Like.countDocuments({ post: postId });

    res.status(200).json({
      likers: likes.map((l) => ({
        _id: l.user._id,
        username: l.user.username,
        profileImage: l.user.profileImage,
        likedAt: l.createdAt,
      })),
      total,
      likesCount: post.likesCount,
      hasMore: skip + likes.length < total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- ADD COMMENT ---------------------
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;
    const { content, parentId } = req.body;

    if (!content || !content.trim())
      return res.status(400).json({ message: "Content is required" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (parentId && !mongoose.Types.ObjectId.isValid(parentId))
      return res.status(400).json({ message: "Invalid parentId" });

    const newComment = await Comment.create({
      postId,
      userId,
      content: content.trim(),
      parentId: parentId || null,
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    await newComment.populate("userId", "username profileImage");

    res.status(201).json({ message: "Comment added", comment: newComment });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding comment", error: error.message });
  }
};

// --------------------- GET COMMENTS ---------------------
exports.getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, skip = 0, parentId } = req.query;

    const query = { postId };
    if (parentId) query.parentId = parentId;

    const comments = await Comment.find(query)
      .populate("userId", "username profileImage")
      .populate("parentId", "content")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.status(200).json({ comments, total });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- DELETE COMMENT ---------------------
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.session.user._id;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.userId.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });

    await Comment.findByIdAndDelete(commentId);
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- EDIT COMMENT ---------------------
exports.editComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.userId.toString() !== req.session.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    comment.content = content || comment.content;
    comment.updatedAt = new Date();

    await comment.save();

    res.json({ message: "Comment updated", comment });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- LIKE COMMENT ---------------------
exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user._id;

    const existing = await CommentLike.findOne({
      user: userId,
      comment: commentId,
    });
    if (existing) return res.status(400).json({ message: "Already liked" });

    await new CommentLike({ user: userId, comment: commentId }).save();

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: 1 } },
      { new: true },
    ).select("likesCount");

    res.json({ message: "Comment liked", likesCount: updated.likesCount });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- UNLIKE COMMENT ---------------------
exports.unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user._id;

    const deleted = await CommentLike.findOneAndDelete({
      user: userId,
      comment: commentId,
    });

    if (!deleted) return res.status(400).json({ message: "Not liked yet" });

    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { likesCount: -1 } },
      { new: true },
    ).select("likesCount");

    res.json({ message: "Comment unliked", likesCount: updated.likesCount });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- SAVE / UNSAVE POST ---------------------
exports.savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.session.user._id);

    if (user.savedPosts.includes(postId))
      return res.status(400).json({ message: "Post already saved" });
    user.savedPosts.push(postId);
    await user.save();

    res.json({ message: "Post saved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error });
  }
};

exports.unsavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.session.user._id);

    const before = user.savedPosts.length;

    user.savedPosts = user.savedPosts.filter(
      (p) => p.toString() !== postId.toString(),
    );

    if (user.savedPosts.length === before)
      return res.status(400).json({ message: "Post not saved yet" });

    await user.save();

    res.json({ message: "Post unsaved", savedCount: user.savedPosts.length });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- GET SAVED POSTS ---------------------
exports.getSavedPosts = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId)
      .populate({
        path: "savedPosts",
        populate: {
          path: "author",
          select: "username profileImage",
        },
      })
      .lean();

    const posts = user?.savedPosts || [];

    if (posts.length > 0) {
      const postIds = posts.map((p) => p._id);

      const likes = await Like.find({
        user: userId,
        post: { $in: postIds },
      })
        .select("post")
        .lean();

      const likedSet = new Set(likes.map((l) => l.post.toString()));

      posts.forEach((post) => {
        post.isLiked = likedSet.has(post._id.toString());
        post.isSaved = true; // Since these are saved posts
      });
    }
    res.json(user.savedPosts || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------- SEARCH POSTS ---------------------
exports.searchPosts = async (req, res) => {
  try {
    const { q, tag, limit = 10, skip = 0 } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }
    if (tag) query.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "username profileImage")
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);

    res.json({ posts, total, hasMore: skip + posts.length < total });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- ADD COLLABORATOR / SEND INVITE ---------------------
// --------------------- ADD COLLABORATOR ---------------------

exports.addCollaborator = async (req, res) => {
  try {
    const { postId } = req.params;

    const username =
      typeof req.body.username === "string" ? req.body.username.trim() : "";

    const role = req.body.role || "editor";

    // --------------------------------------------------
    // 1. Validate logged-in user
    // --------------------------------------------------

    const currentUser = req.session?.user;

    if (!currentUser?._id) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    const currentUserId = currentUser._id.toString();

    // --------------------------------------------------
    // 2. Validate request
    // --------------------------------------------------

    if (!username) {
      return res.status(400).json({
        message: "Username is required.",
      });
    }

    if (!["editor", "commenter"].includes(role)) {
      return res.status(400).json({
        message: "Role must be either editor or commenter.",
      });
    }

    // --------------------------------------------------
    // 3. Find post
    // --------------------------------------------------

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    // --------------------------------------------------
    // 4. Check permission
    // Only the owner can invite collaborators
    // --------------------------------------------------

    if (!canManageCollaborators(post, currentUserId)) {
      return res.status(403).json({
        message: "You are not authorized to manage collaborators.",
      });
    }

    // --------------------------------------------------
    // 5. Find the user being invited
    // --------------------------------------------------

    const collaboratorUser = await User.findOne({
      username: {
        $regex: new RegExp(`^${username}$`, "i"),
      },
    });

    if (!collaboratorUser) {
      return res.status(404).json({
        message: `User "@${username}" was not found.`,
      });
    }

    const collaboratorUserId = collaboratorUser._id.toString();

    // --------------------------------------------------
    // 6. Prevent inviting yourself
    // --------------------------------------------------

    if (collaboratorUserId === currentUserId) {
      return res.status(400).json({
        message: "You cannot invite yourself as a collaborator.",
      });
    }

    // --------------------------------------------------
    // 7. Check existing collaborator
    // --------------------------------------------------

    const existingCollaborator = post.collaborators?.find(
      (entry) => entry.user && entry.user.toString() === collaboratorUserId,
    );

    if (existingCollaborator) {
      return res.status(400).json({
        message: "This user is already a collaborator.",
      });
    }

    // --------------------------------------------------
    // 8. Check for existing pending invite
    // --------------------------------------------------

    const existingInvite = await Invite.findOne({
      post: post._id,
      receiver: collaboratorUser._id,
      status: "pending",
    });

    if (existingInvite) {
      return res.status(400).json({
        message: "An invitation has already been sent to this user.",
      });
    }

    // --------------------------------------------------
    // 9. Create collaboration invite
    // --------------------------------------------------

    const invite = await Invite.create({
      post: post._id,
      sender: currentUser._id,
      receiver: collaboratorUser._id,
      role,
      status: "pending",
      token: crypto.randomUUID(),
    });

    // --------------------------------------------------
    // 10. Create notification
    //
    // IMPORTANT:
    // Your Notification schema uses:
    //
    // receiver
    // sender
    // type
    // post
    // message
    // read
    // --------------------------------------------------

    const notification = await Notification.create({
      receiver: collaboratorUser._id,
      sender: currentUser._id,
      type: "invite",
      post: post._id,
      message: `${currentUser.username || "Someone"} invited you to collaborate on "${post.title}".`,
      read: false,
    });

    console.log("[COLLABORATION INVITE CREATED]", {
      inviteId: invite._id.toString(),
      notificationId: notification._id.toString(),
      sender: currentUserId,
      receiver: collaboratorUserId,
      postId: post._id.toString(),
      role,
    });

    // --------------------------------------------------
    // 11. Populate response data
    // --------------------------------------------------

    await invite.populate("sender", "username profileImage");

    await invite.populate("receiver", "username profileImage");

    // --------------------------------------------------
    // 12. Send response
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: `Invitation sent to @${collaboratorUser.username}.`,
      invite,
      notification,
    });
  } catch (error) {
    console.error("[ADD COLLABORATOR ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send collaboration invitation.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// --------------------- REMOVE COLLABORATOR ---------------------
exports.removeCollaborator = async (req, res) => {
  try {
    const { postId } = req.params;
    const { username } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (!canManageCollaborators(post, req.session.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const before = post.collaborators.length;

    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ message: "User not found" });

    post.collaborators = post.collaborators.filter(
      (c) => c.user.toString() !== user._id.toString(),
    );

    if (post.collaborators.length === before)
      return res.status(400).json({ message: "User is not a collaborator" });

    await post.save();

    await post.populate("collaborators.user", "username");
    res.json({ message: "Collaborator removed", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- UPDATE COLLABORATOR ROLE ---------------------
exports.updateCollaboratorRole = async (req, res) => {
  try {
    const { postId } = req.params;
    const { username, role } = req.body;

    const validRoles = ["editor", "commenter"];
    if (!validRoles.includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (!canManageCollaborators(post, req.session.user._id.toString()))
      return res.status(403).json({ message: "Not authorized" });

    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ message: "User not found" });

    const collab = post.collaborators.find(
      (c) => c.user.toString() === user._id.toString(),
    );

    if (!collab) return res.status(400).json({ message: "Not a collaborator" });

    collab.role = role;
    await post.save();
    await post.populate("collaborators.user", "username");

    res.json({ message: "Collaborator role updated", post });
  } catch (error) {
    res.status(500).json({ error });
  }
};

// --------------------- PUBLISH / UNPUBLISH POST ---------------------
exports.publishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only the post owner can publish this post" });
    }

    post.status = "published";
    await post.save();

    await post.populate("author", "username profileImage");
    await post.populate("collaborators.user", "username profileImage");

    return res.json({ message: "Post published", post });
  } catch (error) {
    console.error("PUBLISH POST ERROR:", error);
    return res.status(500).json({
      message: "Failed to publish post",
      error: error.message,
    });
  }
};

exports.unpublishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only the post owner can unpublish this post" });
    }

    post.status = "draft";
    await post.save();

    await post.populate("author", "username profileImage");
    await post.populate("collaborators.user", "username profileImage");

    return res.json({ message: "Post unpublished", post });
  } catch (error) {
    console.error("UNPUBLISH POST ERROR:", error);
    return res.status(500).json({
      message: "Failed to unpublish post",
      error: error.message,
    });
  }
};

// --------------------- AUTOSAVE ---------------------
exports.autoSave = async (req, res) => {
  try {
    const { postId } = req.params;
    const { document } = req.body;

    if (
      !document ||
      typeof document.schemaVersion !== "number" ||
      !Array.isArray(document.blocks)
    ) {
      return res.status(400).json({
        message:
          "Invalid document format. schemaVersion and blocks are required.",
      });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    if (!canEditPost(post, userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this post" });
    }

    post.document = document;
    post.lastAutoSavedAt = new Date();

    await post.save();

    return res.json({
      message: "Autosaved",
      post,
      lastSaved: post.lastAutoSavedAt,
    });
  } catch (error) {
    console.error("AUTOSAVE ERROR:", error);
    return res.status(500).json({
      message: "Failed to autosave post",
      error: error.message,
    });
  }
};

// --------------------- TOGGLE COLLABORATION ---------------------
exports.toggleCollaboration = async (req, res) => {
  try {
    const { postId } = req.params;
    const { enabled } = req.body; // boolean

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.session.user._id.toString();

    // Only owner can toggle collaboration
    if (!canManageCollaborators(post, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.collaborationEnabled = Boolean(enabled);
    await post.save();

    await post.populate("author", "username profileImage");
    await post.populate("collaborators.user", "username profileImage");

    res.json({
      message: `Collaboration ${post.collaborationEnabled ? "enabled" : "disabled"}`,
      post,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
