import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import {
  Send,
  Lock,
  Shield,
  Church,
  Radio,
  Users,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Spinner, EmptyState, Badge, Button, Avatar } from './ui';
import { formatDateTime, formatTime, formatDual } from '../utils/dateFormat';

const EXEC_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY'];

const roleBadgeVariants = {
  SUPER_ADMIN: 'solid-gold',
  ADMIN: 'gold',
  COLLECTOR: 'gold',
  HR: 'gold',
  SECRETARY: 'gold',
  MEMBER: 'muted'
};

const MessagingCenter = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [activeTab, setActiveTab] = useState(
    EXEC_ROLES.includes(user?.role) ? 'exec' : 'broadcast'
  );

  // Messages states
  const [execMessages, setExecMessages] = useState([]);
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Input states
  const [execInput, setExecInput] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial message history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingMessages(true);
      try {
        if (EXEC_ROLES.includes(user?.role)) {
          const execRes = await api.get('/messages/exec-5');
          if (execRes.data?.success) {
            setExecMessages(execRes.data.messages || []);
          }
        }

        const bcastRes = await api.get('/messages/broadcast');
        if (bcastRes.data?.success) {
          setBroadcastMessages(bcastRes.data.messages || []);
        }
      } catch (err) {
        console.warn('[MessagingCenter] History fetch error:', err.message);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchHistory();
  }, [user?.role]);

  // Real-time socket message listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewExecMsg = (newMsg) => {
      setExecMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    };

    const handleNewBroadcastMsg = (newMsg) => {
      setBroadcastMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    };

    socket.on('new_exec_message', handleNewExecMsg);
    socket.on('new_broadcast_message', handleNewBroadcastMsg);

    return () => {
      socket.off('new_exec_message', handleNewExecMsg);
      socket.off('new_broadcast_message', handleNewBroadcastMsg);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [execMessages, broadcastMessages, activeTab]);

  // Send message in 5-Actors Executive room
  const handleSendExec = async (e) => {
    e?.preventDefault();
    if (!execInput.trim() || isSending) return;

    const content = execInput.trim();
    setExecInput('');
    setIsSending(true);

    try {
      if (socket && socket.connected) {
        socket.emit('send_exec_message', { content }, (ack) => {
          if (!ack?.success) {
            api.post('/messages', { content, channel: 'EXEC_5_ACTORS' });
          }
        });
      } else {
        const res = await api.post('/messages', { content, channel: 'EXEC_5_ACTORS' });
        if (res.data?.success) {
          setExecMessages((prev) => [...prev, res.data.message]);
        }
      }
    } catch (err) {
      console.error('[handleSendExec Error]:', err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Send message in General Broadcast room
  const handleSendBroadcast = async (e) => {
    e?.preventDefault();
    if (!broadcastInput.trim() || isSending) return;

    const content = broadcastInput.trim();
    setBroadcastInput('');
    setIsSending(true);

    try {
      if (socket && socket.connected) {
        socket.emit('send_broadcast_message', { content }, (ack) => {
          if (!ack?.success) {
            api.post('/messages', { content, channel: 'BROADCAST' });
          }
        });
      } else {
        const res = await api.post('/messages', { content, channel: 'BROADCAST' });
        if (res.data?.success) {
          setBroadcastMessages((prev) => [...prev, res.data.message]);
        }
      }
    } catch (err) {
      console.error('[handleSendBroadcast Error]:', err.message);
    } finally {
      setIsSending(false);
    }
  };

  const isExecutive = EXEC_ROLES.includes(user?.role);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[calc(100dvh-180px)] min-h-[480px] max-h-[750px]">
      {/* Header Tabs */}
      <div className="bg-royal text-white border-b border-royal-dark px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-royal-tint/20 border border-gold-400 flex items-center justify-center text-gold-300 shadow-sm shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Wiirtuu Ergaa & Marii Waldichaa</span>
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
            </h2>
            <p className="text-xs text-gold-200 font-medium">
              Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
            </p>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex w-full sm:w-auto items-center space-x-1 sm:space-x-2 bg-royal-dark/80 p-1 rounded-xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('exec')}
            className={`flex-1 sm:flex-none justify-center flex items-center space-x-1.5 sm:space-x-2 px-3 py-2 min-h-[44px] rounded-lg transition-all ${
              activeTab === 'exec'
                ? 'bg-gold-500 text-royal font-black shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ergaa Hooggansaa</span>
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 sm:flex-none justify-center flex items-center space-x-1.5 sm:space-x-2 px-3 py-2 min-h-[44px] rounded-lg transition-all ${
              activeTab === 'broadcast'
                ? 'bg-gold-500 text-royal font-black shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Beeksisoota (Broadcast)</span>
          </button>
        </div>
      </div>

      {/* Main Tab View */}
      {activeTab === 'exec' ? (
        /* TAB 1: 5-Actors Executive Chat */
        !isExecutive ? (
          /* Locked State for Non-Executive Members */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white">
            <div className="w-16 h-16 rounded-2xl bg-royal-tint border border-slate-200 flex items-center justify-center text-gold-500 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-royal">
              Kutaan Kun Qofa Hooggansa Waldichaatiif Kan Daangeffameedha
            </h3>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Marii fi murteewwan icciitii gaggeessuuf gaheen keessan tokko ta'uu qaba:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {EXEC_ROLES.map((role) => (
                <Badge
                  key={role}
                  variant={roleBadgeVariants[role] || 'gold'}
                  size="md"
                >
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          /* Active Executive Chat Screen */
          <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
            {/* Executive Participants Bar */}
            <div className="bg-royal-tint border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-royal font-bold">
                <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                <span>Kora Hooggansaa (Super Admin, Admin, Collector, HR, Secretary)</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Socket Room: exec_5_actors_room</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
              {loadingMessages ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-2">
                  <Spinner size="md" />
                  <p className="text-xs text-slate-500">Ergaawwan fe'amaa jiru...</p>
                </div>
              ) : execMessages.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={MessageSquare}
                    title="Ergaan hooggansaa ammaaf hin jiru"
                    description="Jalqabaa barreessaa!"
                  />
                </div>
              ) : (
                execMessages.map((msg) => {
                  const isSelf = msg.sender?._id?.toString() === user?._id?.toString();
                  const roleVariant = roleBadgeVariants[msg.sender?.role] || 'muted';

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Sender Metadata Header */}
                      <div className="flex items-center space-x-2 text-[11px]">
                        <Avatar user={msg.sender} size="xs" />
                        <span className="font-bold text-slate-900">
                          {isSelf ? 'Ati (You)' : msg.sender?.fullName}
                        </span>
                        <Badge variant={roleVariant} size="sm">
                          {msg.sender?.role}
                        </Badge>
                        {msg.sender?.originChurch && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <Church className="w-2.5 h-2.5 text-gold-500" />
                            <span>{msg.sender?.originChurch}</span>
                          </span>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-xl p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isSelf
                            ? 'bg-royal text-white font-medium rounded-tr-none'
                            : 'bg-royal-tint border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Timestamp */}
                      <span
                        className="text-[9px] text-slate-500 px-1 cursor-help"
                        title={formatDual(msg.createdAt, { includeTime: true })}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={handleSendExec}
              className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center space-x-2 sm:space-x-3"
            >
              <input
                type="text"
                value={execInput}
                onChange={(e) => setExecInput(e.target.value)}
                placeholder="Ergaa hooggansaa icciitii asitti barreessaa..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal/30 text-[16px] sm:text-sm min-h-[44px]"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isSending || !execInput.trim()}
                icon={Send}
                size="md"
              >
                <span>Ergi</span>
              </Button>
            </form>
          </div>
        )
      ) : (
        /* TAB 2: General Broadcast & Announcements for all members */
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
          <div className="bg-royal-tint border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-royal font-bold">
              <Radio className="w-3.5 h-3.5 text-gold-500" />
              <span>Beeksisoota fi Dhaamsa Waliigalaa Amantoota Hundaaf</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Amantoota Hundumaaf Kan Qophaa'e
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {broadcastMessages.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Radio}
                  title="Beeksisni waliigalaa ammaaf hin jiru"
                  description="Dhaamsa ykn beeksisa haaraa asitti hordofaa."
                />
              </div>
            ) : (
              broadcastMessages.map((msg) => {
                const roleVariant = roleBadgeVariants[msg.sender?.role] || 'muted';

                return (
                  <div key={msg._id} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <Avatar user={msg.sender} size="sm" />
                        <span className="font-bold text-slate-900 text-xs">
                          {msg.sender?.fullName}
                        </span>
                        <Badge variant={roleVariant} size="sm">
                          {msg.sender?.role}
                        </Badge>
                        {msg.sender?.originChurch && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Church className="w-2.5 h-2.5 text-gold-500" />
                            <span>{msg.sender?.originChurch}</span>
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[10px] text-slate-500 cursor-help"
                        title={formatDual(msg.createdAt, { includeTime: true })}
                      >
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed pl-1 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Broadcast Composer (Available to Executive Roles) */}
          {isExecutive ? (
            <form
              onSubmit={handleSendBroadcast}
              className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center space-x-2 sm:space-x-3"
            >
              <input
                type="text"
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                placeholder="Dhaamsa ykn beeksisa amantoota hundaaf dabarsaa..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 sm:px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-royal focus:ring-1 focus:ring-royal/30 text-[16px] sm:text-sm min-h-[44px]"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isSending || !broadcastInput.trim()}
                icon={Send}
                size="md"
              >
                <span>Maxxansi</span>
              </Button>
            </form>
          ) : (
            <div className="p-3 bg-royal-tint border-t border-slate-200 text-center text-xs text-slate-600 font-medium">
              Maxxansa haaraa beeksisuun mirga hooggansaa qofa.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessagingCenter;