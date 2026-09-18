const express = require("express");

const {
  getNotifications,
  markAsRead,
} = require("../controllers/notificationController.js");

const router = express.Router();

router.get("/", getNotifications);

router.patch("/:id/read", markAsRead);

module.exports = router;
