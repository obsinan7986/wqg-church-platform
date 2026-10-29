const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');
const {
  uploadImageToCloudinary,
  removeTempFile
} = require('../middleware/contentImageUploadMiddleware');

// @desc    Upload announcement image
// @route   POST /api/announcements/upload
// @access  Private (ADMIN, SUPER_ADMIN, SECRETARY)
exports.uploadAnnouncementImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    const uploadRes = await uploadImageToCloudinary(req.file.path, 'wqg/announcements');

    return res.status(200).json({
      success: true,
      message: 'Announcement image uploaded',
      url: uploadRes.url,
      publicId: uploadRes.public_id
    });
  } catch (error) {
    removeTempFile(req.file?.path);
    console.error('[uploadAnnouncementImage Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

// @desc    Get public published announcements (No login needed, safe fields only)
// @route   GET /api/announcements/public
// @access  Public
exports.getPublicAnnouncements = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const now = new Date();

    const filter = {
      status: 'PUBLISHED',
      audience: 'ALL',
      publishAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    };

    const announcements = await Announcement.find(filter)
      .select('_id title description imageUrl pinned publishAt expiresAt createdAt')
      .sort({ pinned: -1, publishAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.set('Cache-Control', 'public, max-age=60');

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements
    });
  } catch (error) {
    console.error('[getPublicAnnouncements Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch public announcements'
    });
  }
};

// @desc    Get single public announcement by ID
// @route   GET /api/announcements/public/:id
// @access  Public
exports.getPublicAnnouncementById = async (req, res) => {
  try {
    const now = new Date();
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      status: 'PUBLISHED',
      audience: 'ALL',
      publishAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    })
      .select('_id title description imageUrl pinned publishAt expiresAt createdAt')
      .lean();

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found or expired'
      });
    }

    res.set('Cache-Control', 'public, max-age=60');

    return res.status(200).json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('[getPublicAnnouncementById Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement'
    });
  }
};

