import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { Phone, Mail, MapPin, Globe } from 'lucide-react';

const Footer = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
  };

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
              Tokkummaa amantootaa cimsachuu, tajaajila wangeelaa babal'isuu fi gargaarsa hawaasummaa wal-ta'iinsaan raawwachuuf dhaabbate.
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
                <Link to="/media-library" className="text-white/80 hover:text-gold-300 transition-colors">
                  Barruulee & Faayiloota (Library)
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
                  <span>Finfinnee / Oromia / Ethiopia</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                  <span>+251 91 100 0001</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                  <span>waldaa.giyoorgisii23@gmail.com</span>
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

          {/* Right: Round Gold Social Icons */}
          <div className="flex items-center space-x-2.5">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full border border-gold-400/80 text-gold-400 hover:bg-gold-500 hover:text-royal flex items-center justify-center text-[10px] font-bold transition-all"
              title="Facebook"
            >
              f
            </a>
            <a
              href="www.youtube.com/@WaldaaQulqulluuGiyoorgisii"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full border border-gold-400/80 text-gold-400 hover:bg-gold-500 hover:text-royal flex items-center justify-center text-[10px] font-bold transition-all"
              title="YouTube"
            >
              ▶
            </a>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full border border-gold-400/80 text-gold-400 hover:bg-gold-500 hover:text-royal flex items-center justify-center text-[10px] font-bold transition-all"
              title="Telegram"
            >
              ✈
            </a>
            <a
              href="/"
              className="w-7 h-7 rounded-full border border-gold-400/80 text-gold-400 hover:bg-gold-500 hover:text-royal flex items-center justify-center text-[10px] font-bold transition-all"
              title="Website"
            >
              🌐
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;