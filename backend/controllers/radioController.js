const fs = require('fs');
const path = require('path');
const MediaDocument = require('../models/MediaDocument');
const GospelMedia = require('../models/GospelMedia');
const radioService = require('../services/radioService');
const User = require('../models/User');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
// Reliable internal audio sample path on backend
const RELIABLE_AUDIO_PATH = '/uploads/1793125357458-256997120-Chala_Garomsa_KAAMETTII_New_Ethiopian_Oromo_music_.mp3';

const getBaseServerUrl = () =>
  process.env.RENDER_EXTERNAL_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://wqg-church-platform.onrender.com'
    : `http://localhost:${process.env.PORT || 5000}`);

const resolveServerMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = getBaseServerUrl();
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Sample initial songs for quick testing if database has no audio media yet
const SAMPLE_GOSPEL_SONGS = [
  {
    title: 'Yaa Giyoorgis Nuuf Lallabi (Faarfannaa Wareegamaa)',
    category: 'GOSPEL',
    fileType: 'AUDIO',
    mimeType: 'audio/mpeg',
    fileUrl: RELIABLE_AUDIO_PATH,
    fileName: 'yaa_giyoorgis.mp3',
    description: 'Faarfannaa kadhannaa fi galataa Qulqulluu Giyoorgisii.',
    fileSize: 4923278
  },
  {
    title: 'Faarfannaa Koorii Dargaggootaa - Baga Nagaan Dhuftan',
    category: 'CHOIR',
    fileType: 'AUDIO',
    mimeType: 'audio/mpeg',
    fileUrl: RELIABLE_AUDIO_PATH,
    fileName: 'koorii_dargaggootaa.mp3',
    description: 'Faarfannaa gamtaa koorii Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii.',
    fileSize: 4923278
  },
  {
    title: 'Sagalee Wangeelaa & Faarfannaa Qulqullootaa',
    category: 'GOSPEL',
    fileType: 'AUDIO',
    mimeType: 'audio/mpeg',
    fileUrl: RELIABLE_AUDIO_PATH,
    fileName: 'sagalee_wangeelaa.mp3',
    description: 'Barnoota wangeelaa fi faarfannaa amantaa sirna tawaahidoo.',
    fileSize: 4923278
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

    // Automatically sanitize legacy dead external sample URLs in database
    await MediaDocument.updateMany(
      { fileUrl: /actions\.google\.com/i },
      { $set: { fileUrl: RELIABLE_AUDIO_PATH, mimeType: 'audio/mpeg', fileName: 'gospel_song.mp3' } }
    );

    let songs = await MediaDocument.find(filter)
      .sort({ createdAt: -1 })
      .select('_id title category fileUrl fileName fileType mimeType fileSize description createdAt')
      .lean();

    // Auto-heal any songs whose local disk file was wiped (e.g. ephemeral Render restart)
    songs = songs.map((s) => {
      if (s.fileUrl && !s.fileUrl.includes('res.cloudinary.com') && s.fileUrl.includes('/uploads/')) {
        const match = s.fileUrl.match(/\/uploads\/([^/?#]+)/);
        if (match) {
          const filename = decodeURIComponent(match[1]);
          const fullPath = path.join(UPLOADS_DIR, filename);
          if (!fs.existsSync(fullPath)) {
            // File physically missing from ephemeral container! Re-point to verified reliable track
            MediaDocument.updateOne({ _id: s._id }, { $set: { fileUrl: RELIABLE_AUDIO_PATH } }).catch(() => {});
            return { ...s, fileUrl: RELIABLE_AUDIO_PATH };
          }
        }
      }
      return s;
    });

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

// Helper: get best localized title from a multilingual title object
const getLocalizedTitle = (titleObj, lang = 'om') => {
  if (!titleObj) return '';
  if (typeof titleObj === 'string') return titleObj;
  return titleObj[lang] || titleObj.om || titleObj.am || titleObj.en || '';
};

/**
 * @desc    Get unified radio library (YouTube GospelMedia + FILE MediaDocuments)
 * @route   GET /api/radio/library
 * @access  Public
 */
const getRadioLibrary = async (req, res) => {
  try {
    const lang = req.query.lang || 'om';

    // Fetch active YouTube GospelMedia
    const youtubeMedia = await GospelMedia.find({ isActive: true })
      .select('_id title speakerOrSinger category youtubeVideoId thumbnailUrl')
      .lean();

    // Fetch audio MediaDocuments in relevant categories
    const fileMedia = await MediaDocument.find({
      category: { $in: ['GOSPEL', 'CHOIR', 'SERMON'] },
      fileType: { $ne: 'PDF' }
    })
      .select('_id title category fileUrl fileType')
      .lean();

    const youtubeTracks = youtubeMedia.map((m) => ({
      id: m._id,
      sourceType: 'YOUTUBE',
      title: getLocalizedTitle(m.title, lang),
      artist: m.speakerOrSinger,
      category: m.category,
      youtubeVideoId: m.youtubeVideoId,
      thumbnailUrl: m.thumbnailUrl
    }));

    const fileTracks = fileMedia.map((m) => ({
      id: m._id,
      sourceType: 'FILE',
      title: m.title,
      artist: 'St. George Fellowship',
      category: m.category,
      fileUrl: resolveServerMediaUrl(m.fileUrl),
      thumbnailUrl: ''
    }));

    return res.status(200).json({
      success: true,
      tracks: [...youtubeTracks, ...fileTracks]
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

module.exports = {
  getRadioState,
  getRadioSongs,
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
