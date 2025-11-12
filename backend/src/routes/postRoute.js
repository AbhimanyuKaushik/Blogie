const express = require("express");
const auth = require("../middleware/auth.js");
const postController = require("../controllers/postController.js");

const router = express.Router();

// Posts
router.post("/", auth, postController.createPost);
router.get("/", postController.getAllPosts);
router.get("/:postId", postController.getPostById);
router.put("/:postId", auth, postController.updatePost);
router.delete("/:postId", auth, postController.deletePost);
// Likes
router.post("/:postId/like", auth, postController.likePost);
router.delete("/:postId/like", auth, postController.unlikePost);
router.get("/:postId/likes", auth, postController.getPeopleWhoLikedPost);

// Comments
router.post("/:postId/comment", auth, postController.addComment);
router.get("/:postId/comments", auth, postController.getCommentsForPost);
router.delete("/:postId/comments/:commentId", auth, postController.deleteComment);
router.put("/:postId/comments/:commentId", auth, postController.editComment);
router.post("/:postId/comments/:commentId/like", auth, postController.likeComment);
router.delete("/:postId/comments/:commentId/like", auth, postController.unlikeComment);

// Saved posts
router.post("/:postId/save", auth, postController.savePost);
router.delete("/:postId/save", auth, postController.unsavePost);
router.get("/me/saved", auth, postController.getSavedPosts);

module.exports = router;
