import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Bell,
  CheckCheck,
  Send,
  PlusCircle,
  ExternalLink,
  Calendar,
  Radio,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { getLocalizedText } from '../utils/localized';
import { Modal, Button, FormField, Badge } from './ui';
import { formatRelative, formatDual } from '../utils/dateFormat';

const typeIcons = {
  GENERAL: Info,
  EVENT: Calendar,
  LIVE: Radio,
  URGENT: AlertTriangle
};

const typeBadgeVariants = {
  GENERAL: 'outline',
  EVENT: 'gold',
  LIVE: 'danger',
  URGENT: 'danger'
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  return formatRelative(dateString);
};

export const NotificationBell = ({ className = '', triggerClass = '' }) => {
  const { i18n } = useTranslation();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead
  } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    type: 'GENERAL',
    link: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if current user has permission to broadcast notifications
  const canSendNotification =
    user && ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'].includes(user.role);

  const handleNotificationClick = (n) => {
    markNotificationRead(n._id);
    setIsOpen(false);
    if (n.link) {
      if (n.link.startsWith('http://') || n.link.startsWith('https://')) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(n.link);
      }
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      setSendError('Mata duree fi ergaan dirqama (Title and message are required).');
      return;
    }

    try {
      setIsSending(true);
      setSendError('');
      setSendSuccess('');

      const res = await api.post('/notifications/broadcast', {
        title: {
          om: sendForm.title,
          am: sendForm.title,
          en: sendForm.title
        },
        message: {
          om: sendForm.message,
          am: sendForm.message,
          en: sendForm.message
        },
        type: sendForm.type,
        link: sendForm.link
      });

      if (res.data?.success) {
        setSendSuccess('Beeksisni milkaa’inaan ergameera!');
        setSendForm({ title: '', message: '', type: 'GENERAL', link: '' });
        setTimeout(() => {
          setShowSendModal(false);
          setSendSuccess('');
        }, 1500);
      }
    } catch (err) {
      setSendError(err.response?.data?.message || "Beeksisa erguun hin danda'amne.");
    } finally {
      setIsSending(false);
    }
  };

  const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? unreadCount : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Beeksisoota (Notifications) ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title="Beeksisoota (Notifications)"
        className={`relative p-2 rounded-full bg-royal-dark hover:bg-royal-dark/80 text-white border border-gold-500/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 shadow-sm ${triggerClass}`}
      >
        <Bell className="w-4 h-4 text-gold-500" />
        {badgeText !== null && (
          <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md animate-in zoom-in-50">
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-royal-tint border-b border-slate-200 flex items-center justify-between text-xs font-bold text-royal">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-gold-600" />
              <span>Beeksisoota (Notifications)</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200 font-mono font-bold">
                  {unreadCount} haaraa
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-[11px] text-royal hover:text-royal-dark flex items-center gap-1 font-semibold transition-colors"
                  title="Hunda akka dubbifametti mallatteessi"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hunda dubbisi</span>
                </button>
              )}

              {canSendNotification && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowSendModal(true);
                  }}
                  className="p-1 rounded-lg text-royal hover:text-royal-dark hover:bg-slate-200/50 transition-all flex items-center gap-1 text-[11px] font-bold"
                  title="Beeksisa haaraa tamsaasi (Broadcast Notification)"
                  aria-label="Broadcast Notification"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-gold-600" />
                  <span className="hidden sm:inline">Ergi</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications Scroll Area (max-h-80) */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-white">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-slate-500 text-xs space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Beeksisni haaraan hin jiru</p>
                <p className="text-[11px] text-slate-400">No notifications at this time.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                const badgeVar = typeBadgeVariants[n.type] || 'outline';
                const titleText = getLocalizedText(n.title, i18n.language, 'Beeksisa');
                const messageText = getLocalizedText(n.message, i18n.language, '');
                const timeText = formatTime(n.createdAt);

                return (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-2.5 ${
                      !n.isRead
                        ? 'bg-royal-tint/60 border-gold-500/50 hover:border-gold-500 shadow-xs'
                        : 'bg-white border-slate-100 hover:bg-royal-tint/30 text-slate-600'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-royal-tint border border-slate-200 shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-royal" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate block">
                          {titleText}
                        </span>
                        {!n.isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-gold-500 shrink-0 animate-pulse"
                            title="Unread"
                          />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                        {messageText}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span className="cursor-help" title={formatDual(n.createdAt, { includeTime: true })}>
                          {timeText}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {n.type && (
                            <Badge variant={badgeVar} size="sm">
                              {n.type}
                            </Badge>
                          )}
                          {n.link && (
                            <ExternalLink className="w-2.5 h-2.5 text-royal" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Send Notification Modal (SUPER_ADMIN, ADMIN, SECRETARY) */}
      {showSendModal && (
        <Modal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          title="Beeksisa Haaraa Tamsaasi (Broadcast Alert)"
          icon={Send}
        >
          <form onSubmit={handleSendNotification} className="space-y-4">
            {sendError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {sendError}
              </div>
            )}
            {sendSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {sendSuccess}
              </div>
            )}

            <FormField
              label="Mata Duree (Title)"
              required
              value={sendForm.title}
              onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
              placeholder="Fkn: Sagantaa Kadhannaa Kallattii"
            />

            <FormField
              as="textarea"
              label="Ergaa (Message)"
              required
              rows={3}
              value={sendForm.message}
              onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
              placeholder="Dhaamsa ykn beeksisa amantoota hundaaf qoodamu..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                as="select"
                label="Gosa Beeksisaa (Type)"
                required
                value={sendForm.type}
                onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
                options={[
                  { value: 'GENERAL', label: 'Waliigalaa (General)' },
                  { value: 'EVENT', label: 'Ayyaana & Sagantaa (Event)' },
                  { value: 'LIVE', label: 'Tamsaasa Kallattii (Live)' },
                  { value: 'URGENT', label: 'Aariifachiisaa (Urgent)' }
                ]}
              />

              <FormField
                label="Geessituu / Link (Optional)"
                value={sendForm.link}
                onChange={(e) => setSendForm({ ...sendForm, link: e.target.value })}
                placeholder="Fkn: /services"
                helperText="Amantoonni yeroo cuqaasan kan banamu"
              />
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowSendModal(false)}
              >
                Dhiisi (Cancel)
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSending}
                icon={Send}
              >
                Tamsaasi (Broadcast)
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default NotificationBell;