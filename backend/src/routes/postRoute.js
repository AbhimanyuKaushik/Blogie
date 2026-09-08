const express = require("express");

const auth = require("../middleware/auth.js");
const postController = require("../controllers/postController.js");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CREATE / READ POSTS
|--------------------------------------------------------------------------
*/

// Create a normal post
router.post("/", auth, postController.createPost);

// Create an unpublished collaborative draft
//
// IMPORTANT:
// This must come before /:postId routes.
router.post("/draft", auth, postController.createDraft);

// Get all posts
router.get("/", auth, postController.getAllPosts);

// Search posts
router.get("/search", postController.searchPosts);

// Get all saved posts for current user
router.get("/saved", auth, postController.getSavedPosts);

/*
|--------------------------------------------------------------------------
| SINGLE POST
|--------------------------------------------------------------------------
*/

// Get post by ID
router.get("/:postId", auth, postController.getPostById);

// Update post
router.put("/:postId", auth, postController.updatePost);

// Delete post
router.delete("/:postId", auth, postController.deletePost);

/*
|--------------------------------------------------------------------------
| PUBLISH / UNPUBLISH
|--------------------------------------------------------------------------
*/

// Publish post
router.patch("/:postId/publish", auth, postController.publishPost);

// Unpublish post
router.patch("/:postId/unpublish", auth, postController.unpublishPost);

/*
|--------------------------------------------------------------------------
| AUTOSAVE
|--------------------------------------------------------------------------
*/

// Autosave post
router.patch("/:postId/autosave", auth, postController.autoSave);

/*
|--------------------------------------------------------------------------
| COLLABORATION
|--------------------------------------------------------------------------
*/

// Add collaborator / send invitation
router.post("/:postId/collaborators", auth, postController.addCollaborator);

// Remove collaborator
router.delete(
  "/:postId/collaborators",
  auth,
  postController.removeCollaborator,
);

// Update collaborator role
//
// Supported roles:
// - editor
// - commenter
router.patch(
  "/:postId/collaborators/role",
  auth,
  postController.updateCollaboratorRole,
);

// Enable / disable realtime collaboration
router.patch(
  "/:postId/collaboration",
  auth,
  postController.toggleCollaboration,
);

/*
|--------------------------------------------------------------------------
| LIKES
|--------------------------------------------------------------------------
*/

// Like post
router.post("/:postId/like", auth, postController.likePost);

// Unlike post
router.delete("/:postId/like", auth, postController.unlikePost);

// Get people who liked post
router.get("/:postId/likes", auth, postController.getPeopleWhoLikedPost);

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

// Add comment
router.post("/:postId/comment", auth, postController.addComment);

// Get comments
router.get("/:postId/comments", postController.getCommentsForPost);

// Delete comment
router.delete(
  "/:postId/comments/:commentId",
  auth,
  postController.deleteComment,
);

// Edit comment
router.put("/:postId/comments/:commentId", auth, postController.editComment);

/*
|--------------------------------------------------------------------------
| COMMENT LIKES
|--------------------------------------------------------------------------
*/

// Like comment
router.post(
  "/:postId/comments/:commentId/like",
  auth,
  postController.likeComment,
);

// Unlike comment
router.delete(
  "/:postId/comments/:commentId/like",
  auth,
  postController.unlikeComment,
);

/*
|--------------------------------------------------------------------------
| SAVED POSTS
|--------------------------------------------------------------------------
*/

// Save post
router.post("/:postId/save", auth, postController.savePost);

// Unsave post
router.delete("/:postId/save", auth, postController.unsavePost);

module.exports = router;
