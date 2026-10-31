const https = require('https');
const GospelMedia = require('../models/GospelMedia');
const { logAudit } = require('../utils/auditLogger');

// Helper to extract 11-char YouTube Video ID from any supported URL format
const extractYouTubeId = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : '';
};

// Helper to check if a YouTube URL looks like a playlist
const isPlaylistUrl = (url) => {
  if (!url) return false;
  return url.includes('list=') || url.includes('/playlist');
};

// Helper: fetch YouTube oEmbed data using Node built-in https (no axios)
const fetchOEmbed = (videoId) => {
  return new Promise((resolve, reject) => {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    https.get(oEmbedUrl, (res) => {
      if (res.statusCode !== 200) {
        res.resume(); // drain response
        return reject(new Error(`oEmbed returned status ${res.statusCode}`));
      }
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error('Failed to parse oEmbed JSON'));
        }
      });
    }).on('error', (err) => reject(err));
  });
};

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

    // Reject playlist links
    if (isPlaylistUrl(youtubeUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Paste a single video link'
      });
    }

    // Extract video ID
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract a valid YouTube video ID from the provided URL.'
      });
    }

    // Check for duplicate by videoId
    const existing = await GospelMedia.findOne({ youtubeVideoId: videoId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This video is already in the library.'
      });
    }

    // Fetch oEmbed data from YouTube
    let oEmbed = null;
    try {
      oEmbed = await fetchOEmbed(videoId);
    } catch (oEmbedErr) {
      console.warn('[createMedia] oEmbed fetch failed:', oEmbedErr.message);
      return res.status(400).json({
        success: false,
        message: 'Video not found or embedding is disabled.'
      });
    }

    // Prefill title from oEmbed if not provided by staff
    const resolvedTitle = {
      om: (title?.om && title.om.trim()) || oEmbed.title || '',
      am: (title?.am && title.am.trim()) || '',
      en: (title?.en && title.en.trim()) || ''
    };

    // If still no om title after oEmbed, use oEmbed title for all langs
    if (!resolvedTitle.om) {
      resolvedTitle.om = oEmbed.title || '';
      resolvedTitle.am = resolvedTitle.am || oEmbed.title || '';
      resolvedTitle.en = resolvedTitle.en || oEmbed.title || '';
    }

    // Prefill speakerOrSinger from oEmbed if not provided
    const resolvedSpeaker = (speakerOrSinger && speakerOrSinger.trim())
      || oEmbed.author_name
      || 'St. George Fellowship';

    // thumbnailUrl always comes from oEmbed
    const thumbnailUrl = oEmbed.thumbnail_url || '';

    const newMedia = await GospelMedia.create({
      title: resolvedTitle,
      description: {
        om: description?.om || '',
        am: description?.am || '',
        en: description?.en || ''
      },
      youtubeUrl: youtubeUrl.trim(),
      category: category || 'GOSPEL',
      speakerOrSinger: resolvedSpeaker,
      thumbnailUrl,
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

// @desc    Update an existing Gospel media item
// @route   PATCH /api/media/:id
// @access  Private (SUPER_ADMIN, ADMIN, SECRETARY)
exports.updateMedia = async (req, res) => {
  try {
    const media = await GospelMedia.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    const { title, description, category, speakerOrSinger, youtubeUrl, thumbnailUrl } = req.body;

    // If youtubeUrl is being updated, re-validate and re-fetch oEmbed
    if (youtubeUrl && youtubeUrl.trim() !== media.youtubeUrl) {
      const newUrl = youtubeUrl.trim();

      // Reject playlist links
      if (isPlaylistUrl(newUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Paste a single video link'
        });
      }

      const videoId = extractYouTubeId(newUrl);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract a valid YouTube video ID from the provided URL.'
        });
      }

      // Check for duplicate on OTHER documents
      const duplicate = await GospelMedia.findOne({
        youtubeVideoId: videoId,
        _id: { $ne: media._id }
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'This video is already in the library.'
        });
      }

      // Re-fetch oEmbed
      let oEmbed = null;
      try {
        oEmbed = await fetchOEmbed(videoId);
      } catch (oEmbedErr) {
        console.warn('[updateMedia] oEmbed fetch failed:', oEmbedErr.message);
        return res.status(400).json({
          success: false,
          message: 'Video not found or embedding is disabled.'
        });
      }

      media.youtubeUrl = newUrl;
      media.thumbnailUrl = oEmbed.thumbnail_url || '';
    }

    // Apply other field updates if provided
    if (title) {
      if (title.om !== undefined) media.title.om = title.om.trim();
      if (title.am !== undefined) media.title.am = title.am.trim();
      if (title.en !== undefined) media.title.en = title.en.trim();
    }

    if (description) {
      if (description.om !== undefined) media.description.om = description.om;
      if (description.am !== undefined) media.description.am = description.am;
      if (description.en !== undefined) media.description.en = description.en;
    }

    if (category) media.category = category;
    if (speakerOrSinger !== undefined) media.speakerOrSinger = speakerOrSinger.trim();

    // Allow explicit thumbnailUrl override (only if youtubeUrl wasn't changed, since oEmbed already set it above)
    if (thumbnailUrl !== undefined && !youtubeUrl) {
      media.thumbnailUrl = thumbnailUrl;
    }

    await media.save();
    await media.populate('addedBy', 'fullName role originChurch');

    // Audit log
    await logAudit(
      req,
      'UPDATE_MEDIA',
      `Gospel media updated: "${media.title.om}" (${req.params.id})`
    );

    res.status(200).json({
      success: true,
      message: 'Gospel media updated successfully',
      media
    });
  } catch (error) {
    console.error('[updateMedia Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update gospel media'
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
