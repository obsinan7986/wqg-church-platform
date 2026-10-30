const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const RadioState = require('../models/RadioState');
const { logAudit } = require('../utils/auditLogger');

// Directory for local uploads
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const RELIABLE_AUDIO_PATH = '/uploads/1793125357458-256997120-Chala_Garomsa_KAAMETTII_New_Ethiopian_Oromo_music_.mp3';

/**
 * Checks if a given URL references a local /uploads/ file that physically does not exist on disk
 * (which occurs when an ephemeral Render container redeploys or restarts).
 */
const isLocalUploadMissing = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('res.cloudinary.com')) return false;
  if (!url.includes('/uploads/')) return false;

  const match = url.match(/\/uploads\/([^/?#]+)/);
  if (match) {
    const filename = decodeURIComponent(match[1]);
    const filePath = path.join(UPLOADS_DIR, filename);
    return !fs.existsSync(filePath);
  }
  return false;
};

// Helper to safely check MongoDB ObjectId
const isValidObjectId = (id) =>
  id && mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));

// Helper to ensure full absolute HTTP(S) URL for client playback
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

// Staff roles authorized to control the Gospel Radio
const RADIO_STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'];

class RadioService {
  constructor() {
    this.nowPlaying = {
      mediaId: null,
      title: '',
      artist: 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii',
      url: '',
      category: 'GOSPEL',
      duration: 0,
      startedAt: 0,
      pausedAt: null,
      isPlaying: false,
      volume: 0.8,
      loop: false,
      startedBy: null,
      startedByName: '',
      queue: []
    };

    // Set of active socket IDs currently tuned into the radio
    this.activeListeners = new Set();
    this.initialized = false;
  }

  /**
   * Initialize state from MongoDB on startup
   */
  async init() {
    if (this.initialized) return;
    try {
      let state = await RadioState.findOne().sort({ updatedAt: -1 }).lean();
      if (state) {
        this.nowPlaying = {
          mediaId: state.mediaId ? state.mediaId.toString() : null,
          title: state.title || '',
          artist: state.artist || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii',
          url: resolveServerMediaUrl(state.url || ''),
          category: state.category || 'GOSPEL',
          duration: state.duration || 0,
          startedAt: state.startedAt || 0,
          pausedAt: state.pausedAt || null,
          isPlaying: state.isPlaying || false,
          volume: typeof state.volume === 'number' ? state.volume : 0.8,
          loop: !!state.loop,
          startedBy: state.startedBy ? state.startedBy.toString() : null,
          startedByName: state.startedByName || '',
          queue: Array.isArray(state.queue)
            ? state.queue.map((q) => ({ ...q, url: resolveServerMediaUrl(q.url) }))
            : []
        };

        // Ensure any dead actions.google.com URLs or missing local files are healed immediately
        const isDeadGoogle = this.nowPlaying.url && /actions\.google\.com/i.test(this.nowPlaying.url);
        const isMissingDiskFile = isLocalUploadMissing(this.nowPlaying.url);

        if (isDeadGoogle || isMissingDiskFile) {
          console.warn(
            `[RadioService] Current song "${this.nowPlaying.title}" audio file is missing on server disk (${this.nowPlaying.url}). Auto-healing to verified gospel track.`
          );
          this.nowPlaying.url = resolveServerMediaUrl(RELIABLE_AUDIO_PATH);
          this.nowPlaying.title = this.nowPlaying.title || 'Yaa Giyoorgis Nuuf Lallabi (Faarfannaa Wareegamaa)';
          await RadioState.updateMany(
            {},
            { $set: { url: this.nowPlaying.url, title: this.nowPlaying.title } }
          ).catch(() => {});
        }

        // Also heal missing files in the queue
        if (Array.isArray(this.nowPlaying.queue)) {
          this.nowPlaying.queue = this.nowPlaying.queue.map((q) => {
            if (isLocalUploadMissing(q.url)) {
              return { ...q, url: resolveServerMediaUrl(RELIABLE_AUDIO_PATH) };
            }
            return q;
          });
        }
      }
      this.initialized = true;
      console.log('[RadioService] Initialized radio state:', this.nowPlaying.title || '(idle)');
    } catch (err) {
      console.error('[RadioService] Failed to load initial state:', err.message);
    }
  }

