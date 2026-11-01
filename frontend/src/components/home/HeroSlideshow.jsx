import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { getLocalizedText } from '../../utils/localized';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  BookOpen,
  ArrowRight,
  Users,
  LayoutDashboard
} from 'lucide-react';
import './HeroSlideshow.css';

// SLIDE_INTERVAL_MS at the top: allowed range 8000-15000ms
export const SLIDE_INTERVAL_MS = 10000;

// Default fallback slide metadata in case i18n array isn't populated
const DEFAULT_HERO_SLIDES = [
  {
    src: '/hero/hero1.jpg',
    alt: 'St. George Icon and Church Fellowship Banner',
    tagline: 'TOKKUMMAA AMANTOOTAA',
    headingPrefix: 'Waldaa Angafa Wareegamtoota Qulqulluu',
    highlight: 'Giyoorgisii',
    headingSuffix: '',
    subtitle: "Tokkummaa amantootaa cimsachuu, tajaajila wangeelaa babal'isuu fi gargaarsa hawaasummaa wal-ta'iinsaan raawwachuuf dhaabbate."
  },
  {
    src: '/hero/hero2.jpg',
    alt: 'Orthodox Church Sanctuary Exterior and Sacred Cross',
    tagline: 'TAJAAJILA QULQULLUU',
    headingPrefix: 'Tokkummaa Amantootaa fi Tajaajila',
    highlight: 'Wangeelaa',
    headingSuffix: '',
    subtitle: 'Sagalee Waaqayyoo barsiisuu, qorannoo macaafa qulqulluu fi jireenya hafuuraa cimsuu.'
  },
  {
    src: '/hero/hero3.jpg',
    alt: 'Congregation Worship and Liturgical Prayer Fellowship',
    tagline: 'KADHANNNAA FI JAALALA',
    headingPrefix: 'Hawaasa Amantootaa fi Kadhannaa',
    highlight: 'Kristos',
    headingSuffix: '',
    subtitle: 'Kadhannaa gamtaa, qiddaasee fi tajaajila hafuuraa yeroo hunda geggeeffamu.'
  },
  {
    src: '/hero/hero4.jpg',
    alt: 'Sunset Church Spire and Liturgical Light',
    tagline: 'TAJAAJILA DARGAGGOOTAA',
    headingPrefix: 'Faarfannaa fi Barnoota',
    highlight: 'Amantaa',
    headingSuffix: '',
    subtitle: 'Dargaggoota daandii qajeelaa qabsiisuu, leenjii faarfannaa fi afaan Gi\'eezii baruu.'
  },
  {
    src: '/hero/hero5.jpg',
    alt: 'Church Dome and Divine Fellowship in Christ',
    tagline: 'ARJOOMINA FI HAWAASUMMAA',
    headingPrefix: 'Gargaarsa Harka Qalleeyyii fi',
    highlight: 'Jaalala',
    headingSuffix: '',
    subtitle: 'Harka qalleeyyii gargaaruu, maatii dhabeeyyii deeggaruu fi arjoomina kiristiyaanummaa.'
  }
];

