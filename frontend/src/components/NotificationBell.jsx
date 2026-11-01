import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCheck,
  Calendar,
  Radio,
  AlertTriangle,
  Info,
  Mail,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';
import { getLocalizedText } from '../utils/localized';
import { formatRelative } from '../utils/dateFormat';

const typeIcons = {
  GENERAL: Info,
  EVENT: Calendar,
  LIVE_STARTED: Radio,
  ANNOUNCEMENT: Bell,
  CONTACT_MESSAGE: Mail,
  PAYMENT_REMINDER: AlertTriangle,
  URGENT: AlertTriangle
};

const typeBadgeColors = {
  GENERAL: 'bg-slate-100 text-slate-700 border-slate-200',
  EVENT: 'bg-gold-50 text-gold-800 border-gold-300',
  LIVE_STARTED: 'bg-red-50 text-red-700 border-red-200',
  ANNOUNCEMENT: 'bg-royal-tint text-royal border-royal/20',
  CONTACT_MESSAGE: 'bg-royal text-white border-royal',
  PAYMENT_REMINDER: 'bg-amber-50 text-amber-800 border-amber-200',
  URGENT: 'bg-red-100 text-red-800 border-red-300'
};

export const NotificationBell = ({ className = '', triggerClass = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } =
    useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Position state for portal dropdown
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 16, width: 384 });
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  const calculatePosition = useCallback(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    if (!mobile && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: Math.round(rect.bottom + 8),
        right: Math.max(12, Math.round(window.innerWidth - rect.right)),
        width: Math.min(400, window.innerWidth - 24)
      });
    }
  }, []);

  const handleToggle = () => {
    calculatePosition();
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Reposition on window resize / scroll
    const handleScrollOrResize = () => calculatePosition();

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('keydown', handleKeyDown);

    // Attach click listener with minor delay so the toggle click doesn't trigger it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, calculatePosition]);

  // Handle clicking a notification item
  const handleItemClick = (n) => {
    if (!n.isRead) {
      markNotificationRead(n._id);
    }
    setIsOpen(false);

    const link = (n.link || '').trim();
    if (!link) {
      navigate('/dashboard');
      return;
    }

    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(link);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    if (user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      navigate('/dashboard?tab=contact-inbox');
    } else {
      navigate('/dashboard');
    }
  };

  const badgeText = unreadCount > 99 ? '99+' : unreadCount > 0 ? unreadCount : null;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Beeksisoota (Notifications) ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        title="Beeksisoota (Notifications)"
        className={`relative p-2 rounded-full bg-royal-dark hover:bg-royal-dark/80 text-white border border-gold-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 shadow-sm active:scale-95 ${triggerClass}`}
      >
        <Bell className="w-4 h-4 text-gold-500" />
        {badgeText !== null && (
          <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md animate-in zoom-in-50">
            {badgeText}
          </span>
        )}
      </button>

      {/* PORTAL DROPDOWN: Mounted on document.body above all docks and buttons */}
      {isOpen &&
        ReactDOM.createPortal(
          <>
            {/* Backdrop for Mobile Bottom Sheet */}
            {isMobile && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99998] animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
              />
            )}

            {/* Dropdown Container */}
            <div
              ref={dropdownRef}
              style={
                isMobile
                  ? {}
                  : {
                      top: `${dropdownPos.top}px`,
                      right: `${dropdownPos.right}px`,
                      width: `${dropdownPos.width}px`
                    }
              }
              className={
                isMobile
                  ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl z-[99999] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200 border-t border-slate-200 text-slate-900'
                  : 'fixed max-h-[520px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[99999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-900'
              }
              role="dialog"
              aria-label="Notifications"
            >
              {/* Mobile handle indicator */}
              {isMobile && (
                <div className="w-full flex justify-center pt-2.5 pb-1 bg-royal-tint">
                  <div className="w-12 h-1.5 rounded-full bg-slate-300" />
                </div>
              )}

              {/* Dropdown Header */}
              <div className="p-3.5 bg-royal-tint border-b border-slate-200 flex items-center justify-between text-xs font-bold text-royal">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-gold-600" />
                  <span className="font-extrabold text-sm">Beeksisoota (Notifications)</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-mono font-black shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-[11px] text-royal hover:text-royal-dark flex items-center gap-1 font-bold transition-colors bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white shadow-xs"
                      title="Hunda akka dubbifametti mallatteessi (Mark all as read)"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-royal" />
                      <span>Hunda dubbisi</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List (Scrollable) */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-[360px]">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center text-slate-500 text-xs space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Beeksisni haaraan hin jiru</p>
                    <p className="text-[11px] text-slate-400">No notifications at this time.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = typeIcons[n.type] || Bell;
                    const badgeColor =
                      typeBadgeColors[n.type] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const titleText = getLocalizedText(n.title, currentLang, 'Beeksisa');
                    const messageText = getLocalizedText(n.message, currentLang, '');
                    const timeAgo = n.createdAt ? formatRelative(n.createdAt) : '';

                    return (
                      <div
                        key={n._id}
                        onClick={() => handleItemClick(n)}
                        className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 select-none ${
                          !n.isRead
                            ? 'bg-royal-tint/40 hover:bg-royal-tint/70'
                            : 'bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs truncate ${
                                !n.isRead ? 'font-black text-royal' : 'font-semibold text-slate-800'
                              }`}
                            >
                              {titleText}
                            </h4>

                            {/* Unread dot */}
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 shadow-xs animate-pulse" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {messageText}
                          </p>

                          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{timeAgo}</span>
                            <span className="text-royal font-bold inline-flex items-center gap-0.5">
                              <span>Bani</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer: "View all" */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  Waldaa Qulqulluu Giyoorgisii
                </span>
                <button
                  type="button"
                  onClick={handleViewAll}
                  className="font-bold text-royal hover:text-royal-dark hover:underline inline-flex items-center space-x-1"
                >
                  <span>Hunda Ilaali (View all)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default NotificationBell;
