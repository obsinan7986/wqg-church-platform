import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
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
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  UserCheck,
  UserX,
  VolumeX,
  Volume2,
  Clock,
  Sparkles,
  Church,
  AlertCircle,
  Share2,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Card, Button, Badge, Spinner, Toast, Avatar } from '../../components/ui';
import { formatTime, formatDual } from '../../utils/dateFormat';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

const LiveMeetingStudio = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { socket } = useSocket();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Meeting states
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // User media & streaming states
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isForceMuted, setIsForceMuted] = useState(false);
  const [isVideoForcedOff, setIsVideoForcedOff] = useState(false);
  const [isHostBroadcasting, setIsHostBroadcasting] = useState(false);
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Element and stream refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  // WebRTC signaling refs
  const peerConnectionsRef = useRef(new Map()); // Host: viewerSocketId -> RTCPeerConnection
  const hostPeerConnectionRef = useRef(null); // Viewer: connection to host
  const pendingCandidatesRef = useRef(new Map()); // peerId -> RTCIceCandidate[]

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentsEndRef = useRef(null);

  // Reactions state
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);

  // Admission status for regular members
  const [joinRequested, setJoinRequested] = useState(false);
  const [isAdmitted, setIsAdmitted] = useState(false);

  // Role detection
  const isHost = isSuperAdmin || (meeting?.host && (meeting.host._id || meeting.host).toString() === user?._id?.toString());

  // Attach local stream to video element whenever localStream or isCameraOn changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch((err) => {
        console.warn('[LiveStudio] Local video play notice:', err?.message);
      });
    }
  }, [localStream, isCameraOn]);

  // Attach remote stream to remote video element whenever remoteStream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch((err) => {
        console.warn('[LiveStudio] Remote video play warning (autoplay blocked):', err?.message);
        if (err?.name === 'NotAllowedError') {
          setAutoplayBlocked(true);
          setRemoteAudioMuted(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.play().catch(() => {});
          }
        }
      });
    }
  }, [remoteStream]);

  // Proactively check browser permissions if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' })
        .then((status) => {
          status.onchange = () => {
            if (status.state === 'granted') {
              setPermissionError(null);
            }
          };
        })
        .catch(() => {});
    }
  }, []);

  // Handle media device permission and hardware errors with clear bilingual instructions
  const handleMediaError = useCallback((err) => {
    console.error('[LiveStudio] getUserMedia error:', err);
    let errorObj = {
      type: 'other',
      title: 'Dogongora Meeshaa (Media Device Error)',
      message: err.message || 'Kaameeraa/maayikii banuun hin danda\'amne (Could not start camera or microphone).'
    };

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorObj = {
        type: 'denied',
        title: 'Hayyama Kaameeraa/Maayikii Dhowwameera (Permission Denied)',
        message: 'Browser keessan kaameeraa fi maayikii akka fayyadamuuf hayyama hin kennine (Camera & microphone permission was denied).',
        instruction: 'Maaloo sarara teessoo browser keessanii (URL bar) irratti mallattoo qulfii (🔒) ykn kaameeraa cuqaasaati "Allow" filadhaa, achiis qabduu "Irra Deebi\'i Yaali" gadii cuqaasaa (Click the lock/camera icon in your address bar to set permissions to Allow, then click Try Again).'
      };
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorObj = {
        type: 'not_found',
        title: 'Meeshaan Hin Argamne (Device Not Found)',
        message: 'Kaameeraan ykn Maayikroofooniin meeshaa keessan irratti hin argamne (Camera or microphone hardware was not found).',
        instruction: 'Kaameeraa ykn maayikii kompiitara/moobaayila keessanitti qabsiisaatii irra deebi\'aa yaalaa (Please connect a camera or microphone).'
      };
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorObj = {
        type: 'in_use',
        title: 'Kaameeraan Hojii Irra Jira (Device In Use)',
        message: 'Kaameeraan ykn Maayikiin appilikeeshinii biraatiin qabameera (Camera or mic is currently in use by another app).',
        instruction: 'Appilikeeshinoota biraa kanneen akka Zoom, Teams, ykn taboota browser biroo cufaatii irra deebi\'aa yaalaa (Please close other apps using the camera and retry).'
      };
    } else if (err.name === 'OverconstrainedError') {
      errorObj = {
        type: 'constraint',
        title: 'Ulaagaa Hin Danda\'amne (Constraints Not Satisfied)',
        message: 'Ulaagaaleen kaameeraa gaafataman hin danda\'amne (Requested resolution is not supported by your camera).',
        instruction: 'Qulqullina biraa fayyadamuuf yaalaa.'
      };
    } else if (err.name === 'SecurityError') {
      errorObj = {
        type: 'security',
        title: 'Nageenya Browser (Security Policy Error)',
        message: 'Nageenyi browser tajaajila kaameeraa dhowweera (Camera access blocked by browser security policy).',
        instruction: 'Kanneen akka HTTPS ykn localhost qofa fayyadamaa (Requires secure HTTPS connection).'
      };
    }

    setPermissionError(errorObj);
    setErrorMsg(errorObj.message);
  }, []);

  // Request user media and attach streams
  const startMediaStream = async (wantVideo = true, wantAudio = true) => {
    setPermissionError(null);
    setErrorMsg('');

    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg = 'Browser keessan tajaajila kaameeraa fi maayikroofoonii hin deeggaru (Media devices not supported. Please use a modern browser on HTTPS / localhost).';
      setErrorMsg(msg);
      setPermissionError({
        type: 'unsupported',
        title: 'MediaStream Unsupported',
        message: msg,
        instruction: 'Browser Chrome, Firefox, Safari, ykn Edge haaromfame fayyadamaa.'
      });
      return null;
    }

    let stream = null;

    // Primary attempt: request video + audio
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: wantVideo
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user'
            }
          : false,
        audio: wantAudio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          : false
      });
    } catch (err) {
      console.warn('[LiveStudio] Primary getUserMedia failed:', err.name, err.message);

      // Graceful fallback: If audio or video hardware missing, try fallback
      if ((err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') && wantVideo && wantAudio) {
        try {
          console.log('[LiveStudio] Trying video-only fallback...');
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (videoErr) {
          try {
            console.log('[LiveStudio] Trying audio-only fallback...');
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          } catch (audioErr) {
            handleMediaError(err);
            return null;
          }
        }
      } else {
        handleMediaError(err);
        return null;
      }
    }

    if (stream) {
      // Audio state
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = wantAudio && !isForceMuted;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      setIsCameraOn(hasVideo);
      setIsMicOn(hasAudio && !isForceMuted);

      // Attach immediately to local video element if rendered
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch((e) => console.warn('[LiveStudio] Play error:', e));
      }

      // If host, update peer connections or notify peers
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
        });

        // Broadcast host live stream update
        if (socket && meeting?._id) {
          socket.emit('webrtc_signal', {
            meetingId: meeting._id,
            signal: { type: 'host_live_started' }
          });
        }
      } else if (hostPeerConnectionRef.current) {
        // If viewer is admitted and turned on camera, attach tracks to host connection
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
      }

      return stream;
    }

    return null;
  };

  const stopMediaStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsCameraOn(false);
    setIsMicOn(false);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // Camera toggle: toggle videoTrack.enabled only. Do NOT stop the whole stream or the mic.
  // If there is no video track yet, request the camera, then add the track to the existing peer connections.
  const toggleCamera = async () => {
    if (isVideoForcedOff) {
      setErrorMsg('Hooggansi kaameeraa keessan cufeera (The host turned off your camera)');
      return;
    }

    const currentStream = localStreamRef.current;
    if (currentStream && currentStream.getVideoTracks().length > 0) {
      const videoTrack = currentStream.getVideoTracks()[0];
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setIsCameraOn(nextState);
      return;
    }

    // No video track yet: request camera track and attach to existing stream / peer connections
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const newVideoTrack = cameraStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (currentStream) {
        currentStream.addTrack(newVideoTrack);
        newVideoTrack.enabled = true;
        setLocalStream(currentStream);
        setIsCameraOn(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
          localVideoRef.current.play().catch(() => {});
        }

        // Add track to peer connections
        if (isHost) {
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            } else {
              pc.addTrack(newVideoTrack, currentStream);
            }
          });
        } else if (hostPeerConnectionRef.current) {
          const pc = hostPeerConnectionRef.current;
          const senders = pc.getSenders();
          const sender = senders.find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, currentStream);
          }
        }
      } else {
        await startMediaStream(true, isMicOn && !isForceMuted);
      }
    } catch (err) {
      handleMediaError(err);
    }
  };

  // Mic toggle
  const toggleMic = async (explicitState) => {
    if (isForceMuted && (explicitState === true || !isMicOn)) {
      setErrorMsg('Sagaleen keessan Hooggansaan cufameera (You are muted by the host)');
      return;
    }

    const nextState = typeof explicitState === 'boolean' ? explicitState : !isMicOn;

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = nextState;
        setIsMicOn(nextState);
      } else if (nextState) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newTrack = audioStream.getAudioTracks()[0];
          if (newTrack) {
            localStreamRef.current.addTrack(newTrack);
            setIsMicOn(true);
            if (isHost) {
              peerConnectionsRef.current.forEach((pc) => {
                pc.addTrack(newTrack, localStreamRef.current);
              });
            } else if (hostPeerConnectionRef.current) {
              hostPeerConnectionRef.current.addTrack(newTrack, localStreamRef.current);
            }
          }
        } catch (err) {
          handleMediaError(err);
        }
      }
    } else {
      setIsMicOn(nextState);
    }
  };

  // Host creates WebRTC offer for a specific viewer
  const createOfferForViewer = async (viewerSocketId) => {
    if (!socket || !meeting?._id) return;
    try {
      console.log(`[Host WebRTC] Preparing offer for viewer: ${viewerSocketId}`);
      if (peerConnectionsRef.current.has(viewerSocketId)) {
        peerConnectionsRef.current.get(viewerSocketId).close();
        peerConnectionsRef.current.delete(viewerSocketId);
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current.set(viewerSocketId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            to: viewerSocketId,
            signal: { type: 'candidate', candidate: event.candidate },
            meetingId: meeting._id
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          peerConnectionsRef.current.delete(viewerSocketId);
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_signal', {
        to: viewerSocketId,
        signal: { type: 'offer', sdp: offer },
        meetingId: meeting._id
      });
    } catch (err) {
      console.error(`[Host WebRTC] Failed to create offer for ${viewerSocketId}:`, err);
    }
  };

  // Viewer receives offer from Host
  const handleOfferFromHost = async (hostSocketId, sdp) => {
    if (!socket || !meeting?._id) return;
    try {
      console.log(`[Viewer WebRTC] Processing offer from host: ${hostSocketId}`);
      if (hostPeerConnectionRef.current) {
        hostPeerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      hostPeerConnectionRef.current = pc;

      // If admitted viewer has local stream, send tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            to: hostSocketId,
            signal: { type: 'candidate', candidate: event.candidate },
            meetingId: meeting._id
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('[Viewer WebRTC] Received remote broadcast track:', event.track.kind);
        const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        setIsHostBroadcasting(true);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch((playErr) => {
            console.warn('[Viewer WebRTC] Autoplay play error:', playErr);
            if (playErr.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
              setRemoteAudioMuted(true);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = true;
                remoteVideoRef.current.play().catch(() => {});
              }
            }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsHostBroadcasting(false);
        } else if (pc.connectionState === 'connected') {
          setIsHostBroadcasting(true);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Process pending candidates
      const pending = pendingCandidatesRef.current.get(hostSocketId) || [];
      for (const cand of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
      }
      pendingCandidatesRef.current.delete(hostSocketId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_signal', {
        to: hostSocketId,
        signal: { type: 'answer', sdp: answer },
        meetingId: meeting._id
      });
    } catch (err) {
      console.error('[Viewer WebRTC] Error responding to host offer:', err);
    }
  };

  // Host receives answer from Viewer
  const handleAnswerFromViewer = async (viewerSocketId, sdp) => {
    try {
      const pc = peerConnectionsRef.current.get(viewerSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const pending = pendingCandidatesRef.current.get(viewerSocketId) || [];
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        pendingCandidatesRef.current.delete(viewerSocketId);
      }
    } catch (err) {
      console.error(`[Host WebRTC] Error setting remote answer from ${viewerSocketId}:`, err);
    }
  };

  // Process incoming ICE candidates with queuing
  const handleIncomingCandidate = async (fromSocketId, candidate) => {
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
      console.warn(`[WebRTC] Candidate handling notice from ${fromSocketId}:`, err?.message);
    }
  };

  // Auto scroll comments
  const scrollToCommentsBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch active meeting on mount
  const fetchActiveMeeting = async () => {
    try {
      setLoading(true);
      const res = await api.get('/live/active');
      if (res.data?.success && res.data?.meeting) {
        const m = res.data.meeting;
        setMeeting(m);
        setComments(m.comments || []);
        setLikesCount(m.likes?.length || 0);
        setDislikesCount(m.dislikes?.length || 0);

        const currentUserId = user?._id?.toString();
        setUserLiked(m.likes?.some((id) => id.toString() === currentUserId));
        setUserDisliked(m.dislikes?.some((id) => id.toString() === currentUserId));

        // Check admission
        const admitted = isSuperAdmin || m.allowedParticipants?.some(
          (p) => (p._id || p).toString() === currentUserId
        );
        setIsAdmitted(admitted);

        const waiting = m.waitingRoom?.some(
          (w) => (w._id || w).toString() === currentUserId
        );
        setJoinRequested(waiting);

        // Check mute status
        const muted = m.mutedUsers?.some(
          (u) => (u._id || u).toString() === currentUserId
        );
        setIsForceMuted(!!muted);

        const videoOff = m.videoOffUsers?.some(
          (u) => (u._id || u).toString() === currentUserId
        );
        setIsVideoForcedOff(!!videoOff);
      }
    } catch (err) {
      console.error('[LiveStudio] Fetch meeting error:', err.message);
      setErrorMsg('Failed to load active live meeting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveMeeting();
  }, [user?._id]);

  // Teardown local media stream on component unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, []);

  // Socket.io Real-Time Room & Event Listeners
  useEffect(() => {
    if (!socket || !meeting?._id) return;

    // Join studio room
    socket.emit('join_meeting_studio', { meetingId: meeting._id });

    // If meeting is already LIVE and current user is a viewer, immediately request host stream
    if (!isHost && meeting.status === 'LIVE') {
      socket.emit('webrtc_signal', {
        meetingId: meeting._id,
        signal: { type: 'request_host_stream' }
      });
    }

    // Live status changed
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
      setRemoteStream(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (isHost) {
        stopMediaStream();
      }
    });

    // WebRTC Signaling messages
    socket.on('webrtc_signal', async ({ from, senderUser, signal }) => {
      if (!signal) return;

      if (signal.type === 'offer') {
        if (!isHost) {
          await handleOfferFromHost(from, signal.sdp);
        }
      } else if (signal.type === 'answer') {
        if (isHost) {
          await handleAnswerFromViewer(from, signal.sdp);
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        await handleIncomingCandidate(from, signal.candidate);
      } else if (signal.type === 'host_live_started') {
        if (!isHost) {
          socket.emit('webrtc_signal', {
            to: from,
            signal: { type: 'request_host_stream' },
            meetingId: meeting._id
          });
        }
      } else if (signal.type === 'request_host_stream' || signal.type === 'viewer_ready') {
        if (isHost && localStreamRef.current) {
          createOfferForViewer(from);
        }
      }
    });

    // When a viewer enters the studio room
    socket.on('user_joined_studio', ({ user: newUser, socketId }) => {
      if (isHost && localStreamRef.current && socketId) {
        createOfferForViewer(socketId);
      }
    });

    // When a viewer leaves
    socket.on('user_left_studio', ({ socketId }) => {
      if (socketId) {
        if (peerConnectionsRef.current.has(socketId)) {
          peerConnectionsRef.current.get(socketId).close();
          peerConnectionsRef.current.delete(socketId);
        }
        pendingCandidatesRef.current.delete(socketId);
      }
    });

    // Waiting room updates
    socket.on('waiting_room_updated', ({ waitingRoom }) => {
      setMeeting((prev) => (prev ? { ...prev, waitingRoom } : prev));
    });

    // Participants updates
    socket.on('participants_updated', ({ allowedParticipants }) => {
      setMeeting((prev) => (prev ? { ...prev, allowedParticipants } : prev));
    });

    // Host admission signals for member
    socket.on('join_approved', () => {
      setIsAdmitted(true);
      setJoinRequested(false);
    });

    socket.on('join_rejected', () => {
      setIsAdmitted(false);
      setJoinRequested(false);
      setErrorMsg('Gartuun hooggansaa ammaaf hirmaannaa keessan dhowwaniiru.');
    });

    // Mute signals from host
    socket.on('force_mute', () => {
      setIsForceMuted(true);
      if (isMicOn) {
        toggleMic(false);
      }
    });

    socket.on('force_mute_all', () => {
      if (!isSuperAdmin) {
        setIsForceMuted(true);
        if (isMicOn) {
          toggleMic(false);
        }
      }
    });

    socket.on('allow_unmute', () => {
      setIsForceMuted(false);
    });

    socket.on('mute_status_updated', ({ mutedUsers }) => {
      setMeeting((prev) => (prev ? { ...prev, mutedUsers } : prev));
    });

    // Video-off signals from host
    socket.on('force_video_off', () => {
      setIsVideoForcedOff(true);
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsCameraOn(false);
      setErrorMsg('Hooggansi kaameeraa keessan cufeera (The host turned off your camera)');
    });

    socket.on('allow_video', () => {
      setIsVideoForcedOff(false);
      setSuccessMsg('Amma kaameeraa banachuu dandeessu (The host allowed your camera)');
      setTimeout(() => setSuccessMsg(''), 4000);
    });

    socket.on('video_status_updated', ({ videoOffUsers }) => {
      setMeeting((prev) => (prev ? { ...prev, videoOffUsers } : prev));
      const currentUserId = user?._id?.toString();
      if (videoOffUsers && currentUserId) {
        const isOff = videoOffUsers.some((u) => (u._id || u).toString() === currentUserId);
        setIsVideoForcedOff(isOff);
        if (isOff && localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = false;
          });
          setIsCameraOn(false);
        }
      }
    });

    // Live reactions
    socket.on('reaction_updated', ({ likesCount: lc, dislikesCount: dc, likes, dislikes }) => {
      setLikesCount(lc);
      setDislikesCount(dc);
      const uid = user?._id?.toString();
      setUserLiked(likes?.some((id) => (id._id || id).toString() === uid));
      setUserDisliked(dislikes?.some((id) => (id._id || id).toString() === uid));
    });

    // Live comments streaming
    socket.on('new_live_comment', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [...prev, newComment];
      });
      scrollToCommentsBottom();
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
      socket.off('join_approved');
      socket.off('join_rejected');
      socket.off('force_mute');
      socket.off('force_mute_all');
      socket.off('allow_unmute');
      socket.off('mute_status_updated');
      socket.off('force_video_off');
      socket.off('allow_video');
      socket.off('video_status_updated');
      socket.off('reaction_updated');
      socket.off('new_live_comment');

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (hostPeerConnectionRef.current) {
        hostPeerConnectionRef.current.close();
        hostPeerConnectionRef.current = null;
      }
      pendingCandidatesRef.current.clear();
    };
  }, [socket, meeting?._id, isHost]);

  useEffect(() => {
    scrollToCommentsBottom();
  }, [comments]);

  // Super Admin: Start Live Broadcast
  const handleStartLive = async () => {
    if (!meeting?._id) return;
    try {
      const res = await api.patch(`/live/${meeting._id}/start`);
      if (res.data?.success) {
        setMeeting(res.data.meeting);
        // Start camera and microphone immediately so the host's video appears immediately upon starting the live stream
        if (!localStreamRef.current || !isCameraOn) {
          await startMediaStream(true, true);
        } else if (socket) {
          socket.emit('webrtc_signal', {
            meetingId: res.data.meeting._id,
            signal: { type: 'host_live_started' }
          });
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start live');
    }
  };

  // Super Admin: End Live Broadcast
  const handleEndLive = async () => {
    if (!meeting?._id) return;
    try {
      const res = await api.patch(`/live/${meeting._id}/end`);
      if (res.data?.success) {
        setMeeting(res.data.meeting);
        stopMediaStream();
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

  // Super Admin: Admit or Reject waiting member
  const handleAdmitAction = async (userId, action) => {
    if (!meeting?._id) return;
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
    }
  };

  // Super Admin: Mute single user
  const handleMuteToggle = async (userId, shouldMute) => {
    if (!meeting?._id) return;
    try {
      const res = await api.post(`/live/${meeting._id}/mute`, { userId, mute: shouldMute });
      if (res.data?.success) {
        setMeeting((prev) => ({ ...prev, mutedUsers: res.data.mutedUsers }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Mute action failed');
    }
  };

  // Super Admin: Stop/Allow single user video
  const handleVideoOffToggle = async (userId, shouldTurnOff) => {
    if (!meeting?._id) return;
    try {
      const res = await api.post(`/live/${meeting._id}/video-off`, {
        userId,
        videoOff: shouldTurnOff
      });
      if (res.data?.success) {
        setMeeting((prev) => ({
          ...prev,
          videoOffUsers: res.data.videoOffUsers
        }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Video status update failed');
    }
  };

  // Super Admin: Mute All
  const handleMuteAll = async () => {
    if (!meeting?._id) return;
    try {
      const res = await api.post(`/live/${meeting._id}/mute-all`);
      if (res.data?.success) {
        setMeeting((prev) => ({ ...prev, mutedUsers: res.data.mutedUsers }));
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Mute all failed');
    }
  };

  // Copy Meeting Link
  const handleCopyLink = () => {
    if (!meeting?.meetingLink) return;
    const fullUrl = `${window.location.origin}/dashboard?meeting=${meeting.meetingLink}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Toggle Reaction (Like / Dislike)
  const handleReaction = async (type) => {
    if (!meeting?._id) return;
    try {
      const res = await api.post(`/live/${meeting._id}/reaction`, { type });
      if (res.data?.success) {
        setLikesCount(res.data.likesCount);
        setDislikesCount(res.data.dislikesCount);
        const uid = user?._id?.toString();
        setUserLiked(res.data.likes?.some((id) => (id._id || id).toString() === uid));
        setUserDisliked(res.data.dislikes?.some((id) => (id._id || id).toString() === uid));
      }
    } catch (err) {
      console.warn('Reaction error:', err.message);
    }
  };

  // Post Live Comment
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
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Spinner size="lg" />
        <p className="text-sm font-medium">Kutaa Live Studio fe'aa jira...</p>
      </div>
    );
  }

  const isLive = meeting?.status === 'LIVE';
  const isEnded = meeting?.status === 'ENDED';

  return (
    <div className="space-y-6 text-slate-900 pb-16 sm:pb-0">
      {/* Top Banner & Status Controls */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Badge
              variant={isLive ? 'danger' : isEnded ? 'muted' : 'gold'}
              size="sm"
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 inline-block ${isLive ? 'bg-red-500 animate-ping' : isEnded ? 'bg-slate-500' : 'bg-gold-500'}`} />
              {isLive ? 'KALLATTII (LIVE)' : isEnded ? 'XUMURAMEERA (ENDED)' : 'QOPHII IRRA (SCHEDULED)'}
            </Badge>
            <span className="text-xs text-slate-500">
              Host: <strong className="text-royal font-bold">{meeting?.host?.fullName || 'Super Admin'}</strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-royal">
            {meeting?.title}
          </h1>
          <p className="text-xs text-slate-600">
            {meeting?.description || 'Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii Live Studio'}
          </p>
        </div>

        {/* Action Controls for Host / Member */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Copy Meeting Link */}
          <Button
            variant="secondary"
            size="sm"
            icon={copiedLink ? Check : Copy}
            onClick={handleCopyLink}
          >
            <span>{copiedLink ? 'Waraabameera! (Copied)' : 'Waraabi Link'}</span>
          </Button>

          {/* Super Admin Start/End Buttons */}
          {isSuperAdmin && (
            <>
              {!isLive ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={Play}
                  onClick={handleStartLive}
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

      {/* Error Banner */}
      {errorMsg && (
        <Toast variant="error" message={errorMsg} onClose={() => setErrorMsg('')} />
      )}

      {/* Force Mute Banner Alert for Members */}
      {isForceMuted && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2.5 shadow-sm">
          <VolumeX className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Hooggansaan sagaleen keessan cufameera (You have been force-muted by Host).</span>
        </div>
      )}

      {/* Main Studio Grid: Video Stream + Interactive Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Column: Video Screen Area (2 cols) */}
        <div className="lg:col-span-2 space-y-4 min-w-0 overflow-hidden">
          {/* Permission Prompt Banner */}
          {permissionError && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-gold-500/10 text-royal mt-0.5 flex-shrink-0 border border-gold-400">
                    <AlertCircle className="w-5 h-5 text-gold-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-royal">{permissionError.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{permissionError.message}</p>
                    {permissionError.instruction && (
                      <p className="text-xs text-royal font-medium bg-royal-tint p-2.5 rounded-xl border border-slate-200 mt-1">
                        💡 {permissionError.instruction}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPermissionError(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors"
                  title="Cufi (Dismiss)"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center space-x-2 pt-1 pl-10">
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => startMediaStream(true, true)}
                >
                  <span>Irra Deebi'i Yaali</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPermissionError(null)}
                >
                  <span>Dhiisi</span>
                </Button>
              </div>
            </div>
          )}

          <div data-tour="live-video-screen" className="relative aspect-video w-full max-h-[72vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center group">
            {/* MAIN VIDEO STAGE (Host stream or Host avatar) */}
            {isHost ? (
              /* HOST VIEW */
              isCameraOn && localStream ? (
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                      el.srcObject = localStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                /* Host Avatar Tile when Camera Off */
                <div className="flex flex-col items-center justify-center space-y-3 p-8">
                  <Avatar user={user} size="2xl" className="shadow-2xl" />
                  <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700">
                    <VideoOff className="w-4 h-4 text-red-400" />
                    <span>{user?.fullName || 'Host'} (Kaameeraan Cufameera)</span>
                  </div>
                </div>
              )
            ) : (
              /* VIEWER VIEW */
              isLive && isHostBroadcasting && remoteStream ? (
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                      el.srcObject = remoteStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={remoteAudioMuted}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Host Avatar Tile when Host is not broadcasting or camera is off */
                <div className="flex flex-col items-center justify-center space-y-3 p-8">
                  <Avatar user={meeting?.host} size="2xl" className="shadow-2xl" />
                  <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700">
                    <VideoOff className="w-4 h-4 text-red-400" />
                    <span>{meeting?.host?.fullName || 'Host'} (Camera Off)</span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm text-center">
                    {isLive
                      ? 'Tajaajilli kallattii eegalameera. Tamsaasa qulqulluu Hooggansaa eegaa jira...'
                      : isEnded
                      ? 'Sagantaan xumurameera (Live session ended).'
                      : 'Sagantaan kallattii ammaaf hin jalqabamne (Live session scheduled).'}
                  </p>
                </div>
              )
            )}

            {/* Corner Indicators on Main Stage */}
            <div className="absolute top-4 left-4 flex items-center space-x-2 z-20">
              <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-[11px] font-black text-white shadow-md flex items-center gap-1.5 backdrop-blur-md">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`} />
                <span>{isLive ? 'LIVE ON AIR' : 'STUDIO READY'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-semibold text-slate-300 backdrop-blur-md">
                👥 {meeting?.allowedParticipants?.length || 1} Hirmaattota
              </span>
            </div>

            {/* Stage Person's Name and Status in Top-Right Corner */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-white z-20 shadow-md">
              <span className="font-bold truncate max-w-[130px]">
                {isHost ? user?.fullName || 'Host' : meeting?.host?.fullName || 'Host'}
              </span>
              <span className="text-[10px] text-gold-400 font-semibold uppercase">
                (Host)
              </span>
              {isHost ? (
                <>
                  {isMicOn && !isForceMuted ? (
                    <Mic className="w-3.5 h-3.5 text-gold-400" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                  {isCameraOn ? (
                    <Video className="w-3.5 h-3.5 text-gold-400" />
                  ) : (
                    <VideoOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                </>
              ) : (
                <>
                  {remoteAudioMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-gold-400" />
                  )}
                </>
              )}
            </div>

            {/* PARTICIPANT TILE (For Viewers/Participants) */}
            {!isHost && (
              <div className="absolute bottom-16 sm:bottom-20 right-4 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-gold-400 shadow-2xl bg-slate-950 group/tile z-20">
                {isCameraOn && localStream ? (
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                        el.srcObject = localStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                ) : (
                  /* Participant Avatar Tile when Camera Off */
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-slate-950 space-y-1">
                    <Avatar user={user} size="sm" className="shadow-md" />
                    <div className="flex items-center space-x-1 text-[10px] text-slate-300 font-bold truncate max-w-[120px]">
                      <VideoOff className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">{user?.fullName || 'Ati'}</span>
                    </div>
                  </div>
                )}

                {/* Participant Corner Name & Status */}
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold text-white flex items-center gap-1.5 shadow">
                  <span className="truncate max-w-[70px]">{user?.fullName || 'Ati'}</span>
                  {isMicOn && !isForceMuted ? (
                    <Mic className="w-2.5 h-2.5 text-gold-400" />
                  ) : (
                    <MicOff className="w-2.5 h-2.5 text-red-400" />
                  )}
                  {isCameraOn && !isVideoForcedOff ? (
                    <Video className="w-2.5 h-2.5 text-gold-400" />
                  ) : (
                    <VideoOff className="w-2.5 h-2.5 text-red-400" />
                  )}
                </div>

                {/* Participant Tile Controls on hover / always visible on mobile */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover/tile:opacity-100 transition-opacity bg-slate-900/95 px-2 py-1 rounded-xl border border-slate-700/80 shadow-lg">
                  <button
                    onClick={() => toggleMic()}
                    disabled={(!isAdmitted && !isHost) || isForceMuted}
                    title={
                      !isAdmitted && !isHost
                        ? 'Walgahiin eeggamaa jira (Waiting for admission)'
                        : isForceMuted
                        ? 'Muted by host'
                        : isMicOn
                        ? 'Cufi Maayikii'
                        : 'Bani Maayikii'
                    }
                    aria-label="Toggle Participant Mic"
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      (!isAdmitted && !isHost) || isForceMuted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        : isMicOn
                        ? 'bg-gold-500 text-royal'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {isMicOn && !isForceMuted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  </button>

                  <button
                    onClick={() => toggleCamera()}
                    disabled={(!isAdmitted && !isHost) || isVideoForcedOff}
                    title={
                      !isAdmitted && !isHost
                        ? 'Walgahiin eeggamaa jira (Waiting for admission)'
                        : isVideoForcedOff
                        ? 'Camera turned off by host'
                        : isCameraOn
                        ? 'Cufi Kaameeraa'
                        : 'Bani Kaameeraa'
                    }
                    aria-label="Toggle Participant Camera"
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      (!isAdmitted && !isHost) || isVideoForcedOff
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        : isCameraOn
                        ? 'bg-gold-500 text-royal'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {isCameraOn && !isVideoForcedOff ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            {/* CONTROL BAR AT BOTTOM OF VIDEO TILE (Shown on hover, always visible on mobile) */}
            {/* [Mic on/off] [Camera on/off] [Speaker mute] - Small round buttons, gold when active, red when off */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-3 px-5 py-2.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl backdrop-blur-md shadow-2xl z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
              {/* Mic On/Off */}
              <button
                data-tour="live-mic-btn"
                onClick={() => toggleMic()}
                disabled={(!isAdmitted && !isHost) || isForceMuted}
                title={
                  !isAdmitted && !isHost
                    ? 'Walgahiin eeggamaa jira (Waiting for host to admit you)'
                    : isForceMuted
                    ? 'Hooggansi sagalee cufeera (Muted by host)'
                    : isMicOn
                    ? 'Cufi Maayikii (Turn off Mic)'
                    : 'Bani Maayikii (Turn on Mic)'
                }
                aria-label="Toggle Microphone"
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${
                  (!isAdmitted && !isHost) || isForceMuted
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : isMicOn
                    ? 'bg-gold-500 hover:bg-gold-600 text-royal font-black'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {isMicOn && !isForceMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* Camera On/Off */}
              <button
                data-tour="live-camera-btn"
                onClick={() => toggleCamera()}
                disabled={(!isAdmitted && !isHost) || isVideoForcedOff}
                title={
                  !isAdmitted && !isHost
                    ? 'Walgahiin eeggamaa jira (Waiting for host to admit you)'
                    : isVideoForcedOff
                    ? 'Hooggansi kaameeraa cufeera (Camera turned off by host)'
                    : isCameraOn
                    ? 'Cufi Kaameeraa (Turn off Camera)'
                    : 'Bani Kaameeraa (Turn on Camera)'
                }
                aria-label="Toggle Camera"
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${
                  (!isAdmitted && !isHost) || isVideoForcedOff
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : isCameraOn
                    ? 'bg-gold-500 hover:bg-gold-600 text-royal font-black'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {isCameraOn && !isVideoForcedOff ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>

              {/* Speaker Mute / Unmute */}
              <button
                onClick={() => {
                  const next = !remoteAudioMuted;
                  setRemoteAudioMuted(next);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.muted = next;
                  }
                }}
                title={remoteAudioMuted ? 'Sagalee Bani (Unmute Speaker)' : 'Sagalee Cufi (Mute Speaker)'}
                aria-label="Toggle Speaker Mute"
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md ${
                  remoteAudioMuted
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-gold-500 hover:bg-gold-600 text-royal font-black'
                }`}
              >
                {remoteAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Member Waiting Room Lobby Screen if not admitted */}
          {!isAdmitted && !isSuperAdmin && (
            <Card className="p-6 border border-slate-200 shadow-md space-y-4 text-center bg-white">
              <div className="w-12 h-12 rounded-xl bg-royal-tint border border-slate-200 flex items-center justify-center text-gold-500 mx-auto">
                <Clock className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-black text-royal">
                  {joinRequested
                    ? 'Kutaa Eeggannaa (Waiting Room): Eegaa jira...'
                    : 'Tajaajila Kallattiitti Dabalamaa'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                  {joinRequested
                    ? "Gaaffiin keessan Hooggansaan ilaallamaa jira. Akkuma mirkanaa'een kallattiin seentu."
                    : "Sagantaa Live irratti hirmaachuuf hayyama Hooggansaa argachuuf qabduu gadii cuqaasaa."}
                </p>
              </div>

              {!joinRequested ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRequestJoin}
                  className="mx-auto"
                >
                  Hirmaachuuf Gaafadhu (Request to Join)
                </Button>
              ) : (
                <div className="inline-block px-4 py-1.5 rounded-xl bg-royal-tint border border-slate-200 text-royal text-xs font-bold">
                  ✓ Gaaffiin keessan ergameera
                </div>
              )}
            </Card>
          )}

          {/* Live Reactions Bar */}
          <Card className="p-4 flex items-center justify-between shadow-sm border border-slate-200 bg-white">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-gold-500" />
              <span>Miira Keessan Ibsaa (Live Reactions):</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  userLiked
                    ? 'bg-gold-500 text-royal border-gold-500 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{likesCount}</span>
              </button>

              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  userDisliked
                    ? 'bg-red-600 text-white border-red-500 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{dislikesCount}</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Super Admin Controls or Live Comment Stream (1 col) */}
        <div data-tour="live-chat-panel" className="space-y-6 min-w-0">
          {/* SUPER ADMIN CONTROL PANELS */}
          {isSuperAdmin && (
            <Card className="p-5 shadow-sm space-y-6 border border-slate-200 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-royal flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-gold-500" />
                  <span>To'annoo Hooggansaa (Host Studio)</span>
                </span>
                <button
                  onClick={handleMuteAll}
                  className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-bold flex items-center gap-1 transition-all"
                  title="Hunda Cufi"
                  aria-label="Mute All (Hunda Cufi)"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Mute All (Hunda Cufi)</span>
                </button>
              </div>

              {/* Waiting Room Queue */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Kutaa Eeggannaa (Waiting Room)</span>
                  <Badge variant="gold" size="sm">
                    {meeting?.waitingRoom?.length || 0} Gaaffii
                  </Badge>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {meeting?.waitingRoom?.length === 0 ? (
                    <div className="text-[11px] text-slate-500 py-3 text-center">
                      Namni eegaa jiru hin jiru.
                    </div>
                  ) : (
                    meeting?.waitingRoom?.map((w) => (
                      <div
                        key={w._id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-900 block truncate">{w.fullName}</span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            ⛪ {w.originChurch} | 📍 {w.address?.city}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleAdmitAction(w._id, 'accept')}
                            className="p-1.5 rounded-lg bg-royal hover:bg-royal-dark text-white border border-royal transition-colors"
                            title="Accept (Hayyami)"
                            aria-label="Accept (Hayyami)"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdmitAction(w._id, 'reject')}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors"
                            title="Reject (Dhowwi)"
                            aria-label="Reject (Dhowwi)"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Admitted Participants Table */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Hirmaattota Admitted ({meeting?.allowedParticipants?.length || 0})</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {meeting?.allowedParticipants?.map((p) => {
                    const isMuted = meeting?.mutedUsers?.some(
                      (m) => (m._id || m).toString() === (p._id || p).toString()
                    );
                    const isHost = (p._id || p).toString() === meeting?.host?._id?.toString();

                    return (
                      <div
                        key={p._id || p}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-900 block truncate">
                            {p.fullName || 'Member'} {isHost && '(Host)'}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {p.role} | ⛪ {p.originChurch}
                          </span>
                        </div>

                        {!isHost && (
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {/* Stop/Allow Video */}
                            <button
                              onClick={() => {
                                const isVideoOff = meeting?.videoOffUsers?.some(
                                  (v) => (v._id || v).toString() === (p._id || p).toString()
                                );
                                handleVideoOffToggle(p._id || p, !isVideoOff);
                              }}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                meeting?.videoOffUsers?.some((v) => (v._id || v).toString() === (p._id || p).toString())
                                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={
                                meeting?.videoOffUsers?.some((v) => (v._id || v).toString() === (p._id || p).toString())
                                  ? 'Allow Video (Bani Kaameeraa)'
                                  : 'Stop Video (Cufi Kaameeraa)'
                              }
                              aria-label="Toggle Participant Video"
                            >
                              {meeting?.videoOffUsers?.some((v) => (v._id || v).toString() === (p._id || p).toString()) ? (
                                <VideoOff className="w-3.5 h-3.5" />
                              ) : (
                                <Video className="w-3.5 h-3.5 text-royal" />
                              )}
                            </button>

                            {/* Mute/Unmute */}
                            <button
                              onClick={() => handleMuteToggle(p._id || p, !isMuted)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                isMuted
                                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                              title={isMuted ? 'Unmute' : 'Mute'}
                              aria-label={isMuted ? 'Unmute participant' : 'Mute participant'}
                            >
                              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-royal" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* REAL-TIME LIVE COMMENT BOX */}
          <Card className="p-5 shadow-sm border border-slate-200 flex flex-col h-[460px] bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs font-black text-royal">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-gold-500" />
                <span>Yaada Kallattii (Live Comments)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {comments.length} Yaada
              </span>
            </div>

            {/* Comments Scrollable Stream */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs custom-scrollbar">
              {comments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Yaadni ammaaf hin jiru. Kan duraa barreessaa!
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div key={c._id || idx} className="p-3 rounded-xl bg-royal-tint/60 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">{c.fullName}</span>
                      <span
                        className="text-[9px] text-slate-500 cursor-help"
                        title={formatDual(c.createdAt, { includeTime: true })}
                      >
                        {formatTime(c.createdAt)}
                      </span>
                    </div>
                    {c.originChurch && (
                      <span className="text-[10px] text-royal font-medium block">
                        ⛪ {c.originChurch}
                      </span>
                    )}
                    <p className="text-slate-800 leading-snug pt-0.5 whitespace-pre-wrap">
                      {c.text}
                    </p>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Composition Input */}
            <form onSubmit={handleSendComment} className="pt-3 border-t border-slate-200 flex items-center space-x-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Yaada keessan asitti barreessaa..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal/30"
              />
              <button
                type="submit"
                disabled={isSendingComment || !commentInput.trim()}
                aria-label="Ergi (Send comment)"
                className="p-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 active:scale-95 disabled:opacity-50 text-royal font-black transition-all shadow-md"
              >
                <Send className="w-4 h-4 text-royal" />
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveMeetingStudio;
