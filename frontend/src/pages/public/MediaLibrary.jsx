import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import {
  BookOpen,
  Music,
  Video,
  FileText,
  Download,
  Eye,
  Search,
  RefreshCw,
  Sparkles,
  Calendar,
  User,
  Share2,
  Check
} from 'lucide-react';
import {
  Container,
  Section,
  Button,
  Badge,
  Modal,
  EmptyState
} from '../../components/ui';
import { formatDate } from '../../utils/dateFormat';

const CATEGORIES = [
  { id: 'ALL', label: 'Hundumaa (All)' },
  { id: 'BOOK', label: 'Kitaabota PDF (Books)', icon: BookOpen },
  { id: 'GOSPEL', label: 'Wangeela (Gospel Audio)', icon: Music },
  { id: 'CHOIR', label: 'Faarfannaa (Choir Tracks)', icon: Music },
  { id: 'SERMON', label: 'Lallaba (Sermons)', icon: Video }
];

const MediaLibrary = () => {
  const { t } = useTranslation();
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreview, setActivePreview] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/media/all', { params });
      if (res.data?.success) {
        setMediaList(res.data.media || []);
      }
    } catch (err) {
      console.error('[Fetch Media Library Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMedia();
  };

  const getMediaUrl = (relativeOrFull) => {
    if (!relativeOrFull) return '';
    if (relativeOrFull.startsWith('http://') || relativeOrFull.startsWith('https://')) {
      return relativeOrFull;
    }
    const backendBase = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000';
    return `${backendBase}${relativeOrFull.startsWith('/') ? '' : '/'}${relativeOrFull}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleShare = (doc) => {
    const url = getMediaUrl(doc.fileUrl);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(doc._id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Section className="py-12 md:py-16">
        <Container className="space-y-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="gold">
              <Sparkles className="w-4 h-4 mr-1.5 text-gold-600" />
              <span>Wiirtuu Kitaabotaa fi Faayilootaa (Digital Library)</span>
            </Badge>

            <h1 className="text-3xl sm:text-5xl font-black text-royal tracking-tight">
              Galmee Faayiloota Hafuuraa fi Barruulee
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Kitaabota ortodoksii tawaahidoo PDF, faarfannaa choir fi wangeelaa MP3, fi lallaba viidiyoo asirraa kallattiin dubbisaa, dhaggeeffadhaa ykn bilisaan buufadhaa.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Mata-duree ykn maqaa faayiliin barbaadi..."
                  className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-colors"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                >
                  Barbaadi
                </Button>
              </form>

              {/* Refresh */}
              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <span className="text-xs text-slate-600">
                  Faayiloota: <strong className="text-royal font-bold">{mediaList.length}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMedia}
                  title="Haaromsi"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={isActive ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
                    <span>{cat.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Media Grid Cards */}
          {loading ? (
            <div className="p-20 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-royal" />
              <span className="font-semibold text-xs">Faayiloota fe'aa jira...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <EmptyState
                icon={BookOpen}
                title="Faayiliin hin argamne"
                description="Gosa kana jalatti yeroof faayiliin hin jiru. Gosa biraa filadhaa."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaList.map((doc) => {
                const url = getMediaUrl(doc.fileUrl);
                const isPdf = doc.fileType === 'PDF' || doc.category === 'BOOK';
                const isAudio = doc.fileType === 'AUDIO' || doc.category === 'GOSPEL' || doc.category === 'CHOIR';
                const isVideo = doc.fileType === 'VIDEO' || doc.category === 'SERMON';

                return (
                  <div
                    key={doc._id}
                    className="bg-white border border-slate-200 rounded-2xl flex flex-col justify-between overflow-hidden group hover:border-gold-500 hover:shadow-md transition-all shadow-sm"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-royal-tint border border-gold-500/30 flex items-center justify-center text-gold-600 shadow-xs">
                            {isPdf ? (
                              <BookOpen className="w-4 h-4" />
                            ) : isAudio ? (
                              <Music className="w-4 h-4" />
                            ) : (
                              <Video className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <Badge variant="gold">
                              {doc.category}
                            </Badge>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(doc)}
                          title="Geessituu Kopiifi"
                        >
                          {copiedId === doc._id ? (
                            <Check className="w-3.5 h-3.5 text-royal" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5 text-slate-400 hover:text-royal" />
                          )}
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-extrabold text-sm text-royal group-hover:text-royal-dark transition-colors line-clamp-2">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {doc.description}
                          </p>
                        )}
                      </div>

                      {isAudio && (
                        <div className="pt-2">
                          <audio controls src={url} className="w-full h-8 rounded-xl bg-slate-100" />
                        </div>
                      )}

                      {isVideo && (
                        <div className="pt-2 rounded-xl overflow-hidden bg-black aspect-video relative">
                          <video controls src={url} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="p-5 pt-3 border-t border-slate-100 bg-royal-tint/30 space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-gold-600" />
                          <span className="truncate max-w-[140px]">{doc.uploadedBy?.fullName || 'Waldaa Qulqulluu Giyoorgisii'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(doc.recordedAt || doc.createdAt)}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActivePreview(doc)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-royal" />
                          <span>{isPdf ? 'Dubbisi' : isAudio ? 'Dhaggeeffadhu' : 'Daawwadhu'}</span>
                        </Button>

                        <a
                          href={url}
                          download={doc.fileName || true}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-royal font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Buufadhu</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Global In-App Preview Modal */}
          <Modal
            isOpen={Boolean(activePreview)}
            onClose={() => setActivePreview(null)}
            title={activePreview ? activePreview.title : 'Preview'}
            maxWidth="max-w-4xl"
          >
            {activePreview && (
              <div className="flex flex-col items-center justify-center">
                {activePreview.fileType === 'PDF' || activePreview.category === 'BOOK' ? (
                  <div className="w-full h-[65vh] flex flex-col space-y-3">
                    <iframe
                      src={getMediaUrl(activePreview.fileUrl)}
                      title={activePreview.title}
                      className="w-full h-full rounded-2xl border border-slate-200 bg-white"
                    />
                    <div className="flex items-center justify-center gap-3">
                      <a
                        href={getMediaUrl(activePreview.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-royal text-white font-semibold text-xs hover:bg-royal-dark transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Fuula Guutuun Bani</span>
                      </a>
                      <a
                        href={getMediaUrl(activePreview.fileUrl)}
                        download={activePreview.fileName || true}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-500 text-royal font-black text-xs hover:bg-gold-400 transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Buufadhu</span>
                      </a>
                    </div>
                  </div>
                ) : activePreview.fileType === 'AUDIO' || activePreview.category === 'GOSPEL' || activePreview.category === 'CHOIR' ? (
                  <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-royal-tint border border-gold-500/40 flex items-center justify-center text-gold-600 mx-auto">
                      <Music className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-royal">{activePreview.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{activePreview.fileName}</p>
                    </div>
                    <audio controls autoPlay src={getMediaUrl(activePreview.fileUrl)} className="w-full" />
                    <a
                      href={getMediaUrl(activePreview.fileUrl)}
                      download={activePreview.fileName || true}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-500 text-royal font-black text-xs hover:bg-gold-400 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Faarfannaa Buufadhu</span>
                    </a>
                  </div>
                ) : (
                  <div className="w-full max-w-3xl space-y-3">
                    <video controls autoPlay src={getMediaUrl(activePreview.fileUrl)} className="w-full max-h-[65vh] rounded-2xl bg-black border border-slate-200" />
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-royal">{activePreview.title}</h4>
                      <a
                        href={getMediaUrl(activePreview.fileUrl)}
                        download={activePreview.fileName || true}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-500 text-royal font-black text-xs hover:bg-gold-400 transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Viidiyoo Buufadhu</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </Container>
      </Section>
    </div>
  );
};

export default MediaLibrary;