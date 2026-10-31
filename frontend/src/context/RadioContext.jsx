import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../api/axios';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { useYouTubePlayer } from '../utils/useYouTubePlayer';

const RadioContext = createContext(null);

const RELIABLE_AUDIO_FALLBACK = '/uploads/1793125357458-256997120-Chala_Garomsa_KAAMETTII_New_Ethiopian_Oromo_music_.mp3';

// YT player states
const YT_STATES = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

// YT error codes that mean "cannot be played here"
const YT_UNPLAYABLE_ERRORS = [2, 5, 100, 101, 150];

const DEFAULT_RADIO_STATE = {
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
  queue: [],
  listenersCount: 0,
  serverTime: 0,
  sourceType: 'FILE',
  youtubeVideoId: '',
  thumbnailUrl: '',
};

const YT_CONTAINER_ID = 'gospel-radio-yt-player';

export const RadioProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [radioState, setRadioState] = useState(DEFAULT_RADIO_STATE);
  const [isListening, setIsListening] = useState(() => {
    try {
      const saved = localStorage.getItem('gospel_radio_listening');
      return saved !== null ? saved === 'true' : true;
    } catch { return true; }
  });
  const [userVolume, setUserVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('gospel_radio_volume');
      return saved !== null ? Math.min(1, Math.max(0, parseFloat(saved))) : 0.8;
    } catch { return 0.8; }
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [autoplayGate, setAutoplayGate] = useState(false); // true = show "Tap to Listen"
  const [loadError, setLoadError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [brokenTracks, setBrokenTracks] = useState(new Set());
  const [ytPlayerCollapsed, setYtPlayerCollapsed] = useState(false);
  const [ytError, setYtError] = useState(null); // error message for current YT track

  const audioRef = useRef(null);
  const clockOffsetRef = useRef(0);
  const isListeningRef = useRef(isListening);
  const radioStateRef = useRef(radioState);
  const isSyncingRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);
  const ytEndedReportedRef = useRef({}); // guard: { trackId_startedAt: true }

  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'].includes(user.role);
  const isStaffRef = useRef(isStaff);
  isStaffRef.current = isStaff;
  isListeningRef.current = isListening;
  radioStateRef.current = radioState;

  const isYouTube = radioState.sourceType === 'YOUTUBE';
  const isYouTubeRef = useRef(isYouTube);
  isYouTubeRef.current = radioState.sourceType === 'YOUTUBE';

  // =====================
  // YouTube Player Setup
  // =====================
  const handleYTReady = useCallback((e) => {
    // Set initial volume
    try { e.target.setVolume(Math.round(userVolume * 100)); } catch {}
  }, [userVolume]);

  const handleYTStateChange = useCallback((state) => {
    if (state === YT_STATES.ENDED) {
      // Report track ended to server
      const rs = radioStateRef.current;
      const guardKey = `${rs.mediaId}_${rs.startedAt}`;
      if (!ytEndedReportedRef.current[guardKey]) {
        ytEndedReportedRef.current[guardKey] = true;
        if (socket?.connected) {
          socket.emit('radio_ended', { trackId: rs.mediaId, startedAt: rs.startedAt });
        } else {
          api.post('/radio/track-ended', { trackId: rs.mediaId, startedAt: rs.startedAt }).catch(() => {});
        }
      }
    }
  }, [socket]);

  const handleYTError = useCallback((errorCode) => {
    const rs = radioStateRef.current;
    const isUnplayable = YT_UNPLAYABLE_ERRORS.includes(errorCode);

    if (isUnplayable) {
      const msg = 'This video cannot be played here (embedding disabled or not found).';
      setYtError(msg);
      setLoadError(msg);
      // Mark this video as broken
      if (rs.youtubeVideoId) {
        setBrokenTracks(prev => new Set([...prev, rs.youtubeVideoId]));
      }
      // Auto-skip to next after brief delay
      setTimeout(() => {
        if (socket?.connected) {
          socket.emit('radio_next', {});
        } else {
          api.post('/radio/next').catch(() => {});
        }
      }, 2000);
    } else {
      setLoadError(`YouTube error (code ${errorCode}). Try refreshing.`);
    }
  }, [socket]);

  const {
    ytAvailable,
    loadVideo,
    seekTo: ytSeekTo,
    playVideo: ytPlay,
    pauseVideo: ytPause,
    setVolume: ytSetVolume,
    getCurrentTime: ytGetCurrentTime,
  } = useYouTubePlayer({
    containerId: YT_CONTAINER_ID,
    onReady: handleYTReady,
    onStateChange: handleYTStateChange,
    onError: handleYTError,
  });

  // =====================
  // Calculate position
  // =====================
  const calculateTargetPosition = useCallback((state) => {
    if (!state) return 0;
    const now = Date.now() + (clockOffsetRef.current || 0);
    if (state.isPlaying) {
      const elapsed = Math.max(0, (now - (state.startedAt || now)) / 1000);
      if (state.duration > 0 && state.loop) return elapsed % state.duration;
      return elapsed;
    } else if (state.pausedAt && state.startedAt) {
      return Math.max(0, (state.pausedAt - state.startedAt) / 1000);
    }
    return 0;
  }, []);

  // =====================
  // FILE audio sync
  // =====================
  const syncAndPlayAudio = useCallback(async (state) => {
    const audio = audioRef.current;
    if (!audio || !state || !state.url) {
      if (audio) audio.pause();
      return;
    }
    const fullUrl = resolveMediaUrl(state.url);
    if (!fullUrl) { if (audio) audio.pause(); return; }
    setLoadError(null);
    if (audio.src !== fullUrl) {
      fallbackAttemptedRef.current = false;
      audio.src = fullUrl;
      audio.load();
    }
    const targetPos = calculateTargetPosition(state);
    if (state.isPlaying) {
      if (isListeningRef.current) {
        try {
          if (audio.readyState >= 1 && !Number.isNaN(targetPos) && targetPos > 0) {
            try { if (Math.abs(audio.currentTime - targetPos) > 0.8) audio.currentTime = targetPos; } catch {}
          } else if (targetPos > 0) {
            const onMeta = () => { try { if (audio.duration && targetPos < audio.duration) audio.currentTime = targetPos; } catch {} };
            audio.addEventListener('loadedmetadata', onMeta, { once: true });
          }
          audio.volume = userVolume;
          const p = audio.play();
          if (p !== undefined) await p;
          setAutoplayBlocked(false);
          setAutoplayGate(false);
          setLoadError(null);
        } catch (err) {
          if (err.name === 'NotAllowedError') { setAutoplayBlocked(true); setAutoplayGate(true); }
          else if (err.name !== 'AbortError') setLoadError("Faarfannaa fe'uu hin dandeenye (Audio playback failed)");
        }
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      if (state.pausedAt && audio.readyState >= 1) { try { audio.currentTime = targetPos; } catch {} }
    }
  }, [calculateTargetPosition, userVolume]);

  // =====================
  // YOUTUBE sync
  // =====================
  const syncAndPlayYT = useCallback((state) => {
    if (!state || !state.youtubeVideoId) return;
    if (!ytAvailable) {
      setLoadError('YouTube player is not available (script blocked or offline).');
      return;
    }
    setYtError(null);
    setLoadError(null);
    const targetPos = calculateTargetPosition(state);
    loadVideo(state.youtubeVideoId, targetPos);
    if (!isListeningRef.current || !state.isPlaying) {
      setTimeout(() => { ytPause(); }, 1500);
    } else {
      ytSetVolume(userVolume);
    }
  }, [ytAvailable, calculateTargetPosition, loadVideo, ytPause, ytSetVolume, userVolume]);

  // =====================
  // Unified sync
  // =====================
  const syncAndPlay = useCallback((state) => {
    if (!state) return;
    if (state.sourceType === 'YOUTUBE') {
      // Pause audio if switching from FILE
      if (audioRef.current) audioRef.current.pause();
      syncAndPlayYT(state);
    } else {
      // Stop YT if switching from YOUTUBE
      ytPause();
      syncAndPlayAudio(state);
    }
  }, [syncAndPlayAudio, syncAndPlayYT, ytPause]);

  // =====================
  // Persist listening
  // =====================
  const toggleListening = useCallback(() => {
    setIsListening(prev => {
      const next = !prev;
      try { localStorage.setItem('gospel_radio_listening', String(next)); } catch {}
      if (socket) socket.emit(next ? 'radio_listen_start' : 'radio_listen_stop');
      const rs = radioStateRef.current;
      if (rs.sourceType === 'YOUTUBE') {
        if (!next) ytPause(); else if (rs.isPlaying && rs.youtubeVideoId) ytPlay();
      } else {
        const audio = audioRef.current;
        if (audio) {
          if (!next) audio.pause();
          else if (rs.isPlaying && rs.url) syncAndPlayAudio(rs);
        }
      }
      if (next) setAutoplayGate(false);
      return next;
    });
  }, [socket, ytPause, ytPlay, syncAndPlayAudio]);

  // User taps "Tap to Listen" gate
  const unlockAutoplay = useCallback(async () => {
    setAutoplayBlocked(false);
    setAutoplayGate(false);
    const rs = radioStateRef.current;
    if (rs.sourceType === 'YOUTUBE') {
      if (rs.isPlaying && rs.youtubeVideoId) {
        const pos = calculateTargetPosition(rs);
        loadVideo(rs.youtubeVideoId, pos);
        ytSetVolume(userVolume);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        setLoadError(null);
        if (rs.isPlaying && rs.url) {
          const fullUrl = resolveMediaUrl(rs.url);
          if (audio.src !== fullUrl) { audio.src = fullUrl; audio.load(); }
          const pos = calculateTargetPosition(rs);
          audio.currentTime = pos;
          audio.volume = userVolume;
          await audio.play();
          if (socket) socket.emit('radio_listen_start');
        }
      } catch (err) { console.warn('[Radio] Unlock failed:', err); }
    }
  }, [calculateTargetPosition, userVolume, socket, loadVideo, ytSetVolume]);

  const setUserVolume = useCallback((vol) => {
    const clamped = Math.min(1, Math.max(0, vol));
    setUserVolumeState(clamped);
    try { localStorage.setItem('gospel_radio_volume', String(clamped)); } catch {}
    if (audioRef.current) audioRef.current.volume = clamped;
    ytSetVolume(clamped);
  }, [ytSetVolume]);

  const retryPlayback = useCallback(async () => {
    setLoadError(null);
    setAutoplayBlocked(false);
    setYtError(null);
    const rs = radioStateRef.current;
    if (rs.sourceType === 'YOUTUBE') {
      if (rs.youtubeVideoId) {
        const pos = calculateTargetPosition(rs);
        loadVideo(rs.youtubeVideoId, pos);
        ytSetVolume(userVolume);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        const res = await api.get('/radio/state').catch(() => null);
        const state = res?.data?.state || rs;
        if (state?.url) {
          setRadioState(state);
          const fullUrl = resolveMediaUrl(state.url);
          audio.removeAttribute('crossorigin');
          audio.src = fallbackAttemptedRef.current ? resolveMediaUrl(RELIABLE_AUDIO_FALLBACK) : fullUrl;
          audio.load();
          const pos = calculateTargetPosition(state);
          if (pos > 0) audio.currentTime = pos;
          audio.volume = userVolume;
          await audio.play();
          setLoadError(null);
          if (socket) socket.emit('radio_listen_start');
        }
      } catch (err) {
        if (err.name === 'NotAllowedError') setAutoplayBlocked(true);
        else {
          try {
            const backupUrl = resolveMediaUrl(RELIABLE_AUDIO_FALLBACK);
            audio.src = backupUrl; audio.load(); audio.volume = userVolume;
            await audio.play(); setLoadError(null); fallbackAttemptedRef.current = true;
          } catch (be) {
            if (be.name === 'NotAllowedError') setAutoplayBlocked(true);
            else setLoadError("Faarfannaa fe'uu hin dandeenye");
          }
        }
      }
    }
  }, [calculateTargetPosition, userVolume, socket, loadVideo, ytSetVolume]);

  // Initial fetch
  useEffect(() => {
    let mounted = true;
    const fetchInitialState = async () => {
      try {
        const res = await api.get('/radio/state');
        if (res.data?.success && mounted) {
          const state = res.data.state;
          if (state.serverTime) clockOffsetRef.current = state.serverTime - Date.now();
          setRadioState(state);
          syncAndPlay(state);
        }
      } catch (err) { console.warn('[RadioContext] REST state fetch error:', err.message); }
    };
    fetchInitialState();
    return () => { mounted = false; };
  }, [syncAndPlay]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const handleRadioState = (state) => {
      if (!state) return;
      if (state.serverTime) clockOffsetRef.current = state.serverTime - Date.now();
      setRadioState(state);
      syncAndPlay(state);
    };
    const handleListenersCount = ({ listenersCount }) => {
      setRadioState(prev => ({ ...prev, listenersCount }));
    };
    socket.on('radio_state', handleRadioState);
    socket.on('radio_listeners_count', handleListenersCount);
    if (isListeningRef.current) socket.emit('radio_listen_start');
    return () => {
      socket.off('radio_state', handleRadioState);
      socket.off('radio_listeners_count', handleListenersCount);
      socket.emit('radio_listen_stop');
    };
  }, [socket, syncAndPlay]);

  // 10s drift correction
  useEffect(() => {
    const interval = setInterval(() => {
      const state = radioStateRef.current;
      if (!state?.isPlaying) return;
      const expectedPos = calculateTargetPosition(state);
      if (state.sourceType === 'YOUTUBE') {
        const actual = ytGetCurrentTime();
        const drift = Math.abs(actual - expectedPos);
        if (drift > 3) { try { ytSeekTo(expectedPos); } catch {} }
      } else {
        const audio = audioRef.current;
        if (!audio || audio.paused || !isListeningRef.current) return;
        const drift = Math.abs(audio.currentTime - expectedPos);
        if (drift > 1.2) { try { audio.currentTime = expectedPos; } catch {} }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [calculateTargetPosition, ytGetCurrentTime, ytSeekTo]);

  // Current time ticker
  useEffect(() => {
    let animId;
    const tick = () => {
      const state = radioStateRef.current;
      if (state.isPlaying) {
        if (state.sourceType === 'YOUTUBE') {
          setCurrentTime(ytGetCurrentTime());
        } else {
          const audio = audioRef.current;
          if (audio && !audio.paused && !Number.isNaN(audio.currentTime)) setCurrentTime(audio.currentTime);
          else setCurrentTime(calculateTargetPosition(state));
        }
      } else if (state.pausedAt) {
        setCurrentTime(calculateTargetPosition(state));
      } else {
        setCurrentTime(0);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [calculateTargetPosition, ytGetCurrentTime]);

  // FILE audio element events
  const handleAudioEnded = () => {
    const state = radioStateRef.current;
    if (state.loop) {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
    } else {
      // Report ended
      const guardKey = `${state.mediaId}_${state.startedAt}`;
      if (!ytEndedReportedRef.current[guardKey]) {
        ytEndedReportedRef.current[guardKey] = true;
        if (socket?.connected) socket.emit('radio_ended', { trackId: state.mediaId, startedAt: state.startedAt });
        else api.post('/radio/track-ended', { trackId: state.mediaId, startedAt: state.startedAt }).catch(() => {});
      }
    }
  };

  const handleAudioError = (e) => {
    const audio = audioRef.current;
    if (!radioStateRef.current?.url) return;
    if (audio?.crossOrigin) {
      audio.removeAttribute('crossorigin');
      audio.load();
      audio.play().catch(() => {});
      return;
    }
    const fallbackUrl = resolveMediaUrl(RELIABLE_AUDIO_FALLBACK);
    if (!fallbackAttemptedRef.current && audio && audio.src !== fallbackUrl) {
      fallbackAttemptedRef.current = true;
      audio.removeAttribute('crossorigin');
      audio.src = fallbackUrl; audio.load(); audio.volume = userVolume;
      audio.play()
        .then(() => { setLoadError(null); })
        .catch(err => {
          if (err.name === 'NotAllowedError') setAutoplayBlocked(true);
          else setLoadError("Faarfannaa fe'uu hin dandeenye (Audio playback failed)");
        });
      return;
    }
    setLoadError("Faarfannaa fe'uu hin dandeenye (Audio playback failed)");
  };

  // Staff Controls
  const playSong = async (songPayload) => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_play', songPayload, res => resolve(res || { success: true })));
    } else {
      const res = await api.post('/radio/play', songPayload);
      return res.data;
    }
  };

  const pauseRadio = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_pause', {}, res => resolve(res || { success: true })));
    } else { const res = await api.post('/radio/pause'); return res.data; }
  };

  const resumeRadio = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_resume', {}, res => resolve(res || { success: true })));
    } else { const res = await api.post('/radio/resume'); return res.data; }
  };

  const stopRadio = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_stop', {}, res => resolve(res || { success: true })));
    } else { const res = await api.post('/radio/stop'); return res.data; }
  };

  const seekRadio = async (posSeconds) => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_seek', { positionSeconds: posSeconds }, res => resolve(res || { success: true })));
    } else { const res = await api.post('/radio/seek', { positionSeconds: posSeconds }); return res.data; }
  };

  const nextSong = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_next', {}, res => resolve(res || { success: true })));
    } else { const res = await api.post('/radio/next'); return res.data; }
  };

  const updateQueue = async (queue, loop) => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket?.connected) {
      return new Promise(resolve => socket.emit('radio_queue_update', { queue, loop }, res => resolve(res || { success: true })));
    } else { const res = await api.post('/radio/queue', { queue, loop }); return res.data; }
  };

  return (
    <RadioContext.Provider value={{
      radioState,
      isListening,
      toggleListening,
      userVolume,
      setUserVolume,
      autoplayBlocked,
      autoplayGate,
      unlockAutoplay,
      retryPlayback,
      loadError,
      ytError,
      currentTime,
      audioRef,
      isStaff,
      isYouTube,
      ytAvailable,
      ytPlayerCollapsed,
      setYtPlayerCollapsed,
      brokenTracks,
      playSong,
      pauseRadio,
      resumeRadio,
      stopRadio,
      seekRadio,
      nextSong,
      updateQueue,
    }}>
      {/* Hidden FILE audio element */}
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        playsInline
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        style={{ display: 'none' }}
      />

      {/* YouTube IFrame player container - Single persistent element in DOM */}
      <div
        style={{
          position: 'fixed',
          bottom: ytPlayerCollapsed ? '64px' : '96px',
          right: '16px',
          zIndex: 50,
          width: ytPlayerCollapsed ? '200px' : '320px',
          maxWidth: 'calc(100vw - 32px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: isYouTube && radioState.youtubeVideoId ? 'block' : 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#000',
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
          <div id={YT_CONTAINER_ID} style={{ width: '100%', height: '100%' }} />
          <button
            onClick={() => setYtPlayerCollapsed(prev => !prev)}
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={ytPlayerCollapsed ? 'Expand video player' : 'Collapse to small bar'}
          >
            {ytPlayerCollapsed ? '▲ Expand (320px)' : '▼ Minimize'}
          </button>
          {ytError && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(220,38,38,0.95)',
                color: '#fff',
                fontSize: '11px',
                padding: '6px 8px',
                zIndex: 10
              }}
            >
              ⚠ {ytError}
            </div>
          )}
        </div>
        {ytPlayerCollapsed && (
          <div
            style={{
              background: 'rgba(15,23,42,0.95)',
              color: '#fff',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            ▶ {radioState.title || 'YouTube Radio'}
          </div>
        )}
      </div>

      {children}
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) throw new Error('useRadio must be used within a RadioProvider');
  return context;
};
