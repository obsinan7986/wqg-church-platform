const GospelMedia = require('../models/GospelMedia');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all active Gospel YouTube media items (public or filtered)
// @route   GET /api/media
// @access  Public
exports.getAllMedia = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { 'title.om': { $regex: search, $options: 'i' } },
        { 'title.am': { $regex: search, $options: 'i' } },
        { 'title.en': { $regex: search, $options: 'i' } },
        { speakerOrSinger: { $regex: search, $options: 'i' } }
      ];
    }

    const mediaList = await GospelMedia.find(filter)
      .populate('addedBy', 'fullName role originChurch')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mediaList.length,
      media: mediaList
    });
  } catch (error) {
    console.error('[getAllMedia Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gospel media'
    });
  }
};

// @desc    Add a new YouTube Gospel media
// @route   POST /api/media
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.createMedia = async (req, res) => {
  try {
    const { title, description, youtubeUrl, category, speakerOrSinger } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({
        success: false,
        message: 'YouTube URL is required'
      });
    }

    if (!title?.om) {
      return res.status(400).json({
        success: false,
        message: 'Afaan Oromoo title is required'
      });
    }

    const newMedia = await GospelMedia.create({
      title: {
        om: title.om.trim(),
        am: title.am ? title.am.trim() : '',
        en: title.en ? title.en.trim() : ''
      },
      description: {
        om: description?.om || '',
        am: description?.am || '',
        en: description?.en || ''
      },
      youtubeUrl: youtubeUrl.trim(),
      category: category || 'GOSPEL',
      speakerOrSinger: speakerOrSinger || 'St. George Fellowship',
      addedBy: req.user._id
    });

    await newMedia.populate('addedBy', 'fullName role originChurch');

    // Emit live socket event if io is present
    if (req.io) {
      req.io.to('all_users_room').emit('new_gospel_media', {
        media: newMedia
      });
    }

    // Audit log
    await logAudit(
      req,
      'ADD_MEDIA',
      `Gospel media added: "${newMedia.title.om}" (${newMedia.category})`
    );

    res.status(201).json({
      success: true,
      message: 'Gospel media added successfully',
      media: newMedia
    });
  } catch (error) {
    console.error('[createMedia Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add gospel media'
    });
  }
};

// @desc    Delete a Gospel media item
// @route   DELETE /api/media/:id
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.deleteMedia = async (req, res) => {
  try {
    const media = await GospelMedia.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    await media.deleteOne();

    await logAudit(
      req,
      'DELETE_MEDIA',
      `Gospel media deleted: "${media.title.om}" (${req.params.id})`
    );

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('[deleteMedia Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete media'
    });
  }
};
