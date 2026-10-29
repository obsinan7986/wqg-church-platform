const LiveMeeting = require('../models/LiveMeeting');
const Notification = require('../models/Notification');
const crypto = require('crypto');

/**
 * @desc    Schedule or create a new live meeting studio
 * @route   POST /api/live/schedule
 * @access  Private (SUPER_ADMIN only)
 */
const scheduleMeeting = async (req, res) => {
  try {
    const { title, description, scheduledDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title is required'
      });
    }

    if (scheduledDate) {
      const sched = new Date(scheduledDate);
      if (sched.getTime() < Date.now() - 60000) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date and time cannot be in the past'
        });
      }
    }

    const meetingLink = 'wqg-' + crypto.randomBytes(4).toString('hex');

    const meeting = await LiveMeeting.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      meetingLink,
      status: 'SCHEDULED',
      host: req.user._id,
      waitingRoom: [],
      allowedParticipants: [req.user._id],
      mutedUsers: [],
      likes: [],
      dislikes: [],
      comments: []
    });

    const populated = await LiveMeeting.findById(meeting._id)
      .populate('host', 'fullName role originChurch avatarUrl')
      .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city')
      .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city');

    if (req.io) { req.io.to("all_users_room").emit("content_updated", { type: "LIVE", id: meeting._id }); }

    return res.status(201).json({
      success: true,
      message: 'Live meeting scheduled successfully',
      meeting: populated
    });
  } catch (error) {
    console.error('[ScheduleMeeting Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule meeting',
      error: error.message
    });
  }
};

/**
 * @desc    Get currently active (LIVE or SCHEDULED) meeting
 * @route   GET /api/live/active
 * @access  Private
 */
const getActiveMeeting = async (req, res) => {
  try {
    let meeting = await LiveMeeting.findOne({ status: { $in: ['LIVE', 'SCHEDULED'] } })
      .sort({ createdAt: -1 })
      .populate('host', 'fullName role originChurch avatarUrl')
      .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city')
      .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city')
      .populate('mutedUsers', '_id')
      .populate('videoOffUsers', '_id');

    // If no meeting exists at all, auto-create a default scheduled session hosted by super admin or current user
    if (!meeting) {
      meeting = await LiveMeeting.create({
        title: 'Kadhannaa fi Sagalee Waaqayyoo Kallattii (Live)',
        description: 'Tajaajila kadhannaa fi lallaba wangeelaa Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii.',
        status: 'SCHEDULED',
        host: req.user._id,
        waitingRoom: [],
        allowedParticipants: [req.user._id],
        comments: [
          {
            user: req.user._id,
            fullName: 'Sirna Waldaa (System)',
            originChurch: 'Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii',
            role: 'SUPER_ADMIN',
            text: 'Baga nagaan dhuftan! Kutaan Live qophii irra jira.',
            createdAt: new Date()
          }
        ]
      });

      meeting = await LiveMeeting.findById(meeting._id)
        .populate('host', 'fullName role originChurch avatarUrl')
        .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city')
        .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city')
        .populate('mutedUsers', '_id');
    }

    return res.status(200).json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('[GetActiveMeeting Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active meeting',
      error: error.message
    });
  }
};

/**
 * @desc    Get live meeting by unique meeting link
 * @route   GET /api/live/:meetingLink
 * @access  Private
 */
const getMeetingByLink = async (req, res) => {
  try {
    const { meetingLink } = req.params;

    const meeting = await LiveMeeting.findOne({ meetingLink })
      .populate('host', 'fullName role originChurch avatarUrl')
      .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city')
      .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city')
      .populate('mutedUsers', '_id')
      .populate('videoOffUsers', '_id');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Live meeting not found with this link'
      });
    }

    return res.status(200).json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('[GetMeetingByLink Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve meeting',
      error: error.message
    });
  }
};

/**
 * @desc    Start live session & trigger global notification
 * @route   PATCH /api/live/:id/start
 * @access  Private (SUPER_ADMIN only)
 */
