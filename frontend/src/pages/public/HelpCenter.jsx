import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTour } from '../../context/TourContext';
import { changeLanguage } from '../../i18n';
import guideData from '../../help/guide.json';
import {
  HelpCircle,
  Search,
  BookOpen,
  ArrowRight,
  Play,
  ThumbsUp,
  ThumbsDown,
  Globe,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  Container,
  Section,
  Badge,
  Button,
  EmptyState
} from '../../components/ui';

const CATEGORIES = [
  { id: 'ALL', label: { en: 'All Topics', om: 'Mata-duree Hunda', am: 'ሁሉም ርዕሶች' } },
  { id: 'account', label: { en: 'Account & Login', om: 'Akkaawuntii & Seensa', am: 'መለያ እና መግቢያ' } },
  { id: 'communication', label: { en: 'Messages & Alerts', om: 'Ergaa & Beeksisa', am: 'መልዕክት እና ማስታወቂያ' } },
  { id: 'media', label: { en: 'Gospel Media & Radio', om: 'Media Wangeelaa & Raadiyoo', am: 'የወንጌል ሚዲያ እና ሬዲዮ' } },
  { id: 'finance', label: { en: 'Finance & Payments', om: 'Galii & Buusii', am: 'ክፍያ እና መዋጮ' } },
  { id: 'hr', label: { en: 'HR & Members', om: 'Miseensota & HR', am: 'የሰው ኃይል እና አባላት' } },
  { id: 'secretariat', label: { en: 'Records & Minutes', om: "Qaboo Yaa'ii & Sanada", am: 'ሰነድ እና ቃለ-ጉባኤ' } },
  { id: 'admin', label: { en: 'Admin & Programs', om: 'Bulchiinsa & Sagantaa', am: 'አድሚን እና መርሐ-ግብር' } },
  { id: 'troubleshooting', label: { en: 'Troubleshooting', om: 'Furmaata Rakkoolee', am: 'የችግሮች መፍትሔ' } }
];

