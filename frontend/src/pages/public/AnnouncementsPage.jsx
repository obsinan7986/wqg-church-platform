import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import {
  Megaphone,
  Pin,
  Calendar,
  Clock,
  ArrowLeft,
  Search,
  Sparkles,
  X,
  Share2,
  Check
} from 'lucide-react';
import {
  Container,
  Section,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Modal
} from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';
import { formatDual, formatRelative } from '../../utils/dateFormat';

const AnnouncementsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';
  const { socket } = useSocket();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements/public');
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch (err) {
      console.error('[AnnouncementsPage fetch error]:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // If URL has :id, open that announcement in modal
  useEffect(() => {
    if (id && announcements.length > 0) {
      const found = announcements.find((a) => a._id === id);
      if (found) {
        setSelectedAnnouncement(found);
      }
    }
  }, [id, announcements]);

  // Socket listener for live updates
  useEffect(() => {
    if (!socket) return;
    const handleContentUpdate = (data) => {
      if (data?.type === 'announcement' || !data?.type) {
        fetchAnnouncements();
      }
    };
    socket.on('content_updated', handleContentUpdate);
    return () => {
      socket.off('content_updated', handleContentUpdate);
    };
  }, [socket, fetchAnnouncements]);

  const handleOpenDetail = (item) => {
    setSelectedAnnouncement(item);
    navigate(`/announcements/${item._id}`, { replace: true });
  };

  const handleCloseModal = () => {
    setSelectedAnnouncement(null);
    navigate('/announcements', { replace: true });
  };

  const handleCopyShareLink = () => {
    if (!selectedAnnouncement) return;
    const url = `${window.location.origin}/announcements/${selectedAnnouncement._id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredAnnouncements = announcements.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = getLocalizedText(item.title, currentLang, '').toLowerCase();
    const desc = getLocalizedText(item.description, currentLang, '').toLowerCase();
    return title.includes(query) || desc.includes(query);
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Page Header */}
      <div className="bg-royal text-white py-12 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px]" />
        <Container className="relative z-10 max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gold-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Gara Fuula Duraa (Back to Home)</span>
          </Link>
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-royal-dark/60 text-gold-400 px-3 py-1 rounded-full text-xs font-bold border border-gold-500/30 mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Oduuf Beeksisa Waldaa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Beeksisa & Ergaalee
            </h1>
            <p className="text-white/80 text-sm sm:text-base mt-1 max-w-2xl">
              Oduu, ergaafi beeksisoota haaromsaa waldichaa yeroo yeroon baafaman hunda asitti argattu.
            </p>
          </div>
        </Container>
      </div>

      <Container className="max-w-5xl mt-6 space-y-6">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Beeksisa barbaadi / Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white transition-all"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Beeksisa {filteredAnnouncements.length} argameera
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <Skeleton className="w-1/3 h-5" />
                <Skeleton className="w-full h-12" />
                <Skeleton className="w-1/4 h-3" />
              </div>
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <EmptyState
              icon={Megaphone}
              title="Beeksisni homaa hin argamne"
              description="Yeroo ammaa kanatti beeksisni ulaagaa kana guutu hin jiru. Yeroo biraa deebi'aa ilaalaa."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((item) => {
              const formattedDate = formatDual(item.publishAt || item.createdAt);
              const relativeTime = formatRelative(item.publishAt || item.createdAt);
              const title = getLocalizedText(item.title, currentLang, 'Beeksisa');
              const desc = getLocalizedText(item.description, currentLang, '');

              return (
                <div
                  key={item._id}
                  onClick={() => handleOpenDetail(item)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer group ${
                    item.pinned
                      ? 'border-gold-500/50 shadow-md ring-1 ring-gold-500/20'
                      : 'border-slate-200/80 hover:border-royal/40 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Optional Image */}
                    {item.imageUrl && (
                      <div className="w-full md:w-44 h-32 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        {item.pinned && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gold-50 text-gold-700 border border-gold-400">
                            <Pin className="w-3 h-3 fill-gold-600" />
                            <span>Maxxanfame (Pinned)</span>
                          </span>
                        )}
                        <span
                          className="inline-flex items-center space-x-1 text-[11px] text-slate-400 font-medium cursor-help"
                          title={relativeTime}
                        >
                          <Calendar className="w-3 h-3 text-gold-600" />
                          <span>{formattedDate}</span>
                          <span className="text-slate-400 font-normal">({relativeTime})</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-royal transition-colors">
                        {title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {desc}
                      </p>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-royal group-hover:text-gold-600 transition-colors">
                          Guutuu Dubbisi (Read more) →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

      {/* Modal for Announcement Detail */}
      {selectedAnnouncement && (
        <Modal
          isOpen={true}
          onClose={handleCloseModal}
          title={getLocalizedText(selectedAnnouncement.title, currentLang, 'Beeksisa')}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gold-600" />
                <span className="font-medium">
                  {formatDual(selectedAnnouncement.publishAt || selectedAnnouncement.createdAt)}
                </span>
                {selectedAnnouncement.pinned && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gold-100 text-gold-800">
                    Pinned
                  </span>
                )}
              </div>
              <button
                onClick={handleCopyShareLink}
                className="inline-flex items-center space-x-1 text-royal font-bold hover:underline"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Linkiin waraabameera!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Qoodi (Share)</span>
                  </>
                )}
              </button>
            </div>

            {selectedAnnouncement.imageUrl && (
              <div className="w-full max-h-80 rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={selectedAnnouncement.imageUrl}
                  alt={getLocalizedText(selectedAnnouncement.title, currentLang, 'Announcement')}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line py-2">
              {getLocalizedText(selectedAnnouncement.description, currentLang, '')}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="ghost" onClick={handleCloseModal}>
                Cufi (Close)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AnnouncementsPage;
