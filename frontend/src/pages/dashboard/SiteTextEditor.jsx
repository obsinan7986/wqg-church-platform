import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import {
  defaultLocales,
  applySiteTextOverrides,
  fetchAndApplySiteTextOverrides
} from '../../i18n';
import {
  Languages,
  Search,
  RotateCcw,
  Save,
  Eye,
  Check,
  Filter,
  AlertTriangle,
  Globe,
  FileText,
  Layers,
  Copy,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  X
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Modal,
  Toast,
  Spinner,
  EmptyState,
  PageHeader
} from '../../components/ui';

// Flatten nested objects into dot-notated key-value map
function flattenObject(obj, prefix = '') {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey));
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => {
        if (item && typeof item === 'object') {
          Object.assign(result, flattenObject(item, `${fullKey}.${index}`));
        } else {
          result[`${fullKey}.${index}`] = item;
        }
      });
      result[fullKey] = JSON.stringify(val);
    } else {
      result[fullKey] = String(val ?? '');
    }
  }
  return result;
}

const PAGE_GROUP_LABELS = {
  ALL: { en: 'All Pages', om: 'Fuula Hunda', am: 'ሁሉም ገጾች' },
  home: { en: 'Home Page', om: 'Fuula Jalqabaa (Home)', am: 'ዋና ገጽ' },
  auth: { en: 'Login & Register', om: 'Seensa & Galmee', am: 'መግቢያ እና ምዝገባ' },
  dashboard: { en: 'Dashboard & Menus', om: 'Dashboard & Baafata', am: 'ዳሽቦርድ እና ዝርዝር' },
  about: { en: 'About & History', om: "Waa'ee & Seenaa", am: 'ስለ ማኅበሩ' },
  services: { en: 'Services & Ministries', om: 'Tajaajila & Kadhannaa', am: 'አገልግሎትና ጸሎት' },
  nav: { en: 'Navigation & Header', om: 'Naannoo & Boqonnaa', am: 'የዳሰሳ አሞሌ' },
  brand: { en: 'Branding & Names', om: 'Maqaa & Mallattoo', am: 'የማኅበሩ ስሞች' },
  roles: { en: 'User Roles', om: 'Gahee Hojii', am: 'የተጠቃሚ ሚናዎች' }
};

