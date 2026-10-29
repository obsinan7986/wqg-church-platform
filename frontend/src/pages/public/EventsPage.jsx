import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ExternalLink,
  Tag,
  ArrowLeft,
  Search,
  Sparkles
} from 'lucide-react';
import {
  Container,
  Section,
  Button,
  Badge,
  Skeleton,
  EmptyState
} from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';
import { formatEventDate, getEventDateBadge, formatTimeOnly } from '../../utils/dateFormatter';
import { useDateSettings } from '../../context/DateSettingsContext';
import { formatDual, getDeviceTimeNote } from '../../utils/dateFormat';

const EVENT_TYPE_BADGES = {
  CEREMONY: { label: 'Sirna / Ceremony', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  FEAST: { label: 'Ayyaana / Feast', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  MEETING: { label: "Walga'ii / Meeting", color: 'bg-blue-100 text-blue-800 border-blue-300' },
  TRAINING: { label: 'Leenjii / Training', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  LIVE: { label: 'Kallattii / Live', color: 'bg-red-100 text-red-800 border-red-300' },
  OTHER: { label: 'Kan Biraa / Other', color: 'bg-slate-100 text-slate-800 border-slate-300' }
};

const EventsPage = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { socket } = useSocket();
  const { calendarPref, clockPref, formatTime } = useDateSettings();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'all'

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeTab === 'upcoming') {
        params.upcoming = 'true';
      }
      if (filterType !== 'ALL') {
        params.type = filterType;
      }
      const res = await api.get('/events/public', { params });
      if (res.data?.success) {
        setEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('[EventsPage fetch error]:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Socket listener for live updates
  useEffect(() => {
    if (!socket) return;
    const handleContentUpdate = (data) => {
      if (data?.type === 'event' || !data?.type) {
        fetchEvents();
      }
    };
    socket.on('content_updated', handleContentUpdate);
    return () => {
      socket.off('content_updated', handleContentUpdate);
    };
  }, [socket, fetchEvents]);

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = getLocalizedText(ev.title, currentLang, '').toLowerCase();
    const desc = getLocalizedText(ev.description, currentLang, '').toLowerCase();
    const loc = (ev.location || '').toLowerCase();
    return title.includes(query) || desc.includes(query) || loc.includes(query);
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Page Header */}
      <div className="bg-royal text-white py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]" />
        <Container className="relative z-10 max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gold-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Gara Fuula Duraa (Back to Home)</span>
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-royal-dark/60 text-gold-400 px-3 py-1 rounded-full text-xs font-bold border border-gold-500/30 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sagantaalee fi Qophii Waldaa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                Sagantaalee Waldaa
              </h1>
              <p className="text-white/80 text-sm sm:text-base mt-1 max-w-2xl">
                Sagantaalee amantaa, ayyaanota, leenjiifi walga'iiwwan Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii.
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="max-w-5xl mt-6 space-y-6">
        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Tabs: Upcoming vs All */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fuulduraa (Upcoming)
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hunda (All Events)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 flex-1 md:max-w-md md:justify-end">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Barbaadi / Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white transition-all"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-royal transition-all"
            >
              <option value="ALL">Gosa Hunda (All Types)</option>
              <option value="CEREMONY">Sirna (Ceremony)</option>
              <option value="FEAST">Ayyaana (Feast)</option>
              <option value="MEETING">Walga'ii (Meeting)</option>
              <option value="TRAINING">Leenjii (Training)</option>
              <option value="LIVE">Kallattii (Live)</option>
              <option value="OTHER">Biraa (Other)</option>
            </select>
          </div>
        </div>

        {/* Events Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-14 h-14 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                </div>
                <Skeleton className="w-full h-12 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <EmptyState
              icon={CalendarIcon}
              title="Sagantaan homaa hin argamne"
              description="Yeroo ammaa kanatti sagantaan ulaagaa kana guutu hin jiru. Yeroo biraa deebi'aa ilaalaa."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredEvents.map((ev) => {
              const dateBadge = getEventDateBadge(ev.startAt, currentLang, calendarPref);
              const formattedDate = formatDual(ev.startAt);
              const formattedTime = formatTime(ev.startAt, { clock: clockPref });
              const deviceNote = getDeviceTimeNote(ev.startAt);
              const badgeInfo = EVENT_TYPE_BADGES[ev.type] || EVENT_TYPE_BADGES.OTHER;

              return (
                <div
                  key={ev._id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-royal/40 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Optional Image */}
                  {ev.imageUrl && (
                    <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                      <img
                        src={ev.imageUrl}
                        alt={getLocalizedText(ev.title, currentLang, 'Event')}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeInfo.color} shadow-sm backdrop-blur-sm`}>
                        {badgeInfo.label}
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3.5">
                        {/* Date Badge */}
                        <div className="w-14 h-14 rounded-xl bg-royal text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm border border-gold-500/30">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gold-400">
                            {dateBadge.month}
                          </span>
                          <span className="text-lg font-black leading-none mt-0.5">
                            {dateBadge.day}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {!ev.imageUrl && (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.color}`}>
                                {badgeInfo.label}
                              </span>
                            )}
                            {ev.recurrence && ev.recurrence !== 'NONE' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-gold-100 text-gold-900 border border-gold-300">
                                🔄 {ev.recurrence === 'ETH_MONTHLY' ? `Ji'a hunda (${ev.ethDay || 23})` : 'Waggaa hunda'}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-slate-900 group-hover:text-royal transition-colors leading-snug">
                            {getLocalizedText(ev.title, currentLang, 'Sagantaa')}
                          </h3>
                        </div>
                      </div>

                      {/* Description */}
                      {ev.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {getLocalizedText(ev.description, currentLang, '')}
                        </p>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500 font-medium">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-gold-600" />
                          <span>{formattedDate}</span>
                        </div>
                        {formattedTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-gold-600" />
                            <span>{formattedTime}</span>
                            {deviceNote && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                {deviceNote}
                              </span>
                            )}
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-royal" />
                            <span className="truncate max-w-[180px]">{ev.location}</span>
                          </div>
                        )}
                      </div>

                      {ev.linkUrl && (
                        <div className="pt-1 flex justify-end">
                          <a
                            href={ev.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-royal hover:text-gold-600 transition-colors"
                          >
                            <span>Odeeffannoo Dabalataa</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default EventsPage;
