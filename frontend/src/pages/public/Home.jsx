import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import {
  Church,
  Users,
  HeartHandshake,
  BookOpen,
  Megaphone,
  ArrowRight,
  Clock,
  Sparkles,
  LayoutDashboard,
  Lock,
  Phone,
  User as UserIcon,
  MapPin,
  Eye,
  EyeOff,
  Video,
  Music,
  Heart,
  LogIn,
  UserPlus,
  CheckCircle2,
  Wrench,
  Loader2,
  Radio,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Pin,
  Share2,
  Check
} from 'lucide-react';
import {
  Container,
  Section,
  Badge,
  Toast,
  Avatar,
  Skeleton,
  Button,
  Modal
} from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';
import {
  formatEventDate,
  getEventDateBadge,
  formatTimeOnly,
  getCountdown
} from '../../utils/dateFormatter';
import { useDateSettings } from '../../context/DateSettingsContext';
import {
  formatDual,
  formatTimeRange,
  formatTime,
  formatRelative,
  getDeviceTimeNote
} from '../../utils/dateFormat';
import HeroSlideshow from '../../components/home/HeroSlideshow';

// Fallback schedule rows matching original specifications
const FALLBACK_SCHEDULE1 = [
  { when: 'Galgalaa yeroo hunda', time: '5:30 - 6:30', what: 'Kadhana' },
  { when: 'Galgalaa yeroo hunda', time: '3:00 - 4:00', what: 'Kadhana' },
  { when: 'Waree booda yeroo hunda', time: '11:00 - 12:00', what: 'Kadhana' },
  { when: 'Waree booda yeroo hunda', time: '9:00 - 10:00', what: 'Kadhana' },
  { when: 'Guyyaa yeroo hunda', time: '6:00 - 7:00', what: 'Kadhana' },
  { when: 'Ganamaa yeroo hunda', time: '3:00 - 4:00', what: 'Kadhana' }
];

const FALLBACK_SCHEDULE2 = [
  { when: 'Waree duraa yeroo hunda', time: '5:00 Hanga 6:00', what: 'Farfanaa' },
  { when: 'Waree booda yeroo hunda', time: '7:00 Hanga 8:00', what: 'Faruu shaakalii' },
  { when: 'Waree booda yeroo hunda', time: '8:00 Hanga 9:00', what: 'Yaada waljijiruu' },
  { when: 'Waree booda yeroo hunda', time: '10:00 Hanga 11:00', what: 'Gafi fi Debbi' },
  { when: 'Galgalaa yeroo hunda', time: '12:00 Hanga 1:30', what: "Gi'eezii" }
];

const FALLBACK_SCHEDULE3 = [
  { when: 'Galgalaa yeroo hunda', time: '1:30 - 3:00', what: 'Korsii abbaa keenyaa' },
  { when: 'Galagaa yerro hundaa', time: '4:00 - 5:30', what: 'Korsii' },
  { when: 'Ganama subi', time: '6:00 Hanga 3:00', what: 'Qidaase' },
  { when: 'Ganamaa yeroo hunda', time: '4:00 Hanga 5:00', what: 'Wangeelaa' }
];

