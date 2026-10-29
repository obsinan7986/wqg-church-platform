import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Church,
  Target,
  Compass,
  Award,
  CheckCircle2,
  BookmarkCheck,
  Building2,
  Users
} from 'lucide-react';
import {
  Container,
  Section,
  Badge
} from '../../components/ui';

const AboutAndHistory = () => {
  const { t } = useTranslation();

  const milestones = [
    {
      year: t('about.ms1Year'),
      title: 'Hundeeffama Jalqabaa',
      desc: t('about.ms1Desc'),
      icon: Users
    },
    {
      year: t('about.ms2Year'),
      title: "Babal'ina Dameelee",
      desc: t('about.ms2Desc'),
      icon: Building2
    },
    {
      year: t('about.ms3Year'),
      title: 'Gargaarsa Hawaasummaa',
      desc: t('about.ms3Desc'),
      icon: Award
    },
    {
      year: t('about.ms4Year'),
      title: 'Platform Digital & Live',
      desc: t('about.ms4Desc'),
      icon: Church
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Section className="py-12 md:py-16">
        <Container className="space-y-16">
          {/* Page Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="gold">
              <BookmarkCheck className="w-4 h-4 mr-1.5 text-gold-600" />
              <span>Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii</span>
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-black text-royal tracking-tight">
              {t('about.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              {t('about.subtitle')}
            </p>
          </div>

          {/* Vision, Mission & Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Vision */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:border-gold-500/60 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-royal-tint border border-gold-500/40 flex items-center justify-center mb-6 shadow-xs">
                  <Compass className="w-8 h-8 text-gold-600" />
                </div>
                <h3 className="text-xl font-bold text-royal mb-3">{t('about.visionTitle')}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('about.visionDesc')}
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:border-gold-500/60 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-royal-tint border border-gold-500/40 flex items-center justify-center mb-6 shadow-xs">
                  <Target className="w-8 h-8 text-gold-600" />
                </div>
                <h3 className="text-xl font-bold text-royal mb-3">{t('about.missionTitle')}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {t('about.missionDesc')}
                </p>
              </div>
            </div>

            {/* Core Values */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:border-gold-500/60 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-royal-tint border border-gold-500/40 flex items-center justify-center mb-6 shadow-xs">
                  <Award className="w-8 h-8 text-gold-600" />
                </div>
                <h3 className="text-xl font-bold text-royal mb-4">{t('about.valuesTitle')}</h3>
                <ul className="space-y-3">
                  {(t('about.values', { returnObjects: true }) || []).map((val, idx) => (
                    <li key={idx} className="flex items-center space-x-3 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-gold-600 flex-shrink-0" />
                      <span>{val}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Historical Timeline */}
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-royal">
                Tarkaanfii Seenaa Waldichaa
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Jalqaba irraa hanga har'aatti guddina fi tajaajila waldichaa
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {milestones.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-gold-500/60 transition-all space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-gold-600">{m.year}</span>
                      <div className="w-10 h-10 rounded-xl bg-royal-tint border border-gold-500/30 flex items-center justify-center text-gold-600">
                        <Icon className="w-5 h-5 text-gold-600" />
                      </div>
                    </div>
                    <h4 className="font-extrabold text-base text-royal">{m.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default AboutAndHistory;