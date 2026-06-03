const express = require("express");

const auth = require("../middleware/auth.js");

const postController = require(
  "../controllers/postController.js",
);

const router = express.Router();

// -----------------------------------------------------
// DRAFT + COLLABORATIVE EDITOR
// -----------------------------------------------------

router.post(
  "/draft",
  auth,
  postController.createDraftPost,
);

router.get(
  "/:postId/collaborative",
  auth,
  postController.getCollaborativePost,
);

router.patch(
  "/:postId/document",
  auth,
  postController.updateDocument,
);

// -----------------------------------------------------
// CRUD POSTS
// -----------------------------------------------------

router.post(
  "/",
  auth,
  postController.createPost,
);

router.get(
  "/",
  auth,
  postController.getAllPosts,
);

router.get(
  "/search",
  postController.searchPosts,
);

router.get(
  "/saved",
  auth,
  postController.getSavedPosts,
);

router.get(
  "/:postId",
  auth,
  postController.getPostById,
);

router.put(
  "/:postId",
  auth,
  postController.updatePost,
);

router.delete(
  "/:postId",
  auth,
  postController.deletePost,
);

// -----------------------------------------------------
// PUBLISH / UNPUBLISH
// -----------------------------------------------------

router.patch(
  "/:postId/publish",
  auth,
  postController.publishPost,
);

router.patch(
  "/:postId/unpublish",
  auth,
  postController.unpublishPost,
);

// -----------------------------------------------------
// LIKES
// -----------------------------------------------------

router.post(
  "/:postId/like",
  auth,
  postController.likePost,
);

router.delete(
  "/:postId/like",
  auth,
  postController.unlikePost,
);

router.get(
  "/:postId/likes",
  auth,
  postController.getPeopleWhoLikedPost,
);

// -----------------------------------------------------
// COMMENTS
// -----------------------------------------------------

router.post(
  "/:postId/comment",
  auth,
  postController.addComment,
);

router.get(
  "/:postId/comments",
  postController.getCommentsForPost,
);

router.delete(
  "/:postId/comments/:commentId",
  auth,
  postController.deleteComment,
);

router.put(
  "/:postId/comments/:commentId",
  auth,
  postController.editComment,
);

// -----------------------------------------------------
// COMMENT LIKES
// -----------------------------------------------------

router.post(
  "/:postId/comments/:commentId/like",
  auth,
  postController.likeComment,
);

router.delete(
  "/:postId/comments/:commentId/like",
  auth,
  postController.unlikeComment,
);

// -----------------------------------------------------
// SAVE / UNSAVE
// -----------------------------------------------------

router.post(
  "/:postId/save",
  auth,
  postController.savePost,
);

router.delete(
  "/:postId/save",
  auth,
  postController.unsavePost,
);

// -----------------------------------------------------
// COLLABORATION
// -----------------------------------------------------

router.post(
  "/:postId/collaborators",
  auth,
  postController.addCollaborator,
);

router.delete(
  "/:postId/collaborators",
  auth,
  postController.removeCollaborator,
);

router.patch(
  "/:postId/collaborators/role",
  auth,
  postController.updateCollaboratorRole,
);

module.exports = router;