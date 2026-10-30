import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  LayoutGrid,
  SquareCheck,
  MessageSquare,
  Users,
  Copy,
  Check,
  PhoneOff,
  MoreVertical,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';

/**
 * LiveControlBar
 * Mobile-first and desktop controls:
 * - Mic, Camera, Screen share
 * - Layout switch: Speaker view vs Grid view
 * - Chat & Participants drawers
 * - Copy invite link
 * - Hang up / End broadcast
 */
const LiveControlBar = ({
  isHost = false,
  isLive = false,
  isAdmitted = false,
  isMicOn = false,
  isCameraOn = false,
  isScreenSharing = false,
  isForceMuted = false,
  isVideoForcedOff = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  layoutMode = 'speaker', // 'speaker' or 'grid'
  onToggleLayout,
  onOpenChat,
  onOpenParticipants,
  commentsCount = 0,
  participantsCount = 0,
  onCopyLink,
  copiedLink = false,
  onHangUp,
  remoteAudioMuted = false,
  onToggleSpeakerMute
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const canUseMedia = isHost || isAdmitted;

  return (
    <div className="relative z-30">
      {/* MOBILE EXPANDED MENU */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden flex flex-col justify-end p-4 animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-3 shadow-2xl text-white mb-20 animate-in slide-in-from-bottom-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-2" />
            <h4 className="text-xs font-black uppercase text-gold-400 pb-2 border-b border-slate-800">
              Filannoowwan Biroo (More Options)
            </h4>

            {/* Layout Toggle */}
            <button
              onClick={() => {
                onToggleLayout?.();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold"
            >
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4 text-gold-400" />
                <span>Layout: {layoutMode === 'speaker' ? 'Speaker View' : 'Grid View'}</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-lg">
                Jijjiiri
              </span>
            </button>

            {/* Speaker Mute/Unmute */}
            <button
              onClick={() => {
                onToggleSpeakerMute?.();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold"
            >
              <div className="flex items-center gap-2.5">
                {remoteAudioMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gold-400" />
                )}
                <span>Ispikerii (Speaker Audio)</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-lg">
                {remoteAudioMuted ? 'Cufameera' : 'Banaadha'}
              </span>
            </button>

            {/* Copy Invite Link */}
            <button
              onClick={() => {
                onCopyLink?.();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold"
            >
              <div className="flex items-center gap-2.5">
                {copiedLink ? <Check className="w-4 h-4 text-gold-400" /> : <Copy className="w-4 h-4 text-gold-400" />}
                <span>{copiedLink ? 'Waraabameera! (Copied)' : 'Waraabi Link (Invite Link)'}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* MAIN BAR CONTAINER */}
      <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900/95 border border-slate-700/80 rounded-2xl sm:rounded-full backdrop-blur-md shadow-2xl">
        {/* LEFT / PRIMARY MEDIA CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* MIC TOGGLE */}
          <button
            onClick={onToggleMic}
            disabled={!canUseMedia || isForceMuted}
            title={
              !canUseMedia
                ? 'Eeggamaa jira (Waiting for admission)'
                : isForceMuted
                ? 'Hooggansi sagalee cufeera (Muted by host)'
                : isMicOn
                ? 'Cufi Maayikii'
                : 'Bani Maayikii'
            }
            aria-label="Toggle Microphone"
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold transition-all shadow-md active:scale-95 ${
              !canUseMedia || isForceMuted
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                : isMicOn
                ? 'bg-gold-500 hover:bg-gold-600 text-royal font-black'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {isMicOn && !isForceMuted ? (
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* CAMERA TOGGLE */}
          <button
            onClick={onToggleCamera}
            disabled={!canUseMedia || isVideoForcedOff}
            title={
              !canUseMedia
                ? 'Eeggamaa jira (Waiting for admission)'
                : isVideoForcedOff
                ? 'Hooggansi kaameeraa cufeera (Camera turned off by host)'
                : isCameraOn
                ? 'Cufi Kaameeraa'
                : 'Bani Kaameeraa'
            }
            aria-label="Toggle Camera"
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold transition-all shadow-md active:scale-95 ${
              !canUseMedia || isVideoForcedOff
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                : isCameraOn
                ? 'bg-gold-500 hover:bg-gold-600 text-royal font-black'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {isCameraOn && !isVideoForcedOff ? (
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* SCREEN SHARE (Host only) */}
          {isHost && (
            <button
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              aria-label="Toggle Screen Share"
              className={`hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full items-center justify-center font-bold transition-all shadow-md active:scale-95 ${
                isScreenSharing
                  ? 'bg-gold-500 text-royal font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isScreenSharing ? (
                <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5 text-royal" />
              ) : (
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
              )}
            </button>
          )}

          {/* SPEAKER MUTE / UNMUTE (Desktop) */}
          <button
            onClick={onToggleSpeakerMute}
            title={remoteAudioMuted ? 'Sagalee Bani (Unmute speaker)' : 'Sagalee Cufi (Mute speaker)'}
            aria-label="Toggle Speaker"
            className={`hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full items-center justify-center font-bold transition-all shadow-md active:scale-95 ${
              remoteAudioMuted
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {remoteAudioMuted ? (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>

        {/* MIDDLE: LAYOUT SWITCH & DRAWERS (Hidden on small mobile, visible on sm+) */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-700/80">
          {/* Layout Mode Toggle */}
          <button
            onClick={onToggleLayout}
            title={`Switch to ${layoutMode === 'speaker' ? 'Grid View' : 'Speaker View'}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors shadow"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-gold-400" />
            <span>{layoutMode === 'speaker' ? 'Grid' : 'Speaker'}</span>
          </button>

          {/* Copy Invite Link */}
          <button
            onClick={onCopyLink}
            title="Waraabi Link (Copy Invite Link)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors shadow"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-gold-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
            <span className="hidden md:inline">{copiedLink ? 'Waraabameera' : 'Waraabi Link'}</span>
          </button>
        </div>

        {/* RIGHT: CHAT / PARTICIPANTS / HANGUP */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* CHAT BUTTON (Opens Drawer/Bottom Sheet) */}
          <button
            onClick={onOpenChat}
            title="Chat & Reactions"
            aria-label="Open Chat"
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
            {commentsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-gold-500 text-royal text-[9px] font-black shadow">
                {commentsCount}
              </span>
            )}
          </button>

          {/* PARTICIPANTS BUTTON (For mobile / Host controls) */}
          <button
            onClick={onOpenParticipants}
            title="Participants"
            aria-label="Open Participants"
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-200" />
            {participantsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-royal text-gold-400 border border-gold-400 text-[9px] font-black shadow">
                {participantsCount}
              </span>
            )}
          </button>

          {/* MOBILE MORE MENU */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="sm:hidden w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700 active:scale-95"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* HANG UP / END MEETING */}
          <button
            onClick={onHangUp}
            title={isHost ? 'End Broadcast (Cufi)' : 'Leave Studio (Ba\'i)'}
            aria-label="Leave Studio"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center font-bold transition-all shadow-lg ml-1"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LiveControlBar);
