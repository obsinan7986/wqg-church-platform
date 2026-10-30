import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useRadio } from '../../context/RadioContext';
import api from '../../api/axios';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  Users,
  Copy,
  Check,
  Play,
  Square,
  Shield,
  VolumeX,
  Volume2,
  Clock,
  Sparkles,
  AlertCircle,
  LayoutGrid,
  PhoneOff,
  Monitor
} from 'lucide-react';
import { Card, Button, Badge, Spinner, Toast, Avatar } from '../../components/ui';

// Subcomponents
import VideoTile from './live/VideoTile';
import DevicePreviewModal from './live/DevicePreviewModal';
import HostControlPanel from './live/HostControlPanel';
import LiveChatDrawer from './live/LiveChatDrawer';
import LiveControlBar from './live/LiveControlBar';

const DEFAULT_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

/**
 * Apply bandwidth quality limits for star topology:
 * - Host outgoing: 1280x720, maxBitrate 1.5 Mbps (1,500,000 bps)
 * - Participant outgoing: 640x360, 15 fps, maxBitrate 400 kbps (400,000 bps)
 */
const applyBitrateLimits = (pc, isHost) => {
  if (!pc || !pc.getSenders) return;
  try {
    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'video' && sender.getParameters) {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        if (isHost) {
          params.encodings[0].maxBitrate = 1500000; // 1.5 Mbps
        } else {
          params.encodings[0].maxBitrate = 400000; // 400 kbps
          params.encodings[0].maxFramerate = 15;
        }
        sender.setParameters(params).catch((e) => {
          console.warn('[WebRTC] setParameters bitrate warning:', e?.message);
        });
      }
    });
  } catch (err) {
    console.warn('[WebRTC] applyBitrateLimits error:', err?.message);
  }
};