  /**
   * Persist current in-memory state to DB asynchronously
   */
  async persist() {
    try {
      const safePayload = {
        ...this.nowPlaying,
        mediaId: isValidObjectId(this.nowPlaying.mediaId) ? this.nowPlaying.mediaId : null,
        startedBy: isValidObjectId(this.nowPlaying.startedBy) ? this.nowPlaying.startedBy : null,
        queue: Array.isArray(this.nowPlaying.queue)
          ? this.nowPlaying.queue.map((item) => ({
              ...item,
              mediaId: isValidObjectId(item.mediaId) ? item.mediaId : null
            }))
          : [],
        updatedAt: new Date()
      };

      await RadioState.findOneAndUpdate(
        {},
        safePayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.error('[RadioService] Failed to persist state:', err.message);
    }
  }

  /**
   * Get current synchronized state including listener count and server timestamp
   */
  getState() {
    // If the nowPlaying URL happens to be a missing local upload, auto-heal dynamically
    if (this.nowPlaying.url && isLocalUploadMissing(this.nowPlaying.url)) {
      this.nowPlaying.url = resolveServerMediaUrl(RELIABLE_AUDIO_PATH);
    }

    return {
      ...this.nowPlaying,
      listenersCount: this.activeListeners.size,
      serverTime: Date.now()
    };
  }

  /**
   * Role check helper: SUPER_ADMIN, ADMIN, SECRETARY
   */
  isAuthorized(user) {
    if (!user || !user.role) return false;
    return RADIO_STAFF_ROLES.includes(user.role);
  }

  /**
   * Staff plays a song for everyone
   */
  async play(payload, user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    const { mediaId, title, url, artist, category, duration, queue, loop, volume, startOffsetSeconds } = payload || {};

    if (!url || !title) {
      throw new Error('Song URL and title are required to play.');
    }

    let targetUrl = url.trim();
    if (isLocalUploadMissing(targetUrl)) {
      console.warn(`[RadioService] Target audio track "${title}" is missing from disk. Using reliable gospel track.`);
      targetUrl = RELIABLE_AUDIO_PATH;
    }

    const offsetMs = Math.round((Number(startOffsetSeconds) || 0) * 1000);
    const now = Date.now();

    this.nowPlaying = {
      ...this.nowPlaying,
      mediaId: mediaId || null,
      title: title.trim(),
      artist: (artist && artist.trim()) || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii',
      url: resolveServerMediaUrl(targetUrl),
      category: category || 'GOSPEL',
      duration: Number(duration) || 0,
      startedAt: now - offsetMs,
      pausedAt: null,
      isPlaying: true,
      volume: typeof volume === 'number' ? volume : this.nowPlaying.volume,
      loop: typeof loop === 'boolean' ? loop : this.nowPlaying.loop,
      startedBy: user._id,
      startedByName: user.fullName || 'Church Staff',
      queue: Array.isArray(queue)
        ? queue.map((q) => ({ ...q, url: resolveServerMediaUrl(q.url) }))
        : this.nowPlaying.queue
    };

    await this.persist();
    await logAudit(null, 'RADIO_PLAY', { title: this.nowPlaying.title, mediaId: this.nowPlaying.mediaId }, user);

    if (io) {
      io.to('all_users_room').emit('radio_state', this.getState());
    }

    return this.getState();
  }

  /**
   * Staff pauses the radio
   */
  async pause(user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    if (!this.nowPlaying.isPlaying) return this.getState();

    this.nowPlaying.isPlaying = false;
    this.nowPlaying.pausedAt = Date.now();

    await this.persist();
    await logAudit(null, 'RADIO_PAUSE', { title: this.nowPlaying.title }, user);

    if (io) {
      io.to('all_users_room').emit('radio_state', this.getState());
    }

    return this.getState();
  }

  /**
   * Staff resumes playback
   */
  async resume(user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    if (this.nowPlaying.isPlaying || !this.nowPlaying.url) return this.getState();

    const now = Date.now();
    if (this.nowPlaying.pausedAt) {
      // Shift startedAt forward by pause duration to maintain exact position
      const pauseDuration = now - this.nowPlaying.pausedAt;
      this.nowPlaying.startedAt += pauseDuration;
    } else {
      this.nowPlaying.startedAt = now;
    }

    this.nowPlaying.pausedAt = null;
    this.nowPlaying.isPlaying = true;

    await this.persist();
    await logAudit(null, 'RADIO_RESUME', { title: this.nowPlaying.title }, user);

    if (io) {
      io.to('all_users_room').emit('radio_state', this.getState());
    }

    return this.getState();
  }

  /**
   * Staff stops the radio
   */
  async stop(user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    const previousTitle = this.nowPlaying.title;

    this.nowPlaying = {
      ...this.nowPlaying,
      isPlaying: false,
      startedAt: 0,
      pausedAt: null,
      mediaId: null,
      title: '',
      url: '',
      duration: 0
    };

    await this.persist();
    await logAudit(null, 'RADIO_STOP', { previousTitle }, user);

    if (io) {
      io.to('all_users_room').emit('radio_state', this.getState());
    }

    return this.getState();
  }

  /**
   * Staff seeks to a specific position in seconds
   */
  async seek(positionSeconds, user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    const pos = Math.max(0, Number(positionSeconds) || 0);
    const now = Date.now();

    this.nowPlaying.startedAt = now - Math.round(pos * 1000);
    if (!this.nowPlaying.isPlaying) {
      this.nowPlaying.pausedAt = now;
    }

    await this.persist();
    await logAudit(null, 'RADIO_SEEK', { positionSeconds: pos, title: this.nowPlaying.title }, user);

    if (io) {
      io.to('all_users_room').emit('radio_state', this.getState());
    }

    return this.getState();
  }

  /**
   * Staff skips to next song in the queue
   */
  async next(user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    if (this.nowPlaying.queue && this.nowPlaying.queue.length > 0) {
      const nextSong = this.nowPlaying.queue.shift();
      return this.play(
        {
          mediaId: nextSong.mediaId,
          title: nextSong.title,
          url: nextSong.url,
          category: nextSong.category,
          duration: nextSong.duration,
          queue: this.nowPlaying.queue
        },
        user,
        io
      );
    }

    // If loop is enabled and queue is empty, restart current song
    if (this.nowPlaying.loop && this.nowPlaying.url) {
      return this.seek(0, user, io);
    }

    // Otherwise stop playback
    return this.stop(user, io);
  }

  /**
   * Update queue or loop mode
   */
  async updateQueue(queue, loop, user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    if (Array.isArray(queue)) {
      this.nowPlaying.queue = queue;
    }
    if (typeof loop === 'boolean') {
      this.nowPlaying.loop = loop;
    }

    await this.persist();

    if (io) {
      io.to('all_users_room').emit('radio_state', this.getState());
    }

    return this.getState();
  }

  /**
   * Listener tracking
   */
  addListener(socketId, io) {
    if (!socketId) return;
    this.activeListeners.add(socketId);
    if (io) {
      io.to('all_users_room').emit('radio_listeners_count', {
        listenersCount: this.activeListeners.size
      });
    }
  }

  removeListener(socketId, io) {
    if (!socketId) return;
    if (this.activeListeners.delete(socketId)) {
      if (io) {
        io.to('all_users_room').emit('radio_listeners_count', {
          listenersCount: this.activeListeners.size
        });
      }
    }
  }
}

// Singleton radio service instance
const radioService = new RadioService();
module.exports = radioService;
