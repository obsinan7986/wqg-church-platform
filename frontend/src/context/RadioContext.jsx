import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const RadioContext = createContext(null);

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
  serverTime: 0
};

export const RadioProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [radioState, setRadioState] = useState(DEFAULT_RADIO_STATE);
  const [isListening, setIsListening] = useState(() => {
    try {
      const saved = localStorage.getItem('gospel_radio_listening');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [userVolume, setUserVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('gospel_radio_volume');
      return saved !== null ? Math.min(1, Math.max(0, parseFloat(saved))) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef(null);
  const clockOffsetRef = useRef(0); // serverTime - Date.now()
  const isListeningRef = useRef(isListening);
  const radioStateRef = useRef(radioState);
  const isSyncingRef = useRef(false);

  isListeningRef.current = isListening;
  radioStateRef.current = radioState;

  // Persist listening preference
  const toggleListening = useCallback(() => {
    setIsListening((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gospel_radio_listening', String(next));
      } catch {}

      if (socket) {
        socket.emit(next ? 'radio_listen_start' : 'radio_listen_stop');
      }

      const audio = audioRef.current;
      if (audio) {
        if (!next) {
          audio.pause();
        } else if (radioStateRef.current.isPlaying && radioStateRef.current.url) {
          syncAndPlay(radioStateRef.current);
        }
      }

      return next;
    });
  }, [socket]);

  // Persist volume
  const setUserVolume = useCallback((vol) => {
    const clamped = Math.min(1, Math.max(0, vol));
    setUserVolumeState(clamped);
    try {
      localStorage.setItem('gospel_radio_volume', String(clamped));
    } catch {}
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  // Calculate target position from startedAt and server clock offset
  const calculateTargetPosition = useCallback((state) => {
    if (!state || !state.url) return 0;
    const now = Date.now() + (clockOffsetRef.current || 0);

    if (state.isPlaying) {
      const elapsed = Math.max(0, (now - (state.startedAt || now)) / 1000);
      if (state.duration > 0 && state.loop) {
        return elapsed % state.duration;
      }
      return elapsed;
    } else if (state.pausedAt && state.startedAt) {
      return Math.max(0, (state.pausedAt - state.startedAt) / 1000);
    }
    return 0;
  }, []);

  // Synchronize audio element to given state and play if listening
  const syncAndPlay = useCallback(
    async (state) => {
      const audio = audioRef.current;
      if (!audio || !state || !state.url) {
        if (audio) audio.pause();
        return;
      }

      setLoadError(null);

      // Change source if different
      if (audio.src !== state.url) {
        audio.src = state.url;
        audio.load();
      }

      const targetPos = calculateTargetPosition(state);

      if (state.isPlaying) {
        if (isListeningRef.current) {
          try {
            // Apply drift seek if difference > 0.8s
            if (Math.abs(audio.currentTime - targetPos) > 0.8) {
              audio.currentTime = targetPos;
            }
            audio.volume = userVolume;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              await playPromise;
              setAutoplayBlocked(false);
            }
          } catch (err) {
            console.warn('[Gospel Radio] Autoplay blocked or play error:', err.name, err.message);
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
              setAutoplayBlocked(true);
            } else {
              setLoadError('Faarfannaa fe\'uu hin dandeenye (Audio playback failed)');
            }
          }
        } else {
          audio.pause();
        }
      } else {
        // Paused or stopped
        audio.pause();
        if (state.pausedAt) {
          audio.currentTime = targetPos;
        }
      }
    },
    [calculateTargetPosition, userVolume]
  );

  // User unlocks audio on browser autoplay block
  const unlockAutoplay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      setAutoplayBlocked(false);
      if (radioStateRef.current.isPlaying && radioStateRef.current.url) {
        const targetPos = calculateTargetPosition(radioStateRef.current);
        audio.currentTime = targetPos;
        audio.volume = userVolume;
        await audio.play();
        if (socket) socket.emit('radio_listen_start');
      }
    } catch (err) {
      console.warn('[Gospel Radio] Unlock failed:', err);
    }
  }, [calculateTargetPosition, userVolume, socket]);

  // Initial fetch of radio state from REST endpoint as fallback
  useEffect(() => {
    let mounted = true;
    const fetchInitialState = async () => {
      try {
        const res = await api.get('/radio/state');
        if (res.data?.success && mounted) {
          const state = res.data.state;
          if (state.serverTime) {
            clockOffsetRef.current = state.serverTime - Date.now();
          }
          setRadioState(state);
          syncAndPlay(state);
        }
      } catch (err) {
        console.warn('[RadioContext] REST state fetch error:', err.message);
      }
    };
    fetchInitialState();
    return () => {
      mounted = false;
    };
  }, [syncAndPlay]);

  // Socket event listener for real-time broadcasts
  useEffect(() => {
    if (!socket) return;

    const handleRadioState = (state) => {
      if (!state) return;
      if (state.serverTime) {
        clockOffsetRef.current = state.serverTime - Date.now();
      }
      setRadioState(state);
      syncAndPlay(state);
    };

    const handleListenersCount = ({ listenersCount }) => {
      setRadioState((prev) => ({ ...prev, listenersCount }));
    };

    socket.on('radio_state', handleRadioState);
    socket.on('radio_listeners_count', handleListenersCount);

    // If already listening when socket connects, notify server
    if (isListeningRef.current) {
      socket.emit('radio_listen_start');
    }

    return () => {
      socket.off('radio_state', handleRadioState);
      socket.off('radio_listeners_count', handleListenersCount);
      socket.emit('radio_listen_stop');
    };
  }, [socket, syncAndPlay]);

  // 10-second periodic drift correction
  useEffect(() => {
    const interval = setInterval(() => {
      const state = radioStateRef.current;
      const audio = audioRef.current;
      if (!state || !state.isPlaying || !state.url || !audio || audio.paused || !isListeningRef.current) {
        return;
      }

      const expectedPos = calculateTargetPosition(state);
      const drift = Math.abs(audio.currentTime - expectedPos);

      // Correct if drift exceeds 1.2 seconds
      if (drift > 1.2) {
        console.log(`[Gospel Radio] Correcting drift of ${drift.toFixed(2)}s to ${expectedPos.toFixed(2)}s`);
        try {
          audio.currentTime = expectedPos;
        } catch (e) {
          console.warn('[Gospel Radio] Seek correction error:', e);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [calculateTargetPosition]);

  // Smooth UI time progression ticker
  useEffect(() => {
    let animId;
    const tick = () => {
      const state = radioStateRef.current;
      const audio = audioRef.current;
      if (state.isPlaying) {
        if (audio && !audio.paused && !Number.isNaN(audio.currentTime)) {
          setCurrentTime(audio.currentTime);
        } else {
          setCurrentTime(calculateTargetPosition(state));
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
  }, [calculateTargetPosition]);

  // Audio element events
  const handleAudioEnded = () => {
    const state = radioStateRef.current;
    if (state.loop) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      // If staff is currently logged in, trigger next song
      const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'].includes(user.role);
      if (isStaff) {
        nextSong();
      }
    }
  };

  const handleAudioError = (e) => {
    console.error('[Gospel Radio] Audio error:', e);
    setLoadError("Faarfannaa taphachiisuun hin danda'amne (Audio failed to load)");
  };

  // Staff Controls
  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'].includes(user.role);

  const playSong = async (songPayload) => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_play', songPayload, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/play', songPayload);
      return res.data;
    }
  };

  const pauseRadio = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_pause', {}, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/pause');
      return res.data;
    }
  };

  const resumeRadio = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_resume', {}, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/resume');
      return res.data;
    }
  };

  const stopRadio = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_stop', {}, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/stop');
      return res.data;
    }
  };

  const seekRadio = async (posSeconds) => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_seek', { positionSeconds: posSeconds }, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/seek', { positionSeconds: posSeconds });
      return res.data;
    }
  };

  const nextSong = async () => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_next', {}, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/next');
      return res.data;
    }
  };

  const updateQueue = async (queue, loop) => {
    if (!isStaff) return { success: false, message: 'Unauthorized' };
    if (socket && socket.connected) {
      return new Promise((resolve) => {
        socket.emit('radio_queue_update', { queue, loop }, (res) => {
          resolve(res || { success: true });
        });
      });
    } else {
      const res = await api.post('/radio/queue', { queue, loop });
      return res.data;
    }
  };

  return (
    <RadioContext.Provider
      value={{
        radioState,
        isListening,
        toggleListening,
        userVolume,
        setUserVolume,
        autoplayBlocked,
        unlockAutoplay,
        loadError,
        currentTime,
        audioRef,
        isStaff,
        playSong,
        pauseRadio,
        resumeRadio,
        stopRadio,
        seekRadio,
        nextSong,
        updateQueue
      }}
    >
      {/* Hidden global audio element */}
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        playsInline
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        style={{ display: 'none' }}
      />
      {children}
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within a RadioProvider');
  }
  return context;
};
