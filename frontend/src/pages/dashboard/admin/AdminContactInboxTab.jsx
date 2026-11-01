import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';
import { useSocket } from '../../../context/SocketContext';
import { useDateSettings } from '../../../context/DateSettingsContext';
import {
  Inbox,
  Mail,
  Check,
  CheckCheck,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  Spinner,
  Modal
} from '../../../components/ui';

const AdminContactInboxTab = () => {
  const { socket } = useSocket();
  const { formatDual } = useDateSettings();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/contact', {
        params: {
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        }
      });
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error('[Fetch Contact Messages Error]:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => fetchMessages();
    socket.on('contact_message_received', handleNewMessage);
    socket.on('content_updated', handleNewMessage);
    return () => {
      socket.off('contact_message_received', handleNewMessage);
      socket.off('content_updated', handleNewMessage);
    };
  }, [socket, fetchMessages]);

  // Update status (READ or DONE)
  const handleUpdateStatus = async (id, newStatus) => {
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
      alert(err.response?.data?.message || 'Failed to update message status');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete message
  const handleDelete = async (id) => {
    if (!window.confirm('Ergaa kana balleessuu barbaadduu? (Are you sure you want to delete this message?)')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.delete(`/contact/${id}`);
      if (res.data?.success) {
        setMessages((prev) => prev.filter((m) => m._id !== id));
        if (selectedMessage && selectedMessage._id === id) {
          setSelectedMessage(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete message');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.contact || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.message || '').toLowerCase().includes(q)
    );
  });

  const newCount = messages.filter((m) => m.status === 'NEW').length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Controls */}
      <Card className="p-4 border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={statusFilter === 'ALL' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              Hundumaa (All)
            </Button>
            <Button
              variant={statusFilter === 'NEW' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('NEW')}
              className="relative"
            >
              Haaraa (New)
              {newCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                  {newCount}
                </span>
              )}
            </Button>
            <Button
              variant={statusFilter === 'READ' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('READ')}
            >
              Dubbifame (Read)
            </Button>
            <Button
              variant={statusFilter === 'DONE' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('DONE')}
            >
              Xumurame (Done)
            </Button>
          </div>

          {/* Search Box + Refresh */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Barbaadi (Search)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={fetchMessages} title="Haaromsi (Refresh)">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Messages List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
          <Spinner size="lg" />
          <span>Ergaawwan fe'aa jira...</span>
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card className="p-8 border-slate-200">
          <EmptyState
            icon={Inbox}
            title="Ergaan tokkollee hin jiru"
            description="Ergaan karaa fuula qunnamtii dhiyaate asitti mul'ata."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg) => {
            const isNew = msg.status === 'NEW';
            return (
              <Card
                key={msg._id}
                className={`p-4 transition-all hover:shadow-md cursor-pointer border ${
                  isNew
                    ? 'border-royal/40 bg-royal-tint/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() => {
                  setSelectedMessage(msg);
                  if (msg.status === 'NEW') {
                    handleUpdateStatus(msg._id, 'READ');
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-extrabold text-xs text-slate-900 truncate">
                        {msg.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({msg.contact})
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          msg.status === 'NEW'
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : msg.status === 'READ'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-royal">
                      {msg.subject || '(Mata-duree malee)'}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>
                  </div>

                  {/* Right: Date & Quick Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDual(msg.createdAt)}
                    </span>

                    <div
                      className="flex items-center space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {msg.status !== 'DONE' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(msg._id, 'DONE')}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                          title="Xumurame jedhi (Mark as Done)"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(msg._id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                        title="Balleessi (Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <Modal
          isOpen={Boolean(selectedMessage)}
          onClose={() => setSelectedMessage(null)}
          title={selectedMessage.subject || 'Ergaa Qunnamtii'}
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Ergaa kan erge:</span>
                <span className="font-extrabold text-slate-900">{selectedMessage.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Qunnamtii (Email/Phone):</span>
                <span className="font-mono text-royal font-bold">
                  {selectedMessage.contact}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Guyyaa:</span>
                <span className="text-slate-500">{formatDual(selectedMessage.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Ergaa Guutuu:</label>
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedMessage.message}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedMessage.status !== 'DONE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedMessage._id, 'DONE')}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>Xumurame (Done)</span>
                  </Button>
                )}
                {selectedMessage.status === 'DONE' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedMessage._id, 'READ')}
                  >
                    <span>Deebisi gara Read</span>
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                disabled={actionLoading}
                onClick={() => handleDelete(selectedMessage._id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Balleessi</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminContactInboxTab;
