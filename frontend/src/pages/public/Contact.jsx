import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDateSettings } from '../../context/DateSettingsContext';
import { getLocalizedText } from '../../utils/localized';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Video,
  Radio,
  Lock,
  Send,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  Card,
  Container,
  Section,
  Button,
  Badge,
  Spinner
} from '../../components/ui';

// High-quality Brand SVG Icons for Social Platforms
const SocialBrandIcon = ({ platform }) => {
  const p = (platform || '').toUpperCase();
  switch (p) {
    case 'FACEBOOK':
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'YOUTUBE':
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'TELEGRAM':
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.3-.616.3l.204-3.042 5.54-5.006c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.868.886z" />
        </svg>
      );
    case 'TIKTOK':
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.49 2.74 1.34-.05 2.54-.92 2.97-2.18.15-.47.21-.97.21-1.47V.02h-.87z" />
        </svg>
      );
    case 'INSTAGRAM':
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'WHATSAPP':
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      );
    default:
      return <ExternalLink className="w-4 h-4" />;
  }
};

const Contact = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const { formatDual } = useDateSettings();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    subject: '',
    message: '',
    _gotcha: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/site-settings/contact');
      if (res.data?.success) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error('[Contact Settings Error]:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Real-time listener for live updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchSettings();
    };

    socket.on('content_updated', handleUpdate);
    socket.on('site_settings_updated', handleUpdate);
    socket.on('live_meeting_status', handleUpdate);

    return () => {
      socket.off('content_updated', handleUpdate);
      socket.off('site_settings_updated', handleUpdate);
      socket.off('live_meeting_status', handleUpdate);
    };
  }, [socket, fetchSettings]);

  // Copy to clipboard helper
  const handleCopy = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.contact.trim() || !formData.message.trim()) {
      setFormError('Maaloo maqaa, qunnamtii (imeelii/bilbila) fi ergaa guutaa.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/contact', formData);
      if (res.data?.success) {
        setSubmitSuccess(true);
        setFormData({
          name: '',
          contact: '',
          subject: '',
          message: '',
          _gotcha: ''
        });
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setFormError(t('contact.tooManyRequests'));
      } else {
        setFormError(
          err.response?.data?.message || 'Ergaan hin ergamne. Maaloo irra deebi\'aa yaalaa.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const emails = settings?.emails || ['waldaa.giyoorgisii23@gmail.com'];
  const phones = settings?.phones || ['+251911000001'];
  const addressText = getLocalizedText(settings?.address, currentLang);
  const officeHoursText = getLocalizedText(settings?.officeHours, currentLang);
  const socialLinks = (settings?.socialLinks || []).filter((s) => s.enabled && s.url);
  const liveMeeting = settings?.liveMeeting;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ══════ ROYAL BLUE HERO HEADER ══════ */}
      <section className="bg-royal text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-royal-dark/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-royal via-royal to-royal-dark opacity-90 pointer-events-none" />
        <Container className="relative z-10 max-w-5xl text-center space-y-4">
          <Badge variant="solid-gold" className="inline-flex items-center space-x-1.5 shadow-md">
            <Mail className="w-3.5 h-3.5 mr-1" />
            <span>Nu Qunnamaa • Contact Us</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {t('contact.title')}
          </h1>

          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed font-medium">
            {t('contact.subtitle')}
          </p>
        </Container>
      </section>

      {/* ══════ MAIN CONTENT CONTAINER ══════ */}
      <Section className="py-12 px-4 sm:px-6 lg:px-8">
        <Container className="max-w-6xl space-y-12">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500 text-xs">
              <Spinner size="lg" />
              <span>Odeeffannoo qunnamtii fe'aa jira...</span>
            </div>
          ) : (
            <>
              {/* ══════ LIVE MEETING CARD (FEATURED) ══════ */}
              {liveMeeting && (
                <div
                  className={`rounded-3xl p-6 sm:p-8 transition-all border ${
                    liveMeeting.isLive
                      ? 'bg-gradient-to-r from-red-950 via-navy-950 to-royal text-white border-red-500/80 shadow-2xl ring-2 ring-red-500/30'
                      : 'bg-white text-slate-900 border-slate-200 shadow-lg'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Meeting Info */}
                    <div className="space-y-3 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        {liveMeeting.isLive ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white shadow-md animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-ping" />
                            {t('contact.liveNow')}
                          </span>
                        ) : (
                          <Badge variant="solid-gold">
                            <Radio className="w-3.5 h-3.5 mr-1" />
                            <span>Online Fellowship</span>
                          </Badge>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-royal-tint text-royal border border-royal/20 uppercase tracking-wide">
                          {liveMeeting.platform || 'ZOOM'}
                        </span>

                        {liveMeeting.visibility === 'MEMBERS' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <Lock className="w-3 h-3 mr-1" />
                            <span>Miseensota Qofa (Members Only)</span>
                          </span>
                        )}
                      </div>

                      <h2
                        className={`text-xl sm:text-2xl font-black tracking-tight ${
                          liveMeeting.isLive ? 'text-white' : 'text-royal'
                        }`}
                      >
                        {getLocalizedText(liveMeeting.title, currentLang) ||
                          t('contact.liveMeetingTitle')}
                      </h2>

                      {/* Schedule Text */}
                      {liveMeeting.scheduleText && (
                        <p
                          className={`text-xs sm:text-sm font-medium ${
                            liveMeeting.isLive ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 inline mr-1 text-gold-500" />
                          <span>{getLocalizedText(liveMeeting.scheduleText, currentLang)}</span>
                        </p>
                      )}

                      {/* Next Start Date & Time */}
                      {liveMeeting.nextStartAt && (
                        <p
                          className={`text-xs font-semibold ${
                            liveMeeting.isLive ? 'text-gold-300' : 'text-slate-500'
                          }`}
                        >
                          <span>Yeroo Itti Aanu (Next): </span>
                          <span className="text-gold-600 font-bold">
                            {formatDual(liveMeeting.nextStartAt)}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Right: Join / Credentials Action Box */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-3 shrink-0">
                      {liveMeeting.requiresAuth && !isAuthenticated ? (
                        <div className="space-y-2 text-left md:text-right">
                          <p className="text-xs text-amber-600 font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            <span>{t('contact.loginToJoin')}</span>
                          </p>
                          <Link to="/login">
                            <Button variant="solid-gold" size="md">
                              {t('nav.login')}
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          {liveMeeting.url && (
                            <a
                              href={liveMeeting.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all transform active:scale-95 ${
                                liveMeeting.isLive
                                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50'
                                  : 'bg-gold-500 hover:bg-gold-400 text-royal shadow-gold-500/20'
                              }`}
                            >
                              <Video className="w-4 h-4" />
                              <span>{t('contact.joinLive')}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Credentials with Copy Buttons */}
                          {(liveMeeting.meetingId || liveMeeting.passcode) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                              {liveMeeting.meetingId && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy('meetingId', liveMeeting.meetingId)}
                                  className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border transition-colors ${
                                    liveMeeting.isLive
                                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                  }`}
                                  title="Copy Meeting ID"
                                >
                                  <span className="font-semibold">{t('contact.meetingId')}:</span>
                                  <span className="font-mono font-bold">
                                    {liveMeeting.meetingId}
                                  </span>
                                  {copiedKey === 'meetingId' ? (
                                    <Check className="w-3.5 h-3.5 text-green-500 ml-1" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-400 ml-1" />
                                  )}
                                </button>
                              )}

                              {liveMeeting.passcode && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy('passcode', liveMeeting.passcode)}
                                  className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border transition-colors ${
                                    liveMeeting.isLive
                                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                  }`}
                                  title="Copy Passcode"
                                >
                                  <span className="font-semibold">{t('contact.passcode')}:</span>
                                  <span className="font-mono font-bold">
                                    {liveMeeting.passcode}
                                  </span>
                                  {copiedKey === 'passcode' ? (
                                    <Check className="w-3.5 h-3.5 text-green-500 ml-1" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-400 ml-1" />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════ 4 CONTACT CARDS GRID ══════ */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Official Email */}
                <Card className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-royal/20 flex items-center justify-center text-royal">
                      <Mail className="w-6 h-6 text-royal" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {t('contact.emailCardTitle')}
                      </h3>
                      <p className="text-xs text-slate-500 pt-0.5">Imeelii waldichaa</p>
                    </div>
                    <div className="space-y-2 pt-1">
                      {emails.map((email, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100"
                        >
                          <a
                            href={`mailto:${email}`}
                            className="font-medium text-royal hover:underline truncate mr-2"
                          >
                            {email}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(`email-${idx}`, email)}
                            className="p-1 text-slate-400 hover:text-royal shrink-0"
                            title="Copy email"
                          >
                            {copiedKey === `email-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* 2. Official Phone */}
                <Card className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-royal/20 flex items-center justify-center text-royal">
                      <Phone className="w-6 h-6 text-royal" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {t('contact.phoneCardTitle')}
                      </h3>
                      <p className="text-xs text-slate-500 pt-0.5">Bilbila waajjiraa</p>
                    </div>
                    <div className="space-y-2 pt-1">
                      {phones.map((phone, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100"
                        >
                          <a
                            href={`tel:${phone}`}
                            className="font-medium text-royal hover:underline truncate mr-2"
                          >
                            {phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(`phone-${idx}`, phone)}
                            className="p-1 text-slate-400 hover:text-royal shrink-0"
                            title="Copy phone"
                          >
                            {copiedKey === `phone-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* 3. Address & Maps */}
                <Card className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-royal/20 flex items-center justify-center text-royal">
                      <MapPin className="w-6 h-6 text-royal" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {t('contact.addressCardTitle')}
                      </h3>
                      <p className="text-xs text-slate-500 pt-0.5">Teessoo fi iddoo</p>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {addressText || 'Finfinnee, Oromiyaa, Itoophiyaa'}
                    </p>
                  </div>

                  {settings?.mapUrl && (
                    <div className="pt-4 border-t border-slate-100">
                      <a
                        href={settings.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-bold text-royal hover:text-royal-dark transition-colors"
                      >
                        <span>{t('contact.openInMaps')}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </Card>

                {/* 4. Office Hours */}
                <Card className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-royal/20 flex items-center justify-center text-royal">
                      <Clock className="w-6 h-6 text-royal" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {t('contact.officeHoursCardTitle')}
                      </h3>
                      <p className="text-xs text-slate-500 pt-0.5">Yeroo hojii waldichaa</p>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {officeHoursText ||
                        'Wiixata - Jimaata: 2:30 - 11:30\nSanbata: 2:30 - 6:30'}
                    </p>
                  </div>
                </Card>
              </div>

              {/* ══════ SOCIAL LINKS BAR ══════ */}
              {socialLinks.length > 0 && (
                <Card className="p-6 border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-gold-500" />
                        <span>{t('contact.socialCardTitle')}</span>
                      </h3>
                      <p className="text-xs text-slate-500 pt-0.5">
                        Hordofaa, hirmaadhaa, sagalee wangeelaa babal'isaa.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {socialLinks.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-royal hover:text-white text-slate-800 transition-all border border-slate-200 shadow-xs"
                          title={s.platform}
                          aria-label={s.platform}
                        >
                          <SocialBrandIcon platform={s.platform} />
                          <span className="capitalize">{s.platform.toLowerCase()}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* ══════ CONTACT FORM & SPIRITUAL CARD ══════ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left (1 col): Spiritual Guidance Note */}
                <div className="space-y-6">
                  <div className="bg-royal text-white rounded-3xl p-8 space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
                    <span className="text-gold-400 text-3xl font-serif">†</span>
                    <h3 className="text-xl font-black tracking-tight text-white">
                      Kadhannaa fi Yaada Keessaniif
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                      "Waan kadhannaan kadhattan hundumaa akka argattan amanaa, isiniifis ni ta'a."
                    </p>
                    <span className="inline-block text-xs font-bold text-gold-400">
                      — Maarqos 11:24
                    </span>
                    <div className="pt-4 border-t border-white/20 text-xs text-white/80 space-y-2">
                      <p>• Kadhannaa fi eebba waldichaa</p>
                      <p>• Gaaffilee bu'uura amantaa</p>
                      <p>• Hirmaannaa tajaajila adda addaa</p>
                    </div>
                  </div>
                </div>

                {/* Right (2 cols): Contact Form */}
                <div className="lg:col-span-2">
                  <Card className="p-8 border-slate-200 bg-white shadow-md">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          {t('contact.sendMessageTitle')}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 pt-1">
                          {t('contact.sendMessageSubtitle')}
                        </p>
                      </div>

                      {submitSuccess ? (
                        <div className="p-6 rounded-2xl bg-green-50 border border-green-200 text-green-900 space-y-4 text-center animate-in fade-in">
                          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center">
                            <Check className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-black text-base">Milkaa'inaan Ergameera!</h4>
                            <p className="text-xs text-green-800">{t('contact.successMessage')}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSubmitSuccess(false)}
                          >
                            {t('contact.sendAnother')}
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                          {formError && (
                            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                              <span>{formError}</span>
                            </div>
                          )}

                          {/* Honeypot anti-spam field */}
                          <input
                            type="text"
                            name="_gotcha"
                            value={formData._gotcha}
                            onChange={(e) =>
                              setFormData({ ...formData, _gotcha: e.target.value })
                            }
                            style={{ display: 'none' }}
                            tabIndex="-1"
                            autoComplete="off"
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">
                                {t('contact.name')} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                maxLength={100}
                                required
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder={t('contact.namePlaceholder')}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none transition-all"
                              />
                            </div>

                            {/* Email / Phone */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">
                                {t('contact.contactInfo')} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                maxLength={120}
                                required
                                value={formData.contact}
                                onChange={(e) =>
                                  setFormData({ ...formData, contact: e.target.value })
                                }
                                placeholder={t('contact.contactInfoPlaceholder')}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Subject */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              {t('contact.subject')}
                            </label>
                            <input
                              type="text"
                              maxLength={150}
                              value={formData.subject}
                              onChange={(e) =>
                                setFormData({ ...formData, subject: e.target.value })
                              }
                              placeholder={t('contact.subjectPlaceholder')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none transition-all"
                            />
                          </div>

                          {/* Message */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              {t('contact.message')} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              rows={5}
                              maxLength={2000}
                              required
                              value={formData.message}
                              onChange={(e) =>
                                setFormData({ ...formData, message: e.target.value })
                              }
                              placeholder={t('contact.messagePlaceholder')}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none transition-all resize-y"
                            />
                          </div>

                          <div className="pt-2 flex items-center justify-end">
                            <Button
                              type="submit"
                              variant="solid-gold"
                              size="md"
                              disabled={submitting}
                              className="min-w-[150px] shadow-md"
                            >
                              {submitting ? (
                                <div className="flex items-center space-x-2">
                                  <Spinner size="sm" />
                                  <span>{t('contact.submitting')}</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5">
                                  <Send className="w-4 h-4" />
                                  <span>{t('contact.submit')}</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </Container>
      </Section>
    </div>
  );
};

export default Contact;
