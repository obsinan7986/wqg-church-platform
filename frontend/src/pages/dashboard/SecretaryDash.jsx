import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  FileText,
  Video,
  PlusCircle,
  Search,
  Filter,
  Printer,
  X,
  Trash2,
  Calendar,
  Users,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Church,
  BookOpen
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  DataTable,
  PageHeader,
  Modal,
  Tabs,
  Toast,
  FormField,
  EmptyState,
  DatePicker
} from '../../components/ui';
import ChurchStamp from '../../components/ChurchStamp';
import { formatDate, formatDual, getAddisToday } from '../../utils/dateFormat';

const SecretaryDash = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'gospelMedia'
  const [documents, setDocuments] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Document Filters & Form
  const [docSearch, setDocSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    type: 'MINUTES',
    content: '',
    meetingDate: getAddisToday(),
    attendeesCount: 0,
    tags: '',
    status: 'PUBLISHED'
  });
  const [savingDoc, setSavingDoc] = useState(false);
  const [activeDocView, setActiveDocView] = useState(null);

  // YouTube Media Form
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    title: { om: '', am: '', en: '' },
    description: { om: '', am: '', en: '' },
    youtubeUrl: '',
    category: 'GOSPEL',
    speakerOrSinger: ''
  });
  const [savingMedia, setSavingMedia] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [docsRes, mediaRes] = await Promise.all([
        api.get('/documents', {
          params: {
            type: typeFilter,
            search: docSearch
          }
        }),
        api.get('/media')
      ]);

      if (docsRes.data?.success) {
        setDocuments(docsRes.data.documents || []);
      }
      if (mediaRes.data?.success) {
        setMediaList(mediaRes.data.media || []);
      }
    } catch (err) {
      console.error('[SecretaryDash Fetch Error]:', err);
      setErrorMsg("Galmee fi meediyaa fiduun hin danda'amne");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter]);

  const handleDocSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!docForm.title || !docForm.content) {
      setErrorMsg('Mata-duree fi qabiyyee guutuu qabdu');
      return;
    }

    try {
      setSavingDoc(true);
      setErrorMsg('');

      const payload = {
        ...docForm,
        tags: docForm.tags
          ? docForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : []
      };

      const res = await api.post('/documents', payload);
      if (res.data?.success) {
        setSuccessMsg("Qaboo yaa'ii / Galmeen seeraa milkaa'inaan ol-kaawwameera!");
        setShowAddDocModal(false);
        setDocForm({
          title: '',
          type: 'MINUTES',
          content: '',
          meetingDate: getAddisToday(),
          attendeesCount: 0,
          tags: '',
          status: 'PUBLISHED'
        });
        fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Save Doc Error]:', err);
      setErrorMsg(err.response?.data?.message || "Galmee galmeessuun hin danda'amne");
    } finally {
      setSavingDoc(false);
    }
  };

  const handleSaveMedia = async (e) => {
    e.preventDefault();
    if (!mediaForm.youtubeUrl || !mediaForm.title.om) {
      setErrorMsg('YouTube Link fi Mata-duree Afaan Oromoo guutuu qabdu');
      return;
    }

    try {
      setSavingMedia(true);
      setErrorMsg('');
      const res = await api.post('/media', mediaForm);
      if (res.data?.success) {
        setSuccessMsg("Viidiyoon / Faarfannaan YouTube milkaa'inaan dabalamameera!");
        setShowAddMediaModal(false);
        setMediaForm({
          title: { om: '', am: '', en: '' },
          description: { om: '', am: '', en: '' },
          youtubeUrl: '',
          category: 'GOSPEL',
          speakerOrSinger: ''
        });
        fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Save Media Error]:', err);
      setErrorMsg(err.response?.data?.message || "Meediyaa dabaluun hin danda'amne");
    } finally {
      setSavingMedia(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Viidiyoo kana haqamuu isaa mirkaneessituu?')) return;
    try {
      const res = await api.delete(`/media/${mediaId}`);
      if (res.data?.success) {
        setSuccessMsg('Viidiyoon haqeera!');
        fetchData();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('[Delete Media Error]:', err);
      setErrorMsg("Meediyaa haquun hin danda'amne");
    }
  };

  const tabsConfig = [
    { id: 'documents', label: "Qaboo Yaa'ii", count: documents.length },
    { id: 'gospelMedia', label: 'YouTube Media', count: mediaList.length }
  ];

  const docTableColumns = [
    {
      key: 'referenceCode',
      header: 'Lakk. Eenyummaa',
      render: (code) => (
        <span className="font-mono font-bold text-gold-400">
          {code}
        </span>
      )
    },
    {
      key: 'title',
      header: 'Mata-duree',
      render: (title, doc) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{title}</div>
          <p className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
            {doc.content}
          </p>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Gosa',
      render: (type) => (
        <Badge variant="outline">
          {type}
        </Badge>
      )
    },
    {
      key: 'meetingDate',
      header: 'Guyyaa',
      render: (date) => (
        <span className="text-slate-300 text-[11px] font-medium">
          {formatDual(date)}
        </span>
      )
    },
    {
      key: 'attendeesCount',
      header: 'Hirmaattota',
      render: (count) => (
        <span className="text-slate-300 font-bold">
          {count > 0 ? `${count} namoota` : '-'}
        </span>
      )
    },
    {
      key: 'author',
      header: 'Barreessaa',
      render: (author) => (
        <span className="text-slate-300">
          {author?.fullName || 'Secretary'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Gocha',
      align: 'right',
      render: (_, doc) => (
        <Button
          data-tour="sec-view-stamp-btn"
          variant="secondary"
          size="sm"
          onClick={() => setActiveDocView(doc)}
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          <span>Dubbisi & Maxxansi</span>
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* Page Header */}
      <PageHeader
        eyebrow="Kutaa Barreessaa & Galmee (Secretariat & Records)"
        icon={FileText}
        title="Qaboo Yaa'ii, Xalayaa fi Meediyaa Wangeelaa"
        subtitle="Qaboo-yaa'ii walga'ii barreessuu, xalayaa seeraa ol-kaa'uu, fi viidiyoowwan YouTube qindeessuu."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              tabs={tabsConfig}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
            {activeTab === 'documents' && (
              <Button
                data-tour="sec-new-doc-btn"
                variant="primary"
                size="md"
                onClick={() => setShowAddDocModal(true)}
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>Galmee Haaraa</span>
              </Button>
            )}
            {activeTab === 'gospelMedia' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowAddMediaModal(true)}
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>YouTube Video Dabali</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Alert Banners */}
      {successMsg && (
        <Toast
          variant="success"
          message={successMsg}
          onClose={() => setSuccessMsg('')}
        />
      )}
      {errorMsg && (
        <Toast
          variant="error"
          message={errorMsg}
          onClose={() => setErrorMsg('')}
        />
      )}

      {/* Tab 1: Documents & Meeting Minutes */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <Card>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <form onSubmit={handleDocSearchSubmit} className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Mata-duree, Qabiyyee, ykn Lakk. Galmeen..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal transition-colors"
                />
              </form>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal cursor-pointer"
                >
                  <option value="ALL">Gosa Galmee Hundumaa</option>
                  <option value="MINUTES">Qaboo Yaa'ii (Meeting Minutes)</option>
                  <option value="OFFICIAL_LETTER">Xalayaa Seeraa (Official Letter)</option>
                  <option value="AGENDA">Ajandaa Walga'ii (Meeting Agenda)</option>
                  <option value="ANNOUNCEMENT">Beeksisa (Announcement)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Document Archive DataTable */}
          <Card noPadding>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-sm text-royal">
                <BookOpen className="w-4 h-4 text-gold-400" />
                <span>Galmee Ol-kaawwame ({documents.length})</span>
              </div>
              <span className="text-xs text-slate-400">Archived Documents</span>
            </div>

            <DataTable
              columns={docTableColumns}
              data={documents}
              loading={loading}
              emptyIcon={FileText}
              emptyTitle="Galmeen tokkollee hin argamne."
              emptyDescription="Qaboo yaa'ii ykn xalayaa haaraa barreessuuf 'Galmee Haaraa' cuqaasaa."
            />
          </Card>
        </div>
      )}

      {/* Tab 2: YouTube Gospel Media Management */}
      {activeTab === 'gospelMedia' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {mediaList.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <EmptyState
                    icon={Video}
                    title="Viidiyoon YouTube tokkollee hin jiru."
                    description="Barnoota wangeelaa, kadhannaa fi faarfannaa YouTube haaraa dabaluu dandeessu."
                    action={
                      <Button
                        variant="primary"
                        onClick={() => setShowAddMediaModal(true)}
                      >
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        <span>Viidiyoo Jalqabaa Dabali</span>
                      </Button>
                    }
                  />
                </Card>
              </div>
            ) : (
              mediaList.map((media) => (
                <Card key={media._id} noPadding className="flex flex-col justify-between overflow-hidden">
                  <div className="aspect-video w-full bg-slate-900">
                    {media.youtubeVideoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${media.youtubeVideoId}`}
                        title={media.title?.om || 'YouTube Video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                        Video Preview Unavailable
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="solid-gold">
                          {media.category}
                        </Badge>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {media.speakerOrSinger}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-royal line-clamp-1 pt-1">
                        {media.title?.om || (typeof media.title === 'string' ? media.title : 'Media')}
                      </h4>
                      {media.title?.am && (
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {media.title?.am}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-500">
                        {formatDate(media.createdAt)}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteMedia(media._id)}
                        title="Haqi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Add Document Form */}
      <Modal
        isOpen={showAddDocModal}
        onClose={() => setShowAddDocModal(false)}
        title="Qaboo Yaa'ii / Xalayaa Haaraa Barreessi"
        icon={FileText}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveDocument} className="space-y-4">
          <FormField
            label="Mata-duree Galmichaa"
            required
            type="text"
            value={docForm.title}
            onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
            placeholder="fkn. Qaboo Yaa'ii Koree Hoji-raawwachiiftuu"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              as="select"
              label="Gosa Galmee"
              required
              value={docForm.type}
              onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
            >
              <option value="MINUTES">Qaboo Yaa'ii (Meeting Minutes)</option>
              <option value="OFFICIAL_LETTER">Xalayaa Seeraa (Official Letter)</option>
              <option value="AGENDA">Ajandaa Walga'ii (Meeting Agenda)</option>
              <option value="ANNOUNCEMENT">Beeksisa (Announcement)</option>
            </FormField>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Guyyaa Walga'ichaa <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={docForm.meetingDate}
                onChange={(val) => setDocForm({ ...docForm, meetingDate: val })}
                dateOnly={true}
                max={getAddisToday()}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Baay'ina Hirmaattotaa"
              type="number"
              min="0"
              value={docForm.attendeesCount}
              onChange={(e) => setDocForm({ ...docForm, attendeesCount: e.target.value })}
              placeholder="fkn. 15"
            />

            <FormField
              label="Tags"
              type="text"
              value={docForm.tags}
              onChange={(e) => setDocForm({ ...docForm, tags: e.target.value })}
              placeholder="fkn. Marii, Faayinaansii, Live"
            />
          </div>

          <FormField
            as="textarea"
            label="Qabiyyee Guutuu (Content)"
            required
            rows={5}
            value={docForm.content}
            onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
            placeholder="Qaboo yaa'ii, murteewwan darban, fi ajandaalee asitti tarreessaa..."
          />

          <div className="pt-3 flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddDocModal(false)}
            >
              Dhiisi
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingDoc}
            >
              Ol-kaa'i & Galmeessi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add YouTube Media Form */}
      <Modal
        isOpen={showAddMediaModal}
        onClose={() => setShowAddMediaModal(false)}
        title="Viidiyoo / Faarfannaa YouTube Dabali"
        icon={Video}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveMedia} className="space-y-4">
          <FormField
            label="YouTube URL / Link"
            required
            type="url"
            value={mediaForm.youtubeUrl}
            onChange={(e) => setMediaForm({ ...mediaForm, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              as="select"
              label="Gosa (Category)"
              required
              value={mediaForm.category}
              onChange={(e) => setMediaForm({ ...mediaForm, category: e.target.value })}
            >
              <option value="GOSPEL">Wangeela (Gospel)</option>
              <option value="CHOIR">Faarfannaa (Choir)</option>
              <option value="PRAYER">Kadhannaa (Prayer)</option>
              <option value="SERMON">Lallaba (Sermon)</option>
            </FormField>

            <FormField
              label="Lallabaa / Faarfataa"
              type="text"
              value={mediaForm.speakerOrSinger}
              onChange={(e) =>
                setMediaForm({ ...mediaForm, speakerOrSinger: e.target.value })
              }
              placeholder="fkn. Faarfataa Gammachuu"
            />
          </div>

          <FormField
            label="Mata-duree (Afaan Oromoo)"
            required
            type="text"
            value={mediaForm.title.om}
            onChange={(e) =>
              setMediaForm({
                ...mediaForm,
                title: { ...mediaForm.title, om: e.target.value }
              })
            }
            placeholder="Mata-duree Faarfannaa / Lallabaa"
          />

          <div className="pt-3 flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddMediaModal(false)}
            >
              Dhiisi
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingMedia}
            >
              Dabali
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: View & Print Document */}
      {activeDocView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm print:static print:p-0 print:bg-transparent">
          <div className="w-full max-w-2xl rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto print:static print:overflow-visible print:shadow-none print:max-w-none print:border-none print:max-h-none">
            <div className="no-print print:hidden p-4 bg-royal text-white flex items-center justify-between border-b border-royal-dark">
              <span className="text-xs font-bold text-gold-300">
                Galmee Seera-Qabeessa Waldichaa (Official Document)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  <span>Maxxansi (Print)</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveDocView(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="print-area p-8 sm:p-12 space-y-6 bg-white text-slate-900" id="printable-document">
              <div className="flex items-center justify-between pb-6 border-b-2 border-slate-900">
                <div className="flex items-center space-x-4">
                  <img
                    src="/logo-walda.jpg"
                    alt="Logo"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gold-400 shadow"
                  />
                  <div>
                    <h2 className="text-base font-black text-slate-950 uppercase leading-snug">
                      Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii
                    </h2>
                    <p className="text-xs font-bold text-slate-600">
                      Kutaa Barreessaa fi Galmee Seeraa • Secretariat & Archive
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">
                    Ref: {activeDocView.referenceCode}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {formatDual(activeDocView.meetingDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                  {activeDocView.type}
                </div>
                <h1 className="text-xl font-black text-slate-900 pt-1">
                  {activeDocView.title}
                </h1>
                <p className="text-xs text-slate-500">
                  Hirmaattota: {activeDocView.attendeesCount || 'All'} • Barreessaa: {activeDocView.author?.fullName}
                </p>
              </div>

              <div className="py-4 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed border-t border-b border-slate-100">
                {activeDocView.content}
              </div>

              <div className="pt-8 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Barreessaa (Secretary):
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-1">
                    {activeDocView.author?.fullName || user?.fullName}
                  </span>
                  <div className="w-28 h-8 border-b border-dashed border-slate-400 mt-2" />
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Koreen Hooggansaa:
                  </span>
                  <ChurchStamp
                    size={100}
                    date={activeDocView.meetingDate}
                    className="-rotate-6 mt-1"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 uppercase">
                    Chaappaa Seeraa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretaryDash;
