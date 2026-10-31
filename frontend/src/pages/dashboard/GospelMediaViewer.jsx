import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import GospelMediaManager from './admin/GospelMediaManager';
import api from '../../api/axios';
import {
  Tv,
  Search,
  Filter,
  Play,
  Music,
  BookOpen,
  Radio,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  PageHeader,
  EmptyState,
  Spinner
} from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';

const GospelMediaViewer = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const currentLang = i18n.language || 'om';

  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'].includes(user.role);

  if (isStaff) {
    return <GospelMediaManager />;
  }

  const [mediaList, setMediaList] = useState([]);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await api.get('/media', {
        params: {
          category,
          search
        }
      });
      if (res.data?.success) {
        setMediaList(res.data.media || []);
      }
    } catch (err) {
      console.error('[GospelMediaViewer Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedia();
  };

  const categories = [
    { id: 'ALL', label: 'Hundumaa (All)' },
    { id: 'GOSPEL', label: 'Wangeela (Gospel)' },
    { id: 'CHOIR', label: 'Faarfannaa (Choir)' },
    { id: 'PRAYER', label: 'Kadhannaa (Prayer)' },
    { id: 'SERMON', label: 'Lallaba (Sermon)' }
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header Banner */}
      <PageHeader
        eyebrow="Wiirtuu Meediyaa Wangeelaa (YouTube Gospel Library)"
        icon={Tv}
        title="Faarfannaa, Lallaba fi Kadhannaa"
        subtitle="Viidiyoowwan YouTube filataman asirraa kallattiin daawwadhaa; sagantaa hafuuraa waldichaan qindaa'e."
      />

      {/* Toolbar: Category Filters & Search */}
      <Card className="border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mata-duree ykn Faarfataan barbaadi..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal transition-colors"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {categories.map((c) => (
              <Button
                key={c.id}
                variant={category === c.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Video Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
          <Spinner size="md" />
          <span>Viidiyoowwan fe'aa jira...</span>
        </div>
      ) : mediaList.length === 0 ? (
        <Card className="border border-slate-200">
          <EmptyState
            icon={Tv}
            title="Viidiyoon tokkollee hin argamne."
            description="Gosa biraa filadhaa ykn jecha biraatiin barbaadaa."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaList.map((m) => {
            const title = getLocalizedText(m.title, currentLang);
            const desc = getLocalizedText(m.description, currentLang);

            return (
              <Card
                key={m._id}
                noPadding
                className="overflow-hidden flex flex-col justify-between border border-slate-200 shadow-md"
              >
                {/* Responsive 16:9 Iframe Embed */}
                <div className="aspect-video w-full bg-slate-900">
                  {m.youtubeVideoId ? (
                    <iframe
                      src={m.embedUrl || `https://www.youtube.com/embed/${m.youtubeVideoId}`}
                      title={title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      Video Unavailable
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <Badge variant="solid-gold">
                        {m.category}
                      </Badge>
                      <span className="text-slate-500 font-medium">
                        {m.speakerOrSinger}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-royal line-clamp-2 pt-1">
                      {title}
                    </h4>

                    {desc && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>St. George Fellowship</span>
                    <a
                      href={m.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-royal hover:underline flex items-center space-x-1 font-bold"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GospelMediaViewer;