const startLive = async (req, res) => {
  try {
    const { id } = req.params;

    const existingM = await LiveMeeting.findById(id);
    if (!existingM) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    if (existingM.host.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the meeting host or Super Admin can start this live session' });
    }
    const meeting = await LiveMeeting.findByIdAndUpdate(id, { status: 'LIVE' },
      { new: true }
    )
      .populate('host', 'fullName role originChurch avatarUrl')
      .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city')
      .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Create global notification for all members
    const notification = await Notification.create({
      title: {
        om: 'LIVE: Sagantaan Kadhannaa Kallattii Eegalameera!',
        am: 'LIVE: የቀጥታ ጸሎትና ትምህርት ተጀምሯል!',
        en: 'LIVE: Live Meeting Broadcast Has Started!'
      },
      message: {
        om: `Sagantaan '${meeting.title}' amma kallattiin eegalameera. Hirmaachuuf seenuu dandeessu.`,
        am: `'${meeting.title}' የቀጥታ ስርጭት ተጀምሯል፤ አሁኑኑ ተቀላቀሉ።`,
        en: `'${meeting.title}' broadcast is now LIVE. Click to join the studio.`
      },
      type: 'LIVE_STARTED',
      link: '/dashboard',
      readBy: [req.user._id]
    });

    if (req.io) {
      // Broadcast live event to all members
      req.io.to('all_users_room').emit('new_notification', {
        ...notification.toObject(),
        isRead: false
      });

      req.io.to(`meeting_${meeting._id}`).emit('live_status_changed', {
        meetingId: meeting._id,
        status: 'LIVE'
      });
      req.io.to('all_users_room').emit('live_status_changed', {
        meetingId: meeting._id,
        status: 'LIVE'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Live stream started and global notification sent',
      meeting
    });
  } catch (error) {
    console.error('[StartLive Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start live stream',
      error: error.message
    });
  }
};

/**
 * @desc    End live session
 * @route   PATCH /api/live/:id/end
 * @access  Private (SUPER_ADMIN only)
 */
const endLive = async (req, res) => {
  try {
    const { id } = req.params;

    const existingEnd = await LiveMeeting.findById(id);
    if (!existingEnd) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    if (existingEnd.host.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the meeting host or Super Admin can end this live session' });
    }
    const meeting = await LiveMeeting.findByIdAndUpdate(id, { status: 'ENDED' },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (req.io) {
      req.io.to(`meeting_${meeting._id}`).emit('live_ended', { meetingId: meeting._id });
      req.io.to('all_users_room').emit('live_status_changed', {
        meetingId: meeting._id,
        status: 'ENDED'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Live session ended',
      meeting
    });
  } catch (error) {
    console.error('[EndLive Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to end live session',
      error: error.message
    });
  }
};

/**
 * @desc    Member requests to join live studio -> lands in waitingRoom
 * @route   POST /api/live/:id/join-request
 * @access  Private
 */
const requestJoin = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Check if already allowed
    const isAlreadyAllowed = meeting.allowedParticipants.some(
      (p) => p.toString() === userId.toString()
    );
    if (isAlreadyAllowed) {
      return res.status(200).json({
        success: true,
        alreadyAdmitted: true,
        message: 'You are already an admitted participant'
      });
    }

    // Add to waitingRoom if not present
    const isWaiting = meeting.waitingRoom.some((w) => w.toString() === userId.toString());
    if (!isWaiting) {
      meeting.waitingRoom.push(userId);
      await meeting.save();
    }

    const updated = await LiveMeeting.findById(id)
      .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city')
      .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city');

    if (req.io) {
      req.io.to(`meeting_${id}`).emit('waiting_room_updated', {
        waitingRoom: updated.waitingRoom
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request placed in waiting room. Awaiting host approval.',
      waitingRoom: updated.waitingRoom
    });
  } catch (error) {
    console.error('[RequestJoin Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit join request',
      error: error.message
    });
  }
};

/**
 * @desc    Super Admin accepts or rejects member from waitingRoom
 * @route   POST /api/live/:id/admit
 * @access  Private (SUPER_ADMIN only)
 */
const admitMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, action } = req.body; // action: 'accept' | 'reject'

    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        message: 'userId and action (accept/reject) are required'
      });
    }

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Remove from waitingRoom
    meeting.waitingRoom = meeting.waitingRoom.filter((w) => w.toString() !== userId.toString());

    if (action === 'accept') {
      const isAlreadyIn = meeting.allowedParticipants.some(
        (p) => p.toString() === userId.toString()
      );
      if (!isAlreadyIn) {
        meeting.allowedParticipants.push(userId);
      }
    }

    await meeting.save();

    const populated = await LiveMeeting.findById(id)
      .populate('waitingRoom', 'fullName role originChurch avatarUrl address.city')
      .populate('allowedParticipants', 'fullName role originChurch avatarUrl address.city');

    if (req.io) {
      if (action === 'accept') {
        req.io.to(`user_${userId}`).emit('join_approved', { meetingId: id });
      } else {
        req.io.to(`user_${userId}`).emit('join_rejected', { meetingId: id });
      }

      req.io.to(`meeting_${id}`).emit('waiting_room_updated', {
        waitingRoom: populated.waitingRoom
      });
      req.io.to(`meeting_${id}`).emit('participants_updated', {
        allowedParticipants: populated.allowedParticipants
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${action === 'accept' ? 'accepted into live studio' : 'rejected'}`,
      waitingRoom: populated.waitingRoom,
      allowedParticipants: populated.allowedParticipants
    });
  } catch (error) {
    console.error('[AdmitMember Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process admission action',
      error: error.message
    });
  }
};

/**
 * @desc    Super Admin mutes or unmutes a user
 * @route   POST /api/live/:id/mute
 * @access  Private (SUPER_ADMIN only)
 */
const muteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, mute } = req.body; // mute: true | false

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (mute) {
      if (!meeting.mutedUsers.some((u) => u.toString() === userId.toString())) {
        meeting.mutedUsers.push(userId);
      }
    } else {
      meeting.mutedUsers = meeting.mutedUsers.filter((u) => u.toString() !== userId.toString());
    }

    await meeting.save();

    if (req.io) {
      if (mute) {
        req.io.to(`user_${userId}`).emit('force_mute', { meetingId: id });
      } else {
        req.io.to(`user_${userId}`).emit('allow_unmute', { meetingId: id });
      }
      req.io.to(`meeting_${id}`).emit('mute_status_updated', {
        mutedUsers: meeting.mutedUsers
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${mute ? 'muted' : 'unmuted'} successfully`,
      mutedUsers: meeting.mutedUsers
    });
  } catch (error) {
    console.error('[MuteUser Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mute/unmute user',
      error: error.message
    });
  }
};

/**
 * @desc    Super Admin turns off or restores video for a user
 * @route   POST /api/live/:id/video-off
 * @access  Private (SUPER_ADMIN only)
 */
const toggleVideoOff = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, videoOff } = req.body; // videoOff: true | false

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (!meeting.videoOffUsers) {
      meeting.videoOffUsers = [];
    }

    if (videoOff) {
      if (!meeting.videoOffUsers.some((u) => u.toString() === userId.toString())) {
        meeting.videoOffUsers.push(userId);
      }
    } else {
      meeting.videoOffUsers = meeting.videoOffUsers.filter((u) => u.toString() !== userId.toString());
    }

    await meeting.save();

    if (req.io) {
      if (videoOff) {
        req.io.to(`user_${userId}`).emit('force_video_off', { meetingId: id });
      } else {
        req.io.to(`user_${userId}`).emit('allow_video', { meetingId: id });
      }
      req.io.to(`meeting_${id}`).emit('video_status_updated', {
        videoOffUsers: meeting.videoOffUsers
      });
    }

    return res.status(200).json({
      success: true,
      message: `User video ${videoOff ? 'turned off' : 'enabled'} successfully`,
      videoOffUsers: meeting.videoOffUsers
    });
  } catch (error) {
    console.error('[ToggleVideoOff Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user video status',
      error: error.message
    });
  }
};

/**
 * @desc    Super Admin mutes all allowed participants
 * @route   POST /api/live/:id/mute-all
 * @access  Private (SUPER_ADMIN only)
 */
