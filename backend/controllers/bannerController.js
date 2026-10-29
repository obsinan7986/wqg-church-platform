const Banner = require('../models/Banner');
const { logAudit } = require('../utils/auditLogger');
const {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  removeTempFile
} = require('../middleware/contentImageUploadMiddleware');

// @desc    Upload banner image to Cloudinary (folder: wqg/banners)
// @route   POST /api/banners/upload
// @access  Private (ADMIN, SUPER_ADMIN)
exports.uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Suuraan hin filatamne (No image file uploaded)'
      });
    }

    const uploadRes = await uploadImageToCloudinary(req.file.path, 'wqg/banners');

    return res.status(200).json({
      success: true,
      message: 'Banner image uploaded successfully',
      url: uploadRes.url,
      publicId: uploadRes.public_id
    });
  } catch (error) {
    removeTempFile(req.file?.path);
    console.error('[uploadBannerImage Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload banner image',
      error: error.message
    });
  }
};

// @desc    Get banners (active for public, or all for staff)
// @route   GET /api/banners
// @access  Public
exports.getBanners = async (req, res) => {
  try {
    const { all } = req.query;
    const now = new Date();
    const filter =
      all === 'true'
        ? {}
        : {
            isActive: true,
            $and: [
              { $or: [{ activeFrom: null }, { activeFrom: { $lte: now } }] },
              { $or: [{ activeTo: null }, { activeTo: { $gt: now } }] }
            ]
          };

    const banners = await Banner.find(filter)
      .populate('createdBy', 'fullName role')
      .sort({ order: 1, createdAt: -1 });

    res.set('Cache-Control', 'public, max-age=60');

    res.status(200).json({
      success: true,
      count: banners.length,
      banners
    });
  } catch (error) {
    console.error('[getBanners Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners'
    });
  }
};

// @desc    Create a new promotional banner
// @route   POST /api/banners
// @access  Private (ADMIN, SUPER_ADMIN)
exports.createBanner = async (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, badge, order, isActive, activeFrom, activeTo } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Banner image URL is required'
      });
    }

    const resolvedTitleOm = (title?.om || title?.am || title?.en || (typeof title === 'string' ? title : '')).trim();
    if (!resolvedTitleOm) {
      return res.status(400).json({
        success: false,
        message: 'Banner title is required'
      });
    }

    if (activeFrom && activeTo && new Date(activeTo) <= new Date(activeFrom)) {
      return res.status(400).json({
        success: false,
        message: 'Banner activeTo date must be after activeFrom date'
      });
    }

    const banner = await Banner.create({
      title: {
        om: resolvedTitleOm,
        am: title?.am ? title.am.trim() : resolvedTitleOm,
        en: title?.en ? title.en.trim() : resolvedTitleOm
      },
      description: {
        om: description?.om ? description.om.trim() : '',
        am: description?.am ? description.am.trim() : '',
        en: description?.en ? description.en.trim() : ''
      },
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl ? linkUrl.trim() : '/services',
      badge: badge ? badge.trim() : 'Ayyaana & Sagantaa Addaa',
      order: order ? Number(order) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      activeFrom: activeFrom ? new Date(activeFrom) : null,
      activeTo: activeTo ? new Date(activeTo) : null,
      createdBy: req.user._id
    });

    await banner.populate('createdBy', 'fullName role');

    // Audit log
    await logAudit(
      req,
      'ADD_BANNER',
      `Banner added: "${banner.title.om}" (${banner._id})`
    );

    // Real-time broadcast
    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', { type: 'BANNER', id: banner._id });
      req.io.to('all_users_room').emit('new_banner_published', { banner });
    }

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner
    });
  } catch (error) {
    console.error('[createBanner Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create banner'
    });
  }
};

// @desc    Update a promotional banner
// @route   PUT /api/banners/:id
// @access  Private (ADMIN, SUPER_ADMIN)
exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const { title, description, imageUrl, linkUrl, badge, order, isActive, activeFrom, activeTo } = req.body;

    const newActiveFrom = activeFrom !== undefined ? (activeFrom ? new Date(activeFrom) : null) : banner.activeFrom;
    const newActiveTo = activeTo !== undefined ? (activeTo ? new Date(activeTo) : null) : banner.activeTo;

    if (newActiveFrom && newActiveTo && new Date(newActiveTo) <= new Date(newActiveFrom)) {
      return res.status(400).json({
        success: false,
        message: 'Banner activeTo date must be after activeFrom date'
      });
    }

    if (title?.om) banner.title.om = title.om.trim();
    if (title?.am !== undefined) banner.title.am = title.am.trim();
    if (title?.en !== undefined) banner.title.en = title.en.trim();

    if (description?.om !== undefined) banner.description.om = description.om;
    if (description?.am !== undefined) banner.description.am = description.am;
    if (description?.en !== undefined) banner.description.en = description.en;

    if (imageUrl) banner.imageUrl = imageUrl.trim();
    if (linkUrl !== undefined) banner.linkUrl = linkUrl.trim();
    if (badge !== undefined) banner.badge = badge.trim();
    if (order !== undefined) banner.order = Number(order);
    if (isActive !== undefined) banner.isActive = Boolean(isActive);
    if (activeFrom !== undefined) banner.activeFrom = activeFrom ? new Date(activeFrom) : null;
    if (activeTo !== undefined) banner.activeTo = activeTo ? new Date(activeTo) : null;

    await banner.save();
    await banner.populate('createdBy', 'fullName role');

    // Audit log
    await logAudit(
      req,
      'UPDATE_BANNER',
      `Banner updated: "${banner.title.om}" (${banner._id}, Active: ${banner.isActive})`
    );

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', { type: 'BANNER', id: banner._id });
    }

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      banner
    });
  } catch (error) {
    console.error('[updateBanner Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update banner'
    });
  }
};

// @desc    Delete a promotional banner
// @route   DELETE /api/banners/:id
// @access  Private (ADMIN, SUPER_ADMIN)
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    await banner.deleteOne();

    await logAudit(
      req,
      'DELETE_BANNER',
      `Banner deleted: "${banner.title.om}" (${banner._id})`
    );

    if (req.io) {
      req.io.to('all_users_room').emit('content_updated', { type: 'BANNER', id: req.params.id });
    }

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('[deleteBanner Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner'
    });
  }
};