const HelpCenter = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { user, isAuthenticated } = useAuth();
  const { startTour } = useTour();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isReviewModeRequested = searchParams.get('review') === '1';
  const isAuthorizedForReview = isAuthenticated && user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const showReviewMode = isReviewModeRequested && isAuthorizedForReview;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedSectionIds, setExpandedSectionIds] = useState(new Set(['login', 'submit-payment']));
  const [feedbacks, setFeedbacks] = useState({});

  // Helper to get localized field with fallback: current language -> English -> Oromo
  const getField = (obj) => {
    if (!obj) return '';
    return obj[currentLang] || obj.en || obj.om || '';
  };

  // Helper to get localized steps array with fallback
  const getSteps = (stepsObj) => {
    if (!stepsObj) return [];
    if (Array.isArray(stepsObj[currentLang]) && stepsObj[currentLang].length > 0) {
      return stepsObj[currentLang];
    }
    if (Array.isArray(stepsObj.en) && stepsObj.en.length > 0) {
      return stepsObj.en;
    }
    if (Array.isArray(stepsObj.om) && stepsObj.om.length > 0) {
      return stepsObj.om;
    }
    return [];
  };

  // Load existing feedback from localStorage
  useEffect(() => {
    const loaded = {};
    guideData.forEach((sec) => {
      const saved = localStorage.getItem(`help_feedback_${sec.id}`);
      if (saved) {
        loaded[sec.id] = saved;
      }
    });
    setFeedbacks(loaded);
  }, []);

  // Save feedback in localStorage
  const handleFeedback = (secId, type) => {
    localStorage.setItem(`help_feedback_${secId}`, type);
    setFeedbacks((prev) => ({ ...prev, [secId]: type }));
  };

  // Toggle card expansion
  const toggleExpand = (secId) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) {
        next.delete(secId);
      } else {
        next.add(secId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSectionIds(new Set(guideData.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSectionIds(new Set());
  };

  // Filter sections by user role and category and search query
  const filteredSections = useMemo(() => {
    return guideData.filter((sec) => {
      // 1. Role Access Guard
      if (!isAuthenticated || !user) {
        // Guests only see GUEST sections
        if (!sec.roles.includes('GUEST')) return false;
      } else {
        // Logged-in users:
        // SUPER_ADMIN and ADMIN see all
        if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
          // Normal users see GUEST or their exact role
          const canAccess =
            sec.roles.includes('GUEST') ||
            sec.roles.includes(user.role) ||
            (user.role === 'MEMBER' && sec.roles.includes('MEMBER'));
          if (!canAccess) return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && sec.category !== selectedCategory) {
        return false;
      }

      // 3. Search Query (matches title or any step in current language)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const titleText = getField(sec.title).toLowerCase();
        const summaryText = getField(sec.summary).toLowerCase();
        const stepsArr = getSteps(sec.steps).map((s) => s.toLowerCase());

        const matchesTitle = titleText.includes(query);
        const matchesSummary = summaryText.includes(query);
        const matchesSteps = stepsArr.some((step) => step.includes(query));

        if (!matchesTitle && !matchesSummary && !matchesSteps) {
          return false;
        }
      }

      return true;
    });
  }, [isAuthenticated, user, selectedCategory, searchQuery, currentLang]);

  // Handle tour trigger
  const handleStartTour = (tourId, path) => {
    if (path && location.pathname !== path) {
      navigate(path);
      setTimeout(() => startTour(tourId), 300);
    } else {
      startTour(tourId);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50/60 pb-20 text-slate-900 print:bg-white print:p-0">
      {/* ══════ HERO HEADER ══════ */}
      <div className="bg-royal text-white py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden print:hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]" />
        <Container className="relative z-10 max-w-5xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-royal-dark/60 text-gold-400 px-3 py-1 rounded-full text-xs font-bold border border-gold-500/30 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-gold-400" />
                <span>Wiirtuu Gargaarsaa fi Qajeelfama</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
                {currentLang === 'am'
                  ? 'የእርዳታ ማዕከል እና መመሪያዎች'
                  : currentLang === 'en'
                  ? 'Help Center & Guided Tours'
                  : 'Wiirtuu Gargaarsaa & Qajeelfama'}
              </h1>
              <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl">
                {currentLang === 'am'
                  ? 'የቅዱስ ጊዮርጊስ ማኅበርን ድረ-ገጽ በቀላሉ ለመጠቀም የሚያስችሉ ደረጃ በደረጃ የተዘጋጁ መመሪያዎች።'
                  : currentLang === 'en'
                  ? 'Step-by-step guides, walkthroughs, and troubleshooting tips for every feature.'
                  : 'Tajaajilaa fi sirna Waldaa Qulqulluu Giyoorgisii salphaatti fayyadamuuf qajeelfamoota asitti argattu.'}
              </p>
            </div>

            {/* Quick Language Switcher on page */}
            <div className="flex items-center space-x-1 bg-royal-dark/80 p-1.5 rounded-full border border-gold-500/40 self-start md:self-auto shadow-sm">
              <Globe className="w-3.5 h-3.5 text-gold-400 ml-2 mr-1" />
              <button
                onClick={() => changeLanguage('om')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  currentLang === 'om' ? 'bg-gold-500 text-royal shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                om
              </button>
              <button
                onClick={() => changeLanguage('am')}
                className={`px-3 py-1 rounded-full text-xs font-bold font-ethiopic transition-all ${
                  currentLang === 'am' ? 'bg-gold-500 text-royal shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                am
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  currentLang === 'en' ? 'bg-gold-500 text-royal shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="pt-2 max-w-2xl">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentLang === 'am'
                    ? 'ርዕስ ወይም ደረጃዎችን ይፈልጉ... (Search help)'
                    : currentLang === 'en'
                    ? 'Search guides, features, or troubleshooting...'
                    : 'Mata-duree ykn qajeelfama barbaadi...'
                }
                className="w-full pl-11 pr-4 py-3 bg-white text-slate-900 rounded-2xl text-[16px] sm:text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all placeholder:text-slate-400 min-h-[44px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Review Mode Banner (SUPER_ADMIN / ADMIN) */}
      {showReviewMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 py-3 px-4 sm:px-6">
          <Container className="max-w-5xl flex items-center justify-between text-xs text-amber-900 font-medium">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Review Mode Active:</strong> Showing native-speaker verification checklist for Afaan Oromoo and Amharic translations.
              </span>
            </div>
            <Link to="/help" className="font-bold text-amber-800 hover:underline">
              Exit Review
            </Link>
          </Container>
        </div>
      )}

      {/* ══════ MAIN CONTENT ══════ */}
      <Container className="max-w-5xl mt-6 space-y-6">
        {/* Category Filter Chips & Controls */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {currentLang === 'am' ? 'ዘርፎች' : currentLang === 'en' ? 'Categories' : 'Kutaalee'}
            </span>
            <div className="flex items-center space-x-3 text-xs font-semibold text-royal">
              <button onClick={expandAll} className="hover:underline">
                {currentLang === 'am' ? 'ሁሉንም ክፈት' : currentLang === 'en' ? 'Expand All' : 'Hunda Bani'}
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={collapseAll} className="hover:underline">
                {currentLang === 'am' ? 'ሁሉንም ዝጋ' : currentLang === 'en' ? 'Collapse All' : 'Hunda Cufi'}
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={() => window.print()} className="inline-flex items-center space-x-1 text-slate-600 hover:text-royal">
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar sm:flex-wrap pb-1 -mx-1 px-1">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-3 py-2 min-h-[38px] sm:min-h-0 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-royal text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {getField(cat.label)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section List / Accordion */}
        {filteredSections.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <EmptyState
              icon={HelpCircle}
              title={
                currentLang === 'am'
                  ? 'ምንም መመሪያ አልተገኘም'
                  : currentLang === 'en'
                  ? 'No matching guides found'
                  : 'Qajeelfamni homaa hin argamne'
              }
              description={
                currentLang === 'am'
                  ? 'እባክዎ የተለየ ቃል ይፈልጉ ወይም ሌላ ዘርፍ ይምረጡ።'
                  : currentLang === 'en'
                  ? 'Try searching with different terms or selecting another category.'
                  : 'Jechoota biraatiin barbaadaa yookiin kutaa biraa filadhaa.'
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSections.map((sec) => {
              const isExpanded = expandedSectionIds.has(sec.id);
              const title = getField(sec.title);
              const summary = getField(sec.summary);
              const steps = getSteps(sec.steps);
              const feedback = feedbacks[sec.id];

              return (
                <div
                  key={sec.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all hover:border-royal/30"
                >
                  {/* Card Header (Accordion toggle) */}
                  <div
                    onClick={() => toggleExpand(sec.id)}
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-royal bg-royal-tint px-2.5 py-0.5 rounded-full border border-royal/20">
                          {sec.category}
                        </span>
                        {sec.tourId && (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Tour Available</span>
                          </span>
                        )}
                        {showReviewMode && (
                          <div className="flex items-center space-x-1 text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${sec.reviewed.om ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              om: {sec.reviewed.om ? 'Reviewed' : 'Unreviewed'}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${sec.reviewed.am ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              am: {sec.reviewed.am ? 'Reviewed' : 'Unreviewed'}
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                        {title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label="Toggle section details"
                      className="p-2 rounded-xl text-slate-400 hover:text-royal hover:bg-royal-tint transition-all shrink-0 mt-1"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Expanded Content: Steps & Actions */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-5 bg-white">
                      {/* Steps as numbered gold circles */}
                      <div className="space-y-3 pt-2">
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex items-start space-x-3.5">
                            <div className="w-6 h-6 rounded-full bg-gold-500 text-royal font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                              {idx + 1}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pt-0.5">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Footer: Action Buttons + Helpful Thumbs */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {sec.path && (
                            <Link
                              to={sec.path}
                              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-royal text-white hover:bg-royal-dark text-xs font-bold shadow-sm transition-all"
                            >
                              <span>{currentLang === 'am' ? 'ወደዚያ ሂድ' : currentLang === 'en' ? 'Go there' : 'Gara sana deemi'}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
                            </Link>
                          )}

                          {sec.tourId && (
                            <button
                              type="button"
                              onClick={() => handleStartTour(sec.tourId, sec.path)}
                              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-royal font-black text-xs shadow-sm transition-all"
                            >
                              <Play className="w-3.5 h-3.5 fill-royal" />
                              <span>{currentLang === 'am' ? 'ጉብኝቱን ጀምር' : currentLang === 'en' ? 'Start tour' : 'Tour eegali'}</span>
                            </button>
                          )}
                        </div>

                        {/* Was this helpful? */}
                        <div className="flex items-center space-x-2 text-xs text-slate-500 self-end sm:self-auto">
                          <span className="font-semibold">
                            {currentLang === 'am'
                              ? 'ይህ ጠቅሟል?'
                              : currentLang === 'en'
                              ? 'Was this helpful?'
                              : 'Kun isin gargaareeraa?'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleFeedback(sec.id, 'YES')}
                            className={`p-1.5 rounded-lg border transition-all ${
                              feedback === 'YES'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFeedback(sec.id, 'NO')}
                            className={`p-1.5 rounded-lg border transition-all ${
                              feedback === 'NO'
                                ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default HelpCenter;
