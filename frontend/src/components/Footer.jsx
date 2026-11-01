import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { getLocalizedText } from '../utils/localized';
import { Phone, Mail, MapPin, Globe } from 'lucide-react';

// Social Icon Helper
const FooterSocialIcon = ({ platform }) => {
  const p = (platform || '').toUpperCase();
  switch (p) {
    case 'FACEBOOK':
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'YOUTUBE':
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'TELEGRAM':
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.3-.616.3l.204-3.042 5.54-5.006c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.868.886z" />
        </svg>
      );
    case 'TIKTOK':
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.49 2.74 1.34-.05 2.54-.92 2.97-2.18.15-.47.21-.97.21-1.47V.02h-.87z" />
        </svg>
      );
    case 'INSTAGRAM':
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'WHATSAPP':
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      );
    default:
      return null;
  }
};

const Footer = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { socket } = useSocket();

  const [settings, setSettings] = useState(null);

  const fetchFooterSettings = async () => {
    try {
      const res = await api.get('/site-settings/contact');
      if (res.data?.success) {
        setSettings(res.data.settings);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchFooterSettings();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchFooterSettings();
    socket.on('content_updated', handleUpdate);
    socket.on('site_settings_updated', handleUpdate);
    return () => {
      socket.off('content_updated', handleUpdate);
      socket.off('site_settings_updated', handleUpdate);
    };
  }, [socket]);

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
  };

  const email = settings?.emails?.[0] || 'waldaa.giyoorgisii23@gmail.com';
  const phone = settings?.phones?.[0] || '+251 91 100 0001';
  const address =
    getLocalizedText(settings?.address, currentLang) || 'Finfinnee / Oromia / Ethiopia';
  const socialLinks = (settings?.socialLinks || []).filter((s) => s.enabled && s.url);

  return (
    <footer className="bg-royal text-white border-t border-royal-dark">
      {/* Upper Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <img
                src="/logo-walda.jpg"
                alt="Waldaa Qulqulluu Giyoorgisii"
                className="w-12 h-12 rounded-full border-2 border-gold-500 shadow-md object-cover"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  WALDAA AMANTOOTA QULQULLUU GIYOORGISII
                </span>
                <span className="text-xs text-gold-400 font-medium font-ethiopic">
                  የቅዱስ ጊዮርጊስ ማኅበር
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/80 max-w-md leading-relaxed">
              Tokkummaa amantootaa cimsachuu, tajaajila wangeelaa babal'isuu fi gargaarsa hawaasummaa
              wal-ta'iinsaan raawwachuuf dhaabbate.
            </p>
            <div className="flex items-center space-x-2 text-xs text-gold-400 font-medium">
              <span>{t('brand.tagline')}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-gold-400 font-bold text-xs tracking-wider uppercase">
              Kutaalee Waldichaa
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-white/80 hover:text-gold-300 transition-colors">
                  {t('nav.home') || 'Mana'}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-white/80 hover:text-gold-300 transition-colors">
                  {t('nav.about') || "Waa'ee & Seenaa"}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-white/80 hover:text-gold-300 transition-colors">
                  {t('nav.services') || 'Tajaajiloota'}
                </Link>
              </li>
              <li>
                <Link
                  to="/announcements"
                  className="text-white/80 hover:text-gold-300 transition-colors"
                >
                  Beeksisoota (Announcements)
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gold-400 font-bold hover:text-gold-300 transition-colors">
                  {t('nav.contact') || 'Nu Qunnamaa (Contact)'}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-white/80 hover:text-gold-300 transition-colors">
                  Miseensa Ta'i (Register)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Language Selector */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-gold-400 font-bold text-xs tracking-wider uppercase">
                Teessoo fi Quunnamtii
              </h4>
              <ul className="space-y-2 text-xs text-white/80">
                <li className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                  <span className="truncate">{address}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                  <a href={`tel:${phone}`} className="hover:underline">
                    {phone}
                  </a>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                  <a href={`mailto:${email}`} className="hover:underline truncate">
                    {email}
                  </a>
                </li>
              </ul>
            </div>

            {/* Language Switcher in Footer */}
            <div className="pt-2 border-t border-royal-dark/60 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs text-white/80">
                <Globe className="w-3.5 h-3.5 text-gold-400" />
                <span className="font-semibold text-[11px] uppercase tracking-wider text-white">
                  Afaan / Language
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('om')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    i18n.language === 'om'
                      ? 'bg-gold-500 text-royal shadow-xs font-black'
                      : 'bg-royal-dark border border-gold-500/30 text-white/90 hover:text-white'
                  }`}
                >
                  Oromo
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('am')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all font-ethiopic ${
                    i18n.language === 'am'
                      ? 'bg-gold-500 text-royal shadow-xs font-black'
                      : 'bg-royal-dark border border-gold-500/30 text-white/90 hover:text-white'
                  }`}
                >
                  አማርኛ
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    i18n.language === 'en'
                      ? 'bg-gold-500 text-royal shadow-xs font-black'
                      : 'bg-royal-dark border border-gold-500/30 text-white/90 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sacred Scripture & Social Bar */}
      <div className="border-t border-royal-dark bg-royal-dark py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left: Cross + Church Name */}
          <div className="flex items-center space-x-2 font-semibold text-white">
            <span className="text-gold-400 text-base font-serif leading-none select-none">†</span>
            <span className="tracking-tight">Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii</span>
          </div>

          {/* Center: Scripture Quote */}
          <div className="text-center text-white/80 italic text-[11px] sm:text-xs">
            "Hundumtuu akka baraniif, hundumtuus akka gorfamaniif hundumti keessan waan waqayyo isinit muldhise darabeedhaan himuu ni dandeessu ." <span className="text-gold-400 font-semibold not-italic"> 1 Qorontos 14:31</span>
          </div>

          {/* Right: Round Dynamic Social Icons */}
          <div className="flex items-center space-x-2.5">
            {socialLinks.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-gold-400/80 text-gold-400 hover:bg-gold-500 hover:text-royal flex items-center justify-center transition-all shadow-xs"
                title={s.platform}
                aria-label={s.platform}
              >
                <FooterSocialIcon platform={s.platform} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