const EVENT_TYPE_BADGES = {
  CEREMONY: { label: 'Sirna', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  FEAST: { label: 'Ayyaana', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  MEETING: { label: "Walga'ii", color: 'bg-blue-100 text-blue-800 border-blue-300' },
  TRAINING: { label: 'Leenjii', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  LIVE: { label: 'Kallattii', color: 'bg-red-100 text-red-800 border-red-300' },
  OTHER: { label: 'Sagantaa', color: 'bg-slate-100 text-slate-800 border-slate-300' }
};

// Count-up helper component for stats animation
const CountUpValue = ({ end, trigger }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTime = null;
    let animationFrameId;
    const duration = 1800;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(easeOut * end));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setVal(end);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [trigger, end]);

  return <>{val.toLocaleString()}+</>;
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { user, isAuthenticated, login } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { calendarPref, clockPref, formatTime: formatTimeWithSettings } = useDateSettings();

  // 1. LIVE meeting state (from /api/live/public/next)
  const [liveMeeting, setLiveMeeting] = useState(null);
  const [liveCountdown, setLiveCountdown] = useState('');

  // 2. Upcoming Events state (from /api/events/public?upcoming=true)
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // 3. Latest Announcements state (from /api/announcements/public)
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // 4. Weekly Schedule state (from /api/schedule/public)
  const [scheduleData, setScheduleData] = useState({
    SUNDAY_SERVICE: [],
    YOUTH: [],
    LIVE: []
  });
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // Stats Count-up observer state
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  // Quick Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Fetch Public Next Live Meeting
  const fetchLiveMeeting = useCallback(async () => {
    try {
      const res = await api.get('/live/public/next');
      if (res.data?.success && res.data.meeting) {
        setLiveMeeting(res.data.meeting);
        if (res.data.meeting.status === 'SCHEDULED' && res.data.meeting.scheduledDate) {
          setLiveCountdown(getCountdown(res.data.meeting.scheduledDate) || '');
        }
      } else {
        setLiveMeeting(null);
      }
    } catch (e) {
      setLiveMeeting(null);
    }
  }, []);

  // Fetch Upcoming Events
  const fetchUpcomingEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const res = await api.get('/events/public?upcoming=true');
      if (res.data?.success) {
        setUpcomingEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('[Upcoming Events fetch error]:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Fetch Latest Announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoadingAnnouncements(true);
      const res = await api.get('/announcements/public');
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch (err) {
      console.error('[Announcements fetch error]:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  // Fetch Weekly Schedule
  const fetchSchedule = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      const res = await api.get('/schedule/public');
      if (res.data?.success && res.data.grouped) {
        setScheduleData(res.data.grouped);
      }
    } catch (err) {
      console.error('[Schedule fetch error]:', err);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  // Initial fetches
  useEffect(() => {
    fetchLiveMeeting();
    fetchUpcomingEvents();
    fetchAnnouncements();
    fetchSchedule();
  }, [fetchLiveMeeting, fetchUpcomingEvents, fetchAnnouncements, fetchSchedule]);

  // Live countdown ticker
  useEffect(() => {
    if (liveMeeting && liveMeeting.status === 'SCHEDULED' && liveMeeting.scheduledDate) {
      const interval = setInterval(() => {
        const cd = getCountdown(liveMeeting.scheduledDate);
        setLiveCountdown(cd || '');
        if (!cd) {
          // If countdown reached 0, refetch live meeting
          fetchLiveMeeting();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [liveMeeting, fetchLiveMeeting]);

  // Socket listener: updates everything reactively when content_updated is fired
  useEffect(() => {
    if (!socket) return;

    const handleContentUpdate = (data) => {
      const type = data?.type;
      if (!type || type === 'live') fetchLiveMeeting();
      if (!type || type === 'event') fetchUpcomingEvents();
      if (!type || type === 'announcement') fetchAnnouncements();
      if (!type || type === 'schedule') fetchSchedule();
    };

    const handleLiveChange = () => fetchLiveMeeting();

    socket.on('content_updated', handleContentUpdate);
    socket.on('live_status_changed', handleLiveChange);
    socket.on('live_ended', handleLiveChange);

    return () => {
      socket.off('content_updated', handleContentUpdate);
      socket.off('live_status_changed', handleLiveChange);
      socket.off('live_ended', handleLiveChange);
    };
  }, [socket, fetchLiveMeeting, fetchUpcomingEvents, fetchAnnouncements, fetchSchedule]);

  // Stats IntersectionObserver for one-time count-up trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle Quick Login submission
  const handleQuickLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    if (!loginPhone.trim() || !loginPassword) {
      setLoginError('Lakkoofsa bilbilaa fi password galchaa / Please enter phone and password.');
      return;
    }

    setLoginLoading(true);
    const res = await login(loginPhone.trim(), loginPassword);
    setLoginLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setLoginError(res.message || 'Login failed. Please verify credentials.');
    }
  };

  // Resolved schedules (falls back to predefined rows if server returned none)
  const resolvedSchedule1 =
    scheduleData.SUNDAY_SERVICE && scheduleData.SUNDAY_SERVICE.length > 0
      ? scheduleData.SUNDAY_SERVICE.map((s) => ({
          when: getLocalizedText(s.when, currentLang, ''),
          time: s.time,
          startTime: s.startTime,
          endTime: s.endTime,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
          endsNextDay: s.endsNextDay,
          customTime: s.customTime,
          clockType: s.clockType,
          what: getLocalizedText(s.what, currentLang, '')
        }))
      : FALLBACK_SCHEDULE1;

  const resolvedSchedule2 =
    scheduleData.YOUTH && scheduleData.YOUTH.length > 0
      ? scheduleData.YOUTH.map((s) => ({
          when: getLocalizedText(s.when, currentLang, ''),
          time: s.time,
          startTime: s.startTime,
          endTime: s.endTime,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
          endsNextDay: s.endsNextDay,
          customTime: s.customTime,
          clockType: s.clockType,
          what: getLocalizedText(s.what, currentLang, '')
        }))
      : FALLBACK_SCHEDULE2;

  const resolvedSchedule3 =
    scheduleData.LIVE && scheduleData.LIVE.length > 0
      ? scheduleData.LIVE.map((s) => ({
          when: getLocalizedText(s.when, currentLang, ''),
          time: s.time,
          startTime: s.startTime,
          endTime: s.endTime,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
          endsNextDay: s.endsNextDay,
          customTime: s.customTime,
          clockType: s.clockType,
          what: getLocalizedText(s.what, currentLang, '')
        }))
      : FALLBACK_SCHEDULE3;

  const renderScheduleTime = (item) => {
    if (item.customTime && item.customTime.trim()) {
      return (
        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-royal text-white shadow-xs whitespace-nowrap">
          {item.customTime}
        </span>
      );
    }
    if (item.startTime) {
      const formatted = formatTimeRange(item.startTime, item.endTime, {
        clock: clockPref,
        locale: currentLang
      });
      const isEth = clockPref === 'ETHIOPIAN';
      return (
        <div className="flex flex-col items-end">
          <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-royal text-white shadow-xs whitespace-nowrap">
            {formatted}{item.endsNextDay ? ' (+1)' : ''}
          </span>
          <span className="text-[9px] text-slate-500 font-medium mt-0.5">
            {isEth ? "Sa'aatii Itoophiyaa" : 'International (24h)'}
          </span>
        </div>
      );
    }
    return (
      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-royal text-white shadow-xs whitespace-nowrap">
        {item.time || '00:00 - 00:00'}
      </span>
    );
  };

  const stats = [
    {
      icon: Users,
      numeric: 12000,
      label: t('home.statsMembers') || 'Miseensota Waldichaa'
    },
    {
      icon: Church,
      numeric: 18,
      label: t('home.statsBranches') || 'Dameelee Waldichaa'
    },
    {
      icon: BookOpen,
      numeric: 16,
      label: t('home.statsYears') || 'Tajaajilaa Waldichaa'
    },
    {
      icon: HeartHandshake,
      numeric: 250,
      label: t('home.statsEvents') || 'Sagantaalee Waggaa'
    }
  ];

  const featureCards = [
    {
      icon: BookOpen,
      title: t('home.featAboutTitle') || "Waa'ee Waldichaa",
      desc: t('home.featAboutDesc') || "Seenaa, hiika fi hundeeffama Waldaa Qulqulluu Giyoorgisii bal'inaan baradhaa.",
      action: t('home.featAboutAction') || 'Daawwadhaa',
      link: '/about'
    },
    {
      icon: Video,
      title: t('home.featMediaTitle') || 'Wiirtuu Faarfannaa',
      desc: t('home.featMediaDesc') || 'Faarfannaawwan qulqullaa\'oo fi sagantaalee kallattii YouTube irratti daawwadhaa.',
      action: t('home.featMediaAction') || 'Dhaggeeffadhaa',
      link: '/media-library'
    },
    {
      icon: HeartHandshake,
      title: t('home.featServicesTitle') || 'Tajaajila Waldichaa',
      desc: t('home.featServicesDesc') || "Kadhannaa, barnoota amantaa, tajaajila dargaggootaa fi gargaarsa hawaasummaa.",
      action: t('home.featServicesAction') || 'Ilaalaa',
      link: '/services'
    },
    {
      icon: Users,
      title: t('home.featYouthTitle') || 'Kutaa Dargaggootaa',
      desc: t('home.featYouthDesc') || 'Koorii, leenjii faarfannaa fi tajaajila addaa dargaggootaaf qophaa\'an.',
      action: t('home.featYouthAction') || 'Hirmaadhaa',
      link: '/services'
    }
  ];

  return (
    <div className="flex flex-col bg-white text-slate-900">
      {/* ══════ 1. ANIMATED HERO SLIDESHOW (Directly under navbar, no gap) ══════ */}
      <HeroSlideshow />

      {/* ══════ 2. LIVE STRIP (Hidden when none) ══════ */}
      {liveMeeting && (
        <div
          className={`w-full py-3 sm:py-3.5 px-4 text-white shadow-md transition-all ${
            liveMeeting.status === 'LIVE'
              ? 'bg-gradient-to-r from-red-700 via-red-600 to-rose-700 border-b border-red-500'
              : 'bg-gradient-to-r from-royal via-royal-dark to-royal border-b border-gold-500/30'
          }`}
        >
          <Container className="max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center space-x-3">
              {liveMeeting.status === 'LIVE' ? (
                <>
                  <span className="relative flex h-3.5 w-3.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white shadow-xs" />
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-white/40">
                      LIVE NOW
                    </span>
                    <span className="font-bold text-xs sm:text-sm drop-shadow-xs">
                      {liveMeeting.title || "Walga'ii Kallattii Qulqulluu Giyoorgisii"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-400 text-gold-400 flex items-center justify-center shrink-0">
                    <Radio className="w-4 h-4 text-gold-400" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-gold-400 text-xs font-bold uppercase tracking-wider">
                      Next Live:
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-white">
                      {liveMeeting.title}
                    </span>
                    {liveCountdown && (
                      <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 text-[11px] font-mono font-bold border border-gold-500/30">
                        {liveCountdown}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {liveMeeting.status === 'LIVE' ? (
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/dashboard/live');
                  } else {
                    navigate('/login?redirect=/dashboard/live');
                  }
                }}
                className="inline-flex items-center space-x-2 px-5 py-1.5 rounded-full bg-white text-red-700 hover:bg-gold-50 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Hordofaa / Join Live</span>
              </button>
            ) : (
              <Link
                to="/services"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gold-400 hover:text-white transition-colors"
              >
                <span>Sagantaa Guutuu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </Container>
        </div>
      )}

      {/* ══════ 3. UPCOMING EVENTS (Hidden completely if empty) ══════ */}
      {(loadingEvents || upcomingEvents.length > 0) && (
        <section className="py-12 sm:py-16 bg-white border-b border-slate-100">
          <Container className="max-w-6xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1.5">
                <Badge variant="gold">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-gold-600" />
                  <span>Sagantaalee Fuulduraa</span>
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-black text-royal tracking-tight">
                  Sagantaalee Dhihoo Qophaa'an
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                  Sagantaalee amantaa, ayyaanota fi walga'iiwwan waldaa keenyaa kanneen dhihootti geggeeffaman.
                </p>
              </div>

              <Link
                to="/events"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-royal text-white hover:bg-royal-dark text-xs font-bold shadow-sm transition-all self-start sm:self-end"
              >
                <span>Sagantaalee Hunda (View all)</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
              </Link>
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="w-3/4 h-4" />
                        <Skeleton className="w-1/2 h-3" />
                      </div>
                    </div>
                    <Skeleton className="w-full h-10 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {upcomingEvents.slice(0, 3).map((ev) => {
                  const dateBadge = getEventDateBadge(ev.startAt, currentLang, calendarPref);
                  const formattedDate = formatDual(ev.startAt);
                  const formattedTime = formatTimeWithSettings(ev.startAt, { clock: clockPref });
                  const badgeInfo = EVENT_TYPE_BADGES[ev.type] || EVENT_TYPE_BADGES.OTHER;

                  return (
                    <div
                      key={ev._id}
                      className="bg-white border border-slate-200 rounded-2xl hover:border-royal/50 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                    >
                      {ev.imageUrl && (
                        <div className="h-36 w-full overflow-hidden bg-slate-100 relative">
                          <img
                            src={ev.imageUrl}
                            alt={getLocalizedText(ev.title, currentLang, 'Event')}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.color} shadow-xs`}>
                            {badgeInfo.label}
                          </span>
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-royal text-white flex flex-col items-center justify-center shrink-0 border border-gold-500/30">
                              <span className="text-[9px] font-black uppercase text-gold-400">
                                {dateBadge.month}
                              </span>
                              <span className="text-base font-black leading-none mt-0.5">
                                {dateBadge.day}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              {!ev.imageUrl && (
                                <span className={`inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.color}`}>
                                  {badgeInfo.label}
                                </span>
                              )}
                              <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-royal transition-colors line-clamp-2">
                                {getLocalizedText(ev.title, currentLang, 'Sagantaa')}
                              </h3>
                            </div>
                          </div>

                          {ev.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {getLocalizedText(ev.description, currentLang, '')}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-gold-600" />
                            <span>{formattedTime || formattedDate}</span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-royal" />
                              <span className="truncate max-w-[120px]">{ev.location}</span>
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
        </section>
      )}

      {/* ══════ 4. LATEST ANNOUNCEMENTS (Hidden completely if empty) ══════ */}
      {(loadingAnnouncements || announcements.length > 0) && (
        <section className="py-12 sm:py-16 bg-slate-50/60 border-b border-slate-200">
          <Container className="max-w-6xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1.5">
                <Badge variant="gold">
                  <Megaphone className="w-3.5 h-3.5 mr-1 text-gold-600" />
                  <span>Oduu fi Beeksisa</span>
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-black text-royal tracking-tight">
                  Beeksisoota Haaraa
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                  Ergaalee fi beeksisoota barbaachisoo waldichaa yeroo ammaa baafaman.
                </p>
              </div>

              <Link
                to="/announcements"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-royal text-royal hover:text-royal-dark text-xs font-bold shadow-xs transition-all self-start sm:self-end"
              >
                <span>Beeksisa Hunda (View all)</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
              </Link>
            </div>

            {loadingAnnouncements ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
                    <Skeleton className="w-1/3 h-5" />
                    <Skeleton className="w-full h-8" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {announcements.slice(0, 4).map((item) => {
                  const formattedDate = formatDual(item.publishAt || item.createdAt);
                  const relativeTime = formatRelative(item.publishAt || item.createdAt);
                  const title = getLocalizedText(item.title, currentLang, 'Beeksisa');
                  const desc = getLocalizedText(item.description, currentLang, '');

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedAnnouncement(item)}
                      className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer group flex flex-col justify-between ${
                        item.pinned
                          ? 'border-gold-500/50 shadow-md ring-1 ring-gold-500/20'
                          : 'border-slate-200/80 hover:border-royal/40 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-400" title={relativeTime}>
                            {formattedDate}
                          </span>
                          {item.pinned && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gold-50 text-gold-700 border border-gold-400">
                              <Pin className="w-3 h-3 fill-gold-600" />
                              <span>Pinned</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-slate-900 group-hover:text-royal transition-colors line-clamp-1">
                          {title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {desc}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-royal group-hover:text-gold-600 transition-colors">
                        <span>Guutuu Dubbisi (Read more)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Container>
        </section>
      )}

      {/* ══════ 5. WEEKLY SCHEDULE CARDS ══════ */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-200">
        <Container className="max-w-6xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="gold">
              <Clock className="w-3.5 h-3.5 mr-1 text-gold-600" />
              <span>{t('home.scheduleTitle') || 'Sagantaalee Hafuuraa Kan Dhihoo'}</span>
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-royal">
              Sagantaalee Tajaajilaa fi Kadhannaa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {t('home.scheduleSubtitle') || 'Sagantaalee tajaajilaa fi kadhannaa waldaan keenya qopheesse'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            {/* Card 1: Kadhannaa fi Sagalee Waaqayyoo / Sunday Service */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:border-gold-500/70 hover:shadow-md transition-all h-full flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <Badge variant="outline">Sunday Service</Badge>
                  <Clock className="w-4 h-4 text-gold-600" aria-hidden="true" />
                </div>

                <h3 className="font-extrabold text-base text-royal">
                  {t('home.schedule1Title') || 'Kadhannaa fi Sagalee Waaqayyoo'}
                </h3>

                {/* List of rows */}
                <div className="space-y-2 pt-1 divide-y divide-slate-100">
                  {resolvedSchedule1.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between pt-2 first:pt-0 gap-2"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                        <Clock className="w-3.5 h-3.5 text-gold-500 shrink-0" aria-hidden="true" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 leading-snug break-words">
                            {item.what}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {item.when}
                          </span>
                        </div>
                      </div>
                      {renderScheduleTime(item)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/services"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-royal hover:text-royal-dark transition-colors"
                >
                  <span>Tajaajila Ilaalaa</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
                </Link>
              </div>
            </div>

            {/* Card 2: Dargaggoota & Faarfannaa / Youth Ministry */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-gold-500/70 hover:shadow-md transition-all h-full flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <Badge variant="outline">Youth Ministry</Badge>
                  <Music className="w-4 h-4 text-gold-600" aria-hidden="true" />
                </div>

                <h3 className="font-extrabold text-base text-royal">
                  {t('home.schedule2Title') || 'Dargaggoota & Faarfannaa'}
                </h3>

                {/* List of rows */}
                <div className="space-y-2 pt-1 divide-y divide-slate-100">
                  {resolvedSchedule2.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between pt-2 first:pt-0 gap-2"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                        <Clock className="w-3.5 h-3.5 text-gold-500 shrink-0" aria-hidden="true" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 leading-snug break-words">
                            {item.what}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {item.when}
                          </span>
                        </div>
                      </div>
                      {renderScheduleTime(item)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/services"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-royal hover:text-royal-dark transition-colors"
                >
                  <span>Tajaajila Ilaalaa</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
                </Link>
              </div>
            </div>

            {/* Card 3: Walga'ii Kallattii (Live Stream) / Live Broadcast */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-gold-500/70 hover:shadow-md transition-all h-full flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  {liveMeeting && liveMeeting.status === 'LIVE' ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-700 border border-red-300">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                      </span>
                      <span>LIVE AMMA</span>
                    </span>
                  ) : (
                    <Badge variant="outline">Live Broadcast</Badge>
                  )}
                  <Radio
                    className={`w-4 h-4 ${
                      liveMeeting && liveMeeting.status === 'LIVE'
                        ? 'text-red-600 animate-pulse'
                        : 'text-gold-600'
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="font-extrabold text-base text-royal">
                  {t('home.schedule3Title') || "Walga'ii Kallattii (Live Stream)"}
                </h3>

                {/* List of rows */}
                <div className="space-y-2 pt-1 divide-y divide-slate-100">
                  {resolvedSchedule3.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between pt-2 first:pt-0 gap-2"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                        <Clock className="w-3.5 h-3.5 text-gold-500 shrink-0" aria-hidden="true" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 leading-snug break-words">
                            {item.what}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {item.when}
                          </span>
                        </div>
                      </div>
                      {renderScheduleTime(item)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                {liveMeeting && liveMeeting.status === 'LIVE' ? (
                  <Link
                    to={isAuthenticated ? '/dashboard/live' : '/login?redirect=/dashboard/live'}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all select-none"
                  >
                    <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>Live Hordofi (Join Live Stream)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </Link>
                ) : (
                  <Link
                    to="/services"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-royal hover:text-royal-dark transition-colors"
                  >
                    <span>Tajaajila Ilaalaa</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ══════ 6. ABOUT THE ASSOCIATION + SERVICES (History, Stats, Features) ══════ */}
      <section className="bg-white py-12 sm:py-16 border-b border-slate-200">
        <Container className="space-y-12 max-w-6xl">
          {/* History / Mission Narrative */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm hover:border-gold-500/50 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md group">
                <img
                  src="/hero/hero1.jpg"
                  alt="Waldaa Qulqulluu Giyoorgisii"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#011A42]/80 via-[#01255C]/35 to-transparent" />
                <div className="absolute top-4 inset-x-4 flex justify-center">
                  <div className="bg-royal/90 text-white px-4 py-2 rounded-xl shadow-lg border border-gold-500/50 backdrop-blur-xs text-center max-w-sm w-full">
                    <h2 className="font-black text-xs sm:text-sm tracking-wide uppercase leading-tight">
                      WAA'EE WALDICHA & SEENAA ISAA
                    </h2>
                    <p className="font-ethiopic text-[11px] sm:text-xs text-gold-400 font-semibold leading-tight mt-0.5">
                      (ስለ ማኅበሩ እና ታሪኩ)
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <Badge variant="gold">
                    <span className="text-gold-600 select-none mr-1">†</span>
                    <span>Mul'ata fi Kaayyoo Waldichaa</span>
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-black text-royal tracking-tight">
                    Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  <strong className="text-royal font-bold">Waldaan Amantoota Qulqulluu Giyoorgisii</strong> bara 10/3/2017 kan hundeeffame yoo ta'u, kaayyoon isaas amantoota walitti qabuun,
                  Gargaarsa Harka Qalleeyyii fi Hawaasummaa, Tajaajila Faarfannaa fi Kadhannaa fi barnoota wangeelaa babal'isuudha.
                </p>

                {/* Services Section Header Pill */}
                <div className="bg-royal-tint border border-slate-200 rounded-xl px-3.5 py-2 flex items-center space-x-2 text-royal">
                  <Wrench className="w-4 h-4 text-gold-600 shrink-0" aria-hidden="true" />
                  <span className="font-black text-xs uppercase tracking-wide">
                    TAAJAAJILOOTA KEENYA (አገልግሎቶቻችን):
                  </span>
                </div>

                {/* 4 Interactive Service Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-royal-tint/60 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-royal-tint border border-gold-500/30 text-royal flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-royal" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Walga'ii fi Barnoota Kallattii (Live Stream)
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-royal-tint/60 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-royal-tint border border-gold-500/30 text-royal flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4 text-royal" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Tajaajila Faarfannaa fi Kadhannaa
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-royal-tint/60 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-royal-tint border border-gold-500/30 text-royal flex items-center justify-center shrink-0">
                      <Heart className="w-4 h-4 text-gold-600 fill-gold-500/20" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Gargaarsa Harka Qalleeyyii fi Hawaasummaa
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-royal-tint/60 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-royal-tint border border-gold-500/30 text-royal flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-royal" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Galmee Qaboo Yaa'ii fi Barruulee Hafuuraa
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/about"
                    className="inline-flex items-center space-x-2 py-2.5 px-5 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs sm:text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all select-none"
                  >
                    <BookOpen className="w-4 h-4 text-gold-400" />
                    <span>Guutuu Seenaa Dubbisi / ሙሉ ታሪኩን ያንብቡ</span>
                    <ArrowRight className="w-4 h-4 text-gold-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Count-Up Strip */}
          <div ref={statsRef} className="w-full">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl flex items-center space-x-3 sm:space-x-4 p-3.5 sm:p-5 hover:border-gold-500/70 hover:shadow-md transition-all shadow-sm"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-royal-tint border border-gold-500/40 flex items-center justify-center text-gold-600 shadow-xs flex-shrink-0">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xl sm:text-2xl font-black text-royal truncate">
                        <CountUpValue end={s.numeric} trigger={statsVisible} />
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                        {s.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Cards */}
          <div className="space-y-8 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {featureCards.map((c, i) => {
                const Icon = c.icon;
                return (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:border-gold-500/70 hover:shadow-md transition-all h-full flex flex-col justify-between space-y-6 group"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-gold-500/40 flex items-center justify-center text-gold-600 shadow-xs group-hover:bg-gold-500/10 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-extrabold text-base text-royal tracking-tight group-hover:text-royal-dark transition-colors break-words">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium break-words">
                        {c.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <Link
                        to={c.link}
                        className="inline-flex items-center space-x-1.5 text-xs font-bold text-royal hover:text-royal-dark transition-colors"
                      >
                        <span>{c.action}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Callout Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 hover:border-gold-500/60 transition-all">
              <div className="space-y-2 max-w-2xl">
                <Badge variant="gold">
                  <span className="text-gold-600 text-xs font-serif leading-none mr-1 select-none">†</span>
                  <span>Hawaasa Amantootaa</span>
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-royal">
                  {t('home.calloutTitle') || 'Hawaasa Amantootaa Waliin Hojjechuu Barbaadduu?'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('home.calloutSubtitle') || "Waldaa keenya keessatti tajaajila hafuuraa fi gargaarsa hawaasummaa irratti hirmaachuuf har'uma miseensa ta'aa."}
                </p>
              </div>

              <Link
                to="/register"
                className="px-6 py-3.5 rounded-full bg-gold-500 hover:bg-gold-400 text-royal font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <span>{t('home.calloutAction') || "Miseensa Ta'aa"}</span>
                <ArrowRight className="w-4 h-4 text-royal" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ══════ 7. MEMBER LOGIN / REGISTRATION SECTION ══════ */}
      <section className="bg-slate-50 py-12 sm:py-16 border-b border-slate-200">
        <Container className="space-y-8 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="gold">
              <Users className="w-3.5 h-3.5 mr-1 text-gold-600" />
              <span>Miseensummaa fi Seensa</span>
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-royal">
              Seensa fi Galmee Miseensotaa
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Miseensummaa keessan haaromsaa, seenaatii tajaajila waldichaa guutuutti fayyadamaa
            </p>
          </div>

          {/* If the user is logged in: show "Go to Dashboard" instead */}
          {isAuthenticated && user ? (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md hover:border-gold-500/70 transition-all text-center space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <Avatar user={user} size="lg" />
                <span className="text-[11px] uppercase font-bold tracking-wider text-royal bg-gold-500/20 px-3 py-0.5 rounded-full border border-gold-500/40">
                  {user.role}
                </span>
                <h3 className="font-black text-xl text-royal">
                  Baga Nagaan Deebitan, {user.fullName}!
                </h3>
                <p className="text-xs text-slate-600 max-w-md">
                  Akkaawuntiin keessan banaadha. Galmee fi tajaajila keessan hordofuuf gara Dashboard seenaa.
                </p>
              </div>

              <div className="p-4 bg-royal-tint rounded-xl text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                <div>
                  <span className="font-medium text-slate-500">Waldaa: </span>
                  <span className="font-bold text-slate-800">{user.originChurch || 'St. George Fellowship'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Bilbila: </span>
                  <span className="font-bold text-slate-800 font-mono">{user.phone}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Teessoo: </span>
                  <span className="font-bold text-slate-800">{user.address?.city || 'Finfinnee'}, {user.address?.kebele || '01'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Haala: </span>
                  <span className="font-bold text-royal flex items-center gap-1 inline-flex">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold-600" /> Seera-qabeessa
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3 px-8 rounded-full bg-royal hover:bg-royal-dark text-white font-black text-sm shadow-md hover:scale-105 transition-all select-none"
                >
                  <LayoutDashboard className="w-4 h-4 text-gold-400" />
                  <span>GARA DASHBOARD SEENAA / GO TO DASHBOARD</span>
                  <ArrowRight className="w-4 h-4 text-gold-400" />
                </Link>
              </div>
            </div>
          ) : (
            /* Guest State: Two Cards (Login -> /login and Register -> /register) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
              {/* ── CARD 1: MEMBER LOGIN (/login) ── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:border-gold-500/70 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-royal text-gold-400 flex items-center justify-center shadow-md shrink-0 border border-gold-500/40">
                      <LogIn className="w-6 h-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-royal tracking-tight leading-tight uppercase">
                        SEENSA MISEENSAA
                      </h3>
                      <p className="font-ethiopic text-xs font-semibold text-slate-500 leading-tight">
                        (MEMBER LOGIN / መግቢያ)
                      </p>
                    </div>
                  </div>

                  {loginError && (
                    <Toast type="error" message={loginError} onClose={() => setLoginError('')} />
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Miseensonni duraan galmooftan lakkoofsa bilbilaa fi jecha icciitiitiin seenaatii tajaajiloota waldichaa guutuutti hordofaa.
                  </p>

                  {/* Inline quick login input fields */}
                  <form onSubmit={handleQuickLogin} className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-royal" />
                        <span>Lakkoofsa Bilbilaa:</span>
                      </label>
                      <input
                        type="tel"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder="0911 ..."
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-royal" />
                        <span>Jecha Icciitii (Password):</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="********"
                          required
                          className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700"
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs sm:text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 select-none"
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-gold-400" />
                            <span>Seenaa jira...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4 text-gold-400" />
                            <span>SEENAA / LOGIN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Fuula seensaa guutuu:</span>
                  <Link
                    to="/login"
                    className="font-bold text-royal hover:text-royal-dark inline-flex items-center space-x-1"
                  >
                    <span>Login Page</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
                  </Link>
                </div>
              </div>

              {/* ── CARD 2: MEMBER REGISTER (/register) ── */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm hover:border-gold-500/70 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-royal text-gold-400 flex items-center justify-center shadow-md shrink-0 border border-gold-500/40">
                      <UserPlus className="w-6 h-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-royal tracking-tight leading-tight uppercase">
                        GALMEE MISEENSUMMAA
                      </h3>
                      <p className="font-ethiopic text-xs font-semibold text-slate-500 leading-tight">
                        (REGISTER / አባልነት ምዝገባ)
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii keessatti miseensa ta'uun tajaajila hafuuraa fi gargaarsa hawaasummaa irratti akka hirmaattan kabajaan isin affeerra.
                  </p>

                  <div className="space-y-2.5 p-4 rounded-xl bg-royal-tint border border-slate-200/60">
                    <div className="text-xs font-bold text-royal flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                      <span>Faayidaalee Miseensummaa:</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                        <span>Sagantaalee kadhannaa fi tajaajila wangeelaa irratti hirmaachuu</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                        <span>Tajaajila Live Stream fi barruulee hafuuraa daawwachuu</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                        <span>Deeggarsa hawaasummaa fi wal-gargaarsa amantootaa</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-royal font-black text-xs sm:text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all select-none"
                  >
                    <UserPlus className="w-4 h-4 text-royal" />
                    <span>AMMA GALMAA'AA / REGISTER NOW</span>
                    <ArrowRight className="w-4 h-4 text-royal" />
                  </Link>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Duraan galmooftaniittu?</span>
                    <Link
                      to="/login"
                      className="font-bold text-royal hover:text-royal-dark inline-flex items-center space-x-1"
                    >
                      <span>Seeni / Login</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gold-600" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Modal for Announcement Detail on Home */}
      {selectedAnnouncement && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAnnouncement(null)}
          title={getLocalizedText(selectedAnnouncement.title, currentLang, 'Beeksisa')}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-medium">
                {formatDual(selectedAnnouncement.publishAt || selectedAnnouncement.createdAt)}
              </span>
              {selectedAnnouncement.pinned && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gold-100 text-gold-800">
                  Pinned
                </span>
              )}
            </div>

            {selectedAnnouncement.imageUrl && (
              <div className="w-full max-h-64 rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={selectedAnnouncement.imageUrl}
                  alt={getLocalizedText(selectedAnnouncement.title, currentLang, 'Announcement')}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line py-2">
              {getLocalizedText(selectedAnnouncement.description, currentLang, '')}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedAnnouncement(null)}>
                Cufi (Close)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Home;
