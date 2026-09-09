const Notification = require("../models/Notification.js");

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const notifications = await Notification.find({
      receiver: userId,
    })
      .populate("sender", "username profileImage")
      .populate("post", "title")
      .populate("relatedInvite", "role status sender receiver post")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("[GET NOTIFICATIONS ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.session?.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        receiver: userId,
      },
      {
        read: true,
      },
      {
        new: true,
      },
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("[MARK NOTIFICATION READ ERROR]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};
