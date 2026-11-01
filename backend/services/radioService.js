const mongoose = require('mongoose');
const RadioState = require('../models/RadioState');
const { logAudit } = require('../utils/auditLogger');

// Helper to safely check MongoDB ObjectId
const isValidObjectId = (id) =>
  id && mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));

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
      sourceType: 'YOUTUBE',
      youtubeVideoId: '',
      thumbnailUrl: '',
      queue: []
    };

    // Set of active socket IDs currently tuned into the radio
    this.activeListeners = new Set();
    this.initialized = false;

    // Guard map to prevent double-advance on track-ended events
    this.trackEndedGuard = new Map();
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
          url: state.url || '',
          category: state.category || 'GOSPEL',
          duration: state.duration || 0,
          startedAt: state.startedAt || 0,
          pausedAt: state.pausedAt || null,
          isPlaying: state.isPlaying || false,
          volume: typeof state.volume === 'number' ? state.volume : 0.8,
          loop: !!state.loop,
          startedBy: state.startedBy ? state.startedBy.toString() : null,
          startedByName: state.startedByName || '',
          sourceType: 'YOUTUBE',
          youtubeVideoId: state.youtubeVideoId || '',
          thumbnailUrl: state.thumbnailUrl || '',
          queue: Array.isArray(state.queue)
            ? state.queue.map((q) => ({
                ...q,
                sourceType: 'YOUTUBE',
                youtubeVideoId: q.youtubeVideoId || '',
                thumbnailUrl: q.thumbnailUrl || ''
              }))
            : []
        };
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
        sourceType: 'YOUTUBE',
        youtubeVideoId: this.nowPlaying.youtubeVideoId || '',
        thumbnailUrl: this.nowPlaying.thumbnailUrl || '',
        queue: Array.isArray(this.nowPlaying.queue)
          ? this.nowPlaying.queue.map((item) => ({
              ...item,
              mediaId: isValidObjectId(item.mediaId) ? item.mediaId : null,
              sourceType: 'YOUTUBE',
              youtubeVideoId: item.youtubeVideoId || '',
              thumbnailUrl: item.thumbnailUrl || ''
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
    return {
      ...this.nowPlaying,
      sourceType: 'YOUTUBE',
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
   * Staff plays a YouTube track for everyone
   */
  async play(payload, user, io) {
    if (!this.isAuthorized(user)) {
      throw new Error('Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.');
    }

    const { mediaId, title, artist, category, duration, queue, loop, volume, startOffsetSeconds, youtubeVideoId, thumbnailUrl } = payload || {};

    if (!title && !youtubeVideoId) {
      throw new Error('Song title or YouTube video is required to play.');
    }

    const offsetMs = Math.round((Number(startOffsetSeconds) || 0) * 1000);
    const now = Date.now();

    this.nowPlaying = {
      ...this.nowPlaying,
      mediaId: mediaId || null,
      title: (title || 'Gospel Track').trim(),
      artist: (artist && artist.trim()) || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii',
      url: '',
      category: category || 'GOSPEL',
      duration: Number(duration) || 0,
      startedAt: now - offsetMs,
      pausedAt: null,
      isPlaying: true,
      volume: typeof volume === 'number' ? volume : this.nowPlaying.volume,
      loop: typeof loop === 'boolean' ? loop : this.nowPlaying.loop,
      startedBy: user._id,
      startedByName: user.fullName || 'Church Staff',
      sourceType: 'YOUTUBE',
      youtubeVideoId: youtubeVideoId || '',
      thumbnailUrl: thumbnailUrl || '',
      queue: Array.isArray(queue)
        ? queue.map((q) => ({
            ...q,
            sourceType: 'YOUTUBE',
            youtubeVideoId: q.youtubeVideoId || '',
            thumbnailUrl: q.thumbnailUrl || ''
          }))
        : this.nowPlaying.queue
    };

    await this.persist();
    await logAudit(null, 'RADIO_PLAY', { title: this.nowPlaying.title, mediaId: this.nowPlaying.mediaId, youtubeVideoId: this.nowPlaying.youtubeVideoId }, user);

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

    if (this.nowPlaying.isPlaying || !this.nowPlaying.youtubeVideoId) return this.getState();

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
      duration: 0,
      sourceType: 'YOUTUBE',
      youtubeVideoId: '',
      thumbnailUrl: ''
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
          category: nextSong.category,
          duration: nextSong.duration,
          sourceType: 'YOUTUBE',
          youtubeVideoId: nextSong.youtubeVideoId || '',
          thumbnailUrl: nextSong.thumbnailUrl || '',
          queue: this.nowPlaying.queue
        },
        user,
        io
      );
    }

    // If loop is enabled and queue is empty, restart current song
    if (this.nowPlaying.loop && this.nowPlaying.youtubeVideoId) {
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
      this.nowPlaying.queue = queue.map((q) => ({
        ...q,
        sourceType: 'YOUTUBE',
        youtubeVideoId: q.youtubeVideoId || '',
        thumbnailUrl: q.thumbnailUrl || ''
      }));
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

  /**
   * Called when a client reports a YouTube track has ended naturally.
   * Guards against duplicate advances using a (trackId, startedAt) key.
   */
  async trackEnded(trackId, startedAt, user, io) {
    // Guard: only advance once per (trackId, startedAt) combination
    const guardKey = `${trackId}_${startedAt}`;
    if (this.trackEndedGuard.has(guardKey)) return this.getState();
    this.trackEndedGuard.set(guardKey, Date.now());

    // Clean old guard entries (older than 5 min)
    const now = Date.now();
    for (const [k, v] of this.trackEndedGuard.entries()) {
      if (now - v > 300000) this.trackEndedGuard.delete(k);
    }

    // Log and advance
    await logAudit(null, 'RADIO_TRACK_ENDED', { trackId, startedAt, title: this.nowPlaying.title }, user);
    return this.next(user, io);
  }
}

// Singleton radio service instance
const radioService = new RadioService();
module.exports = radioService;