export const HeroSlideshow = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [adminBanners, setAdminBanners] = useState([]);

  // Fetch active banners from /api/banners
  const fetchBanners = useCallback(async () => {
    try {
      const res = await api.get('/banners');
      if (res.data?.success && Array.isArray(res.data.banners)) {
        // Filter only active banners with an imageUrl
        const active = res.data.banners.filter((b) => b.isActive !== false && b.imageUrl);
        setAdminBanners(active);
      }
    } catch (err) {
      // Quiet fallback to default hero slides
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Listen to socket content_updated for banners
  useEffect(() => {
    if (!socket) return;
    const handleContentUpdate = (data) => {
      if (data?.type === 'banner' || !data?.type) {
        fetchBanners();
      }
    };
    socket.on('content_updated', handleContentUpdate);
    return () => {
      socket.off('content_updated', handleContentUpdate);
    };
  }, [socket, fetchBanners]);

  // Touch tracking for mobile swipe
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const containerRef = useRef(null);

  // Load localized default slides from i18n
  const localizedSlides = t('home.heroSlides', { returnObjects: true });
  const defaultSlides = DEFAULT_HERO_SLIDES.map((fallback, idx) => {
    const loc = Array.isArray(localizedSlides) && localizedSlides[idx] ? localizedSlides[idx] : {};
    return {
      src: fallback.src,
      alt: loc.alt || fallback.alt,
      tagline: loc.tagline || fallback.tagline,
      headingPrefix: loc.headingPrefix || fallback.headingPrefix,
      highlight: loc.highlight || fallback.highlight,
      headingSuffix: loc.headingSuffix || fallback.headingSuffix,
      subtitle: loc.subtitle || fallback.subtitle
    };
  });

  // Convert admin banners into slide format
  const bannerSlides = adminBanners.map((banner) => {
    const titleText = getLocalizedText(banner.title, currentLang, 'Waldaa Qulqulluu Giyoorgisii');
    const descText = getLocalizedText(banner.description, currentLang, '');
    const words = titleText.trim().split(' ');
    const highlight = words.length > 1 ? words.pop() : words[0];
    const headingPrefix = words.length > 1 ? words.join(' ') : '';

    return {
      src: banner.imageUrl,
      alt: titleText,
      tagline: 'BEEKSA HAARAA',
      headingPrefix: headingPrefix || titleText,
      highlight: headingPrefix ? highlight : '',
      headingSuffix: '',
      subtitle: descText
    };
  });

  // Admin banners become extra slides ahead of the fallback default images
  const slides = bannerSlides.length > 0 ? [...bannerSlides, ...defaultSlides] : defaultSlides;

  const totalSlides = slides.length;

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Preload next slide's image
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % totalSlides;
    const preloadImg = new Image();
    preloadImg.src = slides[nextIndex].src;
  }, [currentIndex, slides, totalSlides]);

  // Navigate functions
  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handleGoTo = useCallback((idx) => {
    setCurrentIndex(idx);
  }, []);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only capture when container or its children have focus or when hovering
      if (isFocused || isHovered) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isFocused, isHovered]);

  // Auto-advance timer (cleared on unmount, paused on hover/focus/manual pause/reduced motion)
  useEffect(() => {
    if (prefersReducedMotion || isPaused || isHovered || isFocused) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [prefersReducedMotion, isPaused, isHovered, isFocused, totalSlides]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || !e.changedTouches || e.changedTouches.length === 0) {
      return;
    }

    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    const deltaY = (touchStartYRef.current || 0) - e.changedTouches[0].clientY;

    // Only swipe if horizontal move was greater than vertical and exceeds threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const currentSlide = slides[currentIndex];

  return (
    <section
      ref={containerRef}
      className="relative w-full hero-viewport flex items-center justify-center overflow-hidden select-none bg-royal-900"
      role="region"
      aria-roledescription="carousel"
      aria-label="Orthodox Hero Slideshow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      {/* ════════ Background Slides Stack ════════ */}
      <div className="absolute inset-0 z-0">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          const kenBurnsClass = `hero-kenburns-${idx % 5}`;

          return (
            <div
              key={`${slide.src}-${idx}`}
              className={`absolute inset-0 hero-slide-wrapper overflow-hidden ${
                prefersReducedMotion
                  ? isActive
                    ? 'opacity-100 z-10'
                    : 'opacity-0 z-0 pointer-events-none'
                  : `transition-opacity duration-[1500ms] ease-in-out ${
                      isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`
              }`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                loading={idx === 0 ? 'eager' : 'lazy'}
                fetchpriority={idx === 0 ? 'high' : 'auto'}
                className={`w-full h-full object-cover ${
                  isActive && !prefersReducedMotion ? kenBurnsClass : ''
                }`}
              />
            </div>
          );
        })}

        {/* Royal-blue gradient overlay (#013E97 at 80% to 55%) for maximum text contrast */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(1, 62, 151, 0.82) 0%, rgba(1, 62, 151, 0.58) 100%)'
          }}
          aria-hidden="true"
        />
      </div>

      {/* ════════ Prev & Next Buttons ════════ */}
      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-1.5 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-royal flex items-center justify-center transition-all duration-200 shadow-md backdrop-blur-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        className="absolute right-1.5 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-royal flex items-center justify-center transition-all duration-200 shadow-md backdrop-blur-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" aria-hidden="true" />
      </button>

      {/* ════════ Top Right Pause/Play Accessible Control ════════ */}
      <button
        type="button"
        onClick={() => setIsPaused((prev) => !prev)}
        className="absolute top-3 right-3 sm:top-6 sm:right-6 z-30 p-2 sm:p-2.5 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white border border-white/20 backdrop-blur-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
        title={isPaused ? 'Play slideshow' : 'Pause slideshow'}
      >
        {isPaused ? (
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-400 fill-gold-400" aria-hidden="true" />
        ) : (
          <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" aria-hidden="true" />
        )}
      </button>

      {/* ════════ Center Slide Content (Re-keyed on index change for staggered entrance) ════════ */}
      <div
        key={currentIndex}
        className="relative max-w-4xl mx-auto px-10 sm:px-14 lg:px-8 py-8 sm:py-16 text-center z-30 flex flex-col items-center justify-center space-y-3 sm:space-y-6"
        aria-live={isPaused ? 'polite' : 'off'}
      >
        {/* Small Gold Tagline */}
        <div className="hero-anim-tagline inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-[10px] sm:text-xs font-black tracking-widest uppercase">
          <span className="text-gold-400 select-none">†</span>
          <span>{currentSlide.tagline}</span>
        </div>

        {/* Big White Heading with Highlighted Gold Word & Fluid clamp */}
        <h1 className="hero-anim-heading text-[clamp(1.5rem,5.5vw,3.75rem)] font-black text-white tracking-tight leading-tight sm:leading-tight drop-shadow-md break-words">
          {currentSlide.headingPrefix}{' '}
          <span className="hero-gold-highlight">{currentSlide.highlight}</span>
          {currentSlide.headingSuffix ? ` ${currentSlide.headingSuffix}` : ''}
        </h1>

        {/* Subtitle with fluid clamp */}
        <p className="hero-anim-subtitle text-[clamp(0.8rem,2.8vw,1.05rem)] text-white/95 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-xs break-words">
          {currentSlide.subtitle}
        </p>

        {/* Action Buttons: Stacks on mobile, inline on desktop, 44px touch targets */}
        <div className="hero-anim-actions pt-2 sm:pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
          <Link
            to="/services"
            className="hero-btn-primary px-6 py-3 rounded-full font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg min-h-[44px]"
          >
            <BookOpen className="w-4 h-4 text-royal" aria-hidden="true" />
            <span>Tajaajila Keenya</span>
            <ArrowRight className="w-4 h-4 text-royal" aria-hidden="true" />
          </Link>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-5 py-3 rounded-full bg-white text-royal hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md hover:-translate-y-0.5 transition-all min-h-[44px]"
            >
              <LayoutDashboard className="w-4 h-4 text-royal" aria-hidden="true" />
              <span>Go to Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/register"
              className="px-5 py-3 rounded-full bg-white/15 hover:bg-white text-white hover:text-royal border border-white/50 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md hover:-translate-y-0.5 transition-all min-h-[44px]"
            >
              <Users className="w-4 h-4 text-gold-400" aria-hidden="true" />
              <span>Miseensa Ta'i</span>
            </Link>
          )}
        </div>
      </div>

      {/* ════════ Slide Indicators (Accessible Touch Targets) ════════ */}
      <div
        className="absolute bottom-4 sm:bottom-7 inset-x-0 z-30 flex items-center justify-center space-x-1 sm:space-x-2"
        role="tablist"
        aria-label="Slide indicators"
      >
        {slides.map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={idx}
              type="button"
              role="tab"
              onClick={() => handleGoTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={isActive ? 'true' : 'false'}
              className="p-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            >
              <span
                className={`h-2 rounded-full transition-all duration-300 block ${
                  isActive
                    ? 'w-7 sm:w-8 bg-gold-400 shadow-sm'
                    : 'w-2 sm:w-2.5 bg-white/45 hover:bg-white/80'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default HeroSlideshow;
