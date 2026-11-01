import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import {
  Music,
  HeartHandshake,
  Video,
  ArrowRight,
  Radio,
  CalendarCheck,
  Tv
} from 'lucide-react';
import {
  Container,
  Section,
  Button,
  Badge,
  EmptyState,
  Spinner
} from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';
import { formatDate } from '../../utils/dateFormat';

const Services = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'om';

  // Dynamic YouTube Gospel Media state
  const [mediaList, setMediaList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loadingMedia, setLoadingMedia] = useState(true);

  useEffect(() => {
    const fetchGospelMedia = async () => {
      try {
        setLoadingMedia(true);
        const res = await api.get('/media', {
          params: { category: selectedCategory }
        });
        if (res.data?.success) {
          setMediaList(res.data.media || []);
        }
      } catch (err) {
        console.error('[Fetch Gospel Media Error]:', err);
      } finally {
        setLoadingMedia(false);
      }
    };

    fetchGospelMedia();
  }, [selectedCategory]);

  const servicesList = [
    {
      id: 'gospel',
      title: t('services.s1Title'),
      desc: t('services.s1Desc'),
      icon: BookOpen,
      badge: 'Spiritual / Kadhannaa',
      actionText: 'Barnoota Baradhu',
      actionLink: '/about'
    },
    {
      id: 'choir',
      title: t('services.s2Title'),
      desc: t('services.s2Desc'),
      icon: Music,
      badge: 'Youth & Choir / Dargaggoota',
      actionText: 'Dargaggoota Waliin Hojiadhu',
      actionLink: '/register'
    },
    {
      id: 'charity',
      title: t('services.s3Title'),
      desc: t('services.s3Desc'),
      icon: HeartHandshake,
      badge: 'Benevolence / Arjoomina',
      actionText: 'Gargaarsa Hawaasummaa',
      actionLink: '/register'
    },
    {
      id: 'media',
      title: t('services.s4Title'),
      desc: t('services.s4Desc'),
      icon: Radio,
      badge: 'Digital / Media & Radio',
      actionText: 'Media & Raadiyoo',
      actionLink: '/dashboard?tab=media'
    }
  ];

  const categories = [
    { id: 'ALL', label: 'Hundumaa (All)' },
    { id: 'GOSPEL', label: 'Wangeela (Gospel)' },
    { id: 'CHOIR', label: 'Faarfannaa (Choir)' },
    { id: 'PRAYER', label: 'Kadhannaa (Prayer)' },
    { id: 'SERMON', label: 'Lallaba (Sermon)' }
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-slate-100">
      <Section className="py-12 md:py-16">
        <Container className="space-y-16">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="solid-gold">
              <Radio className="w-4 h-4 mr-1.5" />
              <span>Tajaajiloota Waldaa Keenyaa</span>
            </Badge>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t('services.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
              {t('services.subtitle')}
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {servicesList.map((svc) => {
              const Icon = svc.icon;
              return (
                <Card
                  key={svc.id}
                  className="flex flex-col justify-between space-y-6 hover:-translate-y-1 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-navy-950 border border-slate-700 flex items-center justify-center shadow-inner">
                        <Icon className="w-8 h-8 text-gold-400" />
                      </div>
                      <Badge variant="outline">
                        {svc.badge}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {svc.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {svc.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4 text-gold-400" />
                      <span>Dhaabbataan Banamaa dha</span>
                    </span>
                    <Link
                      to={svc.actionLink}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      <span>{svc.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Dynamic YouTube Gospel Media & Videos Section */}
          <div className="space-y-8 pt-6 border-t border-slate-700/80">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs text-gold-400 font-bold uppercase tracking-wider">
                  <Tv className="w-4 h-4 text-gold-400" />
                  <span>Viidiyoowwan fi Faarfannaa YouTube</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Barnoota Wangeelaa, Faarfannaa fi Kadhannaa Kallattii
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-medium">
                  Viidiyoowwan YouTube filataman asirraa kallattiin daawwadhaa. Faarfannaa ortodoksii tawaahidoo fi lallaba hafuuraa yeroo hunda haaromfama.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    variant={selectedCategory === c.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(c.id)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>

            {loadingMedia ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <Spinner size="md" />
                <span>Viidiyoowwan YouTube fe'aa jira...</span>
              </div>
            ) : mediaList.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Video}
                  title="Gosa kanaaf viidiyoon tokkollee hin jiru."
                  description="Gosa biraa filadhaa ykn yeroo biraa deebi'aa ilaalaa."
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaList.map((m) => {
                  const titleText = getLocalizedText(m.title, currentLang);
                  const descText = getLocalizedText(m.description, currentLang);

                  return (
                    <Card
                      key={m._id}
                      noPadding
                      className="overflow-hidden flex flex-col justify-between group"
                    >
                      {/* YouTube Embedded Video */}
                      <div className="aspect-video w-full bg-navy-950 relative">
                        {m.youtubeVideoId ? (
                          <iframe
                            src={m.embedUrl || `https://www.youtube.com/embed/${m.youtubeVideoId}`}
                            title={titleText}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
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
                            <span className="text-slate-400 font-medium">
                              {m.speakerOrSinger}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-white line-clamp-2 pt-1 group-hover:text-gold-400 transition-colors">
                            {titleText}
                          </h4>

                          {descText && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {descText}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{formatDate(m.createdAt)}</span>
                          <a
                            href={m.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-gold-400 hover:text-gold-300 font-bold"
                          >
                            <span>YouTube irratti</span>
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default Services;
