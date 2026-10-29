const User = require('../models/User');
const Contribution = require('../models/Contribution');
const LiveMeeting = require('../models/LiveMeeting');
const Document = require('../models/Document');
const GospelMedia = require('../models/GospelMedia');
const Notification = require('../models/Notification');

// @desc    Get aggregated system statistics & audit overview
// @route   GET /api/admin/overview
// @access  Private (ADMIN, SUPER_ADMIN)
exports.getSystemOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const onlineUsers = await User.countDocuments({ isOnline: true });

    // Financials
    const totalContributions = await Contribution.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Live Meeting stats
    const liveMeetingCount = await LiveMeeting.countDocuments();
    const activeLive = await LiveMeeting.findOne({ status: 'LIVE' }).select(
      'title status meetingLink allowedParticipants'
    );

    // Documents & Gospel media
    const documentCount = await Document.countDocuments();
    const gospelMediaCount = await GospelMedia.countDocuments();
    const notificationCount = await Notification.countDocuments();

    // Staff accounts list
    const staffList = await User.find({
      role: { $in: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY'] }
    }).select('fullName originChurch address email avatarUrl role department isOnline createdAt');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        onlineUsers,
        usersByRole,
        financials: {
          totalAmount: totalContributions[0]?.totalAmount || 0,
          totalCount: totalContributions[0]?.count || 0
        },
        liveMeeting: {
          total: liveMeetingCount,
          active: activeLive
        },
        documentCount,
        gospelMediaCount,
        notificationCount
      },
      staffList
    });
  } catch (error) {
    console.error('[getSystemOverview Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate system overview'
    });
  }
};

// @desc    Update a user's role (Super Admin only can assign executive roles; Admin can manage Member)
// @route   PUT /api/admin/users/:id/role
// @access  Private (ADMIN, SUPER_ADMIN)
exports.updateUserRole = async (req, res) => {
  try {
    const { role, department } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Role restrictions: ONLY Super Admin can make another Super Admin or Admin
    if (
      ['SUPER_ADMIN', 'ADMIN'].includes(role) &&
      req.user.role !== 'SUPER_ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can assign ADMIN or SUPER_ADMIN roles'
      });
    }

    targetUser.role = role || targetUser.role;
    if (department) targetUser.department = department;

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${targetUser.role}`,
      user: {
        _id: targetUser._id,
        fullName: targetUser.fullName,
        role: targetUser.role,
        department: targetUser.department
      }
    });
  } catch (error) {
    console.error('[updateUserRole Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

// @desc    Delete or moderate a comment from a live meeting
// @route   DELETE /api/admin/meetings/:meetingId/comments/:commentId
// @access  Private (ADMIN, SUPER_ADMIN)
exports.moderateMeetingComment = async (req, res) => {
  try {
    const { meetingId, commentId } = req.params;
    const meeting = await LiveMeeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Live meeting not found'
      });
    }

    const commentIndex = meeting.comments.findIndex(
      (c) => c._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    meeting.comments.splice(commentIndex, 1);
    await meeting.save();

    // Broadcast comment deletion via Socket.io
    if (req.io) {
      req.io.to(`meeting_${meeting._id}`).emit('comment_moderated', {
        meetingId: meeting._id,
        commentId
      });
    }

    res.status(200).json({
      success: true,
      message: 'Comment removed by moderator'
    });
  } catch (error) {
    console.error('[moderateMeetingComment Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate comment'
    });
  }
};
