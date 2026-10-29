import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

const TourContext = createContext(null);

export const TOUR_DEFINITIONS = {
  guest: {
    id: 'guest',
    title: {
      en: 'Welcome & Exploration Tour',
      om: 'Qajeelfama Daawwannaa Fuula Duraa',
      am: 'የዋና ገጽ ጉብኝት መመሪያ'
    },
    steps: [
      {
        target: '[data-tour="nav-brand"]',
        title: {
          en: 'Welcome to St. George Fellowship',
          om: 'Baga Nagaan Dhuftan',
          am: 'እንኳን በደህና መጡ'
        },
        content: {
          en: 'Official portal of Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii. Click anytime to return home.',
          om: 'Poortaalii seera-qabeessa Waldaa Qulqulluu Giyoorgisii. Yeroo barbaaddan gara fuula duraa deebi\'uuf cuqaasaa.',
          am: 'የሰማዕታት አለቃ ቅዱስ ጊዮርጊስ ማኅበር ይፋዊ ድረ-ገጽ። በማንኛውም ጊዜ ወደ ዋናው ገጽ ለመመለስ ይህንን ይጫኑ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="nav-lang"]',
        title: {
          en: 'Multilingual Selector',
          om: 'Filannoo Afaanii',
          am: 'የቋንቋ መምረጫ'
        },
        content: {
          en: 'Switch smoothly between Afaan Oromoo, አማርኛ, and English at any time.',
          om: 'Yeroo barbaaddanitti Afaan Oromoo, አማርኛ fi English gidduutti salphaatti jijjiirradhaa.',
          am: 'በኦሮምኛ፣ አማርኛ እና በእንግሊዝኛ መካከል በማንኛውም ጊዜ በቀላሉ ይቀያይሩ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="nav-login"]',
        title: {
          en: 'Member Sign-In',
          om: 'Seensa Miseensotaa',
          am: 'የአባላት መግቢያ'
        },
        content: {
          en: 'Registered members can click here to log into the private dashboard.',
          om: 'Miseensonni duraan galmooftan asitti cuqaasuun gara dashboard seenaa.',
          am: 'የተመዘገቡ አባላት እዚህ በመጫን ወደ ዳሽቦርድ መግባት ይችላሉ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="nav-help"]',
        title: {
          en: 'Help Center',
          om: 'Wiirtuu Gargaarsaa',
          am: 'የእርዳታ ማዕከል'
        },
        content: {
          en: 'Need assistance? Browse guides, step-by-step instructions, and FAQs here.',
          om: 'Gargaarsi isin barbaachisaa? Qajeelfamoota fi deebiiwwan gaaffii asitti argattu.',
          am: 'እርዳታ ይፈልጋሉ? ዝርዝር መመሪያዎችን እና የተለመዱ ጥያቄዎችን እዚህ ያገኛሉ።'
        },
        placement: 'bottom'
      }
    ]
  },

  dashboard: {
    id: 'dashboard',
    title: {
      en: 'Dashboard Overview Tour',
      om: 'Qajeelfama Ilaalcha Dashboard',
      am: 'የዳሽቦርድ አጠቃላይ ጉብኝት'
    },
    steps: [
      {
        target: '[data-tour="dash-sidebar"]',
        title: {
          en: 'Main Navigation Drawer',
          om: 'Saayidbaarii Tajaajilootaa',
          am: 'ዋናው የአገልግሎቶች ማውጫ'
        },
        content: {
          en: 'Quickly switch between Overview, Messages, Live Studio, Media Library, Payments, and Profile.',
          om: 'Kutaalee Dashboard, Ergaa, Tajaajila Live, Media, Kaffaltii fi Profile gidduutti socho\'aa.',
          am: 'በዳሽቦርድ፣ በመልዕክቶች፣ በቀጥታ ስርጭት፣ በሚዲያ፣ በክፍያዎች እና በመገለጫ መካከል በቀላሉ ይዘዋወሩ።'
        },
        placement: 'right'
      },
      {
        target: '[data-tour="dash-bell"]',
        title: {
          en: 'Live Notifications Bell',
          om: 'Bilbila Beeksisootaa',
          am: 'የማስታወቂያ ደውል'
        },
        content: {
          en: 'Receive instant notifications when payments are approved or live broadcasts start.',
          om: 'Yommuu kaffaltiin keessan mirkanaa\'u ykn live eegalu beeksisa battalatti asitti argattu.',
          am: 'ክፍያዎ ሲረጋገጥ ወይም የቀጥታ ስርጭት ሲጀመር ወዲያውኑ መልዕክት እዚህ ይደርስዎታል።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="dash-lang"]',
        title: {
          en: 'Language Preference',
          om: 'Filannoo Afaanii',
          am: 'የቋንቋ ምርጫ'
        },
        content: {
          en: 'Toggle your preferred language anytime: Afaan Oromoo, Amharic, or English.',
          om: 'Afaan Dashboard ittiin fayyadamuu barbaaddan asii jijjiirradhaa.',
          am: 'የዳሽቦርዱን ቋንቋ በማንኛውም ጊዜ ይቀይሩ: ኦሮምኛ፣ አማርኛ ወይም እንግሊዝኛ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="dash-user"]',
        title: {
          en: 'User Profile & Security',
          om: 'Profile fi Nageenya',
          am: 'መገለጫ እና ደህንነት'
        },
        content: {
          en: 'View your branch church, assigned role, edit your profile photo, or log out.',
          om: 'Waldaa irraa dhuftan, gahee hojii ilaalaa, suuraa jijjiiraa yookiin asii bahaa.',
          am: 'የመጡበትን ቤተክርስቲያን፣ የሥራ ድርሻዎን ይመልከቱ፣ ፎቶ ይቀይሩ ወይም ይውጡ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="dash-help-btn"]',
        title: {
          en: 'Floating Help Center Button',
          om: 'Furtuu Gargaarsaa Saffisaa (?)',
          am: 'ፈጣን የእርዳታ አዝራር (?)'
        },
        content: {
          en: 'Click this floating button anytime on any dashboard page to open Help or restart tours.',
          om: 'Qajeelfama dubbisuuf ykn tour deebisanii eegaluuf furtuu kana cuqaasaa.',
          am: 'መመሪያዎችን ለማንበብ ወይም ጉብኝቱን እንደገና ለመጀመር በማንኛውም ጊዜ ይህንን ይጫኑ።'
        },
        placement: 'left'
      }
    ]
  },

  collector: {
    id: 'collector',
    title: {
      en: 'Collector Tools Tour',
      om: 'Qajeelfama Funaanaa Buusii',
      am: 'የገንዘብ ሰብሳቢ መመሪያ'
    },
    steps: [
      {
        target: '[data-tour="collector-add-btn"]',
        title: {
          en: 'Record New Contribution',
          om: 'Buusii Haaraa Galmeessi',
          am: 'አዲስ መዋጮ መመዝገቢያ'
        },
        content: {
          en: 'Record manual cash, Telebirr, or CBE deposits directly on behalf of any registered member.',
          om: 'Qarshii callaa, Telebirr ykn baankii miseensotaarraa funaaname kallattiin galmeessaa.',
          am: 'ከአባላት በጥሬ ገንዘብ፣ በቴሌብር ወይም በባንክ የተሰበሰበውን መዋጮ በቀጥታ ይመዝግቡ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="collector-pending-tab"]',
        title: {
          en: 'Pending Verification Queue',
          om: 'Kaffaltii Eeggatu (Pending)',
          am: 'የማረጋገጫ መጠባበቂያ ዝርዝር'
        },
        content: {
          en: 'Inspect proof screenshots submitted online by members and approve or reject them.',
          om: 'Suuraa nagahee miseensonni ergan qorachuun mirkaneessaa ykn kufaa godhaa.',
          am: 'አባላት የላኩትን የክፍያ ስክሪንሾት በማየት ያረጋግጡ ወይም ውድቅ ያድርጉ።'
        },
        placement: 'bottom'
      }
    ]
  },

  hr: {
    id: 'hr',
    title: {
      en: 'HR & Membership Tour',
      om: 'Qajeelfama Qabeenya Namaa (HR)',
      am: 'የሰው ኃይል (HR) መመሪያ'
    },
    steps: [
      {
        target: '[data-tour="hr-member-table"]',
        title: {
          en: 'Member Directory',
          om: 'Galmee Miseensotaa',
          am: 'የአባላት ማህደር'
        },
        content: {
          en: 'Filter and search through all registered believers across branches and departments.',
          om: 'Miseensota damee fi kutaalee hundarra jiran salphaatti calalaa fi barbaadaa.',
          am: 'በሁሉም ቅርንጫፎች እና ክፍሎች ያሉትን የተመዘገቡ አባላት ይፈልጉ እና ያጣሩ።'
        },
        placement: 'top'
      },
      {
        target: '[data-tour="hr-idcard-btn"]',
        title: {
          en: 'Digital ID Card Generation',
          om: 'Waraqaa Eenyummaa Qopheessuu',
          am: 'የዲጂታል መታወቂያ ካርድ ማመንጫ'
        },
        content: {
          en: 'Generate, preview, and print dual-sided digital ID cards complete with QR codes and church seal.',
          om: 'Waraqaa eenyummaa QR koodii fi chaappaa waldichaa qabu qopheessaa maxxansaa.',
          am: 'የQR ኮድ እና የማኅበሩ ማኅተም ያለበትን የአባልነት መታወቂያ ካርድ አዘጋጅተው ያትሙ።'
        },
        placement: 'left'
      }
    ]
  },

  secretary: {
    id: 'secretary',
    title: {
      en: 'Secretariat & Records Tour',
      om: 'Qajeelfama Qaboo Yaa\'ii & Sanadaa',
      am: 'የሰነድ ማህደር እና ቃለ-ጉባኤ መመሪያ'
    },
    steps: [
      {
        target: '[data-tour="sec-new-doc-btn"]',
        title: {
          en: 'Draft Official Document',
          om: 'Sanada Haaraa Barreessi',
          am: 'አዲስ ሰነድ መጻፊያ'
        },
        content: {
          en: 'Record meeting minutes, official letters, and pastoral resolutions into the church archive.',
          om: 'Qaboo yaa\'ii, xalayaa seera-qabeessaa fi murteewwan galmee waldichaatti ol-kaa\'aa.',
          am: 'የስብሰባ ቃለ-ጉባኤዎችን፣ ይፋዊ ደብዳቤዎችን እና ውሳኔዎችን በማህደሩ ውስጥ ይመዝግቡ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="sec-view-stamp-btn"]',
        title: {
          en: 'View & Print with Church Stamp',
          om: 'Sanada Chaappaa Waliin Maxxansuu',
          am: 'ሰነድን ከማኅተም ጋር ማተሚያ'
        },
        content: {
          en: 'Open the formatted official document complete with the authentic church seal and print to PDF.',
          om: 'Sanadicha chaappaa diimaa/warqee waldichaa waliin banaa maxxanfadhaa.',
          am: 'ይፋዊውን ሰነድ ከማኅበሩ ማኅተም ጋር ከፍተው በወረቀት ወይም በፒዲኤፍ ያትሙ።'
        },
        placement: 'left'
      }
    ]
  },

  admin: {
    id: 'admin',
    title: {
      en: 'Admin & Programs Management Tour',
      om: 'Qajeelfama Bulchiinsaa fi Sagantaalee',
      am: 'የአድሚን እና የመርሐ-ግብር አስተዳደር መመሪያ'
    },
    steps: [
      {
        target: '[data-tour="prog-subtabs"]',
        title: {
          en: 'Programs & Announcements Manager',
          om: 'Wiirtuu Sagantaalee fi Beeksisaa',
          am: 'የመርሐ-ግብሮች እና የማስታወቂያ ማዕከል'
        },
        content: {
          en: 'Manage Announcements, Events, Weekly Prayer Times, Live Broadcasting, and Hero Banners in one place.',
          om: 'Beeksisa, Sagantaalee, Sagantaa Torbee, Tajaajila Live fi Faajjiiwwan bakka tokkotti bulchaa.',
          am: 'ማስታወቂያዎችን፣ መርሐ-ግብሮችን፣ የሳምንት ጸሎቶችን፣ የቀጥታ ስርጭትን እና ባነሮችን በአንድ ቦታ ያስተዳድሩ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="prog-create-btn"]',
        title: {
          en: 'Multilingual Content Publishing',
          om: 'Qabiyyee Afaan 3\'n Maxxansuu',
          am: 'ይዘቶችን በ3 ቋንቋ ማተሚያ'
        },
        content: {
          en: 'Create content in Afaan Oromoo, አማርኛ, and English with Cloudinary images, dates, and member notifications.',
          om: 'Qabiyyee afaan 3\'n, suuraa Cloudinary fi beeksisa miseensotaa waliin qopheessaa.',
          am: 'በ3 ቋንቋዎች፣ ከፎቶ እና ለአባላት ከሚላክ መልዕክት ጋር አዳዲስ ይዘቶችን ያትሙ።'
        },
        placement: 'bottom'
      }
    ]
  },

  live: {
    id: 'live',
    title: {
      en: 'Live Broadcast Studio Tour',
      om: 'Qajeelfama Tajaajila Kallattii (Live)',
      am: 'የቀጥታ ስርጭት ስቱዲዮ መመሪያ'
    },
    steps: [
      {
        target: '[data-tour="live-video-screen"]',
        title: {
          en: 'Interactive Video Display',
          om: 'Skiriinii Vidiyoo Kallattii',
          am: 'የቀጥታ ቪዲዮ ስክሪን'
        },
        content: {
          en: 'Stream high-definition spiritual sermons, choir singing, and liturgical worship in real time.',
          om: 'Tajaajila lallabaa, faarfannaa fi barnoota hafuuraa qulqullina olaanaadhaan kallattiin daawwadhaa.',
          am: 'ትምህርተ ወንጌልን፣ ዝማሬዎችን እና ጸሎቶችን በከፍተኛ ጥራት በቀጥታ ይከታተሉ።'
        },
        placement: 'bottom'
      },
      {
        target: '[data-tour="live-camera-btn"]',
        title: {
          en: 'Camera Controls',
          om: 'To\'annaa Kaameeraa',
          am: 'የካሜራ መቆጣጠሪያ'
        },
        content: {
          en: 'Turn your camera on or off anytime during interactive sessions with browser permission.',
          om: 'Kaameeraa keessan yeroo barbaaddanitti banaa yookiin cufaa.',
          am: 'ካሜራዎን በማንኛውም ጊዜ ማብራት ወይም ማጥፋት ይችላሉ።'
        },
        placement: 'top'
      },
      {
        target: '[data-tour="live-mic-btn"]',
        title: {
          en: 'Microphone Controls',
          om: 'To\'annaa Maayikii',
          am: 'የማይክሮፎን መቆጣጠሪያ'
        },
        content: {
          en: 'Mute or unmute your voice. The host can also manage speaking permissions.',
          om: 'Sagalee keessan callisiisaa ykn banaa. Kaaadhimtoota sagalee hogganaan to\'ata.',
          am: 'ድምጽዎን መዝጋት ወይም መክፈት ይችላሉ፤ አስተናጋጁም የመናገር ፈቃድ መስጠት ይችላል።'
        },
        placement: 'top'
      },
      {
        target: '[data-tour="live-chat-panel"]',
        title: {
          en: 'Live Prayer Chat',
          om: 'Wiirtuu Kadhannaa fi Haasawa',
          am: 'የቀጥታ የጸሎት ውይይት'
        },
        content: {
          en: 'Type prayer requests, amen greetings, and spiritual questions in the real-time chat room.',
          om: 'Gaaffii hafuuraa, kadhannaa fi nagaa miseensotaaf haasawa kallattiin barreessaa.',
          am: 'የጸሎት ጥያቄዎችን፣ አሜን የሚሉ ቃላትን እና ጥያቄዎችን በቀጥታ ይላኩ።'
        },
        placement: 'left'
      }
    ]
  }
};

export const TourProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTour, setActiveTour] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [targetElement, setTargetElement] = useState(null);
  const [onMobileSidebarOpenCallback, setOnMobileSidebarOpenCallback] = useState(null);

  const resizeObserverRef = useRef(null);

  // Helper to get localized step text
  const getLocalized = useCallback((obj) => {
    if (!obj) return '';
    return obj[currentLang] || obj.en || obj.om || '';
  }, [currentLang]);

  // Check if tour was already completed
  const isTourCompleted = useCallback((tourId) => {
    const key = user
      ? `tour_completed_${user._id}_${tourId}_v1`
      : `tour_completed_guest_${tourId}_v1`;
    return localStorage.getItem(key) === 'true';
  }, [user]);

  // Mark tour as completed
  const markTourCompleted = useCallback((tourId) => {
    const key = user
      ? `tour_completed_${user._id}_${tourId}_v1`
      : `tour_completed_guest_${tourId}_v1`;
    localStorage.setItem(key, 'true');
  }, [user]);

  // Start a specific tour
  const startTour = useCallback((tourId, stepIndex = 0) => {
    const def = TOUR_DEFINITIONS[tourId];
    if (!def || !def.steps || def.steps.length === 0) return;

    setActiveTour(tourId);
    setCurrentStepIndex(stepIndex);
  }, []);

  // Stop / Skip active tour
  const stopTour = useCallback((markDone = true) => {
    if (activeTour && markDone) {
      markTourCompleted(activeTour);
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
    setTargetRect(null);
    setTargetElement(null);
  }, [activeTour, markTourCompleted]);

  // Restart a tour cleanly
  const restartTour = useCallback((tourId) => {
    const key = user
      ? `tour_completed_${user._id}_${tourId}_v1`
      : `tour_completed_guest_${tourId}_v1`;
    localStorage.removeItem(key);
    startTour(tourId, 0);
  }, [user, startTour]);

  // Register mobile sidebar open handler from DashboardLayout
  const registerMobileSidebarOpener = useCallback((opener) => {
    setOnMobileSidebarOpenCallback(() => opener);
  }, []);

  // Auto-start dashboard tour once upon first login
  useEffect(() => {
    if (isAuthenticated && user && location.pathname.startsWith('/dashboard')) {
      const tourKey = `tour_completed_${user._id}_dashboard_v1`;
      if (!localStorage.getItem(tourKey)) {
        const timer = setTimeout(() => {
          startTour('dashboard', 0);
        }, 900);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, user, location.pathname, startTour]);

  // Find target element and measure rectangle
  const currentTourDef = activeTour ? TOUR_DEFINITIONS[activeTour] : null;
  const currentStep = currentTourDef?.steps?.[currentStepIndex] || null;

  const updateTargetMeasurements = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      setTargetElement(null);
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      // If mobile and target is inside drawer, try to open mobile sidebar if callback registered
      if (window.innerWidth < 768 && currentStep.target.includes('dash-sidebar') && onMobileSidebarOpenCallback) {
        onMobileSidebarOpenCallback();
      }

      el.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });

      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
      setTargetElement(el);
    } else {
      // Gracefully skip missing step instead of breaking
      setTargetRect(null);
      setTargetElement(null);
    }
  }, [currentStep, onMobileSidebarOpenCallback]);

  // Re-measure on step change, resize, scroll
  useEffect(() => {
    if (!activeTour || !currentStep) return;

    // Small delay to let DOM render
    const timeout = setTimeout(updateTargetMeasurements, 150);

    const handleScrollOrResize = () => {
      updateTargetMeasurements();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
    };
  }, [activeTour, currentStep, currentStepIndex, updateTargetMeasurements]);

  // Next step handler (skips elements if target missing)
  const nextStep = useCallback(() => {
    if (!currentTourDef) return;

    if (currentStepIndex < currentTourDef.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      stopTour(true);
    }
  }, [currentTourDef, currentStepIndex, stopTour]);

  // Previous step handler
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Keyboard accessibility: Escape to skip, Enter / ArrowRight to next, ArrowLeft to prev
  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopTour(true);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, nextStep, prevStep, stopTour]);

  // Calculate tooltip coordinates relative to viewport
  const calculateTooltipPosition = () => {
    const isMobile = window.innerWidth < 640;
    const tooltipWidth = isMobile ? Math.min(window.innerWidth - 32, 340) : 380;
    const tooltipHeight = 220; // approximate
    const margin = 12;

    if (!targetRect) {
      // Center on screen if no target element or offscreen
      return {
        top: Math.max(80, window.innerHeight / 2 - 120),
        left: Math.max(16, (window.innerWidth - tooltipWidth) / 2),
        width: tooltipWidth
      };
    }

    const placement = currentStep?.placement || 'bottom';
    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = targetRect.bottom + margin;
      left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
    } else if (placement === 'top') {
      top = targetRect.top - tooltipHeight - margin;
      left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
    } else if (placement === 'right') {
      top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
      left = targetRect.right + margin;
    } else if (placement === 'left') {
      top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
      left = targetRect.left - tooltipWidth - margin;
    }

    // Keep tooltip inside screen bounds
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (top < 70) top = 70;
    if (top + tooltipHeight > window.innerHeight - 20) {
      top = window.innerHeight - tooltipHeight - 20;
    }

    return { top, left, width: tooltipWidth };
  };

  const tooltipPos = calculateTooltipPosition();
  const totalSteps = currentTourDef?.steps?.length || 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Localized navigation button labels
  const labelNext = currentLang === 'am' ? 'ቀጣይ' : currentLang === 'en' ? 'Next' : 'Itti fufi';
  const labelBack = currentLang === 'am' ? 'ተመለስ' : currentLang === 'en' ? 'Back' : "Deebi'i";
  const labelSkip = currentLang === 'am' ? 'ዝለል' : currentLang === 'en' ? 'Skip' : 'Dhiisi';
  const labelDone = currentLang === 'am' ? 'ጨርስ' : currentLang === 'en' ? 'Done' : 'Xumuri';
  const labelStep = currentLang === 'am' ? 'ደረጃ' : currentLang === 'en' ? 'Step' : 'Tarkaanfii';

  return (
    <TourContext.Provider
      value={{
        activeTour,
        startTour,
        stopTour,
        restartTour,
        isTourCompleted,
        registerMobileSidebarOpener
      }}
    >
      {children}

      {/* Guided Tour Spotlight & Tooltip Overlay */}
      {activeTour && currentStep && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto select-none" role="dialog" aria-modal="true">
          {/* Dark semi-transparent backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] transition-opacity duration-200"
            onClick={() => stopTour(true)}
            aria-hidden="true"
          />

          {/* Spotlight Cutout / Bounding Highlight Box */}
          {targetRect && (
            <div
              className="absolute pointer-events-none rounded-xl transition-all duration-300 border-2 border-gold-400 shadow-[0_0_0_9999px_rgba(1,26,66,0.65),0_0_24px_rgba(212,175,55,0.6)]"
              style={{
                top: Math.max(0, targetRect.top - 6),
                left: Math.max(0, targetRect.left - 6),
                width: targetRect.width + 12,
                height: targetRect.height + 12
              }}
            />
          )}

          {/* Floating Tooltip Card */}
          <div
            className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 transition-all duration-200 z-50 flex flex-col"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              width: `${tooltipPos.width}px`
            }}
          >
            {/* Header: Royal blue gradient with gold emblem */}
            <div className="bg-royal px-4 py-3 text-white flex items-center justify-between border-b border-royal-dark">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wider text-gold-300">
                  {getLocalized(currentTourDef.title)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopTour(true)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-royal-dark transition-colors"
                aria-label={labelSkip}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-royal bg-royal-tint px-2.5 py-0.5 rounded-full border border-royal/20">
                  {labelStep} {currentStepIndex + 1} / {totalSteps}
                </span>

                {/* Progress dot indicators */}
                <div className="flex items-center space-x-1">
                  {currentTourDef.steps.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentStepIndex
                          ? 'w-4 bg-gold-500'
                          : 'w-1.5 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h4 className="font-black text-sm sm:text-base text-slate-900 leading-snug">
                {getLocalized(currentStep.title)}
              </h4>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {getLocalized(currentStep.content)}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => stopTour(true)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                {labelSkip}
              </button>

              <div className="flex items-center space-x-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{labelBack}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center space-x-1 px-4 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-royal font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition-all"
                >
                  <span>{isLastStep ? labelDone : labelNext}</span>
                  {isLastStep ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

export default TourContext;
