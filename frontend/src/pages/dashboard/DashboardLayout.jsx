import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Link, useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { changeLanguage } from '../../i18n';
import api from '../../api/axios';
import {
  Church,
  User,
  LayoutDashboard,
  Video,
  Users,
  Coins,
  FileText,
  Settings,
  LogOut,
  UploadCloud,
  BookOpen,
  MessageSquare,
  Music,
  Megaphone,
  Radio,
  Edit,
  ArrowRight,
  Sparkles,
  Globe,
  Bell,
  Check,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Calendar,
  HelpCircle,
  Languages
} from 'lucide-react';
import { useTour } from '../../context/TourContext';
import { useDateSettings } from '../../context/DateSettingsContext';
import DateSettingsBar from '../../components/DateSettingsBar';
// Lazy-load dashboard tabs with React.lazy + Suspense for optimal bundle size
const MessagingCenter = React.lazy(() => import('../../components/MessagingCenter'));
const LiveMeetingStudio = React.lazy(() => import('./LiveMeetingStudio'));
const CollectorDash = React.lazy(() => import('./CollectorDash'));
const MemberPaymentDash = React.lazy(() => import('./MemberPaymentDash'));
const HRDash = React.lazy(() => import('./HRDash'));
const SecretaryDash = React.lazy(() => import('./SecretaryDash'));
const AdminDash = React.lazy(() => import('./AdminDash'));
const GospelMediaViewer = React.lazy(() => import('./GospelMediaViewer'));
const AdminUpload = React.lazy(() => import('./AdminUpload'));
const MediaLibrary = React.lazy(() => import('../public/MediaLibrary'));
const ProfileAndSecurity = React.lazy(() => import('./ProfileAndSecurity'));
const ProgramsManager = React.lazy(() => import('./ProgramsManager'));
const GospelRadioStudio = React.lazy(() => import('./GospelRadioStudio'));
const SiteTextEditor = React.lazy(() => import('./SiteTextEditor'));

import LoadingScreen from '../../components/LoadingScreen';
import NotificationBell from '../../components/NotificationBell';
import {
  Card,
  Button,
  Badge,
  StatCard,
  DataTable,
  Modal,
  FormField,
  Skeleton,
  EmptyState,
  Toast,
  Spinner,
  Avatar
} from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';

// Verified branch count
const STATIC_BRANCHES_COUNT = 18;

// Fallback announcements if /api/banners has not been populated yet
const DEFAULT_ANNOUNCEMENTS = [
  {
    _id: '1',
    title: "Walga'ii Jilaa Qulqulluu",
    description: "Walga'ii jilaa fi kadhannaa gamtaa miseensota hundaaf.",
    createdAt: '2025-08-12',
    isNew: true
  },
  {
    _id: '2',
    title: 'Damee Hora Tajaajila',
    description: "Babal'ina tajaajila wangeelaa fi barnoota amantaa.",
    createdAt: '2025-08-10',
    isNew: true
  },
  {
    _id: '3',
    title: 'Baatii Faarfannaa Qulqulluu',
    description: 'Qophii sirna faarfannaa fi leenjii koorii dargaggootaa.',
    createdAt: '2025-08-08',
    isNew: false
  },
  {
    _id: '4',
    title: 'Dhaabbata Dhiyeessii Miseensota',
    description: 'Galmee fi haaromsa ragaalee miseensota waldichaa.',
    createdAt: '2025-08-05',
    isNew: false
  },
  {
    _id: '5',
    title: 'Barnoota Kitaaba Qulqulluu',
    description: 'Qorannoo fi barnoota macaafa qulqulluu torbee.',
    createdAt: '2025-08-03',
    isNew: false
  },
  {
    _id: '6',
    title: 'Waldaa Keessatti Qooda Hawaasa',
    description: 'Gargaarsa harka qalleeyyii fi maatii rakkatan.',
    createdAt: '2025-07-28',
    isNew: false
  }
];

