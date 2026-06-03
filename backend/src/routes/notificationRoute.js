exports.getNotifications = async (
  req,
  res,
) => {
  try {
    const notifications =
      await Notification.find({
        recipient:
          req.session.user._id,
      })
        .sort({
          createdAt: -1,
        })
        .populate(
          "sender",
          "username profilePicture",
        )
        .populate(
          "post",
          "title",
        );

    res.json({
      notifications,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Failed to fetch notifications",
    });
  }
};