// @desc    Get all announcements (Staff / Dashboard with search, status filters)
// @route   GET /api/announcements
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.getAdminAnnouncements = async (req, res) => {
  try {
    const { status, audience, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (audience) filter.audience = audience;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { 'title.om': { $regex: q, $options: 'i' } },
        { 'title.am': { $regex: q, $options: 'i' } },
        { 'title.en': { $regex: q, $options: 'i' } },
        { 'description.om': { $regex: q, $options: 'i' } }
      ];
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'fullName role originChurch avatarUrl')
      .sort({ pinned: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements
    });
  } catch (error) {
    console.error('[getAdminAnnouncements Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY - Secretary drafts only)
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      imagePublicId,
      pinned,
      audience,
      status,
      publishAt,
      expiresAt,
      notifyMembers
    } = req.body;

    const effPub = publishAt !== undefined ? (publishAt ? new Date(publishAt) : new Date()) : announcement.publishAt;
    const effExp = expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : announcement.expiresAt;
    if (effExp && effPub && effExp <= effPub) {
      return res.status(400).json({
        success: false,
        message: 'Announcement expiry date must be after publish date'
      });
    }

    const resolvedTitleOm = (title?.om || title?.am || title?.en || (typeof title === 'string' ? title : '')).trim();
    if (!resolvedTitleOm) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const resolvedDescOm = (description?.om || description?.am || description?.en || (typeof description === 'string' ? description : '') || resolvedTitleOm).trim();

    const pub = publishAt ? new Date(publishAt) : new Date();
    const exp = expiresAt ? new Date(expiresAt) : null;
    if (exp && exp <= pub) {
      return res.status(400).json({
        success: false,
        message: 'Announcement expiry date must be after publish date'
      });
    }

    // Role check: SECRETARY can only create DRAFT
    let finalStatus = status || 'DRAFT';
    if (req.user.role === 'SECRETARY') {
      finalStatus = 'DRAFT';
    }

    const announcement = await Announcement.create({
      title: {
        om: resolvedTitleOm,
        am: title?.am ? title.am.trim() : resolvedTitleOm,
        en: title?.en ? title.en.trim() : resolvedTitleOm
      },
      description: {
        om: resolvedDescOm,
        am: description?.am ? description.am.trim() : resolvedDescOm,
        en: description?.en ? description.en.trim() : resolvedDescOm
      },
      imageUrl: imageUrl ? imageUrl.trim() : '',
      imagePublicId: imagePublicId ? imagePublicId.trim() : '',
      pinned: Boolean(pinned),
      audience: audience || 'ALL',
      status: finalStatus,
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id
    });

    await announcement.populate('createdBy', 'fullName role originChurch avatarUrl');

    // Audit log
    await logAudit(
      req,
      'CREATE_ANNOUNCEMENT',
      `Announcement created: "${announcement.title.om}" (${announcement._id}, Status: ${announcement.status})`
    );

    // Option "Notify members" on publish
    if (notifyMembers && announcement.status === 'PUBLISHED') {
      const notification = await Notification.create({
        title: {
          om: announcement.title.om,
          am: announcement.title.am || announcement.title.om,
          en: announcement.title.en || announcement.title.om
        },
        message: {
          om: announcement.description.om.substring(0, 160),
          am: (announcement.description.am || announcement.description.om).substring(0, 160),
          en: (announcement.description.en || announcement.description.om).substring(0, 160)
        },
        type: 'ANNOUNCEMENT',
        link: `/announcements`,
        readBy: [req.user._id]
      });

      if (req.io) {
        req.io.to('all_users_room').emit('new_notification', {
          ...notification.toObject(),
          isRead: false
        });
      }
    }

    // Socket emit content_updated to all_users_room
    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'ANNOUNCEMENT',
        id: announcement._id
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('[createAnnouncement Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create announcement'
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (SUPER_ADMIN, ADMIN)
exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const {
      title,
      description,
      imageUrl,
      imagePublicId,
      pinned,
      audience,
      status,
      publishAt,
      expiresAt,
      notifyMembers
    } = req.body;

    const effPub = publishAt !== undefined ? (publishAt ? new Date(publishAt) : new Date()) : announcement.publishAt;
    const effExp = expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : announcement.expiresAt;
    if (effExp && effPub && effExp <= effPub) {
      return res.status(400).json({
        success: false,
        message: 'Announcement expiry date must be after publish date'
      });
    }

    if (title?.om) announcement.title.om = title.om.trim();
    if (title?.am !== undefined) announcement.title.am = title.am.trim();
    if (title?.en !== undefined) announcement.title.en = title.en.trim();

    if (description?.om) announcement.description.om = description.om.trim();
    if (description?.am !== undefined) announcement.description.am = description.am.trim();
    if (description?.en !== undefined) announcement.description.en = description.en.trim();

    if (imageUrl !== undefined) announcement.imageUrl = imageUrl.trim();
    if (imagePublicId !== undefined) announcement.imagePublicId = imagePublicId.trim();
    if (pinned !== undefined) announcement.pinned = Boolean(pinned);
    if (audience !== undefined) announcement.audience = audience;
    if (status !== undefined) announcement.status = status;
    if (publishAt !== undefined) announcement.publishAt = publishAt ? new Date(publishAt) : new Date();
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt ? new Date(expiresAt) : null;

    await announcement.save();
    await announcement.populate('createdBy', 'fullName role originChurch avatarUrl');

    // Audit log
    await logAudit(
      req,
      'UPDATE_ANNOUNCEMENT',
      `Announcement updated: "${announcement.title.om}" (${announcement._id}, Status: ${announcement.status})`
    );

    // Option "Notify members" on publish
    if (notifyMembers && announcement.status === 'PUBLISHED') {
      const notification = await Notification.create({
        title: {
          om: announcement.title.om,
          am: announcement.title.am || announcement.title.om,
          en: announcement.title.en || announcement.title.om
        },
        message: {
          om: announcement.description.om.substring(0, 160),
          am: (announcement.description.am || announcement.description.om).substring(0, 160),
          en: (announcement.description.en || announcement.description.om).substring(0, 160)
        },
        type: 'ANNOUNCEMENT',
        link: `/announcements`,
        readBy: [req.user._id]
      });

      if (req.io) {
        req.io.to('all_users_room').emit('new_notification', {
          ...notification.toObject(),
          isRead: false
        });
      }
    }

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'ANNOUNCEMENT',
        id: announcement._id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.error('[updateAnnouncement Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update announcement'
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (SUPER_ADMIN, ADMIN)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.deleteOne();

    await logAudit(
      req,
      'DELETE_ANNOUNCEMENT',
      `Announcement deleted: "${announcement.title.om}" (${announcement._id})`
    );

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', {
        type: 'ANNOUNCEMENT',
        id: req.params.id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('[deleteAnnouncement Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
};
