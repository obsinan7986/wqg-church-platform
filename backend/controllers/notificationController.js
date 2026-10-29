const Notification = require('../models/Notification');

/**
 * @desc    Get recent notifications with unread count for current user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const formatted = notifications.map((n) => ({
      ...n,
      isRead: n.readBy && n.readBy.some((id) => id.toString() === userId.toString())
    }));

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications: formatted
    });
  } catch (error) {
    console.error('[GetNotifications Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: userId } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification: {
        ...notification.toObject(),
        isRead: true
      }
    });
  } catch (error) {
    console.error('[MarkAsRead Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * @desc    Mark all notifications as read for current user
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('[MarkAllAsRead Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message
    });
  }
};

/**
 * @desc    Create and broadcast a notification
 * @route   POST /api/notifications
 * @access  Private (Staff/Admin)
 */
const createNotification = async (req, res) => {
  try {
    const { title, message, type, link } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and type are required'
      });
    }

    const notification = await Notification.create({
      title: typeof title === 'string' ? { om: title, am: title, en: title } : title,
      message: typeof message === 'string' ? { om: message, am: message, en: message } : message,
      type,
      link: link || null,
      readBy: [req.user._id]
    });

    // Emit real-time notification to all connected users
    if (req.io) {
      req.io.to('all_users_room').emit('new_notification', {
        ...notification.toObject(),
        isRead: false
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Notification created and broadcasted successfully',
      notification
    });
  } catch (error) {
    console.error('[CreateNotification Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
};
