import React from 'react';
import { Tv, PlusCircle, Trash2 } from 'lucide-react';
import { Card, Button, Badge, EmptyState } from '../../../components/ui';
import { getLocalizedText } from '../../../utils/localized';

const AdminMediaTab = ({ mediaList = [], onAddMedia, onDeleteMedia }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-royal flex items-center space-x-2">
            <Tv className="w-5 h-5 text-gold-500" />
            <span>Viidiyoowwan fi Faarfannaa YouTube ({mediaList.length})</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Viidiyoowwan YouTube kallattiin akka taphatamaniif galmeessaa.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={onAddMedia}
        >
          YouTube Video Dabali
        </Button>
      </div>

      {mediaList.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="Viidiyoon YouTube hin jiru"
          description="Viidiyoo wangeelaa ykn faarfannaa haaraa dabaluuf qabduu 'YouTube Video Dabali' fayyadamaa."
          action={
            <Button variant="primary" size="sm" icon={PlusCircle} onClick={onAddMedia}>
              YouTube Video Dabali
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaList.map((m) => {
            const titleOm = getLocalizedText(m.title, 'om');
            const titleAm = m.title && typeof m.title === 'object' ? m.title.am : '';

            return (
              <Card
                key={m._id}
                className="overflow-hidden flex flex-col justify-between p-0 shadow-md border border-slate-200"
              >
                <div className="aspect-video w-full bg-slate-900">
                  {m.youtubeVideoId ? (
                    <iframe
                      src={m.embedUrl || `https://www.youtube.com/embed/${m.youtubeVideoId}`}
                      title={titleOm || 'YouTube'}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      Video Unavailable
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <Badge variant="gold" size="sm">
                      {m.category}
                    </Badge>
                    <h4 className="font-bold text-sm text-royal line-clamp-1 pt-1">
                      {titleOm || 'Media'}
                    </h4>
                    {titleAm && (
                      <p className="text-xs text-slate-500 line-clamp-1">{titleAm}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 font-medium">{m.speakerOrSinger}</span>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => onDeleteMedia(m._id)}
                      title="Haqi"
                      aria-label="Haqi (Delete media)"
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

export default AdminMediaTab;
