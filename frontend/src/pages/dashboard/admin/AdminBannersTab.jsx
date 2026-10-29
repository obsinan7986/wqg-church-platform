import React from 'react';
import { Image as ImageIcon, PlusCircle, Trash2, Calendar } from 'lucide-react';
import { Card, Button, Badge, EmptyState } from '../../../components/ui';
import { getLocalizedText } from '../../../utils/localized';
import { useDateSettings } from '../../../context/DateSettingsContext';

const AdminBannersTab = ({
  banners = [],
  onAddBanner,
  onToggleActive,
  onDeleteBanner
}) => {
  const { formatDual } = useDateSettings();
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-royal flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-gold-500" />
            <span>To'annoo Beeksisoota Fuula Duraa (Homepage Banners)</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Beeksisoota fi faaruuwwan ayyaanaa fuula duraa irratti miseensota hundaaf mul'atan qindeessaa.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={onAddBanner}
        >
          Banner Haaraa Dabali
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Beeksisni hin jiru"
          description="Beeksisa haaraa maxxansuuf qabduu 'Banner Haaraa Dabali' fayyadamaa."
          action={
            <Button variant="primary" size="sm" icon={PlusCircle} onClick={onAddBanner}>
              Banner Haaraa Dabali
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => {
            const titleOm = getLocalizedText(b.title, 'om');
            const titleAm = b.title && typeof b.title === 'object' ? b.title.am : '';
            const descOm = getLocalizedText(b.description, 'om');

            return (
              <Card
                key={b._id}
                className="overflow-hidden flex flex-col justify-between p-0 shadow-md border border-slate-200"
              >
                <div className="relative aspect-[21/9] w-full bg-slate-100 overflow-hidden">
                  <img
                    src={b.imageUrl}
                    alt={titleOm || 'Banner'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1548625361-195fe5787a2a?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-royal border border-slate-200 shadow-sm">
                    {b.badge}
                  </span>
                  <div className="absolute top-3 right-3">
                    <Badge variant={b.isActive ? 'solid-gold' : 'muted'} size="sm">
                      {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4 className="font-black text-base text-royal">
                      {titleOm || 'Banner'}
                    </h4>
                    {titleAm && (
                      <p className="text-xs text-slate-500">{titleAm}</p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {descOm}
                    </p>
                    {(b.activeFrom || b.activeTo) && (
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 pt-1">
                        <Calendar className="w-3 h-3 text-royal" />
                        <span>
                          {b.activeFrom ? formatDual(b.activeFrom) : 'Ammaa'} - {b.activeTo ? formatDual(b.activeTo) : 'Bara baraan'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleActive(b)}
                    >
                      {b.isActive ? 'Cufi (Deactivate)' : 'Bani (Activate)'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => onDeleteBanner(b._id)}
                      title="Haqi"
                      aria-label="Haqi (Delete banner)"
                    />
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

export default AdminBannersTab;