const SiteTextEditor = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';

  // State
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [resettingKey, setResettingKey] = useState(null);
  const [toastMsg, setToastMsg] = useState({ type: '', text: '' });

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'missing' | 'overridden' | 'defaults'
  const [copiedKey, setCopiedKey] = useState(null);

  // Preview modal state
  const [previewItem, setPreviewItem] = useState(null);

  // Edit draft buffer: map of key -> { om, am, en }
  const [editDrafts, setEditDrafts] = useState({});

  // Flatten default translations from locale JSONs
  const defaultKeysMap = useMemo(() => {
    const en = flattenObject(defaultLocales.en);
    const om = flattenObject(defaultLocales.om);
    const am = flattenObject(defaultLocales.am);
    return { en, om, am };
  }, []);

  // Set of all valid keys based on en.json
  const allValidKeys = useMemo(() => {
    return Object.keys(defaultKeysMap.en);
  }, [defaultKeysMap]);

  // Map of overrides by key
  const overridesByKey = useMemo(() => {
    const map = new Map();
    overrides.forEach((item) => {
      if (item && item.key) {
        map.set(item.key, item);
      }
    });
    return map;
  }, [overrides]);

  // Fetch overrides from backend
  const fetchOverrides = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/site-text');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOverrides(res.data.data);
      }
    } catch (err) {
      console.error('[SiteTextEditor] Error loading overrides:', err.message);
      setToastMsg({
        type: 'error',
        text: 'Failed to load text overrides from server.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  // Synchronize draft edits when overrides or valid keys change
  useEffect(() => {
    const drafts = {};
    allValidKeys.forEach((key) => {
      const override = overridesByKey.get(key);
      drafts[key] = {
        om: override?.om !== undefined && override.om !== null ? override.om : (defaultKeysMap.om[key] || ''),
        am: override?.am !== undefined && override.am !== null ? override.am : (defaultKeysMap.am[key] || ''),
        en: override?.en !== undefined && override.en !== null ? override.en : (defaultKeysMap.en[key] || '')
      };
    });
    setEditDrafts(drafts);
  }, [allValidKeys, overridesByKey, defaultKeysMap]);

  // Handle draft field changes
  const handleDraftChange = (key, lang, value) => {
    setEditDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { om: '', am: '', en: '' }),
        [lang]: value
      }
    }));
  };

  // Save single key override
  const handleSaveKey = async (key) => {
    if (!allValidKeys.includes(key)) {
      setToastMsg({
        type: 'error',
        text: `Key validation failed: '${key}' does not exist in master keys.`
      });
      return;
    }

    const draft = editDrafts[key] || {};
    try {
      setSavingKey(key);
      const payload = {
        om: draft.om || '',
        am: draft.am || '',
        en: draft.en || ''
      };

      const res = await api.put(`/api/site-text/${encodeURIComponent(key)}`, payload);
      if (res.data?.success) {
        // Update local state
        setOverrides((prev) => {
          const filtered = prev.filter((o) => o.key !== key);
          return [...filtered, res.data.data];
        });

        // Apply immediately to i18next runtime
        applySiteTextOverrides([res.data.data]);

        setToastMsg({
          type: 'success',
          text: `Qabiyyee '${key}' milkaa'inaan haaromfameera! (Updated live)`
        });
      }
    } catch (err) {
      console.error('[handleSaveKey Error]:', err);
      setToastMsg({
        type: 'error',
        text: err.response?.data?.message || `Failed to update '${key}'.`
      });
    } finally {
      setSavingKey(null);
    }
  };

  // Reset key to default JSON
  const handleResetKey = async (key) => {
    if (!allValidKeys.includes(key)) return;

    try {
      setResettingKey(key);
      const res = await api.delete(`/api/site-text/${encodeURIComponent(key)}`);
      if (res.data?.success) {
        // Remove from local overrides
        setOverrides((prev) => prev.filter((o) => o.key !== key));

        // Reset draft buffer to JSON defaults
        setEditDrafts((prev) => ({
          ...prev,
          [key]: {
            om: defaultKeysMap.om[key] || '',
            am: defaultKeysMap.am[key] || '',
            en: defaultKeysMap.en[key] || ''
          }
        }));

        // Re-apply remaining overrides to i18n
        const updated = await fetchAndApplySiteTextOverrides();
        setOverrides(updated);

        setToastMsg({
          type: 'success',
          text: `'${key}' gara qabiyyee bu'uuraatti (default) deebi'eera.`
        });
      }
    } catch (err) {
      console.error('[handleResetKey Error]:', err);
      setToastMsg({
        type: 'error',
        text: err.response?.data?.message || `Failed to reset '${key}'.`
      });
    } finally {
      setResettingKey(null);
    }
  };

  // Copy key to clipboard
  const handleCopyKey = (key) => {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered and grouped items
  const filteredItems = useMemo(() => {
    return allValidKeys
      .map((key) => {
        const group = key.split('.')[0] || 'common';
        const override = overridesByKey.get(key);
        const draft = editDrafts[key] || {
          om: defaultKeysMap.om[key] || '',
          am: defaultKeysMap.am[key] || '',
          en: defaultKeysMap.en[key] || ''
        };

        const defaultOm = defaultKeysMap.om[key] || '';
        const defaultAm = defaultKeysMap.am[key] || '';
        const defaultEn = defaultKeysMap.en[key] || '';

        const isOverridden = !!override;
        const isModifiedFromOverride =
          override &&
          (draft.om !== override.om || draft.am !== override.am || draft.en !== override.en);
        const isModifiedFromDefault =
          !override &&
          (draft.om !== defaultOm || draft.am !== defaultAm || draft.en !== defaultEn);

        const isMissingAny = !draft.om?.trim() || !draft.am?.trim() || !draft.en?.trim();

        return {
          key,
          group,
          draft,
          override,
          defaultOm,
          defaultAm,
          defaultEn,
          isOverridden,
          isDirty: isModifiedFromOverride || isModifiedFromDefault,
          isMissingAny
        };
      })
      .filter((item) => {
        // Group filter
        if (selectedGroup !== 'ALL' && item.group !== selectedGroup) {
          return false;
        }

        // Mode filter
        if (filterMode === 'missing' && !item.isMissingAny) {
          return false;
        }
        if (filterMode === 'overridden' && !item.isOverridden) {
          return false;
        }
        if (filterMode === 'defaults' && item.isOverridden) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchKey = item.key.toLowerCase().includes(q);
          const matchOm = item.draft.om.toLowerCase().includes(q);
          const matchAm = item.draft.am.toLowerCase().includes(q);
          const matchEn = item.draft.en.toLowerCase().includes(q);
          if (!matchKey && !matchOm && !matchAm && !matchEn) {
            return false;
          }
        }

        return true;
      });
  }, [allValidKeys, overridesByKey, editDrafts, defaultKeysMap, selectedGroup, filterMode, searchQuery]);

  // Counts for summary pills
  const statsSummary = useMemo(() => {
    let missingCount = 0;
    let overriddenCount = 0;
    allValidKeys.forEach((key) => {
      const override = overridesByKey.get(key);
      const draft = editDrafts[key] || {
        om: defaultKeysMap.om[key] || '',
        am: defaultKeysMap.am[key] || '',
        en: defaultKeysMap.en[key] || ''
      };
      if (!draft.om?.trim() || !draft.am?.trim() || !draft.en?.trim()) {
        missingCount++;
      }
      if (override) {
        overriddenCount++;
      }
    });
    return {
      total: allValidKeys.length,
      overridden: overriddenCount,
      missing: missingCount
    };
  }, [allValidKeys, overridesByKey, editDrafts, defaultKeysMap]);

  return (
    <div className="space-y-6 text-slate-900">
      {/* Toast notifications */}
      {toastMsg.text && (
        <Toast
          type={toastMsg.type}
          message={toastMsg.text}
          onClose={() => setToastMsg({ type: '', text: '' })}
        />
      )}

      {/* Page Header */}
      <PageHeader
        icon={Languages}
        eyebrow="Sirreessaa Qabiyyee Marsariitii (Site Text Editor)"
        title="Gulaala Barreeffama fi Afaanii (i18n)"
        subtitle="Barreeffamoota fuula marsariitii hunda (Afaan Oromoo, አማርኛ, English) bakka tokkotti gulaalaa, haaromsaa, ykn deebisaa."
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              onClick={fetchOverrides}
            >
              Haaromsi
            </Button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Jecha Hunda (Total Keys)
            </span>
            <span className="text-2xl font-black text-royal">{statsSummary.total}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-royal-tint border border-gold-500/30 flex items-center justify-center text-royal">
            <FileText className="w-5 h-5 text-gold-600" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Kan Haaromfame (Overridden)
            </span>
            <span className="text-2xl font-black text-gold-600">{statsSummary.overridden}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-500/40 flex items-center justify-center text-gold-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Afaan Dhabame (Missing)
            </span>
            <span className={`text-2xl font-black ${statsSummary.missing > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {statsSummary.missing}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            statsSummary.missing > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            {statsSummary.missing > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Afaanota (Languages)
            </span>
            <span className="text-2xl font-black text-royal">3</span>
            <span className="text-[10px] text-slate-400 block">OM • AM • EN</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-royal-tint border border-gold-500/30 flex items-center justify-center text-royal">
            <Globe className="w-5 h-5 text-gold-600" />
          </div>
        </Card>
      </div>

      {/* Control Bar: Search, Group Select, Filter Mode */}
      <Card className="p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jecha, hiika, ykn key barbaadaa (e.g. 'home.heroTitle', 'Miseensa')..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[16px] sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-royal focus:ring-1 focus:ring-royal/30 min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 shrink-0 hidden sm:inline">Fuula:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[16px] sm:text-xs text-slate-800 font-bold focus:outline-none focus:border-royal min-h-[44px]"
            >
              {Object.entries(PAGE_GROUP_LABELS).map(([grp, labels]) => (
                <option key={grp} value={grp}>
                  {labels[currentLang] || labels.om || labels.en}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Mode Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 shrink-0 hidden sm:inline">Filtara:</span>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[16px] sm:text-xs text-slate-800 font-bold focus:outline-none focus:border-royal min-h-[44px]"
            >
              <option value="all">Hunda (All Keys)</option>
              <option value="missing">⚠️ Missing in a language</option>
              <option value="overridden">✨ Kan Haaromfame (Overridden Only)</option>
              <option value="defaults">📄 Bu'uura Qofa (Defaults Only)</option>
            </select>
          </div>
        </div>

        {/* Status / Count line */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Argaman: <strong className="text-royal font-bold">{filteredItems.length}</strong> / {allValidKeys.length}
          </span>
          <span className="text-[11px] text-slate-400">
            Jijjiiramoonni battalumatti (live) hojii irra oolu.
          </span>
        </div>
      </Card>

      {/* Main Table / Stacked Card Container */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
          <Spinner size="lg" variant="royal" />
          <p className="text-xs font-semibold">Qabiyyee barreeffamootaa fidaa jira...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            icon={Languages}
            title="Qabiyyeen barbaaddan hin argamne"
            description="Filtara ykn jecha barbaaddan jijjiiruun irra deebi'aa yaalaa."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroup('ALL');
                  setFilterMode('all');
                }}
              >
                Filtara Qulqulleessi
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile Stacked Card View (< 768px) */}
          <div className="md:hidden space-y-4">
            {filteredItems.map((item) => (
              <Card key={item.key} className="p-4 space-y-3.5 shadow-sm">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-black text-gold-600 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                        {item.group}
                      </span>
                      {item.isOverridden ? (
                        <Badge variant="gold" size="sm">
                          ✨ Overridden
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm">
                          Default
                        </Badge>
                      )}
                      {item.isMissingAny && (
                        <Badge variant="danger" size="sm">
                          Missing Language
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold text-royal mt-1 break-all">
                      {item.key}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyKey(item.key)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-royal hover:bg-royal-tint transition-colors"
                    title="Kopiisi"
                  >
                    {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Afaan Oromoo Editor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Afaan Oromoo (om)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Default: {item.defaultOm ? `${item.defaultOm.slice(0, 30)}...` : '—'}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={item.draft.om}
                    onChange={(e) => handleDraftChange(item.key, 'om', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[16px] sm:text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-royal"
                    placeholder="Barreeffama Afaan Oromoo..."
                  />
                </div>

                {/* Amharic Editor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>አማርኛ (am)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Default: {item.defaultAm ? `${item.defaultAm.slice(0, 30)}...` : '—'}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={item.draft.am}
                    onChange={(e) => handleDraftChange(item.key, 'am', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[16px] sm:text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-royal font-ethiopic"
                    placeholder="የአማርኛ ጽሑፍ..."
                  />
                </div>

                {/* English Editor */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>English (en)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Default: {item.defaultEn ? `${item.defaultEn.slice(0, 30)}...` : '—'}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={item.draft.en}
                    onChange={(e) => handleDraftChange(item.key, 'en', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[16px] sm:text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-royal"
                    placeholder="English translation..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1 min-h-[44px]"
                    icon={Save}
                    loading={savingKey === item.key}
                    onClick={() => handleSaveKey(item.key)}
                  >
                    Olkaayi (Save)
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    className="min-h-[44px]"
                    icon={Eye}
                    onClick={() => setPreviewItem(item)}
                    title="Ilaali (Preview)"
                  >
                    Preview
                  </Button>

                  {item.isOverridden && (
                    <Button
                      variant="ghost"
                      size="md"
                      className="text-red-600 hover:bg-red-50 min-h-[44px]"
                      icon={RotateCcw}
                      loading={resettingKey === item.key}
                      onClick={() => handleResetKey(item.key)}
                      title="Gara default deebisi (Reset)"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-royal-tint text-[11px] font-bold uppercase text-royal border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-52">Key & Group</th>
                    <th className="py-3 px-4">Afaan Oromoo (om)</th>
                    <th className="py-3 px-4">አማርኛ (am)</th>
                    <th className="py-3 px-4">English (en)</th>
                    <th className="py-3 px-4 text-right w-36">Gocha (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.key}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.isOverridden ? 'bg-gold-50/20' : ''
                      }`}
                    >
                      {/* Key & Status */}
                      <td className="py-3 px-4 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-black uppercase text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded border border-gold-200">
                              {item.group}
                            </span>
                            {item.isOverridden && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                Customized
                              </span>
                            )}
                            {item.isMissingAny && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.2 rounded">
                                Missing
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-xs font-bold text-royal flex items-center gap-1 group">
                            <span className="break-all">{item.key}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(item.key)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-royal transition-opacity p-0.5"
                              title="Kopiisi"
                            >
                              {copiedKey === item.key ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {item.override?.updatedAt && (
                            <div className="text-[10px] text-slate-400">
                              Haaromfame: {new Date(item.override.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Afaan Oromoo Editor */}
                      <td className="py-3 px-4 align-top">
                        <textarea
                          rows={2}
                          value={item.draft.om}
                          onChange={(e) => handleDraftChange(item.key, 'om', e.target.value)}
                          className="w-full p-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-royal rounded-xl text-xs text-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-royal/20"
                          placeholder="Afaan Oromoo..."
                        />
                        {item.defaultOm && item.draft.om !== item.defaultOm && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs" title={`Default: ${item.defaultOm}`}>
                            Orig: {item.defaultOm}
                          </div>
                        )}
                      </td>

                      {/* Amharic Editor */}
                      <td className="py-3 px-4 align-top">
                        <textarea
                          rows={2}
                          value={item.draft.am}
                          onChange={(e) => handleDraftChange(item.key, 'am', e.target.value)}
                          className="w-full p-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-royal rounded-xl text-xs text-slate-900 font-ethiopic transition-colors focus:outline-none focus:ring-1 focus:ring-royal/20"
                          placeholder="አማርኛ..."
                        />
                        {item.defaultAm && item.draft.am !== item.defaultAm && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs font-ethiopic" title={`Default: ${item.defaultAm}`}>
                            Orig: {item.defaultAm}
                          </div>
                        )}
                      </td>

                      {/* English Editor */}
                      <td className="py-3 px-4 align-top">
                        <textarea
                          rows={2}
                          value={item.draft.en}
                          onChange={(e) => handleDraftChange(item.key, 'en', e.target.value)}
                          className="w-full p-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-royal rounded-xl text-xs text-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-royal/20"
                          placeholder="English..."
                        />
                        {item.defaultEn && item.draft.en !== item.defaultEn && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs" title={`Default: ${item.defaultEn}`}>
                            Orig: {item.defaultEn}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex flex-col items-end space-y-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Save}
                            loading={savingKey === item.key}
                            onClick={() => handleSaveKey(item.key)}
                          >
                            Olkaayi
                          </Button>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-royal-tint transition-colors"
                              title="Ilaali (Preview)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {item.isOverridden && (
                              <button
                                type="button"
                                disabled={resettingKey === item.key}
                                onClick={() => handleResetKey(item.key)}
                                className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Gara default deebisi (Reset)"
                              >
                                {resettingKey === item.key ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={`Dur-argaa (Preview): ${previewItem.key}`}
          icon={Eye}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-royal-tint border border-slate-200 space-y-1">
              <span className="text-[10px] font-mono text-royal font-bold block">
                Translation Key: {previewItem.key}
              </span>
              <span className="text-xs text-slate-500">
                Garee: <strong className="text-slate-800">{previewItem.group}</strong>
              </span>
            </div>

            {/* Rendered cards in all 3 languages */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-royal">
                  <span>Afaan Oromoo (om)</span>
                  <Badge variant="gold" size="sm">Active</Badge>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium pt-1">
                  {previewItem.draft.om || <em className="text-slate-400">Barreeffamni hin jiru (Empty)</em>}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-royal">
                  <span>አማርኛ (am)</span>
                  <Badge variant="outline" size="sm">Amharic</Badge>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-ethiopic pt-1">
                  {previewItem.draft.am || <em className="text-slate-400">ምንም ጽሑፍ የለም (Empty)</em>}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-royal">
                  <span>English (en)</span>
                  <Badge variant="outline" size="sm">English</Badge>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed pt-1">
                  {previewItem.draft.en || <em className="text-slate-400">No English text (Empty)</em>}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                size="md"
                onClick={() => setPreviewItem(null)}
              >
                Cufi (Close Preview)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SiteTextEditor;