const LiveMeetingStudio = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { radioState, audioRef } = useRadio();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Gospel Radio Mixing State
  const [mixRadioToStream, setMixRadioToStream] = useState(() => {
    try {
      return localStorage.getItem('gospel_radio_send_to_live') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMixRadioToStream = useCallback(() => {
    setMixRadioToStream((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gospel_radio_send_to_live', String(next));
      } catch {}
      return next;
    });
  }, []);

  const audioContextRef = useRef(null);
  const mediaStreamDestRef = useRef(null);
  const mixedAudioTrackRef = useRef(null);

  // Dynamic ICE servers (from /api/live/ice-servers)
  const [iceServers, setIceServers] = useState(DEFAULT_STUN_SERVERS);

  // Meeting states
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Local media & streaming
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);

  // Permissions & admission
  const [isForceMuted, setIsForceMuted] = useState(false);
  const [isVideoForcedOff, setIsVideoForcedOff] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);

  // Layout & UI
  const [layoutMode, setLayoutMode] = useState('speaker'); // 'speaker' | 'grid'
  const [pinnedId, setPinnedId] = useState(null);
  const [devicePreviewOpen, setDevicePreviewOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileParticipantsOpen, setMobileParticipantsOpen] = useState(false);
  const [isStartingBroadcast, setIsStartingBroadcast] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Star Topology WebRTC state
  // Host holds Map of viewerSocketId/userId -> RTCPeerConnection
  const peerConnectionsRef = useRef(new Map());
  // Participant holds one connection to host
  const hostPeerConnectionRef = useRef(null);
  const hostSocketIdRef = useRef(null);
  const pendingCandidatesRef = useRef(new Map());

  // Streams state
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  // Host's participant streams: participantId -> { stream, user, micOn, videoOn }
  const [participantStreams, setParticipantStreams] = useState({});
  // Viewer's remote stream from host
  const [hostStream, setHostStream] = useState(null);
  const [isHostBroadcasting, setIsHostBroadcasting] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Reactions state
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);

  // Role detection: Super Admin or meeting host
  const hostId = (meeting?.host?._id || meeting?.host)?.toString();
  const currentUserId = user?._id?.toString();
  const isHost = isSuperAdmin || (hostId && hostId === currentUserId);

  // 1) Fetch ICE Servers from backend (STUN + TURN)
  useEffect(() => {
    let isMounted = true;
    const fetchIceServers = async () => {
      try {
        const res = await api.get('/live/ice-servers');
        if (isMounted && res.data?.success && Array.isArray(res.data?.iceServers)) {
          setIceServers(res.data.iceServers);
        }
      } catch (err) {
        // Graceful fallback to Google STUN if endpoint returns 404 or fails
        console.warn('[LiveStudio] ICE servers endpoint unavailable, using public STUN:', err?.message);
        if (isMounted) {
          setIceServers(DEFAULT_STUN_SERVERS);
        }
      }
    };
    fetchIceServers();
    return () => { isMounted = false; };
  }, []);

  const rtcConfig = useMemo(() => ({
    iceServers: iceServers.length > 0 ? iceServers : DEFAULT_STUN_SERVERS
  }), [iceServers]);

  // 2) Fetch active meeting or meeting by URL query param
  const fetchMeeting = useCallback(async () => {
    try {
      setLoading(true);
      const meetingParam = searchParams.get('meeting');
      const validMeetingParam =
        meetingParam &&
        meetingParam !== 'undefined' &&
        meetingParam !== 'null' &&
        meetingParam.trim();

      const endpoint = validMeetingParam
        ? `/live/${encodeURIComponent(validMeetingParam)}`
        : '/live/active';

      let res;
      try {
        res = await api.get(endpoint);
      } catch (fetchErr) {
        // If specific meeting param returned 404, fallback to active session
        if (validMeetingParam && fetchErr.response?.status === 404) {
          console.warn(`[LiveStudio] Meeting '${validMeetingParam}' not found, falling back to active meeting.`);
          res = await api.get('/live/active');
        } else {
          throw fetchErr;
        }
      }

      if (res?.data?.success && res.data?.meeting) {
        const m = res.data.meeting;
        setMeeting(m);
        setComments(m.comments || []);
        setLikesCount(m.likes?.length || 0);
        setDislikesCount(m.dislikes?.length || 0);

        if (currentUserId) {
          setUserLiked(m.likes?.some((id) => (id._id || id).toString() === currentUserId));
          setUserDisliked(m.dislikes?.some((id) => (id._id || id).toString() === currentUserId));

          // Check admission
          const admitted = isSuperAdmin || (m.host && (m.host._id || m.host).toString() === currentUserId) ||
            m.allowedParticipants?.some((p) => (p._id || p).toString() === currentUserId);
          setIsAdmitted(admitted);

          const waiting = m.waitingRoom?.some((w) => (w._id || w).toString() === currentUserId);
          setJoinRequested(waiting);

          // Mic permission
          const micAllowed = isSuperAdmin || (m.host && (m.host._id || m.host).toString() === currentUserId) ||
            m.allowedMicUsers?.some((u) => (u._id || u).toString() === currentUserId);
          setIsForceMuted(!micAllowed);

          // Video permission
          const videoAllowed = isSuperAdmin || (m.host && (m.host._id || m.host).toString() === currentUserId) ||
            m.allowedVideoUsers?.some((u) => (u._id || u).toString() === currentUserId);
          setIsVideoForcedOff(!videoAllowed);
        }
      }
    } catch (err) {
      console.error('[LiveStudio] Fetch meeting error:', err.message);
      setErrorMsg('Failed to load live meeting');
    } finally {
      setLoading(false);
    }
  }, [searchParams, currentUserId, isSuperAdmin]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  // Clean up media on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 3) WebRTC Automatic ICE Restart Helper
  const triggerIceRestart = useCallback(async (targetSocketId, isHostRole) => {
    console.log(`[LiveStudio] Triggering ICE restart with target: ${targetSocketId}`);
    try {
      if (isHostRole) {
        const pc = peerConnectionsRef.current.get(targetSocketId);
        if (pc) {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          socket?.emit('webrtc_signal', {
            to: targetSocketId,
            signal: { type: 'offer', sdp: offer, iceRestart: true },
            meetingId: meeting?._id
          });
        }
      } else {
        socket?.emit('webrtc_signal', {
          to: hostSocketIdRef.current || hostId,
          signal: { type: 'request_ice_restart' },
          meetingId: meeting?._id
        });
      }
    } catch (err) {
      console.warn('[LiveStudio] ICE restart failure:', err?.message);
    }
  }, [socket, meeting?._id, hostId]);

  // 4) Host: Create PeerConnection and Offer for an admitted participant
  const createOfferForParticipant = useCallback(async (participantSocketId, participantUser) => {
    if (!socket || !meeting?._id) return;
    try {
      console.log(`[Host WebRTC] Creating offer for participant socket: ${participantSocketId}`);

      // Close previous PC if exists
      if (peerConnectionsRef.current.has(participantSocketId)) {
        peerConnectionsRef.current.get(participantSocketId).close();
        peerConnectionsRef.current.delete(participantSocketId);
      }

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current.set(participantSocketId, pc);

      // Add Host's outgoing tracks (camera/mic or screen share)
      const outgoingStream = screenStreamRef.current || localStreamRef.current;
      if (outgoingStream) {
        outgoingStream.getTracks().forEach((track) => {
          if (track.kind === 'audio' && mixedAudioTrackRef.current) {
            pc.addTrack(mixedAudioTrackRef.current, outgoingStream);
          } else {
            pc.addTrack(track, outgoingStream);
          }
        });
        applyBitrateLimits(pc, true);
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            to: participantSocketId,
            signal: { type: 'candidate', candidate: event.candidate },
            meetingId: meeting._id
          });
        }
      };

      // Handle incoming track from participant
      pc.ontrack = (event) => {
        console.log(`[Host WebRTC] Received participant track (${event.track.kind}) from ${participantSocketId}`);
        const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        const pId = participantUser?._id?.toString() || participantSocketId;

        setParticipantStreams((prev) => ({
          ...prev,
          [pId]: {
            stream,
            user: participantUser,
            socketId: participantSocketId,
            micOn: stream.getAudioTracks().some((t) => t.enabled),
            videoOn: stream.getVideoTracks().some((t) => t.enabled)
          }
        }));
      };

      // Connection state & auto ICE restart
      pc.onconnectionstatechange = () => {
        console.log(`[Host WebRTC] State with ${participantSocketId}: ${pc.connectionState}`);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          triggerIceRestart(participantSocketId, true);
        } else if (pc.connectionState === 'closed') {
          peerConnectionsRef.current.delete(participantSocketId);
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_signal', {
        to: participantSocketId,
        signal: { type: 'offer', sdp: offer },
        meetingId: meeting._id
      });
    } catch (err) {
      console.error(`[Host WebRTC] Error creating offer for ${participantSocketId}:`, err);
    }
  }, [socket, meeting?._id, rtcConfig, triggerIceRestart]);

  // 5) Participant: Handle Offer from Host
  const handleOfferFromHost = useCallback(async (fromHostSocketId, sdp, hostSender) => {
    if (!socket || !meeting?._id) return;
    try {
      console.log(`[Viewer WebRTC] Processing offer from host ${fromHostSocketId}`);
      hostSocketIdRef.current = fromHostSocketId;

      if (hostPeerConnectionRef.current) {
        hostPeerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(rtcConfig);
      hostPeerConnectionRef.current = pc;

      // If admitted participant has active local stream (video/mic allowed), attach tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
        applyBitrateLimits(pc, false);
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            to: fromHostSocketId,
            signal: { type: 'candidate', candidate: event.candidate },
            meetingId: meeting._id
          });
        }
      };

      // Receive Host's camera/mic or screen share track
      pc.ontrack = (event) => {
        console.log('[Viewer WebRTC] Received remote track from host:', event.track.kind);
        const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        setHostStream(stream);
        setIsHostBroadcasting(true);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[Viewer WebRTC] Host connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          triggerIceRestart(fromHostSocketId, false);
        } else if (pc.connectionState === 'connected') {
          setIsHostBroadcasting(true);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush queued candidates
      const pending = pendingCandidatesRef.current.get(fromHostSocketId) || [];
      for (const cand of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      pendingCandidatesRef.current.delete(fromHostSocketId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_signal', {
        to: fromHostSocketId,
        signal: { type: 'answer', sdp: answer },
        meetingId: meeting._id
      });
    } catch (err) {
      console.error('[Viewer WebRTC] Error responding to host offer:', err);
    }
  }, [socket, meeting?._id, rtcConfig, triggerIceRestart]);

  // 6) Host: Handle Answer from Participant
  const handleAnswerFromParticipant = useCallback(async (fromParticipantSocketId, sdp) => {
    try {
      const pc = peerConnectionsRef.current.get(fromParticipantSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const pending = pendingCandidatesRef.current.get(fromParticipantSocketId) || [];
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        pendingCandidatesRef.current.delete(fromParticipantSocketId);
      }
    } catch (err) {
      console.error(`[Host WebRTC] Error setting remote answer from ${fromParticipantSocketId}:`, err);
    }
  }, []);

  // 7) Handle ICE Candidate Exchange
  const handleIncomingCandidate = useCallback(async (fromSocketId, candidate) => {
    try {
      const pc = isHost ? peerConnectionsRef.current.get(fromSocketId) : hostPeerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        const queue = pendingCandidatesRef.current.get(fromSocketId) || [];
        queue.push(candidate);
        pendingCandidatesRef.current.set(fromSocketId, queue);
      }
    } catch (err) {
      console.warn(`[WebRTC] Candidate error from ${fromSocketId}:`, err?.message);
    }
  }, [isHost]);

  // 8) Media Device Acquisition & Track Management
  const startLocalMedia = useCallback(async (wantVideo = true, wantAudio = true) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg('Browser does not support media devices');
      return null;
    }

    try {
      // Quality limits: Host 720p, Participant 360p 15fps
      const videoConstraints = isHost
        ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } }
        : { width: { ideal: 640, max: 640 }, height: { ideal: 360, max: 360 }, frameRate: { ideal: 15, max: 15 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo ? videoConstraints : false,
        audio: wantAudio ? { echoCancellation: true, noiseSuppression: true } : false
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      setIsCameraOn(hasVideo);
      setIsMicOn(hasAudio);

      // Attach tracks to existing connections
      if (isHost) {
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          stream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track && s.track.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track);
            } else {
              pc.addTrack(track, stream);
            }
          });
          applyBitrateLimits(pc, true);
        });
      } else if (hostPeerConnectionRef.current) {
        const pc = hostPeerConnectionRef.current;
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
        applyBitrateLimits(pc, false);
      }

      return stream;
    } catch (err) {
      console.warn('[LiveStudio] getUserMedia error:', err);
      setErrorMsg(err.message || 'Kaameeraa/maayikii banuu hin dandeenye');
      return null;
    }
  }, [isHost]);

  // Toggle Camera
  const handleToggleCamera = useCallback(async () => {
    if (!isHost && isVideoForcedOff) {
      setErrorMsg('Hooggansi kaameeraa keessan cufeera (Camera turned off by host)');
      return;
    }

    const curStream = localStreamRef.current;
    if (curStream && curStream.getVideoTracks().length > 0) {
      const vTrack = curStream.getVideoTracks()[0];
      const nextState = !vTrack.enabled;
      vTrack.enabled = nextState;
      setIsCameraOn(nextState);
      return;
    }

    // No video track yet: acquire track
    await startLocalMedia(true, isMicOn && !isForceMuted);
  }, [isHost, isVideoForcedOff, isMicOn, isForceMuted, startLocalMedia]);

  // Toggle Mic
  const handleToggleMic = useCallback(async () => {
    if (!isHost && isForceMuted) {
      setErrorMsg('Sagaleen keessan Hooggansaan cufameera (Muted by host)');
      return;
    }

    const curStream = localStreamRef.current;
    if (curStream && curStream.getAudioTracks().length > 0) {
      const aTrack = curStream.getAudioTracks()[0];
      const nextState = !aTrack.enabled;
      aTrack.enabled = nextState;
      setIsMicOn(nextState);
      return;
    }

    // No audio track yet: acquire track
    await startLocalMedia(isCameraOn && !isVideoForcedOff, true);
  }, [isHost, isForceMuted, isCameraOn, isVideoForcedOff, startLocalMedia]);

  // Host: Screen Share Toggle
  const handleToggleScreenShare = useCallback(async () => {
    if (!isHost) return;

    if (isScreenSharing && screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);

      // Restore camera track to all viewers
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenTrack = stream.getVideoTracks()[0];
      screenTrack.onended = () => {
        handleToggleScreenShare();
      };

      // Replace video track with screen track on all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        applyBitrateLimits(pc, true);
      });
    } catch (err) {
      console.warn('[LiveStudio] getDisplayMedia canceled/failed:', err);
    }
  }, [isHost, isScreenSharing]);

  // Web Audio API: Mix Gospel Radio into Host's outgoing stream
  useEffect(() => {
    if (!isHost) return;

    const shouldMix = mixRadioToStream && radioState.isPlaying && audioRef?.current;

    const cleanupAudioMixing = () => {
      if (mixedAudioTrackRef.current) {
        mixedAudioTrackRef.current.stop();
        mixedAudioTrackRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      mediaStreamDestRef.current = null;

      // Revert peer connections back to original mic track
      const cleanMicTrack = localStreamRef.current?.getAudioTracks()[0];
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
        if (sender && cleanMicTrack) {
          sender.replaceTrack(cleanMicTrack).catch(() => {});
        }
      });
    };

    if (!shouldMix) {
      cleanupAudioMixing();
      return;
    }

    try {
      const audioEl = audioRef.current;
      const micTrack = localStreamRef.current?.getAudioTracks()[0];

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      mediaStreamDestRef.current = dest;

      // Connect mic if available
      if (micTrack) {
        const micStream = new MediaStream([micTrack]);
        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(dest);
      }

      // Connect radio audio element
      if (!audioEl._webaudio_source || audioEl._webaudio_ctx !== ctx) {
        try {
          audioEl._webaudio_source = ctx.createMediaElementSource(audioEl);
          audioEl._webaudio_ctx = ctx;
        } catch (e) {
          console.warn('[WebAudio] createMediaElementSource warning:', e.message);
        }
      }

      if (audioEl._webaudio_source) {
        try {
          audioEl._webaudio_source.connect(dest);
          audioEl._webaudio_source.connect(ctx.destination);
        } catch (e) {
          console.warn('[WebAudio] connect warning:', e.message);
        }
      }

      const mixedTrack = dest.stream.getAudioTracks()[0];
      if (mixedTrack) {
        mixedAudioTrackRef.current = mixedTrack;

        // Replace track on all active host peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(mixedTrack).catch(() => {});
          }
        });
      }
    } catch (err) {
      console.error('[WebAudio] Audio mixing error:', err);
    }

    return () => {
      cleanupAudioMixing();
    };
  }, [isHost, mixRadioToStream, radioState.isPlaying, radioState.url, audioRef]);

  // 9) Socket Listeners & Real-Time Sync
  useEffect(() => {
    if (!socket || !meeting?._id) return;

    socket.emit('join_meeting_studio', { meetingId: meeting._id });

    // Request host stream if meeting is live
    if (!isHost && meeting.status === 'LIVE') {
      socket.emit('webrtc_signal', {
        meetingId: meeting._id,
        signal: { type: 'request_host_stream' }
      });
    }

    socket.on('live_status_changed', ({ status }) => {
      setMeeting((prev) => (prev ? { ...prev, status } : prev));
      if (status === 'LIVE' && !isHost) {
        socket.emit('webrtc_signal', {
          meetingId: meeting._id,
          signal: { type: 'request_host_stream' }
        });
      }
    });

    socket.on('live_ended', () => {
      setMeeting((prev) => (prev ? { ...prev, status: 'ENDED' } : prev));
      setIsHostBroadcasting(false);
      setHostStream(null);
      if (isHost) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
        }
      }
    });

    // WebRTC Signaling
    socket.on('webrtc_signal', async ({ from, senderUser, signal }) => {
      if (!signal) return;

      if (signal.type === 'offer') {
        if (!isHost) {
          await handleOfferFromHost(from, signal.sdp, senderUser);
        }
      } else if (signal.type === 'answer') {
        if (isHost) {
          await handleAnswerFromParticipant(from, signal.sdp);
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        await handleIncomingCandidate(from, signal.candidate);
      } else if (signal.type === 'request_host_stream' || signal.type === 'viewer_ready') {
        if (isHost && (localStreamRef.current || screenStreamRef.current)) {
          createOfferForParticipant(from, senderUser);
        }
      } else if (signal.type === 'request_ice_restart') {
        if (isHost) {
          triggerIceRestart(from, true);
        }
      }
    });

    // Participant joined / left
    socket.on('user_joined_studio', ({ user: newUser, socketId }) => {
      if (isHost && (localStreamRef.current || screenStreamRef.current) && socketId) {
        createOfferForParticipant(socketId, newUser);
      }
    });

    socket.on('user_left_studio', ({ socketId, userId }) => {
      if (socketId && peerConnectionsRef.current.has(socketId)) {
        peerConnectionsRef.current.get(socketId).close();
        peerConnectionsRef.current.delete(socketId);
      }
      if (userId) {
        setParticipantStreams((prev) => {
          const next = { ...prev };
          delete next[userId.toString()];
          return next;
        });
      }
    });

    // Permission and admission events
    socket.on('waiting_room_updated', ({ waitingRoom }) => {
      setMeeting((prev) => (prev ? { ...prev, waitingRoom } : prev));
    });

    socket.on('participants_updated', ({ allowedParticipants }) => {
      setMeeting((prev) => (prev ? { ...prev, allowedParticipants } : prev));
    });

    socket.on('participant_permissions_updated', ({ allowedVideoUsers, allowedMicUsers, videoOffUsers, mutedUsers }) => {
      setMeeting((prev) => (prev ? {
        ...prev,
        allowedVideoUsers,
        allowedMicUsers,
        videoOffUsers,
        mutedUsers
      } : prev));

      if (currentUserId) {
        const canVideo = allowedVideoUsers?.some((id) => (id._id || id).toString() === currentUserId);
        setIsVideoForcedOff(!canVideo);
        if (!canVideo && localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = false; });
          setIsCameraOn(false);
        }

        const canMic = allowedMicUsers?.some((id) => (id._id || id).toString() === currentUserId);
        setIsForceMuted(!canMic);
        if (!canMic && localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
          setIsMicOn(false);
        }
      }
    });

    socket.on('join_approved', () => {
      setIsAdmitted(true);
      setJoinRequested(false);
      setSuccessMsg('Baga nagaan dhuftan! Hooggansi isin simateera.');
      setTimeout(() => setSuccessMsg(''), 4000);
    });

    socket.on('join_rejected', () => {
      setIsAdmitted(false);
      setJoinRequested(false);
      setErrorMsg('Gartuun hooggansaa ammaaf hirmaannaa keessan dhowwaniiru.');
    });

    socket.on('video_permission_changed', ({ allowed }) => {
      setIsVideoForcedOff(!allowed);
      if (allowed) {
        setSuccessMsg('Hooggansi kaameeraa keessan hayyameera (Video allowed by host)');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = false; });
        }
        setIsCameraOn(false);
        setErrorMsg('Hooggansi kaameeraa keessan cufeera (Video stopped by host)');
      }
    });

    socket.on('mic_permission_changed', ({ allowed }) => {
      setIsForceMuted(!allowed);
      if (allowed) {
        setSuccessMsg('Hooggansi maayikii keessan hayyameera (Mic allowed by host)');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
        }
        setIsMicOn(false);
        setErrorMsg('Hooggansi sagalee keessan cufeera (Muted by host)');
      }
    });

    socket.on('reaction_updated', ({ likesCount: lc, dislikesCount: dc, likes, dislikes }) => {
      setLikesCount(lc);
      setDislikesCount(dc);
      if (currentUserId) {
        setUserLiked(likes?.some((id) => (id._id || id).toString() === currentUserId));
        setUserDisliked(dislikes?.some((id) => (id._id || id).toString() === currentUserId));
      }
    });

    socket.on('new_live_comment', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [...prev, newComment];
      });
    });

    return () => {
      socket.emit('leave_meeting_studio', { meetingId: meeting._id });
      socket.off('live_status_changed');
      socket.off('live_ended');
      socket.off('webrtc_signal');
      socket.off('user_joined_studio');
      socket.off('user_left_studio');
      socket.off('waiting_room_updated');
      socket.off('participants_updated');
      socket.off('participant_permissions_updated');
      socket.off('join_approved');
      socket.off('join_rejected');
      socket.off('video_permission_changed');
      socket.off('mic_permission_changed');
      socket.off('reaction_updated');
      socket.off('new_live_comment');

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (hostPeerConnectionRef.current) {
        hostPeerConnectionRef.current.close();
        hostPeerConnectionRef.current = null;
      }
    };
  }, [socket, meeting?._id, isHost, currentUserId, handleOfferFromHost, handleAnswerFromParticipant, handleIncomingCandidate, createOfferForParticipant, triggerIceRestart]);

  // 10) Host Broadcast Start Flow: Click "Start Live Broadcast" -> Open Preview Modal
  const handleOpenStartBroadcastModal = () => {
    setDevicePreviewOpen(true);
  };

  const handleConfirmStartBroadcast = async ({ joinWithCameraOff, micMuted, previewStream }) => {
    if (!meeting?._id) return;
    setIsStartingBroadcast(true);
    try {
      const res = await api.patch(`/live/${meeting._id}/start`);
      if (res.data?.success) {
        setMeeting(res.data.meeting);

        // Adopt preview stream if available, or acquire fresh stream
        if (previewStream) {
          localStreamRef.current = previewStream;
          setLocalStream(previewStream);
          setIsCameraOn(!joinWithCameraOff);
          setIsMicOn(!micMuted);
        } else {
          await startLocalMedia(!joinWithCameraOff, !micMuted);
        }

        setDevicePreviewOpen(false);
        setSuccessMsg('Tamsaasa kallattii eegaltaniittu! (Live broadcast started)');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start broadcast');
    } finally {
      setIsStartingBroadcast(false);
    }
  };

  // Host: End Live
  const handleEndLive = async () => {
    if (!meeting?._id) return;
    try {
      const res = await api.patch(`/live/${meeting._id}/end`);
      if (res.data?.success) {
        setMeeting(res.data.meeting);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
          setLocalStream(null);
        }
        setIsCameraOn(false);
        setIsMicOn(false);
        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to end live');
    }
  };

  // Member: Request to Join
  const handleRequestJoin = async () => {
    if (!meeting?._id) return;
    try {
      const res = await api.post(`/live/${meeting._id}/join-request`);
      if (res.data?.success) {
        if (res.data.alreadyAdmitted) {
          setIsAdmitted(true);
        } else {
          setJoinRequested(true);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send join request');
    }
  };

  // Host: Admit / Reject
  const handleAdmitAction = async (userId, action) => {
    if (!meeting?._id) return;
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/live/${meeting._id}/admit`, { userId, action });
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          waitingRoom: res.data.waitingRoom,
          allowedParticipants: res.data.allowedParticipants
        }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Admission action failed');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Host: Allow Video for Participant
  const handleAllowVideo = async (userId) => {
    if (!meeting?._id) return;
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/live/${meeting._id}/allow-video`, { userId });
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          allowedVideoUsers: res.data.allowedVideoUsers
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to allow video';
      setErrorMsg(msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Host: Stop Video for Participant
  const handleStopVideo = async (userId) => {
    if (!meeting?._id) return;
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/live/${meeting._id}/stop-video`, { userId });
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          allowedVideoUsers: res.data.allowedVideoUsers
        }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to stop video');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Host: Allow Mic for Participant
  const handleAllowMic = async (userId) => {
    if (!meeting?._id) return;
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/live/${meeting._id}/allow-mic`, { userId });
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          allowedMicUsers: res.data.allowedMicUsers
        }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to allow mic');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Host: Mute User
  const handleMuteUser = async (userId) => {
    if (!meeting?._id) return;
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/live/${meeting._id}/mute`, { userId, mute: true });
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          allowedMicUsers: res.data.allowedMicUsers,
          mutedUsers: res.data.mutedUsers
        }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to mute participant');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Host: Mute All
  const handleMuteAll = async () => {
    if (!meeting?._id) return;
    setIsProcessingAction(true);
    try {
      const res = await api.post(`/live/${meeting._id}/mute-all`);
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          allowedMicUsers: res.data.allowedMicUsers,
          mutedUsers: res.data.mutedUsers
        }));
        setSuccessMsg('Hirmaattota hundaaf sagaleen cufameera (All muted)');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to mute all');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Copy Meeting Link ("Waraabi Link") -> opens /dashboard?tab=live&meeting=<id>
  const handleCopyLink = () => {
    const meetingId = meeting?.meetingLink || meeting?._id;
    if (!meetingId) return;
    const fullUrl = `${window.location.origin}/dashboard?tab=live&meeting=${meetingId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Reactions
  const handleReaction = async (type) => {
    if (!meeting?._id) return;
    try {
      const res = await api.post(`/live/${meeting._id}/reaction`, { type });
      if (res.data?.success) {
        setLikesCount(res.data.likesCount);
        setDislikesCount(res.data.dislikesCount);
        if (currentUserId) {
          setUserLiked(res.data.likes?.some((id) => (id._id || id).toString() === currentUserId));
          setUserDisliked(res.data.dislikes?.some((id) => (id._id || id).toString() === currentUserId));
        }
      }
    } catch (err) {
      console.warn('Reaction error:', err.message);
    }
  };

  // Comments
  const handleSendComment = async (e) => {
    e?.preventDefault();
    if (!commentInput.trim() || !meeting?._id || isSendingComment) return;
    const text = commentInput.trim();
    setCommentInput('');
    setIsSendingComment(true);
    try {
      await api.post(`/live/${meeting._id}/comment`, { text });
    } catch (err) {
      console.error('Comment error:', err.message);
    } finally {
      setIsSendingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400 min-h-[60vh]">
        <Spinner size="lg" />
        <p className="text-sm font-medium">Kutaa Live Studio fe'aa jira...</p>
      </div>
    );
  }

  const isLive = meeting?.status === 'LIVE';
  const isEnded = meeting?.status === 'ENDED';

  // Video tiles list calculation
  // Host stream: either screen share or camera stream
  const activeHostStream = isHost ? (screenStream || localStream) : hostStream;
  const isHostCameraOn = isHost ? (isCameraOn || isScreenSharing) : isHostBroadcasting;

  // Active admitted video participants for Host view
  const participantTiles = Object.entries(participantStreams).map(([pId, data]) => ({
    id: pId,
    stream: data.stream,
    user: data.user,
    isHost: false,
    isLocal: false,
    isMicOn: data.micOn,
    isCameraOn: data.videoOn
  }));

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between space-y-4 text-slate-900 pb-20 sm:pb-6">
      {/* TOP BANNER */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 sm:p-5 shadow-sm border border-slate-200 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Badge variant={isLive ? 'danger' : isEnded ? 'muted' : 'gold'} size="sm">
              <span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${isLive ? 'bg-red-500 animate-ping' : isEnded ? 'bg-slate-500' : 'bg-gold-500'}`} />
              {isLive ? 'KALLATTII (LIVE)' : isEnded ? 'XUMURAMEERA (ENDED)' : 'QOPHII IRRA (SCHEDULED)'}
            </Badge>
            <span className="text-xs text-slate-500">
              Host: <strong className="text-royal font-bold">{meeting?.host?.fullName || 'Super Admin'}</strong>
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-royal truncate max-w-xl">
            {meeting?.title}
          </h1>
        </div>

        {/* TOP ACTION CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Invite Link */}
          <Button
            variant="secondary"
            size="sm"
            icon={copiedLink ? Check : Copy}
            onClick={handleCopyLink}
          >
            <span>{copiedLink ? 'Waraabameera!' : 'Waraabi Link'}</span>
          </Button>

          {/* Super Admin Start/End Broadcast */}
          {isSuperAdmin && (
            <>
              {!isLive ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={Play}
                  onClick={handleOpenStartBroadcastModal}
                >
                  <span>Start Live Broadcast</span>
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="md"
                  icon={Square}
                  onClick={handleEndLive}
                >
                  <span>Close Live (Xumuri)</span>
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* NOTIFICATION TOASTS */}
      {errorMsg && (
        <Toast variant="error" message={errorMsg} onClose={() => setErrorMsg('')} />
      )}
      {successMsg && (
        <Toast variant="success" message={successMsg} onClose={() => setSuccessMsg('')} />
      )}

      {/* MAIN VIDEO STAGE & LAYOUT (100dvh compliant) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* VIDEO DISPLAY AREA (2 Cols on lg) */}
        <div className="lg:col-span-2 flex flex-col space-y-3 min-h-[50vh] lg:min-h-[65vh]">
          {/* VIDEO STAGE CONTAINER */}
          <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col p-2 min-h-[420px]">
            {/* GRID VIEW LAYOUT */}
            {layoutMode === 'grid' ? (
              <div
                className={`w-full h-full grid gap-2.5 ${
                  participantTiles.length === 0
                    ? 'grid-cols-1'
                    : participantTiles.length === 1
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : participantTiles.length <= 3
                    ? 'grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3'
                }`}
              >
                {/* Host Video Tile */}
                <VideoTile
                  stream={activeHostStream}
                  user={meeting?.host || user}
                  isHost={true}
                  isLocal={isHost}
                  isMicOn={isHost ? isMicOn : true}
                  isCameraOn={isHostCameraOn}
                  isPinned={pinnedId === 'host'}
                  onPin={() => setPinnedId(pinnedId === 'host' ? null : 'host')}
                  className="w-full h-full min-h-[200px]"
                />

                {/* If Viewer: Participant's own local tile */}
                {!isHost && (
                  <VideoTile
                    stream={localStream}
                    user={user}
                    isHost={false}
                    isLocal={true}
                    isMicOn={isMicOn && !isForceMuted}
                    isCameraOn={isCameraOn && !isVideoForcedOff}
                    isPinned={pinnedId === 'local'}
                    onPin={() => setPinnedId(pinnedId === 'local' ? null : 'local')}
                    className="w-full h-full min-h-[200px]"
                  />
                )}

                {/* Host sees every admitted participant with allowed video */}
                {isHost &&
                  participantTiles.map((tile) => (
                    <VideoTile
                      key={tile.id}
                      stream={tile.stream}
                      user={tile.user}
                      isHost={false}
                      isLocal={false}
                      isMicOn={tile.isMicOn}
                      isCameraOn={tile.isCameraOn}
                      isPinned={pinnedId === tile.id}
                      onPin={() => setPinnedId(pinnedId === tile.id ? null : tile.id)}
                      className="w-full h-full min-h-[200px]"
                    />
                  ))}
              </div>
            ) : (
              /* SPEAKER VIEW LAYOUT (Main large tile + thumbnail strip) */
              <div className="w-full h-full flex flex-col justify-between space-y-2">
                {/* Main Spotlight Video */}
                <div className="flex-1 w-full min-h-0 relative rounded-xl overflow-hidden">
                  {pinnedId && pinnedId !== 'host' && participantStreams[pinnedId] ? (
                    /* Pinned Participant */
                    <VideoTile
                      stream={participantStreams[pinnedId].stream}
                      user={participantStreams[pinnedId].user}
                      isHost={false}
                      isLocal={false}
                      isMicOn={participantStreams[pinnedId].micOn}
                      isCameraOn={participantStreams[pinnedId].videoOn}
                      isPinned={true}
                      onPin={() => setPinnedId(null)}
                      className="w-full h-full"
                    />
                  ) : (
                    /* Default Host Video */
                    <VideoTile
                      stream={activeHostStream}
                      user={meeting?.host || user}
                      isHost={true}
                      isLocal={isHost}
                      isMicOn={isHost ? isMicOn : true}
                      isCameraOn={isHostCameraOn}
                      isPinned={pinnedId === 'host'}
                      onPin={() => setPinnedId(pinnedId === 'host' ? null : 'host')}
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* Thumbnail Strip (Bottom) */}
                <div className="h-24 sm:h-28 w-full flex items-center gap-2 overflow-x-auto py-1 px-1 custom-scrollbar shrink-0">
                  {/* Host Thumbnail if not spotlighted */}
                  {pinnedId && pinnedId !== 'host' && (
                    <div
                      onClick={() => setPinnedId('host')}
                      className="h-full aspect-video rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:border-gold-400 shrink-0"
                    >
                      <VideoTile
                        stream={activeHostStream}
                        user={meeting?.host || user}
                        isHost={true}
                        isLocal={isHost}
                        isMicOn={isHost ? isMicOn : true}
                        isCameraOn={isHostCameraOn}
                        className="w-full h-full pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Viewer's Own Thumbnail Tile */}
                  {!isHost && (
                    <div
                      onClick={() => setPinnedId('local')}
                      className="h-full aspect-video rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:border-gold-400 shrink-0"
                    >
                      <VideoTile
                        stream={localStream}
                        user={user}
                        isHost={false}
                        isLocal={true}
                        isMicOn={isMicOn && !isForceMuted}
                        isCameraOn={isCameraOn && !isVideoForcedOff}
                        className="w-full h-full pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Host sees participant thumbnails */}
                  {isHost &&
                    participantTiles.map((tile) => (
                      <div
                        key={tile.id}
                        onClick={() => setPinnedId(tile.id)}
                        className={`h-full aspect-video rounded-xl overflow-hidden border cursor-pointer shrink-0 transition-all ${
                          pinnedId === tile.id ? 'border-gold-400 ring-2 ring-gold-400' : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <VideoTile
                          stream={tile.stream}
                          user={tile.user}
                          isHost={false}
                          isLocal={false}
                          isMicOn={tile.isMicOn}
                          isCameraOn={tile.isCameraOn}
                          className="w-full h-full pointer-events-none"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* WAITING ROOM SCREEN FOR NON-ADMITTED MEMBERS */}
          {!isAdmitted && !isSuperAdmin && (
            <Card className="p-5 border border-slate-200 shadow-md space-y-3 text-center bg-white">
              <div className="w-10 h-10 rounded-xl bg-royal-tint border border-slate-200 flex items-center justify-center text-gold-500 mx-auto">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-black text-royal">
                  {joinRequested ? 'Kutaa Eeggannaa (Waiting Room): Eegaa jira...' : 'Tajaajila Kallattiitti Dabalamaa'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  {joinRequested
                    ? "Gaaffiin keessan Hooggansaan ilaallamaa jira. Akkuma mirkanaa'een kallattiin seentu."
                    : "Sagantaa Live irratti hirmaachuuf hayyama Hooggansaa gaafachuuf qabduu cuqaasaa."}
                </p>
              </div>
              {!joinRequested ? (
                <Button variant="primary" size="sm" onClick={handleRequestJoin} className="mx-auto">
                  <span>Hirmaachuuf Gaafadhu (Request to Join)</span>
                </Button>
              ) : (
                <div className="inline-block px-3 py-1 rounded-xl bg-royal-tint text-royal text-xs font-bold border border-slate-200">
                  ✓ Gaaffiin ergameera
                </div>
              )}
            </Card>
          )}

          {/* LIVE CONTROL BAR (Mobile & Desktop) */}
          <LiveControlBar
            isHost={isHost}
            isLive={isLive}
            isAdmitted={isAdmitted}
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            isForceMuted={isForceMuted}
            isVideoForcedOff={isVideoForcedOff}
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
            onToggleScreenShare={handleToggleScreenShare}
            layoutMode={layoutMode}
            onToggleLayout={() => setLayoutMode((m) => (m === 'speaker' ? 'grid' : 'speaker'))}
            onOpenChat={() => setMobileChatOpen(true)}
            onOpenParticipants={() => setMobileParticipantsOpen(true)}
            commentsCount={comments.length}
            participantsCount={meeting?.allowedParticipants?.length || 1}
            onCopyLink={handleCopyLink}
            copiedLink={copiedLink}
            onHangUp={isHost ? handleEndLive : () => navigate('/dashboard')}
            remoteAudioMuted={remoteAudioMuted}
            onToggleSpeakerMute={() => setRemoteAudioMuted((m) => !m)}
          />
        </div>

        {/* SIDEBAR AREA (Desktop: Host Controls + Chat | Mobile: Slide-Up Bottom Sheets) */}
        <div className="hidden lg:flex flex-col space-y-4">
          {/* Host Studio Control Panel */}
          {isHost && (
            <HostControlPanel
              meeting={meeting}
              onAdmitAction={handleAdmitAction}
              onAllowVideo={handleAllowVideo}
              onStopVideo={handleStopVideo}
              onAllowMic={handleAllowMic}
              onMuteUser={handleMuteUser}
              onMuteAll={handleMuteAll}
              isProcessing={isProcessingAction}
              mixRadioToStream={mixRadioToStream}
              onToggleMixRadio={toggleMixRadioToStream}
              radioPlaying={radioState.isPlaying}
              radioTitle={radioState.title}
            />
          )}

          {/* Desktop Chat Box */}
          <LiveChatDrawer
            comments={comments}
            commentInput={commentInput}
            onCommentInputChange={setCommentInput}
            onSendComment={handleSendComment}
            isSendingComment={isSendingComment}
            likesCount={likesCount}
            dislikesCount={dislikesCount}
            userLiked={userLiked}
            userDisliked={userDisliked}
            onReaction={handleReaction}
            isMobileSheet={false}
          />
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET: CHAT */}
      <LiveChatDrawer
        comments={comments}
        commentInput={commentInput}
        onCommentInputChange={setCommentInput}
        onSendComment={handleSendComment}
        isSendingComment={isSendingComment}
        likesCount={likesCount}
        dislikesCount={dislikesCount}
        userLiked={userLiked}
        userDisliked={userDisliked}
        onReaction={handleReaction}
        isMobileSheet={true}
        isOpen={mobileChatOpen}
        onClose={() => setMobileChatOpen(false)}
      />

      {/* MOBILE BOTTOM SHEET: PARTICIPANTS & HOST CONTROLS */}
      {mobileParticipantsOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setMobileParticipantsOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl max-h-[80vh] h-[550px] w-full p-4 overflow-y-auto shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3" />
            {isHost ? (
              <HostControlPanel
                meeting={meeting}
                onAdmitAction={handleAdmitAction}
                onAllowVideo={handleAllowVideo}
                onStopVideo={handleStopVideo}
                onAllowMic={handleAllowMic}
                onMuteUser={handleMuteUser}
                onMuteAll={handleMuteAll}
                isProcessing={isProcessingAction}
                mixRadioToStream={mixRadioToStream}
                onToggleMixRadio={toggleMixRadioToStream}
                radioPlaying={radioState.isPlaying}
                radioTitle={radioState.title}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase text-royal">
                    Hirmaattota ({meeting?.allowedParticipants?.length || 0})
                  </h4>
                  <button
                    onClick={() => setMobileParticipantsOpen(false)}
                    className="p-1 rounded-lg bg-slate-100 text-slate-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  {meeting?.allowedParticipants?.map((p) => (
                    <div
                      key={p._id || p}
                      className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-900">{p.fullName || 'Member'}</span>
                      <span className="text-[10px] text-slate-500">{p.role || 'MEMBER'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOST START BROADCAST DEVICE PREVIEW MODAL */}
      <DevicePreviewModal
        isOpen={devicePreviewOpen}
        onClose={() => setDevicePreviewOpen(false)}
        onStartBroadcast={handleConfirmStartBroadcast}
        isStarting={isStartingBroadcast}
      />
    </div>
  );
};

export default LiveMeetingStudio;
