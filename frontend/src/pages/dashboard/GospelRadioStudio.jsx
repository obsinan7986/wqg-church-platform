import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRadio } from '../../context/RadioContext';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import api from '../../api/axios';
import {
  Radio,
  Play,
  Pause,
  Square,
  SkipForward,
  Repeat,
  Search,
  Users,
  Music,
  Plus,
  Trash2,
  ListMusic,
  Disc3,
  Volume2,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  Send,
  Video,
  Youtube,
  FileAudio,
  AlertCircle
} from 'lucide-react';

export default function GospelRadioStudio() {
  const {
    radioState,
    currentTime,
    playSong,
    pauseRadio,
    resumeRadio,
    stopRadio,
    seekRadio,
    nextSong,
    updateQueue,
    isListening,
    toggleListening,
    brokenTracks
  } = useRadio();

  const { user } = useAuth();

  // Track library state from /api/radio/library
  const [tracks, setTracks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTab, setSourceTab] = useState('ALL'); // 'ALL' | 'YOUTUBE' | 'FILE'
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'GOSPEL' | 'CHOIR' | 'SERMON'
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // "Also send into the live meeting" state
  const [sendToLiveMeeting, setSendToLiveMeeting] = useState(() => {
    try {
      return localStorage.getItem('gospel_radio_send_to_live') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSendToLive = () => {
    setSendToLiveMeeting((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gospel_radio_send_to_live', String(next));
      } catch {}
      return next;
    });
  };

  // Fetch normalized tracks from /api/radio/library
  const fetchLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const res = await api.get('/radio/library');
      if (res.data?.success) {
        setTracks(res.data.tracks || []);
      }
    } catch (err) {
      console.error('[GospelRadioStudio] Fetch library error:', err.message);
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Format mm:ss
  const formatTime = (secs) => {
    if (Number.isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter tracks by Source tab, Category, and Search Query
  const filteredTracks = useMemo(() => {
    return tracks.filter((t) => {
      // Source filter: 'ALL' | 'YOUTUBE' | 'FILE'
      if (sourceTab !== 'ALL' && t.sourceType !== sourceTab) {
        return false;
      }
      // Category filter: 'ALL' | 'GOSPEL' | 'CHOIR' | 'SERMON'
      if (selectedCategory !== 'ALL' && t.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchArtist = (t.artist || '').toLowerCase().includes(q);
        if (!matchTitle && !matchArtist) return false;
      }
      return true;
    });
  }, [tracks, sourceTab, selectedCategory, searchQuery]);

  // Handle Play for Everyone
  const handlePlayNow = async (track) => {
    setActionLoading(true);
    setStatusMsg(null);
    try {
      const isYt = track.sourceType === 'YOUTUBE';
      const fullUrl = isYt ? '' : resolveMediaUrl(track.fileUrl);

      await playSong({
        mediaId: track.id,
        title: track.title,
        url: fullUrl,
        artist: track.artist || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii',
        category: track.category || 'GOSPEL',
        duration: track.duration || 0,
        sourceType: track.sourceType,
        youtubeVideoId: track.youtubeVideoId || '',
        thumbnailUrl: track.thumbnailUrl || ''
      });
      setStatusMsg({ type: 'success', text: `Taphachaa jira (Now playing): ${track.title}` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Faarfannaa taphachiisuun hin danda\'amne' });
    } finally {
      setActionLoading(false);
    }
  };

  // Add track to queue
  const handleAddToQueue = async (track) => {
    setActionLoading(true);
    try {
      const isYt = track.sourceType === 'YOUTUBE';
      const fullUrl = isYt ? '' : resolveMediaUrl(track.fileUrl);

      const newQueue = [
        ...(radioState.queue || []),
        {
          mediaId: track.id,
          title: track.title,
          url: fullUrl,
          artist: track.artist || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii',
          category: track.category || 'GOSPEL',
          duration: track.duration || 0,
          sourceType: track.sourceType,
          youtubeVideoId: track.youtubeVideoId || '',
          thumbnailUrl: track.thumbnailUrl || ''
        }
      ];
      await updateQueue(newQueue, radioState.loop);
      setStatusMsg({ type: 'success', text: `Tarree keessa gale (Added to queue): ${track.title}` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Remove track from queue
  const handleRemoveFromQueue = async (index) => {
    const newQueue = [...(radioState.queue || [])];
    newQueue.splice(index, 1);
    await updateQueue(newQueue, radioState.loop);
  };

  // Clear entire queue
  const handleClearQueue = async () => {
    await updateQueue([], radioState.loop);
  };

  // Toggle loop mode
  const handleToggleLoop = async () => {
    await updateQueue(radioState.queue, !radioState.loop);
  };

  // Seek on progress bar click
  const handleSeek = (e) => {
    if (!radioState.duration || radioState.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTarget = fraction * radioState.duration;
    seekRadio(seekTarget);
  };

  const isCurrentTrack = (track) => {
    if (radioState.mediaId && String(radioState.mediaId) === String(track.id)) {
      return true;
    }
    if (track.sourceType === 'YOUTUBE' && track.youtubeVideoId && radioState.youtubeVideoId === track.youtubeVideoId) {
      return true;
    }
    if (track.sourceType === 'FILE' && track.fileUrl) {
      const trackUrl = resolveMediaUrl(track.fileUrl);
      const currentUrl = resolveMediaUrl(radioState.url);
      if (trackUrl && currentUrl && trackUrl === currentUrl) return true;
    }
    return false;
  };

  const isTrackBroken = (track) => {
    if (track.sourceType === 'YOUTUBE' && track.youtubeVideoId) {
      return brokenTracks?.has(track.youtubeVideoId);
    }
    return false;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white rounded-2xl p-5 sm:p-7 shadow-xl border border-amber-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Radio className="w-6 h-6 animate-pulse motion-reduce:animate-none" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Wiirtuu Gospel Radio (Broadcast Studio)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Synchronized live gospel music & YouTube broadcast for everyone active on the website.
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Chip */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 flex items-center gap-2 text-xs font-semibold shadow">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                radioState.isPlaying ? 'bg-emerald-400 animate-ping motion-reduce:animate-none' : 'bg-slate-500'
              }`}
            />
            <span>{radioState.isPlaying ? 'ON AIR / LIVE' : 'IDLE / PAUSED'}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>{radioState.listenersCount} Listeners</span>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs sm:text-sm flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs font-bold underline ml-2">
            OK
          </button>
        </div>
      )}

      {/* Main Grid: Left = Now Playing & Queue; Right = Song Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Now Playing & Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* NOW PLAYING CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-amber-500" />
                Amma Taphachaa Jira (Now Playing)
              </span>
              <div className="flex items-center gap-1.5">
                {/* Source Badge */}
                {radioState.sourceType === 'YOUTUBE' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase flex items-center gap-1">
                    <Youtube className="w-3 h-3" /> YouTube
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase flex items-center gap-1">
                    <FileAudio className="w-3 h-3" /> Audio File
                  </span>
                )}
                {radioState.category && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                    {radioState.category}
                  </span>
                )}
              </div>
            </div>

            {/* Song Details */}
            <div className="flex items-center gap-4">
              {radioState.sourceType === 'YOUTUBE' && radioState.thumbnailUrl ? (
                <div className="w-20 h-14 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-slate-900 border border-slate-200">
                  <img
                    src={radioState.thumbnailUrl}
                    alt={radioState.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md flex-shrink-0 ${
                    radioState.isPlaying ? 'animate-spin [animation-duration:8s] motion-reduce:animate-none' : ''
                  }`}
                >
                  <Music className="w-8 h-8 text-amber-100" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">
                  {radioState.title || 'Faarfannaa filadhaa (No track playing)'}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {radioState.artist || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii'}
                </p>
                {radioState.startedByName && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Jalqabsiise: <span className="font-semibold text-slate-600">{radioState.startedByName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Seek Bar (for file tracks or if duration known) */}
            {radioState.sourceType !== 'YOUTUBE' && radioState.duration > 0 && (
              <div className="space-y-1.5">
                <div
                  onClick={handleSeek}
                  className="w-full bg-slate-100 hover:bg-slate-200 h-2.5 rounded-full cursor-pointer relative overflow-hidden transition-colors"
                  title="Click to seek for everyone"
                >
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${
                        radioState.duration > 0
                          ? Math.min(100, (currentTime / radioState.duration) * 100)
                          : 0
                      }%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 font-medium">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(radioState.duration || 0)}</span>
                </div>
              </div>
            )}

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3 pt-2">
              {/* Loop Toggle */}
              <button
                onClick={handleToggleLoop}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 ${
                  radioState.loop
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={radioState.loop ? 'Looping enabled' : 'Loop disabled'}
              >
                <Repeat className="w-4 h-4" />
              </button>

              {/* Play / Resume / Pause */}
              {radioState.isPlaying ? (
                <button
                  onClick={pauseRadio}
                  disabled={actionLoading}
                  className="p-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-md transition-transform active:scale-95"
                  title="Pause radio for everyone"
                >
                  <Pause className="w-6 h-6 fill-white" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (radioState.url || radioState.youtubeVideoId) {
                      resumeRadio();
                    } else if (filteredTracks.length > 0) {
                      handlePlayNow(filteredTracks[0]);
                    }
                  }}
                  disabled={actionLoading}
                  className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md transition-transform active:scale-95"
                  title="Play / Resume radio for everyone"
                >
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </button>
              )}

              {/* Stop */}
              <button
                onClick={stopRadio}
                disabled={actionLoading || (!radioState.url && !radioState.youtubeVideoId)}
                className="p-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl border border-slate-200 transition-colors"
                title="Stop radio"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>

              {/* Next */}
              <button
                onClick={nextSong}
                disabled={actionLoading || (!radioState.queue?.length && !radioState.url && !radioState.youtubeVideoId)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
                title="Next song in queue"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Live Meeting Integration Switch */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Video className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Gara Live Meetingtti dabali
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mix radio audio into host's live meeting studio stream
                  </p>
                </div>
              </div>

              <button
                onClick={toggleSendToLive}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sendToLiveMeeting ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
                title="Mix Gospel Radio into Live Meeting Studio stream"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    sendToLiveMeeting ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* QUEUE / PLAYLIST CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tarree Faarfannaa (Queue - {radioState.queue?.length || 0})
                </h3>
              </div>
              {radioState.queue?.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Haqi (Clear)
                </button>
              )}
            </div>

            {(!radioState.queue || radioState.queue.length === 0) ? (
              <div className="text-center py-6 text-slate-400 space-y-1">
                <ListMusic className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300" />
                <p className="text-xs">Tarreen duwwaadha (Queue is empty).</p>
                <p className="text-[11px] text-slate-400">
                  Faarfannaa mirga jiru irraa "+ Queue" tuqi.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {radioState.queue.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-xs border border-slate-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      {item.sourceType === 'YOUTUBE' ? (
                        <Youtube className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      ) : (
                        <FileAudio className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 truncate">
                        {item.title}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFromQueue(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Radio Library (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            {/* Catalog Filter Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Radio className="w-5 h-5 text-amber-600" />
                  Kuusaa Meediyaa Radio (Radio Library)
                </h3>
                <p className="text-xs text-slate-500">
                  Unified library of YouTube Gospel songs & uploaded audio documents.
                </p>
              </div>

              <button
                onClick={fetchLibrary}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 self-end sm:self-auto"
                title="Refresh library"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLibrary ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Source Tabs: All | YouTube | Uploaded files */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              {[
                { id: 'ALL', label: 'All', icon: Radio },
                { id: 'YOUTUBE', label: 'YouTube', icon: Youtube },
                { id: 'FILE', label: 'Uploaded files', icon: FileAudio },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = sourceTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSourceTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${tab.id === 'YOUTUBE' && !isActive ? 'text-red-500' : ''}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Category Filter Pills */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Faarfannaa barbaadi (Search tracks)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 self-start overflow-x-auto max-w-full pb-1">
                {['ALL', 'GOSPEL', 'CHOIR', 'SERMON'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'Hunda (All)' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Track List */}
            {loadingLibrary ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                <p className="text-xs font-medium">Kuusaa fe'aa jira (Loading library)...</p>
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Music className="w-10 h-10 mx-auto stroke-[1.2] text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Faarfannaan hin argamne</p>
                <p className="text-xs">No tracks match your selected filters.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredTracks.map((track) => {
                  const isCurrent = isCurrentTrack(track);
                  const isBroken = isTrackBroken(track);

                  return (
                    <div
                      key={track.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isBroken
                          ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                          : isCurrent
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail or Icon */}
                        {track.thumbnailUrl ? (
                          <div className="w-16 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-200">
                            <img
                              src={track.thumbnailUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isCurrent
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isCurrent && radioState.isPlaying ? (
                              <Disc3 className="w-5 h-5 animate-spin [animation-duration:4s]" />
                            ) : track.sourceType === 'YOUTUBE' ? (
                              <Youtube className="w-5 h-5 text-red-600" />
                            ) : (
                              <Music className="w-5 h-5" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {track.title}
                            </h4>
                            {/* Source badge */}
                            {track.sourceType === 'YOUTUBE' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase flex items-center gap-0.5">
                                <Youtube className="w-2.5 h-2.5" />
                                YouTube
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase flex items-center gap-0.5">
                                <FileAudio className="w-2.5 h-2.5" />
                                Uploaded file
                              </span>
                            )}
                            {/* Category badge */}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                              {track.category}
                            </span>
                            {/* Broken badge */}
                            {isBroken && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Broken
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {track.artist || 'Waldaa Qulqulluu Giyoorgisii'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleAddToQueue(track)}
                          disabled={actionLoading || isBroken}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                          title="Add to queue"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Queue</span>
                        </button>

                        <button
                          onClick={() => handlePlayNow(track)}
                          disabled={actionLoading || isBroken}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 ${
                            isCurrent && radioState.isPlaying
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title="Play for everyone on site"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isCurrent && radioState.isPlaying ? 'Restart' : 'Play for Everyone'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
