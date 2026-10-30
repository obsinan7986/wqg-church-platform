import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Pin,
  Move
} from 'lucide-react';

/**
 * VideoTile Component
 * - Fullscreen, Fit/Fill toggle (contain/cover)
 * - Zoom in/out (CSS scale 1x - 3x) with drag to pan
 * - Mobile pinch-to-zoom and double-tap to zoom
 * - Mic and camera status icons, name label
 * - Avatar with initial when camera is off
 */
const VideoTile = ({
  stream,
  user,
  isHost = false,
  isLocal = false,
  isMicOn = false,
  isCameraOn = false,
  isPinned = false,
  onPin,
  fitMode = 'cover', // 'cover' or 'contain'
  onToggleFit,
  className = ''
}) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Per-tile zoom and pan state (1x to 3x)
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localFit, setLocalFit] = useState(fitMode);

  // Sync prop fitMode
  useEffect(() => {
    setLocalFit(fitMode);
  }, [fitMode]);

  // Touch gesture refs for mobile pinch & double tap
  const touchStartDistRef = useRef(null);
  const initialScaleRef = useRef(1);
  const lastTapRef = useRef(0);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch((err) => {
        console.warn('[VideoTile] Play warning:', err?.message);
      });
    }
  }, [stream, isCameraOn]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Zoom helpers
  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomScale((prev) => Math.min(3, +(prev + 0.5).toFixed(1)));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomScale((prev) => {
      const next = Math.max(1, +(prev - 0.5).toFixed(1));
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e) => {
    e?.stopPropagation();
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = (e) => {
    e?.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('[VideoTile] Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleToggleFit = (e) => {
    e?.stopPropagation();
    const next = localFit === 'cover' ? 'contain' : 'cover';
    setLocalFit(next);
    if (onToggleFit) onToggleFit(next);
  };

  // Mouse drag to pan when zoomed in
  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomScale <= 1) return;
    const maxOffset = (zoomScale - 1) * 120;
    const newX = Math.max(-maxOffset, Math.min(maxOffset, e.clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, e.clientY - dragStart.y));
    setPanPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch gestures for mobile: pinch-to-zoom and drag-to-pan, double-tap
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch to zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialScaleRef.current = zoomScale;
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap!
        if (zoomScale > 1) {
          setZoomScale(1);
          setPanPosition({ x: 0, y: 0 });
        } else {
          setZoomScale(2);
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        if (zoomScale > 1) {
          setIsDragging(true);
          setDragStart({
            x: e.touches[0].clientX - panPosition.x,
            y: e.touches[0].clientY - panPosition.y
          });
        }
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const newScale = Math.min(3, Math.max(1, +(initialScaleRef.current * ratio).toFixed(2)));
      setZoomScale(newScale);
      if (newScale === 1) setPanPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && zoomScale > 1) {
      // Panning
      const maxOffset = (zoomScale - 1) * 120;
      const newX = Math.max(-maxOffset, Math.min(maxOffset, e.touches[0].clientX - dragStart.x));
      const newY = Math.max(-maxOffset, Math.min(maxOffset, e.touches[0].clientY - dragStart.y));
      setPanPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  // User display name & initial
  const fullName = user?.fullName || (isHost ? 'Host' : 'Participant');
  const initial = (fullName.trim()[0] || 'U').toUpperCase();

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`group relative bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 select-none flex items-center justify-center transition-all ${
        zoomScale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      } ${isPinned ? 'ring-2 ring-gold-400' : ''} ${className}`}
    >
      {/* VIDEO / AVATAR LAYER */}
      {isCameraOn && stream ? (
        <div
          className="w-full h-full overflow-hidden flex items-center justify-center transition-transform duration-75"
          style={{
            transform: `scale(${zoomScale}) translate(${panPosition.x / zoomScale}px, ${panPosition.y / zoomScale}px)`
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`w-full h-full ${
              localFit === 'cover' ? 'object-cover' : 'object-contain'
            } ${isLocal ? 'transform scale-x-[-1]' : ''}`}
          />
        </div>
      ) : (
        /* Camera Off: Beautiful Avatar with Initials */
        <div className="flex flex-col items-center justify-center p-6 space-y-3 z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-royal-dark to-royal border-2 border-gold-400 flex items-center justify-center text-gold-400 text-2xl sm:text-3xl font-black shadow-2xl">
            {initial}
          </div>
          <div className="text-center">
            <span className="text-sm font-bold text-white block truncate max-w-[160px]">
              {fullName} {isLocal && '(Ati)'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {user?.role || (isHost ? 'Host' : 'Member')}
            </span>
          </div>
        </div>
      )}

      {/* TOP-LEFT: STATUS BADGE (Name, Role, Mic & Cam Icons) */}
      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/80 text-white text-xs shadow-md max-w-[85%]">
        <span className="font-bold truncate max-w-[120px] text-[11px]">
          {fullName} {isLocal && '(Ati)'}
        </span>
        {isHost && (
          <span className="px-1.5 py-0.2 rounded bg-gold-500 text-royal text-[9px] font-black uppercase">
            Host
          </span>
        )}
        <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-700">
          {isMicOn ? (
            <Mic className="w-3 h-3 text-gold-400" />
          ) : (
            <MicOff className="w-3 h-3 text-red-400" />
          )}
          {isCameraOn ? (
            <Video className="w-3 h-3 text-gold-400" />
          ) : (
            <VideoOff className="w-3 h-3 text-red-400" />
          )}
        </div>
      </div>

      {/* TOP-RIGHT: PIN & FULLSCREEN CONTROLS */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {onPin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            title={isPinned ? 'Unpin' : 'Pin/Spotlight'}
            className={`p-1.5 rounded-lg border backdrop-blur-md transition-all ${
              isPinned
                ? 'bg-gold-500 text-royal border-gold-400 shadow-md'
                : 'bg-slate-900/85 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="p-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md transition-all shadow"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* BOTTOM-RIGHT: ZOOM & FIT/FILL OVERLAY CONTROLS */}
      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {/* Fit/Fill Toggle */}
        <button
          onClick={handleToggleFit}
          title={localFit === 'cover' ? 'Fit Video (contain)' : 'Fill Video (cover)'}
          className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-200 hover:bg-slate-800 border border-slate-700 transition-colors"
        >
          {localFit === 'cover' ? 'Fit' : 'Fill'}
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={zoomScale >= 3}
          title="Zoom In"
          className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-40 text-slate-200 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={zoomScale <= 1}
          title="Zoom Out"
          className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-40 text-slate-200 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Reset Zoom / Indicator */}
        {zoomScale > 1 && (
          <button
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-gold-500 text-royal font-bold text-[10px] shadow"
          >
            <span>{zoomScale}x</span>
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Zoom Drag Helper Badge when Zoomed In */}
      {zoomScale > 1 && (
        <div className="absolute bottom-2.5 left-2.5 z-20 px-2 py-0.5 rounded-md bg-slate-900/80 text-[9px] text-slate-300 border border-slate-700 pointer-events-none flex items-center gap-1">
          <Move className="w-2.5 h-2.5 text-gold-400" />
          <span>Harkisaa (Drag to pan)</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(VideoTile);
