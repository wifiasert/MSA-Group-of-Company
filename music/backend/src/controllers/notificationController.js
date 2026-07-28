const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utilities/responseUtil');

const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, { notifications }, 'Notifications loaded');
};

const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) return errorResponse(res, 'Notification not found', 404);
  notification.read = true;
  await notification.save();
  return successResponse(res, { notification }, 'Notification marked read');
};

module.exports = { getNotifications, markNotificationRead };
