import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  AlertCircle,
  RefreshCw,
  Camera,
  Play,
  X
} from 'lucide-react';
import { Button, Modal, Spinner } from '../../../components/ui';

/**
 * DevicePreviewModal
 * Host Pre-Join Screen:
 * - Requests camera & mic
 * - Displays live preview
 * - Device selectors (Camera, Mic, Speaker)
 * - "Join with camera off" option
 * - Clear instructions if permission is denied or device not found
 */
const DevicePreviewModal = ({
  isOpen,
  onClose,
  onStartBroadcast,
  isStarting = false
}) => {
  const videoPreviewRef = useRef(null);
  const streamRef = useRef(null);

  // Device lists
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);

  // Selected device IDs
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('');
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState('');

  // Toggles
  const [joinWithCameraOff, setJoinWithCameraOff] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  // Loading & Permission Error states
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [permissionError, setPermissionError] = useState(null);

  // Enumerate devices helper
  const updateDeviceList = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vInputs = devices.filter((d) => d.kind === 'videoinput');
      const aInputs = devices.filter((d) => d.kind === 'audioinput');
      const aOutputs = devices.filter((d) => d.kind === 'audiooutput');

      setVideoDevices(vInputs);
      setAudioInputDevices(aInputs);
      setAudioOutputDevices(aOutputs);

      if (vInputs.length > 0 && !selectedVideoId) {
        setSelectedVideoId(vInputs[0].deviceId);
      }
      if (aInputs.length > 0 && !selectedAudioInputId) {
        setSelectedAudioInputId(aInputs[0].deviceId);
      }
      if (aOutputs.length > 0 && !selectedAudioOutputId) {
        setSelectedAudioOutputId(aOutputs[0].deviceId);
      }
    } catch (err) {
      console.warn('[DevicePreview] enumerateDevices warning:', err);
    }
  };

  // Start preview stream
  const startPreview = async (wantVideo = !joinWithCameraOff, wantAudio = !micMuted) => {
    setIsLoadingMedia(true);
    setPermissionError(null);

    // Stop existing preview stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError({
        type: 'unsupported',
        title: 'Browser Not Supported',
        message: 'Browser keessan kaameeraa fi maayikii hin deeggaru (Media devices not supported).',
        instruction: 'Maaloo browser haaraa kan akka Google Chrome, Edge ykn Safari fayyadamaa.'
      });
      setIsLoadingMedia(false);
      return;
    }

    try {
      const constraints = {
        video: wantVideo
          ? selectedVideoId
            ? { deviceId: { exact: selectedVideoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
        audio: wantAudio
          ? selectedAudioInputId
            ? { deviceId: { exact: selectedAudioInputId }, echoCancellation: true, noiseSuppression: true }
            : { echoCancellation: true, noiseSuppression: true }
          : false
      };

      // If user wants camera off and mic off in preview, request at least audio to verify permissions
      if (!constraints.video && !constraints.audio) {
        constraints.audio = true;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Mute audio track locally if user checked mic muted
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micMuted;
      }

      // If camera off, disable video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !joinWithCameraOff;
      }

      if (videoPreviewRef.current && stream) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      await updateDeviceList();
    } catch (err) {
      console.error('[DevicePreview] getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError({
          type: 'denied',
          title: 'Hayyama Kaameeraa fi Maayikii (Permission Denied)',
          message: 'Browser keessan kaameeraa fi maayikii akka fayyadamuuf hayyama hin kennine.',
          instruction: 'Maaloo sarara teessoo browser keessanii (URL bar) irratti mallattoo qulfii (🔒) ykn kaameeraa cuqaasaati "Allow" filadhaa, achiis "Irra Deebi\'i Yaali" cuqaasaa (Click the lock icon in your address bar and set Camera/Mic to Allow, then click Try Again).'
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError({
          type: 'not_found',
          title: 'Meeshaan Hin Argamne (Device Not Found)',
          message: 'Kaameeraan ykn Maayikroofooniin meeshaa keessan irratti hin argamne.',
          instruction: 'Maaloo kaameeraa ykn maayikii kompiitara/moobaayila keessanitti qabsiisaatii irra deebi\'aa yaalaa.'
        });
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionError({
          type: 'in_use',
          title: 'Kaameeraan Hojii Irra Jira (Device in Use)',
          message: 'Kaameeraan ykn Maayikiin appilikeeshinii biraatiin qabameera.',
          instruction: 'Appilikeeshinoota kanneen akka Zoom, Teams, Skype ykn taboota browser biroo cufaatii irra deebi\'aa yaalaa.'
        });
      } else {
        setPermissionError({
          type: 'generic',
          title: 'Dogongora Meeshaa (Hardware Error)',
          message: err.message || 'Kaameeraa ykn maayikii banuu hin dandeenye.',
          instruction: 'Browser haaromsaatii irra deebi\'aa yaalaa.'
        });
      }
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Trigger preview on modal open
  useEffect(() => {
    if (isOpen) {
      startPreview();
    } else {
      // Clean up stream on modal close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle device change
  const handleDeviceChange = () => {
    startPreview(!joinWithCameraOff, !micMuted);
  };

  // Toggle Join With Camera Off
  const handleToggleCameraOff = (checked) => {
    setJoinWithCameraOff(checked);
    if (streamRef.current) {
      const vTrack = streamRef.current.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !checked;
      }
    }
  };

  // Toggle Mic Mute
  const handleToggleMicMute = (checked) => {
    setMicMuted(checked);
    if (streamRef.current) {
      const aTrack = streamRef.current.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !checked;
      }
    }
  };

  // Start broadcast confirmed
  const handleConfirmStart = () => {
    onStartBroadcast({
      joinWithCameraOff,
      micMuted,
      selectedVideoId,
      selectedAudioInputId,
      selectedAudioOutputId,
      previewStream: streamRef.current
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-royal-tint/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold-500 text-royal flex items-center justify-center font-black shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-royal">
                Qophii Tamsaasa Kallattii (Live Broadcast Setup)
              </h3>
              <p className="text-xs text-slate-500">
                Kaameeraa fi maayikii keessan qulqulleeffadhaa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* PERMISSION ERROR ALERT */}
          {permissionError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5 animate-in slide-in-from-top-2">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black">{permissionError.title}</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">{permissionError.message}</p>
                  {permissionError.instruction && (
                    <div className="text-xs bg-white/80 p-2.5 rounded-xl border border-amber-200 font-medium text-amber-900">
                      💡 {permissionError.instruction}
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-1 flex items-center gap-2 pl-8">
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => startPreview()}
                >
                  <span>Irra Deebi'i Yaali (Try Again)</span>
                </Button>
              </div>
            </div>
          )}

          {/* VIDEO PREVIEW SCREEN */}
          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
            {isLoadingMedia ? (
              <div className="flex flex-col items-center space-y-2 text-slate-400">
                <Spinner size="md" />
                <span className="text-xs font-medium">Kaameeraa qopheessaa jira...</span>
              </div>
            ) : !joinWithCameraOff && !permissionError ? (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center space-y-2 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-red-400" />
                </div>
                <span className="text-xs font-bold text-slate-300">
                  {joinWithCameraOff ? 'Kaameeraan cufameera (Camera Off)' : 'Kaameeraan hin banamne'}
                </span>
              </div>
            )}

            {/* Quick Preview Overlays */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-[11px] font-bold text-white flex items-center gap-1.5 shadow">
                {micMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-gold-400" />
                )}
                <span>{micMuted ? 'Sagalee Cufaa' : 'Sagalee Banaa'}</span>
              </span>
            </div>
          </div>

          {/* QUICK JOIN TOGGLE OPTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Join with Camera Off */}
            <label className="flex items-center space-x-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white shadow-sm">
              <input
                type="checkbox"
                checked={joinWithCameraOff}
                onChange={(e) => handleToggleCameraOff(e.target.checked)}
                className="w-4 h-4 text-royal rounded border-slate-300 focus:ring-royal"
              />
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <VideoOff className="w-4 h-4 text-slate-500" />
                <span>Join with camera off (Kaameeraa cufi)</span>
              </div>
            </label>

            {/* Join Muted */}
            <label className="flex items-center space-x-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white shadow-sm">
              <input
                type="checkbox"
                checked={micMuted}
                onChange={(e) => handleToggleMicMute(e.target.checked)}
                className="w-4 h-4 text-royal rounded border-slate-300 focus:ring-royal"
              />
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <MicOff className="w-4 h-4 text-slate-500" />
                <span>Join with mic muted (Maayikii cufi)</span>
              </div>
            </label>
          </div>

          {/* HARDWARE DEVICE SELECTORS */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-royal">
              Filannoo Meeshaalee (Hardware Devices)
            </h4>

            {/* Camera Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-royal" />
                <span>Kaameeraa (Camera)</span>
              </label>
              <select
                value={selectedVideoId}
                onChange={(e) => {
                  setSelectedVideoId(e.target.value);
                  setTimeout(handleDeviceChange, 100);
                }}
                disabled={videoDevices.length === 0}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-royal"
              >
                {videoDevices.length === 0 ? (
                  <option value="">Kaameeraan hin argamne (No camera detected)</option>
                ) : (
                  videoDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Microphone Select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-royal" />
                <span>Maayikroofoonii (Microphone)</span>
              </label>
              <select
                value={selectedAudioInputId}
                onChange={(e) => {
                  setSelectedAudioInputId(e.target.value);
                  setTimeout(handleDeviceChange, 100);
                }}
                disabled={audioInputDevices.length === 0}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-royal"
              >
                {audioInputDevices.length === 0 ? (
                  <option value="">Maayikii hin argamne (No microphone detected)</option>
                ) : (
                  audioInputDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Speaker Select (if supported) */}
            {audioOutputDevices.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-royal" />
                  <span>Ispikerii (Speaker / Audio Output)</span>
                </label>
                <select
                  value={selectedAudioOutputId}
                  onChange={(e) => setSelectedAudioOutputId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-royal"
                >
                  {audioOutputDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Speaker ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-end space-x-3 bg-slate-50">
          <Button variant="ghost" size="md" onClick={onClose}>
            <span>Dhiisi (Cancel)</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Play}
            loading={isStarting}
            onClick={handleConfirmStart}
          >
            <span>Start Live Broadcast</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DevicePreviewModal;
