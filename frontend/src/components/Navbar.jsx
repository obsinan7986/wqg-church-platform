import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { changeLanguage } from '../i18n';
import api from '../api/axios';
import {
  Globe,
  Bell,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Lock,
  BookOpen,
  Home as HomeIcon,
  Megaphone,
  HeartHandshake,
  Shield,
  Coins,
  MessageSquare,
  Radio,
  HelpCircle
} from 'lucide-react';
import { Avatar } from './ui';
import NotificationBell from './NotificationBell';
import DateSettingsBar from './DateSettingsBar';

export const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide Navbar completely on dashboard routes to prevent double header
  if (location.pathname.startsWith('/dashboard')) {
    return null;
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [liveMeeting, setLiveMeeting] = useState(null);

  const userRef = useRef(null);
  const mobileDrawerRef = useRef(null);

  // Check active live meeting on mount and socket events
  useEffect(() => {
    let isMounted = true;

    const checkActiveMeeting = async () => {
      try {
        const res = await api.get('/live/active');
        if (isMounted && res.data?.success && res.data.meeting) {
          setLiveMeeting(res.data.meeting);
        } else if (isMounted) {
          setLiveMeeting(null);
        }
      } catch (e) {
        if (isMounted) setLiveMeeting(null);
      }
    };

    checkActiveMeeting();

    if (socket) {
      socket.on('live_status_changed', (payload) => {
        if (payload?.status === 'LIVE' || payload?.meeting?.status === 'LIVE') {
          checkActiveMeeting();
        } else {
          if (isMounted) setLiveMeeting(null);
        }
      });
      socket.on('live_ended', () => {
        if (isMounted) setLiveMeeting(null);
      });
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('live_status_changed');
        socket.off('live_ended');
      }
    };
  }, [socket]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Esc key closes all menus & drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile focus trap
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const drawer = mobileDrawerRef.current;
    if (!drawer) return;

    const focusableElements = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) firstElement.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    drawer.addEventListener('keydown', handleTabKey);
    return () => drawer.removeEventListener('keydown', handleTabKey);
  }, [mobileMenuOpen]);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav links: Mana, Seenaa, Tajaajiloota, Beeksisa, Gargaarsa, Seeni/Login (or Dashboard)
  const navTabs = [
    { name: 'Mana (Home)', path: '/', icon: HomeIcon },
    { name: 'Seenaa (History)', path: '/about', icon: BookOpen },
    { name: 'Tajaajiloota (Services)', path: '/services', icon: HeartHandshake },
    { name: 'Beeksisa', path: '/media-library', icon: Megaphone },
    { name: 'Gargaarsa (Help)', path: '/help', icon: HelpCircle },
    {
      name: isAuthenticated ? 'Dashboard' : 'Seeni/Login',
      path: isAuthenticated ? '/dashboard' : '/login',
      icon: isAuthenticated ? LayoutDashboard : Lock
    }
  ];

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* ══════ ROW 1: ROYAL BLUE HEADER (#013E97) ══════ */}
      <div className="bg-royal text-white border-b border-royal-dark/40 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: St. George logo with gold ring + gold cross + bilingual church name */}
          <Link
            to="/"
            data-tour="nav-brand"
            className="flex items-center space-x-3 group select-none flex-shrink-0"
            aria-label="Waldaa Amantoota Qulqulluu Giyoorgisii Home"
          >
            <div className="relative">
              <img
                src="/logo-walda.jpg"
                alt="St. George Logo"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-gold-500 shadow-md object-cover group-hover:scale-105 transition-transform"
              />
            </div>

            {/* Sacred Gold Orthodox Cross */}
            <span className="text-gold-500 text-2xl font-serif leading-none select-none" aria-hidden="true">
              †
            </span>

            {/* Church Title and Ge'ez Subtitle */}
            <div className="flex flex-col">
              <span className="font-black text-xs sm:text-sm lg:text-[15px] tracking-wide text-white leading-tight uppercase group-hover:text-gold-300 transition-colors">
                WALDAA ANGAFAA WAREEGAMTOOTA QULQULLUU GIYOORGISII
              </span>
              <span className="text-gold-400 text-[11px] sm:text-xs font-semibold font-ethiopic leading-snug">
                የቅዱስ ጊዮርጊስ ማኅበር
              </span>
            </div>
          </Link>

          {/* Right Section Desktop */}
          <div className="hidden lg:flex items-center space-x-3.5">
            {/* Compact Language Selector Pills with Globe */}
            <div
              data-tour="nav-lang"
              className="flex items-center bg-royal-dark/90 border border-gold-500/40 rounded-full p-1 space-x-1 shadow-xs"
              role="group"
              aria-label="Language selector"
            >
              <Globe className="w-3.5 h-3.5 text-gold-500 ml-1.5 mr-0.5 shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleLanguageChange('om')}
                className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                  i18n.language === 'om'
                    ? 'bg-gold-500 text-royal font-black shadow-xs'
                    : 'text-white/90 hover:text-white font-medium'
                }`}
                aria-pressed={i18n.language === 'om'}
              >
                Afaan Oromoo
              </button>
              <span className="text-white/30 text-xs select-none">|</span>
              <button
                type="button"
                onClick={() => handleLanguageChange('am')}
                className={`px-2.5 py-0.5 rounded-full text-xs font-ethiopic transition-colors ${
                  i18n.language === 'am'
                    ? 'bg-gold-500 text-royal font-black shadow-xs'
                    : 'text-white/90 hover:text-white font-medium'
                }`}
                aria-pressed={i18n.language === 'am'}
              >
                አማርኛ
              </button>
              <span className="text-white/30 text-xs select-none">|</span>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-gold-500 text-royal font-black shadow-xs'
                    : 'text-white/90 hover:text-white font-medium'
                }`}
                aria-pressed={i18n.language === 'en'}
              >
                EN
              </button>
            </div>

            {/* Calendar & Clock System Quick Toggles */}
            <DateSettingsBar variant="header" />

            {/* Notification Bell */}
            <div data-tour="nav-bell">
              <NotificationBell />
            </div>

            {/* When Logged In: User Chip + Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  data-tour="nav-user"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-royal-dark hover:bg-royal-dark/80 border border-gold-500/40 text-white transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <Avatar user={user} size="sm" />
                  <div className="flex flex-col text-left leading-tight hidden xl:flex">
                    <span className="font-bold text-xs text-white truncate max-w-[120px]">
                      {user.fullName || 'Miseensa'}
                    </span>
                    <span className="text-[10px] text-gold-300 truncate">
                      {user.originChurch || user.address?.city || 'Guyoorgisii'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gold-400" />
                </button>

                {/* Dropdown Panel (White card under the chip) */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 text-slate-800 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Mini Header */}
                    <div className="p-2.5 bg-royal-tint rounded-xl flex items-center space-x-3 border border-slate-200/60">
                      <Avatar user={user} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-royal truncate">{user.fullName}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {user.originChurch || 'Guyoorgisii'}
                        </p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-gold-500/20 text-royal uppercase tracking-wider">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {/* Calendar & Clock Preferences */}
                    <DateSettingsBar variant="menu" />

                    {/* LIVE Alert Line (Shown only when a live meeting is running) */}
                    {liveMeeting && (
                      <Link
                        to="/dashboard?tab=live"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors group"
                      >
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                        </span>
                        <Radio className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="truncate">LIVE: Walga'iin amma jalqabeera!</span>
                      </Link>
                    )}

                    {/* Dropdown Buttons: Dashboard, Ergaa, Profile, Payments, Bahii */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-royal" />
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        to="/dashboard/messages"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-royal" />
                        <span>Ergaa (Messages)</span>
                      </Link>

                      <Link
                        to="/dashboard/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                      >
                        <Shield className="w-4 h-4 text-royal" />
                        <span>My Profile & Security</span>
                      </Link>

                      <Link
                        to="/dashboard/my-payments"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                      >
                        <Coins className="w-4 h-4 text-gold-600" />
                        <span>Kaffaltii Koo (My Payments)</span>
                      </Link>

                      <Link
                        to="/help"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-royal hover:bg-royal-tint rounded-xl transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-gold-600" />
                        <span>Gargaarsa (Help Center)</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Bahii (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest: Gold Login Button with royal text */
              <Link
                to="/login"
                data-tour="nav-login"
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-gold-500 hover:bg-gold-400 text-royal font-black text-xs shadow-sm transition-transform active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Seeni / Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Right Controls: Bell + Hamburger */}
          <div className="lg:hidden flex items-center space-x-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-royal-dark border border-gold-500/40 text-white hover:text-gold-300"
              aria-label={mobileMenuOpen ? 'Cufi (Close menu)' : 'Bani (Open menu)'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ══════ ROW 2: ROYAL BLUE STRIP WITH TAB-STYLE LINKS ══════ */}
      <div className="bg-royal border-t border-royal-dark/60 hidden lg:block px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-2">
          {navTabs.map((tab) => {
            const isActive =
              tab.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.path);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.path}
                to={tab.path}
                data-tour={tab.path === '/help' ? 'nav-help' : undefined}
                className={`inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold transition-all select-none ${
                  isActive
                    ? 'bg-white text-royal rounded-t-xl font-black shadow-xs relative top-[1px]'
                    : 'text-white/90 hover:text-white hover:border-b-2 hover:border-gold-500 pb-2'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-royal' : 'text-gold-500'
                  }`}
                />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ══════ MOBILE DRAWER ══════ */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={mobileDrawerRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-white h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <img
                    src="/logo-walda.jpg"
                    alt="Logo"
                    className="w-8 h-8 rounded-full border-2 border-gold-500 object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-black text-xs text-royal uppercase tracking-wider">
                      WQG WALDAA
                    </span>
                    <span className="text-[10px] text-gold-600 font-ethiopic font-semibold">
                      የቅዱስ ጊዮርጊስ
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* LIVE Alert Banner in Mobile Drawer if active */}
              {liveMeeting && (
                <Link
                  to="/dashboard?tab=live"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold"
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                  <span>LIVE: Walga'iin amma jalqabeera!</span>
                </Link>
              )}

              {/* Navigation Links */}
              <nav className="flex flex-col space-y-1.5">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive =
                    tab.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(tab.path);
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-3 transition-colors ${
                        isActive
                          ? 'bg-royal text-white shadow-sm font-black'
                          : 'text-slate-700 hover:bg-royal-tint hover:text-royal'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gold-500'}`} />
                      <span>{tab.name}</span>
                    </Link>
                  );
                })}

                {isAuthenticated && (
                  <>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-3 text-slate-700 hover:bg-royal-tint hover:text-royal"
                    >
                      <Shield className="w-4 h-4 text-gold-500" />
                      <span>My Profile & Security</span>
                    </Link>
                    <Link
                      to="/dashboard/my-payments"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-3 text-slate-700 hover:bg-royal-tint hover:text-royal"
                    >
                      <Coins className="w-4 h-4 text-gold-500" />
                      <span>Kaffaltii Koo (My Payments)</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Drawer Footer: Language & Auth */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              {/* Language Switch */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Afaan / Language
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('om')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      i18n.language === 'om'
                        ? 'bg-gold-500 text-royal font-black'
                        : 'bg-royal-tint border border-slate-200 text-slate-700'
                    }`}
                  >
                    Afaan Oromoo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('am')}
                    className={`py-1.5 rounded-lg text-xs font-bold font-ethiopic transition-all ${
                      i18n.language === 'am'
                        ? 'bg-gold-500 text-royal font-black'
                        : 'bg-royal-tint border border-slate-200 text-slate-700'
                    }`}
                  >
                    አማርኛ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      i18n.language === 'en'
                        ? 'bg-gold-500 text-royal font-black'
                        : 'bg-royal-tint border border-slate-200 text-slate-700'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Mobile Calendar & Clock Setting */}
              <DateSettingsBar variant="menu" />

              {/* Login / Logout */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center space-x-2 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Bahii (Logout)</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gold-500 text-royal font-black text-xs flex items-center justify-center space-x-2 shadow-sm hover:bg-gold-400 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Seeni / Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
