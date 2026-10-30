import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { fetchAndApplySiteTextOverrides } from './i18n';
import { AuthProvider } from './context/AuthContext';
import { DateSettingsProvider } from './context/DateSettingsContext';
import { SocketProvider } from './context/SocketContext';
import { RadioProvider } from './context/RadioContext';
import { TourProvider } from './context/TourContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GospelRadioMiniPlayer from './components/GospelRadioMiniPlayer';
import { Spinner } from './components/ui';

// Lazy-load Pages for Optimal Performance
const Home = React.lazy(() => import('./pages/public/Home'));
const AboutAndHistory = React.lazy(() => import('./pages/public/AboutAndHistory'));
const Services = React.lazy(() => import('./pages/public/Services'));
const MediaLibrary = React.lazy(() => import('./pages/public/MediaLibrary'));
const EventsPage = React.lazy(() => import('./pages/public/EventsPage'));
const AnnouncementsPage = React.lazy(() => import('./pages/public/AnnouncementsPage'));
const HelpCenter = React.lazy(() => import('./pages/public/HelpCenter'));
const NotFound = React.lazy(() => import('./pages/public/NotFound'));

// Auth Pages
const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));

// Dashboard Shell
const DashboardLayout = React.lazy(() => import('./pages/dashboard/DashboardLayout'));

const PageFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-400">
    <Spinner size="lg" />
    <span className="text-xs font-semibold text-slate-400">Fe'aa jira... (Loading)</span>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    fetchAndApplySiteTextOverrides();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 overflow-x-hidden">
      {!isDashboard && <Navbar />}
      <div className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutAndHistory />} />
            <Route path="/services" element={<Services />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/announcements/:id" element={<AnnouncementsPage />} />
            <Route path="/media-library" element={<MediaLibrary />} />
            <Route path="/library" element={<MediaLibrary />} />
            <Route path="/help" element={<HelpCenter />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Dashboard Route */}
            <Route path="/dashboard" element={<DashboardLayout />} />
            <Route path="/dashboard/:tab" element={<DashboardLayout />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      {!isDashboard && <Footer />}
      <GospelRadioMiniPlayer />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DateSettingsProvider>
          <SocketProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <RadioProvider>
                <TourProvider>
                  <AppContent />
                </TourProvider>
              </RadioProvider>
            </Router>
          </SocketProvider>
        </DateSettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
