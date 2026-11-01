import { useEffect, useRef, useCallback, useState } from 'react';

const YT_SCRIPT_ID = 'youtube-iframe-api';
const YT_SCRIPT_SRC = 'https://www.youtube.com/iframe_api';

// Load YouTube script once globally
let ytScriptLoaded = false;
let ytReady = false;
const ytReadyCallbacks = [];

function ensureYTScript() {
  if (typeof window === 'undefined') return;
  if (ytReady) return;
  if (ytScriptLoaded) return;
  ytScriptLoaded = true;

  const script = document.createElement('script');
  script.id = YT_SCRIPT_ID;
  script.src = YT_SCRIPT_SRC;
  script.async = true;
  script.onerror = () => {
    console.warn('[YT] YouTube script failed to load (blocked or offline).');
  };
  document.head.appendChild(script);

  window.onYouTubeIframeAPIReady = () => {
    ytReady = true;
    ytReadyCallbacks.forEach(cb => cb());
    ytReadyCallbacks.length = 0;
  };
}

function whenYTReady(cb) {
  if (ytReady && window.YT?.Player) {
    cb();
  } else {
    ytReadyCallbacks.push(cb);
    ensureYTScript();
  }
}

/**
 * useYouTubePlayer
 *
 * @param {object} options
 * @param {string} options.containerId - DOM id for the player div
 * @param {function} options.onReady - called when player is ready
 * @param {function} options.onStateChange - called with YouTube state number
 * @param {function} options.onError - called with YouTube error code
 */
export function useYouTubePlayer({ containerId, onReady, onStateChange, onError }) {
  const playerRef = useRef(null);
  const [ytAvailable, setYtAvailable] = useState(true);

  const onReadyRef = useRef(onReady);
  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {}
    playerRef.current = null;
  }, []);

  const createPlayer = useCallback((videoId, startSeconds = 0) => {
    if (!videoId) return;

    whenYTReady(() => {
      if (!window.YT?.Player) {
        setYtAvailable(false);
        return;
      }

      // If player already exists and is valid, use loadVideoById directly
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById({ videoId, startSeconds: Math.floor(startSeconds) });
          return;
        } catch (e) {
          console.warn('[YT] loadVideoById existing player error, recreating:', e);
        }
      }

      destroyPlayer();

      const el = document.getElementById(containerId);
      if (!el) {
        console.warn(`[YT] Target container #${containerId} not found in DOM`);
        return;
      }

      try {
        playerRef.current = new window.YT.Player(containerId, {
          height: '100%',
          width: '100%',
          host: 'https://www.youtube.com',
          videoId,
          playerVars: {
            autoplay: 1,
            start: Math.floor(startSeconds),
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              onReadyRef.current?.(e);
            },
            onStateChange: (e) => {
              onStateChangeRef.current?.(e.data);
            },
            onError: (e) => {
              onErrorRef.current?.(e.data);
            },
          },
        });
      } catch (err) {
        console.warn('[YT] Failed to create player:', err);
        setYtAvailable(false);
      }
    });
  }, [containerId, destroyPlayer]);

  const loadVideo = useCallback((videoId, startSeconds = 0) => {
    if (!playerRef.current || typeof playerRef.current.loadVideoById !== 'function') {
      createPlayer(videoId, startSeconds);
      return;
    }
    try {
      playerRef.current.loadVideoById({ videoId, startSeconds: Math.floor(startSeconds) });
    } catch (e) {
      console.warn('[YT] loadVideoById error, recreating player:', e);
      createPlayer(videoId, startSeconds);
    }
  }, [createPlayer]);

  const seekTo = useCallback((seconds) => {
    try { playerRef.current?.seekTo(Math.max(0, seconds), true); } catch {}
  }, []);

  const playVideo = useCallback(() => {
    try { playerRef.current?.playVideo(); } catch {}
  }, []);

  const pauseVideo = useCallback(() => {
    try { playerRef.current?.pauseVideo(); } catch {}
  }, []);

  const setVolume = useCallback((vol) => {
    // YT volume is 0-100
    try { playerRef.current?.setVolume(Math.round(vol * 100)); } catch {}
  }, []);

  const getCurrentTime = useCallback(() => {
    try { return playerRef.current?.getCurrentTime() ?? 0; } catch { return 0; }
  }, []);

  const getPlayerState = useCallback(() => {
    try { return playerRef.current?.getPlayerState() ?? -1; } catch { return -1; }
  }, []);

  useEffect(() => {
    ensureYTScript();
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer]);

  return {
    playerRef,
    ytAvailable,
    createPlayer,
    loadVideo,
    seekTo,
    playVideo,
    pauseVideo,
    setVolume,
    getCurrentTime,
    getPlayerState,
  };
}
