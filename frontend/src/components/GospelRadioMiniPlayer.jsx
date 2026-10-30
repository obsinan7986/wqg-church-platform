import React, { useState } from 'react';
import { useRadio } from '../context/RadioContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Radio,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  AlertCircle,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Headphones,
  Music2,
  Disc3
} from 'lucide-react';

export default function GospelRadioMiniPlayer() {
  const {
    radioState,
    isListening,
    toggleListening,
    userVolume,
    setUserVolume,
    autoplayBlocked,
    unlockAutoplay,
    retryPlayback,
    loadError,
    currentTime,
    isStaff
  } = useRadio();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMinimized, setIsMinimized] = useState(false);

  // If there's no track and radio is idle, don't show the bar
  const hasTrack = Boolean(radioState.url && radioState.title);
  if (!hasTrack && !isStaff) {
    return null;
  }

  // Format mm:ss
  const formatTime = (secs) => {
    if (Number.isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLiveMeeting = location.pathname.includes('/dashboard') && location.search.includes('tab=live');

  return (
    <aside
      aria-label="Gospel Radio Mini Player"
      className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-none"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 pb-2 sm:pb-3 pointer-events-auto">
        {/* Autoplay Unlock Banner */}
        {autoplayBlocked && (
          <div
            role="alert"
            className="mb-2 p-3 bg-amber-500/95 backdrop-blur-md text-white rounded-xl shadow-lg border border-amber-400 flex flex-wrap items-center justify-between gap-3 animate-bounce motion-reduce:animate-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/20 rounded-full">
                <Headphones className="w-4 h-4 text-white" />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  Sagalee dhageeffachuuf as tuqi (Tap to unlock audio)
                </p>
                <p className="text-[11px] text-amber-100 hidden sm:block">
                  Browser requires user gesture before playing synchronized live audio.
                </p>
              </div>
            </div>
            <button
              onClick={unlockAutoplay}
              className="px-4 py-1.5 bg-white text-amber-900 font-semibold text-xs sm:text-sm rounded-lg shadow-sm hover:bg-amber-50 transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-amber-900" />
              Tap to Listen
            </button>
          </div>
        )}

        {/* Load Error Banner */}
        {loadError && (
          <div className="mb-2 px-3 py-2 bg-rose-600/90 backdrop-blur-md text-white text-xs rounded-lg shadow flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {loadError}
            </span>
            <button
              onClick={retryPlayback}
              className="text-[11px] font-semibold underline hover:text-rose-100 ml-2 py-1 px-2 rounded hover:bg-white/10 transition-colors"
            >
              Irra deebi'i (Retry)
            </button>
          </div>
        )}

        {/* Minimized Pill */}
        {isMinimized ? (
          <div className="flex justify-end">
            <button
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-xl border border-slate-700/80 hover:bg-slate-800 transition-all text-xs font-medium"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse motion-reduce:animate-none" />
              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                {radioState.title || 'Gospel Radio'}
              </span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ) : (
          /* Full Player Bar */
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-800/80 p-2.5 sm:p-3.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
              {/* Left: Radio badge & Track info */}
              <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                {/* Vinyl / Disc icon */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-md ${
                      radioState.isPlaying && isListening
                        ? 'animate-spin [animation-duration:6s] motion-reduce:animate-none'
                        : ''
                    }`}
                  >
                    <Disc3 className="w-5 h-5 text-amber-100" />
                  </div>
                  {radioState.isPlaying && (
                    <span
                      aria-label="Live on air"
                      className="absolute -top-1 -right-1 px-1 py-0.2 bg-red-600 text-white text-[9px] font-black rounded uppercase tracking-wider shadow"
                    >
                      LIVE
                    </span>
                  )}
                </div>

                {/* Title & Artist */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      Gospel Radio
                    </span>
                    {radioState.listenersCount > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        • {radioState.listenersCount} {radioState.listenersCount === 1 ? 'listener' : 'listeners'}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold truncate text-slate-100">
                    {radioState.title || 'Faarfannaa filadhaa (No song playing)'}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    {radioState.artist || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii'}
                    {radioState.duration > 0 && (
                      <span className="ml-1 text-slate-500">
                        [{formatTime(currentTime)} / {formatTime(radioState.duration)}]
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Center / Controls: Listen Switch & Volume */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                {/* "Listen to Gospel Radio" Toggle Switch */}
                <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] font-medium text-slate-300 hidden md:inline">
                    Listen to Radio:
                  </span>
                  <button
                    onClick={toggleListening}
                    aria-label={isListening ? 'Mute Gospel Radio' : 'Unmute Gospel Radio'}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isListening ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isListening ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-semibold text-slate-200 min-w-[28px]">
                    {isListening ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60">
                  <button
                    onClick={() => setUserVolume(userVolume > 0 ? 0 : 0.8)}
                    className="text-slate-400 hover:text-white transition-colors"
                    aria-label={userVolume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {userVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : userVolume < 0.5 ? (
                      <Volume1 className="w-4 h-4 text-slate-300" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={userVolume}
                    onChange={(e) => setUserVolume(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    aria-label="Radio Volume Slider"
                  />
                  <span className="text-[10px] text-slate-400 font-mono w-6 text-right">
                    {Math.round(userVolume * 100)}%
                  </span>
                </div>

                {/* Staff Studio Link */}
                {isStaff && (
                  <button
                    onClick={() => navigate('/dashboard?tab=radio')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-medium transition-colors"
                    title="Open Radio Studio Controls"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Studio</span>
                  </button>
                )}

                {/* Minimize Button */}
                <button
                  onClick={() => setIsMinimized(true)}
                  aria-label="Minimize radio player"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtle progress bar for track duration if known */}
            {radioState.duration > 0 && (
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (currentTime / radioState.duration) * 100)}%`
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
