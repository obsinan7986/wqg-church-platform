import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  UploadCloud,
  FileText,
  Music,
  Video,
  BookOpen,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  Search,
  X,
  FileCheck,
  HardDrive,
  Layers
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Modal,
  Toast,
  FormField,
  EmptyState,
  DateTimePicker
} from '../../components/ui';
import { formatDate } from '../../utils/dateFormat';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const CATEGORIES = [
  {
    id: 'BOOK',
    label: 'Kitaaba Hafuuraa (Religious Book - PDF)',
    icon: BookOpen,
    accept: '.pdf,application/pdf',
    hint: 'PDF qofa (Max: 50MB)'
  },
  {
    id: 'GOSPEL',
    label: 'Wangeela (Gospel - MP3/Audio)',
    icon: Music,
    accept: 'audio/*,.mp3,.wav,.ogg,.m4a,.aac',
    hint: 'MP3, WAV, M4A, OGG, AAC (Max: 50MB)'
  },
  {
    id: 'CHOIR',
    label: 'Faarfannaa (Choir - MP3/Audio)',
    icon: Music,
    accept: 'audio/*,.mp3,.wav,.ogg,.m4a,.aac',
    hint: 'MP3, WAV, M4A, OGG, AAC (Max: 50MB)'
  },
  {
    id: 'SERMON',
    label: 'Lallaba (Sermon - MP4/Video/Audio)',
    icon: Video,
    accept: 'video/*,audio/*,.mp4,.mkv,.webm,.mov,.mp3',
    hint: 'MP4, WebM, MKV, MP3 (Max: 50MB)'
  }
];

