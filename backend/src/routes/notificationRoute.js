const router = require("express").Router();
const controller = require("../controllers/notificationController");

router.get("/", controller.getNotifications);
router.patch("/:id/read", controller.markAsRead);

module.exports = router;