const muteAll = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Add all participants except host to mutedUsers
    const nonHostParticipants = meeting.allowedParticipants.filter(
      (p) => p.toString() !== meeting.host.toString()
    );

    meeting.mutedUsers = nonHostParticipants;
    await meeting.save();

    if (req.io) {
      req.io.to(`meeting_${id}`).emit('force_mute_all', { meetingId: id });
      req.io.to(`meeting_${id}`).emit('mute_status_updated', {
        mutedUsers: meeting.mutedUsers
      });
    }

    return res.status(200).json({
      success: true,
      message: 'All participants have been muted',
      mutedUsers: meeting.mutedUsers
    });
  } catch (error) {
    console.error('[MuteAll Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mute all participants',
      error: error.message
    });
  }
};

/**
 * @desc    Toggle Like / Dislike reaction
 * @route   POST /api/live/:id/reaction
 * @access  Private
 */
const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'like' or 'dislike'
    const userId = req.user._id;

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (type === 'like') {
      const alreadyLiked = meeting.likes.some((l) => l.toString() === userId.toString());
      if (alreadyLiked) {
        meeting.likes = meeting.likes.filter((l) => l.toString() !== userId.toString());
      } else {
        meeting.likes.push(userId);
        meeting.dislikes = meeting.dislikes.filter((d) => d.toString() !== userId.toString());
      }
    } else if (type === 'dislike') {
      const alreadyDisliked = meeting.dislikes.some((d) => d.toString() === userId.toString());
      if (alreadyDisliked) {
        meeting.dislikes = meeting.dislikes.filter((d) => d.toString() !== userId.toString());
      } else {
        meeting.dislikes.push(userId);
        meeting.likes = meeting.likes.filter((l) => l.toString() !== userId.toString());
      }
    }

    await meeting.save();

    const payload = {
      likesCount: meeting.likes.length,
      dislikesCount: meeting.dislikes.length,
      likes: meeting.likes,
      dislikes: meeting.dislikes
    };

    if (req.io) {
      req.io.to(`meeting_${id}`).emit('reaction_updated', payload);
    }

    return res.status(200).json({
      success: true,
      ...payload
    });
  } catch (error) {
    console.error('[ToggleReaction Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update reaction',
      error: error.message
    });
  }
};

/**
 * @desc    Post a live comment into streaming box
 * @route   POST /api/live/:id/comment
 * @access  Private
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot be empty'
      });
    }

    const meeting = await LiveMeeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const newComment = {
      user: req.user._id,
      fullName: req.user.fullName,
      originChurch: req.user.originChurch || 'Waldaa Qulqulluu Giyoorgisii',
      role: req.user.role,
      text: text.trim(),
      createdAt: new Date()
    };

    meeting.comments.push(newComment);
    await meeting.save();

    const savedComment = meeting.comments[meeting.comments.length - 1];

    if (req.io) {
      req.io.to(`meeting_${id}`).emit('new_live_comment', savedComment);
    }

    return res.status(201).json({
      success: true,
      comment: savedComment
    });
  } catch (error) {
    console.error('[AddComment Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to post live comment',
      error: error.message
    });
  }
};


/**
 * @desc    Get current LIVE meeting or next SCHEDULED meeting for public banner
 * @route   GET /api/live/public/next
 * @access  Public (No auth needed, safe fields only)
 */
const getPublicNextLive = async (req, res) => {
  try {
    let meeting = await LiveMeeting.findOne({ status: 'LIVE' })
      .select('title scheduledDate status')
      .lean();

    if (!meeting) {
      meeting = await LiveMeeting.findOne({
        status: 'SCHEDULED',
        scheduledDate: { $gte: new Date(Date.now() - 3600000 * 2) }
      })
        .select('title scheduledDate status')
        .sort({ scheduledDate: 1 })
        .lean();
    }

    res.set('Cache-Control', 'public, max-age=30');

    return res.status(200).json({
      success: true,
      meeting: meeting
        ? {
            title: meeting.title,
            scheduledDate: meeting.scheduledDate,
            status: meeting.status
          }
        : null
    });
  } catch (error) {
    console.error('[GetPublicNextLive Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch next live meeting'
    });
  }
};

module.exports = {
  getPublicNextLive,
  scheduleMeeting,
  getActiveMeeting,
  getMeetingByLink,
  startLive,
  endLive,
  requestJoin,
  admitMember,
  muteUser,
  muteAll,
  toggleVideoOff,
  toggleReaction,
  addComment
};
