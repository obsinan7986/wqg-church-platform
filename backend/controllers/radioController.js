const GospelMedia = require('../models/GospelMedia');
const radioService = require('../services/radioService');
const User = require('../models/User');

// Helper: get best localized title from a multilingual title object
const getLocalizedTitle = (titleObj, lang = 'om') => {
  if (!titleObj) return '';
  if (typeof titleObj === 'string') return titleObj;
  return titleObj[lang] || titleObj.om || titleObj.am || titleObj.en || '';
};

/**
 * @desc    Get current synchronized radio state
 * @route   GET /api/radio/state
 * @access  Public
 */
const getRadioState = async (req, res) => {
  try {
    await radioService.init();
    return res.status(200).json({
      success: true,
      state: radioService.getState()
    });
  } catch (err) {
    console.error('[getRadioState Error]:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to get radio state' });
  }
};

/**
 * @desc    Get radio library of active YouTube GospelMedia tracks
 * @route   GET /api/radio/library
 * @access  Public
 */
const getRadioLibrary = async (req, res) => {
  try {
    const lang = req.query.lang || 'om';

    // Fetch active YouTube GospelMedia
    const youtubeMedia = await GospelMedia.find({ isActive: true })
      .select('_id title speakerOrSinger category youtubeVideoId thumbnailUrl')
      .sort({ createdAt: -1 })
      .lean();

    const tracks = youtubeMedia.map((m) => ({
      id: m._id,
      sourceType: 'YOUTUBE',
      title: getLocalizedTitle(m.title, lang),
      artist: m.speakerOrSinger,
      category: m.category,
      youtubeVideoId: m.youtubeVideoId,
      thumbnailUrl: m.thumbnailUrl
    }));

    return res.status(200).json({
      success: true,
      tracks
    });
  } catch (err) {
    console.error('[getRadioLibrary Error]:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch radio library' });
  }
};

/**
 * @desc    Report that a YouTube track has ended naturally (triggers auto-advance)
 * @route   POST /api/radio/track-ended
 * @access  Private (staff only)
 */
const reportTrackEnded = async (req, res) => {
  try {
    const { trackId, startedAt } = req.body;
    const state = await radioService.trackEnded(trackId, startedAt, req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    console.error('[reportTrackEnded Error]:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

const playRadio = async (req, res) => {
  try {
    const state = await radioService.play(req.body, req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    console.error('[playRadio Error]:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
};

const pauseRadio = async (req, res) => {
  try {
    const state = await radioService.pause(req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const resumeRadio = async (req, res) => {
  try {
    const state = await radioService.resume(req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const stopRadio = async (req, res) => {
  try {
    const state = await radioService.stop(req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const seekRadio = async (req, res) => {
  try {
    const { positionSeconds } = req.body;
    const state = await radioService.seek(positionSeconds, req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const nextRadio = async (req, res) => {
  try {
    const state = await radioService.next(req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const updateRadioQueue = async (req, res) => {
  try {
    const { queue, loop } = req.body;
    const state = await radioService.updateQueue(queue, loop, req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRadioState,
  getRadioLibrary,
  reportTrackEnded,
  playRadio,
  pauseRadio,
  resumeRadio,
  stopRadio,
  seekRadio,
  nextRadio,
  updateRadioQueue
};