const AdminUpload = ({ onUploadSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('BOOK');
  const [description, setDescription] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Status & Progress State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Media Document Management State
  const [mediaList, setMediaList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [activePreview, setActivePreview] = useState(null);

  const selectedCategoryConfig =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const fetchMediaDocuments = async () => {
    try {
      setLoadingList(true);
      const res = await api.get('/media/all', {
        params: {
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          search: searchQuery.trim() || undefined
        }
      });
      if (res.data?.success) {
        setMediaList(res.data.media || []);
      }
    } catch (err) {
      console.error('[Fetch Media Error]:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchMediaDocuments();
  }, [categoryFilter]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMessage('');
    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMessage(
        `Faayiliin kun ${formatFileSize(selectedFile.size)} dha. Hangi ol-aanaan 50MB caaluu hin qabu (File exceeds 50MB limit).`
      );
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    if (!title.trim()) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Mata-duree faayilii galchaa (Title is required).');
      return;
    }

    if (!file) {
      setErrorMessage('Faayilii ol-fe\'amu filadhaa (Please select a file).');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('description', description.trim());
      if (recordedAt) {
        formData.append('recordedAt', recordedAt);
      }
      formData.append('file', file);

      const token = localStorage.getItem('wqg_token');
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      };

      const res = await api.post('/media/upload', formData, config);

      if (res.data?.success) {
        setSuccessMessage(
          `Faayiliin "${res.data.media?.title || title}" milkaa'inaan ol-fe'ameera!`
        );
        setTitle('');
        setDescription('');
        setRecordedAt('');
        setFile(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';

        fetchMediaDocuments();

        if (typeof onUploadSuccess === 'function') {
          onUploadSuccess(res.data.media);
        }
      }
    } catch (err) {
      console.error('[Upload Submit Error]:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Faayilii ol-fe'uun hin danda'amne. Irra deebi'aa yaalaa.";
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, docTitle) => {
    if (!window.confirm(`Dhuguma faayilii "${docTitle}" haquu barbaadduu?`)) {
      return;
    }

    try {
      setDeletingId(docId);
      const token = localStorage.getItem('wqg_token');
      const res = await api.delete(`/media/document/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        setSuccessMessage(`Faayiliin "${docTitle}" haqameera.`);
        fetchMediaDocuments();
      }
    } catch (err) {
      console.error('[Delete Error]:', err);
      setErrorMessage(
        err.response?.data?.message || "Faayilii haquun hin danda'amne."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMediaUrl = (relativeOrFull) => resolveMediaUrl(relativeOrFull);

  return (
    <div className="space-y-8 text-slate-900">
      {/* Upload Header Box */}
      <Card className="space-y-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Badge variant="solid-gold">
              <UploadCloud className="w-3.5 h-3.5 mr-1" />
              <span>Sirna Faayilii Ol-fe'uu (Upload Management)</span>
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black text-royal">
              Faayiloota Hafuuraa Fe'i & Bulchi
            </h2>
            <p className="text-xs text-slate-600">
              Kitaabota PDF, Faarfannaa fi Wangeela Audio (MP3), fi Lallaba Viidiyoo (MP4) ol-fe'aa. Hangi faayilii tokkoo hanga 50MB eeyyamama.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs bg-royal-tint px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700">
            <HardDrive className="w-4 h-4 text-gold-500" />
            <span>Daangaa: <strong className="text-royal">50 MB</strong> / Faayilii</span>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <Toast
            variant="success"
            message={successMessage}
            onClose={() => setSuccessMessage('')}
          />
        )}
        {errorMessage && (
          <Toast
            variant="error"
            message={errorMessage}
            onClose={() => setErrorMessage('')}
          />
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField
              label="Mata-duree Faayilii (Title)"
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="fkn: Qabsoo Qulqulluu Giyoorgisii, Faarfannaa 01, Lallaba Ayyaanaa..."
              disabled={uploading}
            />

            <FormField
              as="select"
              label="Gosa Faayilii (Category)"
              required
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={uploading}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-white text-slate-900">
                  {cat.label}
                </option>
              ))}
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Ibsa Dabalataa (Description - Yaada gabaabaa)"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ibsa faayilii kanaa gabaabinaan barreessaa (optional)..."
              disabled={uploading}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Guyyaa & Sa'aatii Waraabbii (Recorded At)
              </label>
              <DateTimePicker
                value={recordedAt}
                onChange={(val) => setRecordedAt(val)}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Faayilii Filadhu (File Selection) <span className="text-red-500">*</span></span>
              <span className="text-[11px] text-royal font-semibold">
                {selectedCategoryConfig.hint}
              </span>
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-royal bg-royal-tint scale-[1.01]'
                  : file
                  ? 'border-royal bg-royal-tint/30'
                  : 'border-slate-300 hover:border-royal/50 bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={selectedCategoryConfig.accept}
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />

              {file ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-royal flex items-center justify-center text-royal mx-auto shadow-sm">
                    <FileCheck className="w-6 h-6 text-royal" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 truncate max-w-md mx-auto">
                      {file.name}
                    </h4>
                    <p className="text-[11px] text-royal font-bold mt-0.5">
                      {formatFileSize(file.size)} • {file.type || 'Ready to upload'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Faayilii Jijjiiri</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-royal-tint border border-slate-200 flex items-center justify-center text-gold-500 mx-auto shadow-sm">
                    <UploadCloud className="w-6 h-6 text-gold-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Faayilii asitti harkisaa ykn cuqaasaatii filadhaa
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Eeyyamama: {selectedCategoryConfig.accept} (Hanga 50MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2 p-4 rounded-2xl bg-royal-tint border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-royal flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Faayiliin ol-fe'amaa jira...</span>
                </span>
                <span className="text-slate-900">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-royal h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={uploading || !file}
              loading={uploading}
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              <span>{uploading ? `Fe'aa jira (${uploadProgress}%)...` : "Ol-fe'i (Upload Now)"}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Media Management Table */}
      <Card className="space-y-5 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-lg font-black text-royal flex items-center space-x-2">
              <Layers className="w-4 h-4 text-gold-500" />
              <span>Galmee Faayiloota Ol-fe'amanii ({mediaList.length})</span>
            </h3>
            <p className="text-xs text-slate-600">
              Faayiloota ol-fe'aman ilaalaa, daawwadhaa, buufadhaa ykn haqaa.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Barbaadi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMediaDocuments()}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal w-44"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMediaDocuments}
              title="Haaromsi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <Button
            variant={categoryFilter === 'ALL' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('ALL')}
          >
            Hundumaa ({mediaList.length})
          </Button>
          {CATEGORIES.map((c) => {
            const count = mediaList.filter((m) => m.category === c.id).length;
            const isActive = categoryFilter === c.id;
            return (
              <Button
                key={c.id}
                variant={isActive ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter(c.id)}
              >
                {c.id} {categoryFilter === 'ALL' ? `(${count})` : ''}
              </Button>
            );
          })}
        </div>

        {/* Table Content */}
        {loadingList ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-royal" />
            <span>Faayiloota fe'aa jira...</span>
          </div>
        ) : mediaList.length === 0 ? (
          <EmptyState
            icon={UploadCloud}
            title="Faayiliin tokkollee hin argamne."
            description="Faayilii haaraa ol-fe'uuf foomii gubbaa jiru fayyadamaa."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-royal font-bold uppercase text-[10px] tracking-wider bg-royal-tint">
                  <th className="py-2.5 px-3">Faayilii & Mata-duree</th>
                  <th className="py-2.5 px-3">Gosa</th>
                  <th className="py-2.5 px-3">Hanga</th>
                  <th className="py-2.5 px-3">Kan Fe'e</th>
                  <th className="py-2.5 px-3">Guyyaa</th>
                  <th className="py-2.5 px-3 text-right">Tarkaanfii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {mediaList.map((doc) => {
                  const url = getMediaUrl(doc.fileUrl);
                  return (
                    <tr key={doc._id} className="hover:bg-royal-tint/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-royal-tint border border-slate-200 flex items-center justify-center text-royal flex-shrink-0">
                            {doc.fileType === 'PDF' ? (
                              <FileText className="w-4 h-4 text-royal" />
                            ) : doc.fileType === 'AUDIO' ? (
                              <Music className="w-4 h-4 text-royal" />
                            ) : (
                              <Video className="w-4 h-4 text-royal" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <p className="font-bold text-slate-900 truncate text-xs">
                              {doc.title}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {doc.fileName || doc.storedFileName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge variant="outline">
                          {doc.category}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-semibold text-[11px]">
                        {formatFileSize(doc.fileSize)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 text-xs">
                        <span>{doc.uploadedBy?.fullName || 'Admin'}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatDate(doc.recordedAt || doc.createdAt)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActivePreview(doc)}
                            title="Ilaali"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <a
                            href={url}
                            download={doc.fileName || true}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-royal hover:border-royal transition-colors inline-flex items-center justify-center"
                            title="Buufadhu"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(doc._id, doc.title)}
                            disabled={deletingId === doc._id}
                            title="Haqi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Media Preview Modal */}
      <Modal
        isOpen={Boolean(activePreview)}
        onClose={() => setActivePreview(null)}
        title={activePreview ? activePreview.title : 'Preview'}
        eyebrow={activePreview?.category}
        maxWidth="max-w-4xl"
      >
        {activePreview && (
          <div className="flex flex-col items-center justify-center">
            {activePreview.fileType === 'PDF' ? (
              <div className="w-full h-[60vh] flex flex-col space-y-3">
                <iframe
                  src={getMediaUrl(activePreview.fileUrl)}
                  title={activePreview.title}
                  className="w-full h-full rounded-2xl border border-slate-200 bg-white"
                />
                <div className="text-center">
                  <a
                    href={getMediaUrl(activePreview.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-500 text-royal font-black text-xs hover:bg-gold-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Fuula Guutuun Bani / Buufadhu</span>
                  </a>
                </div>
              </div>
            ) : activePreview.fileType === 'AUDIO' ? (
              <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-lg">
                <div className="w-14 h-14 rounded-full bg-royal-tint border border-gold-400 flex items-center justify-center text-gold-500 mx-auto">
                  <Music className="w-7 h-7 text-gold-500" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-royal">{activePreview.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{activePreview.fileName}</p>
                </div>
                <audio controls autoPlay src={getMediaUrl(activePreview.fileUrl)} className="w-full" />
              </div>
            ) : activePreview.fileType === 'VIDEO' ? (
              <div className="w-full max-w-2xl space-y-3">
                <video controls autoPlay src={getMediaUrl(activePreview.fileUrl)} className="w-full max-h-[60vh] rounded-2xl bg-black border border-slate-200" />
                <h4 className="font-bold text-xs text-slate-900 text-center">{activePreview.title}</h4>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-500">Faayilii buufachuuf as cuqaasaa.</p>
                <a
                  href={getMediaUrl(activePreview.fileUrl)}
                  download
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gold-500 text-royal font-black text-xs hover:bg-gold-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Faayilii Buufadhu</span>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUpload;
