const Message = require('../models/Message');

const EXEC_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY'];

/**
 * @desc    Get executive 5-actors chat history
 * @route   GET /api/messages/exec-5
 * @access  Private (5 Executive Roles strictly)
 */
const getExecMessages = async (req, res) => {
  try {
    const messages = await Message.find({ channel: 'EXEC_5_ACTORS' })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender', 'fullName role originChurch avatarUrl address.city')
      .lean();

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('[GetExecMessages Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch executive messages',
      error: error.message
    });
  }
};

/**
 * @desc    Get general broadcast messages for all members
 * @route   GET /api/messages/broadcast
 * @access  Private (All Authenticated Members)
 */
const getBroadcastMessages = async (req, res) => {
  try {
    const messages = await Message.find({ channel: 'BROADCAST' })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender', 'fullName role originChurch avatarUrl address.city')
      .lean();

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('[GetBroadcastMessages Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch broadcast messages',
      error: error.message
    });
  }
};

/**
 * @desc    Get 1-on-1 direct messages between current user and target user
 * @route   GET /api/messages/direct/:userId
 * @access  Private
 */
const getDirectMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId: otherUserId } = req.params;

    const messages = await Message.find({
      channel: 'DIRECT',
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender', 'fullName role originChurch avatarUrl address.city')
      .populate('recipient', 'fullName role originChurch avatarUrl address.city')
      .lean();

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('[GetDirectMessages Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch direct messages',
      error: error.message
    });
  }
};

/**
 * @desc    Send a message (REST fallback + Socket emit)
 * @route   POST /api/messages
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { content, channel, recipient } = req.body;
    const sender = req.user;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty'
      });
    }

    const targetChannel = channel || 'EXEC_5_ACTORS';

    // Strict RBAC for EXEC_5_ACTORS
    if (targetChannel === 'EXEC_5_ACTORS' && !EXEC_ROLES.includes(sender.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access Forbidden: Only executive roles can post to the 5-Actors chat box'
      });
    }

    // Direct message requires recipient
    if (targetChannel === 'DIRECT' && !recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient is required for direct messages'
      });
    }

    const newMessage = await Message.create({
      sender: sender._id,
      channel: targetChannel,
      content: content.trim(),
      recipient: targetChannel === 'DIRECT' ? recipient : null,
      readBy: [sender._id]
    });

    const populatedMsg = await Message.findById(newMessage._id)
      .populate('sender', 'fullName role originChurch avatarUrl address.city')
      .populate('recipient', 'fullName role originChurch avatarUrl address.city');

    // Real-time dispatch via Socket.io
    if (req.io) {
      if (targetChannel === 'EXEC_5_ACTORS') {
        req.io.to('exec_5_actors_room').emit('new_exec_message', populatedMsg);
      } else if (targetChannel === 'BROADCAST') {
        req.io.to('all_users_room').emit('new_broadcast_message', populatedMsg);
      } else if (targetChannel === 'DIRECT' && recipient) {
        req.io.to(`user_${recipient}`).to(`user_${sender._id}`).emit('new_direct_message', populatedMsg);
      }
    }

    return res.status(201).json({
      success: true,
      message: populatedMsg
    });
  } catch (error) {
    console.error('[SendMessage Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

module.exports = {
  getExecMessages,
  getBroadcastMessages,
  getDirectMessages,
  sendMessage
};
