const express = require("express");
const auth = require("../middleware/auth.js");
const postController = require("../controllers/postController.js");

const router = express.Router();

// CRUD Operations for Posts

router.post("/", auth, postController.createPost);
router.get("/", auth, postController.getAllPosts);
router.get("/search", postController.searchPosts);
router.get("/:postId", auth, postController.getPostById);
router.put("/:postId", auth, postController.updatePost);
router.delete("/:postId", auth, postController.deletePost);

// Publish / Unpublish Posts
router.patch("/:postId/publish", auth, postController.publishPost);
router.patch("/:postId/unpublish", auth, postController.unpublishPost);

// Autosave Posts
router.patch("/:postId/autosave", auth, postController.autoSave);

// Like / Unlike Posts

router.post("/:postId/like", auth, postController.likePost);
router.delete("/:postId/like", auth, postController.unlikePost);
router.get("/:postId/likes", auth, postController.getPeopleWhoLikedPost);

// Comments on Posts

router.post("/:postId/comment", auth, postController.addComment);
router.get("/:postId/comments", postController.getCommentsForPost);

router.delete("/:postId/comments/:commentId", auth, postController.deleteComment);
router.put("/:postId/comments/:commentId", auth, postController.editComment);

// Like / Unlike Comments
router.post("/:postId/comments/:commentId/like", auth, postController.likeComment);
router.delete("/:postId/comments/:commentId/like", auth, postController.unlikeComment);

// Save / Unsave Posts

router.post("/:postId/save", auth, postController.savePost);
router.delete("/:postId/save", auth, postController.unsavePost);

// Add collaborator
router.post("/:postId/collaborators", auth, postController.addCollaborator);

// Remove collaborator
router.delete("/:postId/collaborators", auth, postController.removeCollaborator);

// Update collaborator role (editor/commenter)
router.patch("/:postId/collaborators/role", auth, postController.updateCollaboratorRole);


module.exports = router;