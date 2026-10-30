import React from 'react';
import {
  Shield,
  VolumeX,
  Volume2,
  Video,
  VideoOff,
  UserCheck,
  UserX,
  Users,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Card, Badge, Button, Avatar } from '../../../components/ui';

/**
 * HostControlPanel
 * Manage Waiting Room & Participant Permissions:
 * - Accept/Reject waiting room requests
 * - "Allow video / Stop video / Allow mic / Mute" per participant
 * - 8 video limit indicator & clear warning alert when reached
 * - "Mute All" button
 */
const HostControlPanel = ({
  meeting,
  onAdmitAction,
  onAllowVideo,
  onStopVideo,
  onAllowMic,
  onMuteUser,
  onMuteAll,
  isProcessing = false
}) => {
  const hostId = (meeting?.host?._id || meeting?.host)?.toString();
  const waitingRoom = meeting?.waitingRoom || [];
  const allowedParticipants = meeting?.allowedParticipants || [];

  // Allowed Mic & Video users from meeting state
  const allowedMicUsers = (meeting?.allowedMicUsers || []).map((u) => (u._id || u).toString());
  const allowedVideoUsers = (meeting?.allowedVideoUsers || []).map((u) => (u._id || u).toString());

  // Count active participant videos (excluding host)
  const activeParticipantVideoCount = allowedVideoUsers.filter((id) => id !== hostId).length;
  const isVideoLimitReached = activeParticipantVideoCount >= 8;

  return (
    <Card className="p-5 shadow-sm space-y-6 border border-slate-200 bg-white">
      {/* HEADER & MUTE ALL */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold-500" />
          <span className="text-xs font-black uppercase tracking-wider text-royal">
            To'annoo Hooggansaa (Host Studio)
          </span>
        </div>
        <button
          onClick={onMuteAll}
          disabled={isProcessing}
          className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-bold flex items-center gap-1 transition-all"
          title="Sagalee hunda cufi"
        >
          <VolumeX className="w-3.5 h-3.5" />
          <span>Mute All (Hunda Cufi)</span>
        </button>
      </div>

      {/* VIDEO CAPACITY LIMIT STATUS BADGE & ALERT */}
      <div className="p-3 rounded-2xl bg-royal-tint/60 border border-slate-200 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-royal" />
            <span>Kaameeraa Hirmaattotaa (Video Slots):</span>
          </span>
          <Badge variant={isVideoLimitReached ? 'danger' : 'gold'} size="sm">
            {activeParticipantVideoCount} / 8 Banameera
          </Badge>
        </div>

        {isVideoLimitReached ? (
          <div className="flex items-start gap-2 p-2 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 font-semibold leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              Qulqullinaaf kaameeraa hirmaattotaa 8 qofatu tamsaasa yeroo tokkotti banamuu danda'a.
              (Max 8 participant videos reached. Others view/listen only).
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Hirmaattota hanga 8 qofatu kaameeraan isaanii tamsaasa irratti mul'achuu danda'a.
          </p>
        )}
      </div>

      {/* WAITING ROOM QUEUE */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gold-500" />
            <span>Kutaa Eeggannaa (Waiting Room)</span>
          </span>
          <Badge variant="gold" size="sm">
            {waitingRoom.length} Gaaffii
          </Badge>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {waitingRoom.length === 0 ? (
            <div className="text-[11px] text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Namni eeggachaa jiru hin jiru.
            </div>
          ) : (
            waitingRoom.map((w) => (
              <div
                key={w._id}
                className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm"
              >
                <div className="truncate pr-2">
                  <span className="font-bold text-slate-900 block truncate">{w.fullName}</span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    ⛪ {w.originChurch || 'WQG'} | 📍 {w.address?.city || 'Finfinnee'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => onAdmitAction(w._id, 'accept')}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-royal hover:bg-royal-dark text-white border border-royal transition-colors"
                    title="Accept (Hayyami)"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onAdmitAction(w._id, 'reject')}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors"
                    title="Reject (Dhowwi)"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADMITTED PARTICIPANTS LIST WITH PERMISSION TOGGLES */}
      <div className="space-y-2.5 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-royal" />
            <span>Hirmaattota Admitted ({allowedParticipants.length})</span>
          </span>
          <span className="text-[10px] text-slate-500">
            Mic & Video Permission
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {allowedParticipants.map((p) => {
            const pId = (p._id || p).toString();
            const isUserHost = pId === hostId;
            const isMicAllowed = isUserHost || allowedMicUsers.includes(pId);
            const isVideoAllowed = isUserHost || allowedVideoUsers.includes(pId);

            return (
              <div
                key={pId}
                className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-sm hover:border-royal/30 transition-colors"
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-slate-900 truncate">
                      {p.fullName || 'Member'}
                    </span>
                    {isUserHost && (
                      <span className="px-1.5 py-0.2 rounded bg-gold-500 text-royal text-[9px] font-black uppercase">
                        Host
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {p.role || 'MEMBER'} | ⛪ {p.originChurch || 'Waldaa Qulqulluu Giyoorgisii'}
                  </span>
                </div>

                {!isUserHost && (
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {/* VIDEO CONTROL: Allow video / Stop video */}
                    <button
                      onClick={() => {
                        if (isVideoAllowed) {
                          onStopVideo(pId);
                        } else {
                          onAllowVideo(pId);
                        }
                      }}
                      disabled={isProcessing || (!isVideoAllowed && isVideoLimitReached)}
                      title={
                        !isVideoAllowed && isVideoLimitReached
                          ? 'Limit reached (8/8 videos active)'
                          : isVideoAllowed
                          ? 'Stop Video (Cufi Kaameeraa)'
                          : 'Allow Video (Bani Kaameeraa)'
                      }
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isVideoAllowed
                          ? 'bg-gold-500 text-royal border-gold-500 shadow-sm'
                          : isVideoLimitReached
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isVideoAllowed ? (
                        <>
                          <Video className="w-3 h-3 text-royal" />
                          <span>Stop Video</span>
                        </>
                      ) : (
                        <>
                          <VideoOff className="w-3 h-3 text-red-500" />
                          <span>Allow Video</span>
                        </>
                      )}
                    </button>

                    {/* MIC CONTROL: Allow mic / Mute */}
                    <button
                      onClick={() => {
                        if (isMicAllowed) {
                          onMuteUser(pId);
                        } else {
                          onAllowMic(pId);
                        }
                      }}
                      disabled={isProcessing}
                      title={isMicAllowed ? 'Mute Mic (Cufi)' : 'Allow Mic (Hayyami)'}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isMicAllowed
                          ? 'bg-gold-500 text-royal border-gold-500 shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isMicAllowed ? (
                        <>
                          <Mic className="w-3 h-3 text-royal" />
                          <span>Mute</span>
                        </>
                      ) : (
                        <>
                          <MicOff className="w-3 h-3 text-red-500" />
                          <span>Allow Mic</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default HostControlPanel;
