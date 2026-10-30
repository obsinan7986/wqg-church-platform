const MediaDocument = require('../models/MediaDocument');
const radioService = require('../services/radioService');
const User = require('../models/User');

// Sample initial songs for quick testing if database has no audio media yet
const SAMPLE_GOSPEL_SONGS = [
  {
    title: 'Yaa Giyoorgis Nuuf Lallabi (Faarfannaa Wareegamaa)',
    category: 'GOSPEL',
    fileType: 'AUDIO',
    mimeType: 'audio/mpeg',
    fileUrl: 'https://actions.google.com/sounds/v1/ambiences/temple_bell.ogg', // Reliable public sample audio
    fileName: 'yaa_giyoorgis.ogg',
    description: 'Faarfannaa kadhannaa fi galataa Qulqulluu Giyoorgisii.',
    fileSize: 1048576
  },
  {
    title: 'Faarfannaa Koorii Dargaggootaa - Baga Nagaan Dhuftan',
    category: 'CHOIR',
    fileType: 'AUDIO',
    mimeType: 'audio/mpeg',
    fileUrl: 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
    fileName: 'koorii_dargaggootaa.ogg',
    description: 'Faarfannaa gamtaa koorii Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii.',
    fileSize: 2097152
  },
  {
    title: 'Sagalee Wangeelaa & Faarfannaa Qulqullootaa',
    category: 'GOSPEL',
    fileType: 'AUDIO',
    mimeType: 'audio/mpeg',
    fileUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_festival_crowd.ogg',
    fileName: 'sagalee_wangeelaa.ogg',
    description: 'Barnoota wangeelaa fi faarfannaa amantaa sirna tawaahidoo.',
    fileSize: 1572864
  }
];

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
 * @desc    Get list of available songs from MediaDocument categories GOSPEL and CHOIR
 * @route   GET /api/radio/songs
 * @access  Private / Public
 */
const getRadioSongs = async (req, res) => {
  try {
    const { q, category } = req.query;

    const filter = {
      category: { $in: ['GOSPEL', 'CHOIR'] }
    };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (q && q.trim()) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } }
      ];
    }

    let songs = await MediaDocument.find(filter)
      .sort({ createdAt: -1 })
      .select('_id title category fileUrl fileName fileType mimeType fileSize description createdAt')
      .lean();

    // Auto-seed sample songs if empty so the radio is immediately usable
    if (songs.length === 0 && !q && (!category || category === 'ALL')) {
      const adminUser = await User.findOne({ role: 'SUPER_ADMIN' }).select('_id');
      if (adminUser) {
        const seeded = await MediaDocument.insertMany(
          SAMPLE_GOSPEL_SONGS.map((s) => ({ ...s, uploadedBy: adminUser._id }))
        );
        songs = seeded.map((s) => s.toObject());
      }
    }

    const baseServerUrl =
      process.env.RENDER_EXTERNAL_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://wqg-church-platform.onrender.com'
        : `http://localhost:${process.env.PORT || 5000}`);

    const mappedSongs = songs.map((s) => ({
      ...s,
      fileUrl: s.fileUrl && !s.fileUrl.startsWith('http') && !s.fileUrl.startsWith('data:')
        ? `${baseServerUrl}${s.fileUrl.startsWith('/') ? '' : '/'}${s.fileUrl}`
        : s.fileUrl
    }));

    return res.status(200).json({
      success: true,
      count: mappedSongs.length,
      songs: mappedSongs
    });
  } catch (err) {
    console.error('[getRadioSongs Error]:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch radio songs' });
  }
};

/**
 * REST Fallback handlers for staff controls
 */
const playRadio = async (req, res) => {
  try {
    const state = await radioService.play(req.body, req.user, req.io);
    return res.status(200).json({ success: true, state });
  } catch (err) {
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
  getRadioSongs,
  playRadio,
  pauseRadio,
  resumeRadio,
  stopRadio,
  seekRadio,
  nextRadio,
  updateRadioQueue
};