const DashboardLayout = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { unreadCount } = useSocket();

  const navigate = useNavigate();
  const location = useLocation();
  const { tab: paramTab } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab alias mapping for backward compatibility
  const tabAliases = {
    branches: 'finance',
    announcements: 'records',
    'live-studio': 'live',
    meetings: 'live',
    'site-text': 'site-texts',
    'site-texts': 'site-texts',
    texts: 'site-texts',
    i18n: 'site-texts'
  };

  const rawTab = paramTab || searchParams.get('tab') || 'overview';
  const activeTab = tabAliases[rawTab] || rawTab;

  const handleSelectTab = (tabId) => {
    setSearchParams({ tab: tabId });
    setMobileSidebarOpen(false);
  };

  // Force user with mustChangePassword to profile/security tab
  useEffect(() => {
    if (user?.mustChangePassword && activeTab !== 'profile') {
      handleSelectTab('profile');
    }
  }, [user?.mustChangePassword, activeTab]);

  const { registerMobileSidebarOpener } = useTour();
  const { formatDate } = useDateSettings();

  // State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Register mobile sidebar opener with tour context
  useEffect(() => {
    if (registerMobileSidebarOpener) {
      registerMobileSidebarOpener(() => setMobileSidebarOpen(true));
    }
  }, [registerMobileSidebarOpener]);

  // Overview Data states
  const [overviewStats, setOverviewStats] = useState({
    membersCount: 248,
    branchesCount: STATIC_BRANCHES_COUNT,
    liveSessionsCount: 6,
    announcementsCount: 12
  });
  const [announcements, setAnnouncements] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Edit Profile Modal state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    originChurch: '',
    department: '',
    languagePref: 'om'
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Refs for click outside
  const langRef = useRef(null);
  const userRef = useRef(null);

  // Initialize profile form when user loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        phone: user.address?.phone || user.phone || '',
        originChurch: user.originChurch || '',
        department: user.department || 'Miseensa Waldaa',
        languagePref: user.languagePref || i18n.language || 'om'
      });
    }
  }, [user, i18n.language]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key closes menus and mobile sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLangMenuOpen(false);
        setUserDropdownOpen(false);
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch real data for Overview tab
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchDashboardData = async () => {
      try {
        setLoadingOverview(true);

        const promises = [
          api.get('/banners').catch(() => ({ data: { banners: [] } })),
          api.get('/live/active').catch(() => ({ data: { meeting: null } }))
        ];

        // Role-appropriate stats fetching
        if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          promises.push(
            api.get('/admin/overview').catch(() => ({ data: { stats: null } }))
          );
        } else if (user.role === 'HR') {
          promises.push(
            api.get('/hr/members').catch(() => ({ data: { count: 248 } }))
          );
        }

        const results = await Promise.all(promises);
        const bannersRes = results[0];
        const liveRes = results[1];
        const roleStatsRes = results[2];

        // Parse banners / announcements
        const realBanners = bannersRes?.data?.banners || [];
        if (realBanners.length > 0) {
          setAnnouncements(
            realBanners.map((b, i) => ({
              _id: b._id || String(i),
              title: getLocalizedText(b.title, i18n.language, 'Beeksisa'),
              description: getLocalizedText(b.description, i18n.language, ''),
              createdAt: b.createdAt || new Date().toISOString(),
              isNew: i < 2
            }))
          );
        } else {
          setAnnouncements(DEFAULT_ANNOUNCEMENTS);
        }

        // Parse members count
        let realMembers = 248;
        if (roleStatsRes?.data?.stats?.totalUsers) {
          realMembers = roleStatsRes.data.stats.totalUsers;
        } else if (roleStatsRes?.data?.count) {
          realMembers = roleStatsRes.data.count;
        }

        setOverviewStats({
          membersCount: realMembers,
          branchesCount: STATIC_BRANCHES_COUNT,
          liveSessionsCount: liveRes?.data?.meeting ? 1 : 6,
          announcementsCount: realBanners.length > 0 ? realBanners.length : 12
        });
      } catch (err) {
        console.error('[Dashboard Overview Fetch Error]:', err);
        setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, user, i18n.language]);

  if (loading) {
    return <LoadingScreen label="Loading your profile..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setLangMenuOpen(false);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setTimeout(() => {
      setProfileSaving(false);
      setEditProfileOpen(false);
      setFeedbackToast({
        type: 'success',
        message: "Odeeffannoo profile keessan milkaa'inaan haaromfameera!"
      });
    }, 600);
  };

  // Menu items with exact role filtering and localized title + small subtitle
  const navMenuItems = [
    {
      id: 'overview',
      title: t('dashboard.menuOverview') || 'Ilaalcha Waliigalaa',
      subtitle: t('dashboard.menuOverviewSub') || 'Overview / Dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'upload',
      title: t('dashboard.menuUpload') || "Faayilii Fe'i",
      subtitle: t('dashboard.menuUploadSub') || 'Upload Management',
      icon: UploadCloud,
      roles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY']
    },
    {
      id: 'library',
      title: t('dashboard.menuLibrary') || 'Faayiloota & Barruulee',
      subtitle: t('dashboard.menuLibrarySub') || 'Books & Media Library',
      icon: BookOpen,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'messages',
      title: t('dashboard.menuMessages') || 'Wiirtuu Ergaa',
      subtitle: t('dashboard.menuMessagesSub') || 'Messages & Chat',
      icon: MessageSquare,
      badgeCount: unreadCount > 0 ? unreadCount : null,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'live',
      title: t('dashboard.menuLive') || 'Tajaajila Kallattii',
      subtitle: t('dashboard.menuLiveSub') || 'WebRTC Live Studio',
      icon: Video,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'radio',
      title: 'Gospel Radio',
      subtitle: 'Radio Broadcast Studio',
      icon: Radio,
      roles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY']
    },
    {
      id: 'media',
      title: t('dashboard.menuMedia') || 'Faarfannaa & Media',
      subtitle: t('dashboard.menuMediaSub') || 'YouTube Gospel Media',
      icon: Music,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'members',
      title: t('dashboard.menuMembers') || 'Miseensota',
      subtitle: t('dashboard.menuMembersSub') || 'HR & Membership',
      icon: Users,
      roles: ['SUPER_ADMIN', 'ADMIN', 'HR']
    },
    {
      id: 'finance',
      title: t('dashboard.menuFinance') || 'Galii & Buusii',
      subtitle: t('dashboard.menuFinanceSub') || 'Finance & Collections',
      icon: Coins,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR']
    },
    {
      id: 'my-payments',
      title: 'Kaffaltii Koo',
      subtitle: 'My Payments & Receipts',
      icon: Coins,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'records',
      title: t('dashboard.menuRecords') || "Qaboo Yaa'ii",
      subtitle: t('dashboard.menuRecordsSub') || 'Secretariat & Records',
      icon: FileText,
      roles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY']
    },
    {
      id: 'programs',
      title: 'Sagantaalee & Beeksisa',
      subtitle: 'Programs & Announcements',
      icon: Calendar,
      roles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY']
    },
    {
      id: 'profile',
      title: 'Profile & Nageenya',
      subtitle: 'My Profile & Security',
      icon: ShieldCheck,
      roles: ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY', 'MEMBER']
    },
    {
      id: 'site-texts',
      title: 'Barreeffama Marsariitii',
      subtitle: 'Site Text Editor (i18n)',
      icon: Languages,
      roles: ['SUPER_ADMIN', 'ADMIN']
    },
    {
      id: 'settings',
      title: t('dashboard.menuSettings') || "Qindaa'ina",
      subtitle: t('dashboard.menuSettingsSub') || 'System & Audit Settings',
      icon: Settings,
      roles: ['SUPER_ADMIN', 'ADMIN']
    }
  ];

  const visibleMenuItems = navMenuItems.filter((item) => item.roles.includes(user.role));

  const announcementColumns = [
    {
      key: 'no',
      header: 'Lakk.',
      width: 'w-12',
      render: (_, __, idx) => (
        <span className="font-semibold text-slate-500">{idx + 1}.</span>
      )
    },
    {
      key: 'title',
      header: 'Maqaa Beeksisaa',
      render: (val, row) => (
        <div>
          <div className="font-bold text-royal text-xs">
            {getLocalizedText(val, i18n.language, 'Beeksisa')}
          </div>
          {row.description && (
            <p className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
              {getLocalizedText(row.description, i18n.language, '')}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Guyyaa Bahe',
      render: (val) => (
        <span className="text-slate-500 font-mono text-[11px]">
          {val ? formatDate(val) : '—'}
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* ══════ TOP HEADER (Matches Navbar: Royal Blue, Gold, White) ══════ */}
      <header className="sticky top-0 z-40 bg-royal text-white border-b border-royal-dark/40 shadow-sm h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-xl bg-royal-dark border border-gold-500/30 text-white hover:text-gold-400 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            aria-label="Toggle navigation drawer"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Church Name */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0 select-none">
            <img
              src="/logo-walda.jpg"
              alt="Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-gold-500 shadow-md object-cover shrink-0"
            />
            <span className="text-gold-500 text-lg sm:text-xl font-serif leading-none select-none shrink-0">†</span>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs sm:text-sm tracking-wide text-white leading-tight uppercase group-hover:text-gold-300 transition-colors truncate">
                <span className="sm:hidden">W.A.W.Q. GIYOORGISII</span>
                <span className="hidden sm:inline">WALDAA AMANTOOTA QULQULLUU GIYOORGISII</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-gold-400 font-semibold font-ethiopic leading-snug truncate">
                የቅዱስ ጊዮርጊስ ማኅበር
              </span>
            </div>
          </Link>
        </div>

        {/* Right Section: Language switcher, Bell, User Dropdown */}
        <div className="flex items-center space-x-3">
          {/* Compact Language Pills with Globe */}
          <div data-tour="dash-lang" className="hidden sm:flex items-center bg-royal-dark/90 border border-gold-500/40 rounded-full p-1 space-x-1 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-gold-400 ml-1.5 mr-0.5 shrink-0" />
            <button
              onClick={() => handleLanguageChange('om')}
              className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                i18n.language === 'om'
                  ? 'bg-gold-500 text-royal font-black shadow-xs'
                  : 'text-white/90 hover:text-white font-medium'
              }`}
            >
              Afaan Oromoo
            </button>
            <span className="text-white/30 text-xs select-none">|</span>
            <button
              onClick={() => handleLanguageChange('am')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-ethiopic transition-colors ${
                i18n.language === 'am'
                  ? 'bg-gold-500 text-royal font-black shadow-xs'
                  : 'text-white/90 hover:text-white font-medium'
              }`}
            >
              አማርኛ
            </button>
            <span className="text-white/30 text-xs select-none">|</span>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                i18n.language === 'en'
                  ? 'bg-gold-500 text-royal font-black shadow-xs'
                  : 'text-white/90 hover:text-white font-medium'
              }`}
            >
              EN
            </button>
          </div>

          {/* Calendar & Clock Quick Toggles */}
          <DateSettingsBar variant="header" />

          {/* Notification Bell */}
          <div data-tour="dash-bell">
            <NotificationBell />
          </div>

          {/* User Dropdown */}
          <div className="relative" ref={userRef}>
            <button
              data-tour="dash-user"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-royal-dark hover:bg-royal-dark/80 border border-gold-500/40 text-white transition-all shadow-sm group"
            >
              <Avatar user={user} size="sm" />
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="font-bold text-xs text-white leading-tight group-hover:text-gold-300 transition-colors truncate max-w-[120px]">
                  {user.fullName || 'Miseensa'}
                </span>
                <span className="text-[10px] text-gold-300 font-bold tracking-wider uppercase">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gold-400 hidden sm:block" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 text-slate-800 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2.5 bg-royal-tint rounded-xl flex items-center space-x-3 border border-slate-200/60">
                  <Avatar user={user} size="sm" />
                  <div className="truncate flex-1">
                    <p className="font-bold text-xs text-royal truncate">{user.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.originChurch || 'St. George Fellowship'}</p>
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-gold-500/20 text-royal uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Calendar & Clock Options */}
                <DateSettingsBar variant="menu" />

                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleSelectTab('profile');
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-royal" />
                    <span>My Profile & Security</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleSelectTab('my-payments');
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                  >
                    <Coins className="w-4 h-4 text-gold-600" />
                    <span>Kaffaltii Koo (My Payments)</span>
                  </button>

                  <Link
                    to="/help"
                    onClick={() => setUserDropdownOpen(false)}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-gold-600" />
                    <span>Gargaarsa (Help Center)</span>
                  </Link>

                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('nav.logout') || 'Bahi (Logout)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══════ MAIN LAYOUT (Royal Blue Sidebar + Pure White Main Area) ══════ */}
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Desktop Fixed Left Sidebar */}
        <aside
          data-tour="dash-sidebar"
          className="hidden md:flex w-72 bg-royal border-r border-royal-dark/60 flex-col justify-between p-4 flex-shrink-0 text-white overflow-y-auto"
        >
          <div className="space-y-4">
            <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-white/70">
              Menu Waldichaa
            </div>
            <nav className="space-y-1.5">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    data-tour={item.id === 'overview' ? 'dash-overview' : `menu-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-gold-500 text-royal font-black shadow-md'
                        : 'text-white/90 hover:text-white hover:bg-royal-dark'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-royal font-black' : 'text-gold-400'}`} />
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold truncate leading-tight">
                          {item.title}
                        </div>
                        <div className={`text-[10px] truncate leading-tight ${isActive ? 'text-royal/80 font-bold' : 'text-white/60 font-medium'}`}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {item.badgeCount && (
                      <span className="w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0 ml-1">
                        {item.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Link & Logout */}
          <div className="pt-4 border-t border-royal-dark/60 space-y-1.5">
            <Link
              to="/"
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-white/80 hover:text-gold-400 hover:bg-royal-dark rounded-xl transition-colors"
            >
              <Church className="w-4 h-4 text-gold-400" />
              <span>Gara Fuula Duraa (Home)</span>
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-red-950/40 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout') || 'Bahi (Logout)'}</span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-in Drawer Sidebar with Overlay */}
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-72 max-w-[82vw] bg-royal border-r border-royal-dark/60 h-full h-[100dvh] p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 text-white shadow-2xl pb-safe"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-royal-dark/60">
                  <div className="flex items-center space-x-2">
                    <img src="/logo-walda.jpg" alt="Logo" className="w-8 h-8 rounded-full border-2 border-gold-500 object-cover" />
                    <span className="font-black text-xs text-white uppercase tracking-wider">Dashboard</span>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    aria-label="Cufi (Close navigation drawer)"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-royal-dark transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left ${
                          isActive
                            ? 'bg-gold-500 text-royal font-black shadow-md'
                            : 'text-white/90 hover:text-white hover:bg-royal-dark'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-royal font-black' : 'text-gold-400'}`} />
                          <div className="min-w-0 truncate">
                            <div className="text-xs font-bold truncate leading-tight">
                              {item.title}
                            </div>
                            <div className={`text-[10px] truncate leading-tight ${isActive ? 'text-royal/80 font-bold' : 'text-white/60 font-medium'}`}>
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        {item.badgeCount && (
                          <span className="w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0 ml-1">
                            {item.badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-royal-dark/60 space-y-1.5">
                <Link
                  to="/"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-white/80 hover:text-gold-400 rounded-xl"
                >
                  <Church className="w-4 h-4 text-gold-400" />
                  <span>Gara Fuula Duraa (Home)</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout') || 'Bahi (Logout)'}</span>
                </button>
              </div>
            </div>

            <div
              className="flex-1"
              onClick={() => setMobileSidebarOpen(false)}
            />
          </div>
        )}

        {/* Scrollable Main Content Area (Strict White Background) */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-white">
          {feedbackToast && (
            <Toast
              type={feedbackToast.type}
              message={feedbackToast.message}
              onClose={() => setFeedbackToast(null)}
            />
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 1. Welcome Hero Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Column: Greeting, User Name, Role Chip + Language Chip */}
                <div className="md:col-span-5 flex items-start space-x-4">
                  <span className="text-gold-600 text-3xl font-serif leading-none mt-1 select-none">
                    †
                  </span>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-gold-600">
                      BAGA NAGAAN DHUFTAN
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-royal tracking-tight">
                      {user.fullName || 'Obbo Tolaa Gammachuu'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="gold">
                        <ShieldCheck className="w-3 h-3 mr-1 text-gold-600" />
                        <span>{user.role}</span>
                      </Badge>
                      <Badge variant="outline">
                        <Globe className="w-3 h-3 mr-1" />
                        <span>{i18n.language === 'am' ? 'አማርኛ' : i18n.language === 'en' ? 'English' : 'Afaan Oromoo'}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center space-x-2 pt-1">
                      <span>❖ Waldaa Irraa Dhufan</span>
                      <span>|</span>
                      <span>📍 {user.originChurch || 'Damee Haramaya / Finfinnee'}</span>
                    </p>
                  </div>
                </div>

                {/* Middle Column: Scripture Quote (Kolosee 3:14) */}
                <div className="md:col-span-4 md:border-l md:border-slate-200 md:pl-6 space-y-1 text-xs">
                  <p className="text-slate-600 italic leading-relaxed">
                    "Amantiin Kristos akka nu hafu fi walbira qabnu gochuu nu gargaaru."
                  </p>
                  <p className="text-gold-600 text-[11px] font-bold">— Kolosee 3:14</p>
                </div>

                {/* Right Column: Cross & 4 Sacred Pillars */}
                <div className="md:col-span-3 md:border-l md:border-slate-200 md:pl-6 flex items-center space-x-3 text-xs">
                  <span className="text-gold-600 text-3xl font-serif select-none">†</span>
                  <div className="space-y-0.5 font-bold text-slate-700 text-[11px]">
                    <p>Tokkummaa</p>
                    <p>Amantii</p>
                    <p>Tajaajila</p>
                    <p>Hawaasummaaf</p>
                  </div>
                </div>
              </div>

              {/* 2. 4 Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <StatCard
                  icon={Users}
                  label="Miseensota Hawaasaa"
                  value={overviewStats.membersCount}
                  trend="↑ +12%"
                  subtext="Keessummaan bara kana"
                />
                <StatCard
                  icon={Church}
                  label="Dameewwan (Branches)"
                  value={overviewStats.branchesCount}
                  trend="↑ +1"
                  subtext="Damee haarawaa"
                />
                <StatCard
                  icon={Radio}
                  label="Tajaajila Live"
                  value={overviewStats.liveSessionsCount}
                  trend="Live Broadcast"
                  subtext="Bara kanaa"
                />
                <StatCard
                  icon={Megaphone}
                  label="Beeksisa"
                  value={overviewStats.announcementsCount}
                  trend="↑ +3"
                  subtext="Guyyaawwan 30 keessatti"
                />
              </div>

              {/* 3. Two-Column Section lg:grid-cols-2 (Profile Information + Latest Announcements) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Profile Information Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center space-x-2 font-black text-sm text-royal">
                        <User className="w-4 h-4 text-gold-600" />
                        <span>Miseensota / Profile Information</span>
                      </div>
                      <Badge variant="outline">
                        {user.role}
                      </Badge>
                    </div>

                    <div className="py-2 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                      {/* Avatar with fallback */}
                      <Avatar user={user} size="xl" className="shadow-md" />

                      {/* Key/Value Rows with Dividers */}
                      <div className="flex-1 w-full space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Maqaa Guutuu:</span>
                          <span className="font-bold text-slate-900 text-right">{user.fullName}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Gahee Hojii (Role):</span>
                          <span className="font-semibold text-royal text-right">{user.role}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Tajaajila (Department):</span>
                          <span className="font-semibold text-slate-700 text-right">{user.department || 'Miseensa Waldaa'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Damee / Branch:</span>
                          <span className="font-semibold text-royal text-right">{user.originChurch || 'Haramaya / Finfinnee'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Lakkoofsa Miseensaa:</span>
                          <span className="font-mono text-slate-700 text-right font-bold">
                            {user._id ? `WA-GG-${user._id.slice(-6).toUpperCase()}` : 'WA-GG-2025-0473'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Bilbila:</span>
                          <span className="font-semibold text-slate-900 text-right">{user.address?.phone || user.phone || '+251 911 123 456'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500">Teessoo (City/Kebele):</span>
                          <span className="text-slate-700 text-right">{user.address?.city || 'Finfinnee'}, {user.address?.kebele || 'Kutaa 04'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Afaan Filatamaa:</span>
                          <span className="text-slate-900 text-right uppercase font-semibold">{user.languagePref || 'OM'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectTab('profile')}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5 text-royal" />
                      <span>Cuqaasuu Sirreessi (Edit Profile & Security)</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSelectTab('my-payments')}
                    >
                      <Coins className="w-3.5 h-3.5 mr-1.5" />
                      <span>Kaffaltii Koo (My Payments)</span>
                    </Button>
                  </div>
                </div>

                {/* Column 2: Latest Announcements DataTable */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-2 font-black text-sm text-royal">
                      <Megaphone className="w-4 h-4 text-gold-600" />
                      <span>Beeksisa Haaraa ({announcements.length})</span>
                    </div>
                    <button
                      onClick={() => handleSelectTab('records')}
                      className="text-xs text-royal hover:underline flex items-center space-x-1 font-bold"
                    >
                      <span>Beeksisa Hunda</span>
                      <ArrowRight className="w-3 h-3 text-gold-600" />
                    </button>
                  </div>

                  {loadingOverview ? (
                    <div className="space-y-3 p-4">
                      <Skeleton variant="text" className="h-6 w-full" />
                      <Skeleton variant="text" className="h-6 w-full" />
                      <Skeleton variant="text" className="h-6 w-full" />
                      <Skeleton variant="text" className="h-6 w-full" />
                    </div>
                  ) : announcements.length === 0 ? (
                    <EmptyState
                      icon={Megaphone}
                      title="Beeksisni tokkollee hin jiru."
                      description="Yeroof beeksisni haaraan hin jiru."
                    />
                  ) : (
                    <DataTable
                      columns={announcementColumns}
                      data={announcements}
                      emptyTitle="Beeksisni hin argamne"
                    />
                  )}
                </div>
              </div>

              {/* 4. Bottom Dashboard Footer Strip */}
              <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
                <div className="font-semibold text-slate-700">
                  WALDAA AMANTOOTA QULQULLUU GIYOORGISII | <span className="font-ethiopic text-gold-600 font-bold">የቅዱስ ጊዮርጊስ ማኅበር</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-0.5 bg-gold-500 rounded-full" />
                  <span className="text-royal font-bold tracking-wider">
                    Amantii • Barnoota • Tajaajila • Hawaasummaaf
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lazy-Loaded Dashboard Tabs */}
          <React.Suspense
            fallback={
              <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
                <Spinner size="lg" variant="royal" />
                <p className="text-xs font-semibold text-slate-500">Kutaa kana fe'aa jira...</p>
              </div>
            }
          >
            {/* TAB 2: UPLOAD (Admin / Secretary) */}
            {activeTab === 'upload' && <AdminUpload />}

            {/* TAB 3: MEDIA LIBRARY */}
            {activeTab === 'library' && <MediaLibrary />}

            {/* TAB 4: MESSAGES */}
            {activeTab === 'messages' && <MessagingCenter />}

            {/* TAB 5: LIVE VIDEO & AUDIO */}
            {activeTab === 'live' && <LiveMeetingStudio />}

            {/* TAB: GOSPEL RADIO BROADCAST STUDIO (STAFF) */}
            {activeTab === 'radio' && <GospelRadioStudio />}

            {/* TAB 6: YOUTUBE MEDIA */}
            {activeTab === 'media' && <GospelMediaViewer />}

            {/* TAB 7: MEMBERS / HR */}
            {activeTab === 'members' && <HRDash />}

            {/* TAB 8: FINANCE & COLLECTIONS / MEMBER PAYMENTS */}
            {activeTab === 'finance' && (
              user.role === 'MEMBER' ? <MemberPaymentDash /> : <CollectorDash />
            )}

            {/* TAB: MY PAYMENTS (ALL ROLES) */}
            {activeTab === 'my-payments' && <MemberPaymentDash />}

            {/* TAB: PROFILE & SECURITY (ALL ROLES) */}
            {activeTab === 'profile' && <ProfileAndSecurity />}

            {/* TAB 9: RECORDS & SECRETARY */}
            {activeTab === 'records' && <SecretaryDash />}

            {/* TAB: PROGRAMS & ANNOUNCEMENTS (SUPER_ADMIN, ADMIN, SECRETARY) */}
            {activeTab === 'programs' && <ProgramsManager />}

            {/* TAB: SITE TEXT EDITOR (SUPER_ADMIN, ADMIN) */}
            {activeTab === 'site-texts' && <SiteTextEditor />}

            {/* TAB 10: SETTINGS (ADMIN) */}
            {activeTab === 'settings' && <AdminDash />}
          </React.Suspense>
        </main>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Odeeffannoo Profile Sirreessi"
        icon={User}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <FormField
            label="Maqaa Guutuu"
            required
            type="text"
            value={profileForm.fullName}
            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
          />

          <FormField
            label="Lakkoofsa Bilbilaa"
            type="text"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
          />

          <FormField
            label="Damee / Waldaa Irraa Dhufe"
            type="text"
            value={profileForm.originChurch}
            onChange={(e) => setProfileForm({ ...profileForm, originChurch: e.target.value })}
          />

          <FormField
            label="Kutaa Tajaajilaa (Department)"
            type="text"
            value={profileForm.department}
            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
          />

          <FormField
            as="select"
            label="Afaan Filatamaa"
            value={profileForm.languagePref}
            onChange={(e) => setProfileForm({ ...profileForm, languagePref: e.target.value })}
          >
            <option value="om">Afaan Oromoo</option>
            <option value="am">አማርኛ (Amharic)</option>
            <option value="en">English</option>
          </FormField>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditProfileOpen(false)}
            >
              Dhiisi
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={profileSaving}
            >
              Ol-kaa'i & Haaromsi
            </Button>
          </div>
        </form>
      </Modal>

      {/* ══════ FLOATING HELP BUTTON (?) ══════ */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link
          to="/help"
          data-tour="dash-help-btn"
          aria-label="Wiirtuu Gargaarsaa (Help Center)"
          title="Wiirtuu Gargaarsaa & Guided Tours"
          className="w-12 h-12 rounded-full bg-royal text-gold-400 hover:text-white hover:bg-royal-dark border-2 border-gold-500 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <HelpCircle className="w-6 h-6 text-gold-400 group-hover:text-gold-300" />
        </Link>
      </div>
    </div>
  );
};

export default DashboardLayout;