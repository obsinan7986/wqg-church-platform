import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useDateSettings } from '../../context/DateSettingsContext';
import {
  Inbox,
  Mail,
  Phone,
  MessageSquare,
  Search,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  ArrowLeft,
  User,
  Filter,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { Card, Button, Badge, Spinner, EmptyState } from '../../components/ui';

const statusBadgeColors = {
  NEW: 'bg-red-100 text-red-800 border-red-300',
  READ: 'bg-blue-100 text-blue-800 border-blue-300',
  DONE: 'bg-emerald-100 text-emerald-800 border-emerald-300'
};

const ContactInbox = ({ onCountChange }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { socket } = useSocket();
  const { formatDual, formatRelative } = useDateSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeIdParam = searchParams.get('id');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/contact', {
        params: {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          limit: 100
        }
      });
      if (res.data?.success && Array.isArray(res.data.messages)) {
        setMessages(res.data.messages);
        if (typeof res.data.unreadCount === 'number' && onCountChange) {
          onCountChange(res.data.unreadCount);
        }
      }
    } catch (err) {
      console.error('[ContactInbox fetch error]:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, onCountChange]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time listener for incoming contact messages
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => {
      fetchMessages();
    };

    socket.on('new_contact_message', handleNewMessage);
    socket.on('content_updated', handleNewMessage);

    return () => {
      socket.off('new_contact_message', handleNewMessage);
      socket.off('content_updated', handleNewMessage);
    };
  }, [socket, fetchMessages]);

  // Sync selected message with activeIdParam or fallback
  useEffect(() => {
    if (activeIdParam && messages.length > 0) {
      const found = messages.find((m) => m._id === activeIdParam);
      if (found) {
        setSelectedMessage(found);
        // If message is new, mark as READ
        if (found.status === 'NEW') {
          handleUpdateStatus(found._id, 'READ', false);
        }
      }
    } else if (!selectedMessage && messages.length > 0 && window.innerWidth >= 1024) {
      // Auto-select first message on desktop if none selected
      setSelectedMessage(messages[0]);
    }
  }, [activeIdParam, messages]);

  // Update Status
  const handleUpdateStatus = async (id, newStatus, autoSelect = true) => {
    try {
      setActionLoading(true);
      const res = await api.patch(`/contact/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === id ? { ...m, status: newStatus } : m))
        );
        if (selectedMessage && selectedMessage._id === id) {
          setSelectedMessage((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('[Update status error]:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete message
  const handleDelete = async (id) => {
    if (!window.confirm('Ergaa kana haaquu barbaadduu? (Are you sure you want to delete this message?)')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.delete(`/contact/${id}`);
      if (res.data?.success) {
        setMessages((prev) => prev.filter((m) => m._id !== id));
        if (selectedMessage && selectedMessage._id === id) {
          setSelectedMessage(null);
          // Clear query param
          searchParams.delete('id');
          setSearchParams(searchParams, { replace: true });
        }
      }
    } catch (err) {
      console.error('[Delete message error]:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Select message handler
  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    searchParams.set('id', msg._id);
    setSearchParams(searchParams, { replace: true });

    if (msg.status === 'NEW') {
      handleUpdateStatus(msg._id, 'READ', false);
    }
  };

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.contact || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.message || '').toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Parse phone & email from contact string
  const parsedContact = useMemo(() => {
    if (!selectedMessage) return { email: null, phone: null, cleanPhone: null };
    const raw = selectedMessage.contact || '';
    let email = null;
    let phone = null;

    if (raw.includes('@')) {
      email = raw.trim();
    }

    // Check if contains digits for phone
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 9) {
      phone = raw.trim();
      let clean = digitsOnly;
      if (clean.startsWith('09')) clean = '251' + clean.slice(1);
      if (clean.startsWith('07')) clean = '251' + clean.slice(1);
      if (clean.startsWith('9')) clean = '251' + clean;
      return { email, phone, cleanPhone: clean };
    }

    return { email, phone, cleanPhone: null };
  }, [selectedMessage]);

  const newCount = messages.filter((m) => m.status === 'NEW').length;

  return (
    <div className="space-y-6 text-slate-900 animate-in fade-in">
      {/* ══════ HEADER ══════ */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-royal text-white flex items-center justify-center shadow-xs">
              <Inbox className="w-5 h-5 text-gold-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-royal tracking-tight">
              Ergaa Qunnamtii (Contact Inbox)
            </h1>
            {newCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white shadow-xs animate-pulse">
                {newCount} Haaraa
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Ergaawwan, gaaffiilee fi kadhannaa daawwattoonni fuula qunnamtii irraa ergan to'adhaa.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={fetchMessages} title="Haaromsi">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Haaromsi</span>
          </Button>
        </div>
      </div>

      {/* ══════ TWO-PANE INBOX CONTAINER ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT PANE: MESSAGE LIST (4 cols on xl, 5 cols on lg) ── */}
        <div
          className={`lg:col-span-5 xl:col-span-5 space-y-3 ${
            selectedMessage && 'hidden lg:block'
          }`}
        >
          {/* Controls: Search + Status Filter Pills */}
          <Card className="p-3.5 border-slate-200 bg-white space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Maqaa, qunnamtii, ergaa barbaadi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none transition-all"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              {[
                { id: 'ALL', label: 'Hundumaa' },
                { id: 'NEW', label: 'Haaraa', count: newCount },
                { id: 'READ', label: 'Dubbifame' },
                { id: 'DONE', label: 'Xumurame' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1 ${
                    statusFilter === tab.id
                      ? 'bg-royal text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  {Boolean(tab.count) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-black ml-1">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* List Items */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
              <Spinner size="md" />
              <span>Ergaawwan fe'aa jira...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card className="p-8 border-slate-200 text-center">
              <EmptyState
                icon={Inbox}
                title="Ergaan tokkollee hin jiru"
                description="Ergaan haaraan yeroo dhiyaatu asitti mul'ata."
              />
            </Card>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              {filteredMessages.map((msg) => {
                const isSelected = selectedMessage?._id === msg._id;
                const isNew = msg.status === 'NEW';

                return (
                  <div
                    key={msg._id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-1.5 ${
                      isSelected
                        ? 'bg-royal-tint border-royal shadow-sm ring-1 ring-royal/30'
                        : isNew
                        ? 'bg-red-50/40 border-red-200 hover:bg-red-50/70'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 truncate">
                        {isNew && (
                          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            isNew ? 'font-black text-slate-900' : 'font-bold text-slate-800'
                          }`}
                        >
                          {msg.name}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                          statusBadgeColors[msg.status] || statusBadgeColors.READ
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <h4
                      className={`text-xs truncate ${
                        isNew ? 'font-bold text-royal' : 'font-medium text-slate-700'
                      }`}
                    >
                      {msg.subject || '(Mata-duree malee)'}
                    </h4>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{msg.contact}</span>
                      <span>{msg.createdAt ? formatRelative(msg.createdAt) : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT PANE: DETAIL VIEW (7 cols on lg/xl) ── */}
        <div
          className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
            !selectedMessage && 'hidden lg:block'
          }`}
        >
          {!selectedMessage ? (
            <Card className="p-16 border-slate-200 bg-white text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-3xl bg-royal-tint flex items-center justify-center text-royal mb-4">
                <MessageSquare className="w-8 h-8 text-royal" />
              </div>
              <h3 className="font-extrabold text-base text-slate-800">
                Ergaa Tokko Filadhaa (Select a Message)
              </h3>
              <p className="text-xs text-slate-500 max-w-sm pt-1">
                Ergaa bal'inaan dubbisuuf, deebii kennuuf ykn xumuruuf tarree bitaa irraa filadhaa.
              </p>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              {/* Mobile Back Button */}
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Deebi'i gara Tarree (Back to List)</span>
                </button>
              </div>

              {/* Message Header Card */}
              <Card className="p-6 border-slate-200 bg-white space-y-6">
                {/* Top Banner: Sender Info + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-royal text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                      {selectedMessage.name?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight truncate">
                        {selectedMessage.name}
                      </h2>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <span className="font-mono">{selectedMessage.contact}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        statusBadgeColors[selectedMessage.status] || statusBadgeColors.READ
                      }`}
                    >
                      {selectedMessage.status}
                    </span>
                  </div>
                </div>

                {/* Date & Calendars in Dual Systems */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-royal" />
                      <span>Guyyaa fi Sa'aatii (Dual Calendar)</span>
                    </span>
                    <p className="font-bold text-royal">
                      {formatDual(selectedMessage.createdAt)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-royal" />
                      <span>Yeroo Darbe (Relative)</span>
                    </span>
                    <p className="font-medium text-slate-700">
                      {formatRelative(selectedMessage.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Mata-duree (Subject)
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedMessage.subject || '(Mata-duree malee)'}
                  </h3>
                </div>

                {/* Message Body */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Ergaa Guutuu (Full Message)
                  </span>
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* ══════ ACTION TOOLBAR ══════ */}
                <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Communication Replies */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Mailto Reply */}
                    <a
                      href={`mailto:${selectedMessage.contact}?subject=Re: ${encodeURIComponent(
                        selectedMessage.subject || 'Ergaa Qunnamtii'
                      )}`}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-royal hover:bg-royal-dark text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5 text-gold-400" />
                      <span>Imeeliin Deebisi</span>
                    </a>

                    {/* Tel Call */}
                    {parsedContact.phone && (
                      <a
                        href={`tel:${parsedContact.phone}`}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5 text-gold-400" />
                        <span>Bilbili</span>
                      </a>
                    )}

                    {/* WhatsApp */}
                    {parsedContact.cleanPhone && (
                      <a
                        href={`https://wa.me/${parsedContact.cleanPhone}?text=${encodeURIComponent(
                          `Nagaa, kabajamoo ${selectedMessage.name}, ergaa keessaniif galatoomaa.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {/* Right: Status Workflow & Delete */}
                  <div className="flex items-center space-x-2">
                    {selectedMessage.status !== 'DONE' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(selectedMessage._id, 'DONE')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        <span>Xumurame (Done)</span>
                      </Button>
                    )}

                    {selectedMessage.status === 'DONE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus(selectedMessage._id, 'READ')}
                      >
                        <span>Deebisi gara Read</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleDelete(selectedMessage._id)}
                      className="text-red-600 hover:bg-red-50"
                      title="Balleessi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInbox;
