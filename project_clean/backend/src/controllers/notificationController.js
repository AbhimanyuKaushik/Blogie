const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({
    receiver: req.session.user._id,
  })
    .populate("sender", "username")
    .populate("post", "title")
    .sort({ createdAt: -1 });

  res.json(notifications);
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;

  await Notification.findByIdAndUpdate(id, { read: true });

  res.json({ message: "Notification read" });
};