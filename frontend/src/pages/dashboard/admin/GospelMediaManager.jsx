import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../api/axios';
import { useRadio } from '../../../context/RadioContext';
import { getLocalizedText } from '../../../utils/localized';
import {
  Plus,
  Trash2,
  Edit2,
  Play,
  ListPlus,
  RefreshCw,
  Youtube,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const CATEGORIES = ['GOSPEL', 'CHOIR', 'SERMON'];

export default function GospelMediaManager() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'om';
  const { playSong, updateQueue, radioState, brokenTracks } = useRadio();

  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null); // null = new, object = editing
  const [form, setForm] = useState({
    youtubeUrl: '',
    titleOm: '',
    titleAm: '',
    titleEn: '',
    category: 'GOSPEL',
    speakerOrSinger: '',
  });
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [preview, setPreview] = useState(null); // { title, thumbnailUrl, authorName }
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/media', {
        params: { category: filterCategory !== 'ALL' ? filterCategory : undefined },
      });
      if (res.data?.success) setMediaList(res.data.media || []);
    } catch (err) {
      console.error('[GospelMediaManager]', err);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const resetForm = () => {
    setForm({ youtubeUrl: '', titleOm: '', titleAm: '', titleEn: '', category: 'GOSPEL', speakerOrSinger: '' });
    setPreview(null);
    setFormError(null);
    setEditItem(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditItem(item);
    setForm({
      youtubeUrl: item.youtubeUrl || '',
      titleOm: item.title?.om || '',
      titleAm: item.title?.am || '',
      titleEn: item.title?.en || '',
      category: item.category || 'GOSPEL',
      speakerOrSinger: item.speakerOrSinger || '',
    });
    setPreview(
      item.thumbnailUrl
        ? { thumbnailUrl: item.thumbnailUrl, title: getLocalizedText(item.title, lang), authorName: item.speakerOrSinger }
        : null
    );
    setFormError(null);
    setShowForm(true);
  };

  const handleFetchDetails = async () => {
    if (!form.youtubeUrl.trim()) { setFormError('Paste a YouTube link first.'); return; }
    setFetchingDetails(true);
    setFormError(null);
    setPreview(null);
    try {
      const url = form.youtubeUrl.trim();
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembedUrl);
      if (!res.ok) {
        setFormError('Video not found or embedding is disabled.');
        return;
      }
      const data = await res.json();
      setPreview({ title: data.title, thumbnailUrl: data.thumbnail_url, authorName: data.author_name });
      // Prefill empty fields
      if (!form.titleOm) setForm(f => ({ ...f, titleOm: data.title || '' }));
      if (!form.speakerOrSinger) setForm(f => ({ ...f, speakerOrSinger: data.author_name || '' }));
    } catch (err) {
      setFormError('Could not fetch video details. Check the link or your connection.');
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        youtubeUrl: form.youtubeUrl.trim(),
        title: {
          om: form.titleOm.trim(),
          am: form.titleAm.trim(),
          en: form.titleEn.trim(),
        },
        category: form.category,
        speakerOrSinger: form.speakerOrSinger.trim(),
      };
      if (editItem) {
        const res = await api.patch(`/media/${editItem._id}`, payload);
        if (res.data?.success) {
          setStatusMsg({ type: 'success', text: 'Media updated successfully.' });
          setShowForm(false); resetForm(); fetchMedia();
        } else {
          setFormError(res.data?.message || 'Update failed.');
        }
      } else {
        const res = await api.post('/media', payload);
        if (res.data?.success) {
          setStatusMsg({ type: 'success', text: 'Gospel media added successfully.' });
          setShowForm(false); resetForm(); fetchMedia();
        } else {
          setFormError(res.data?.message || 'Failed to add media.');
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${getLocalizedText(item.title, lang)}"?`)) return;
    try {
      const res = await api.delete(`/media/${item._id}`);
      if (res.data?.success) { setStatusMsg({ type: 'success', text: 'Deleted.' }); fetchMedia(); }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Delete failed.' });
    }
  };

  const handlePlayForEveryone = async (item) => {
    const title = getLocalizedText(item.title, lang);
    await playSong({
      mediaId: item._id,
      title,
      url: '',
      artist: item.speakerOrSinger || 'St. George Fellowship',
      category: item.category,
      duration: 0,
      sourceType: 'YOUTUBE',
      youtubeVideoId: item.youtubeVideoId,
      thumbnailUrl: item.thumbnailUrl,
    });
    setStatusMsg({ type: 'success', text: `Now playing for everyone: ${title}` });
  };

  const handleAddToQueue = async (item) => {
    const title = getLocalizedText(item.title, lang);
    const newQueue = [
      ...(radioState.queue || []),
      {
        mediaId: item._id,
        title,
        url: '',
        artist: item.speakerOrSinger || 'St. George Fellowship',
        category: item.category,
        duration: 0,
        sourceType: 'YOUTUBE',
        youtubeVideoId: item.youtubeVideoId,
        thumbnailUrl: item.thumbnailUrl,
      },
    ];
    await updateQueue(newQueue, radioState.loop);
    setStatusMsg({ type: 'success', text: `Added to queue: ${title}` });
  };

  const filtered = mediaList.filter(m => {
    const title = getLocalizedText(m.title, lang).toLowerCase();
    return title.includes(searchTerm.toLowerCase());
  });

  const isCurrent = (item) =>
    radioState.mediaId === item._id || radioState.youtubeVideoId === item.youtubeVideoId;
  const isBroken = (item) => brokenTracks.has(item.youtubeVideoId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-600" />
            Gospel Media Library (YouTube)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage YouTube videos for radio broadcast. Staff only.</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors shadow"
        >
          <Plus className="w-4 h-4" />
          Add YouTube Video
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {statusMsg.type === 'success'
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            {statusMsg.text}
          </span>
          <button onClick={() => setStatusMsg(null)} className="ml-2 text-xs underline">OK</button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{editItem ? 'Edit YouTube Media' : 'Add YouTube Video'}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* YouTube URL + Fetch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">YouTube Link *</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <button
                  type="button"
                  onClick={handleFetchDetails}
                  disabled={fetchingDetails || !form.youtubeUrl.trim()}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {fetchingDetails
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Youtube className="w-4 h-4" />}
                  Fetch Details
                </button>
              </div>
              {formError && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{formError}
                </p>
              )}
            </div>

            {/* Preview */}
            {preview && (
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {preview.thumbnailUrl && (
                  <img src={preview.thumbnailUrl} alt="thumbnail" className="w-24 h-14 object-cover rounded-lg flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-2">{preview.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{preview.authorName}</p>
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Singer / Speaker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Singer / Speaker</label>
              <input
                type="text"
                value={form.speakerOrSinger}
                onChange={e => setForm(f => ({ ...f, speakerOrSinger: e.target.value }))}
                placeholder="Artist or preacher name"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Titles */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Titles (at least one)</label>
              {[['om', 'Afaan Oromoo'], ['am', 'Amharic (አማርኛ)'], ['en', 'English']].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-32">{label}</span>
                  <input
                    type="text"
                    value={form[`title${key.charAt(0).toUpperCase() + key.slice(1)}`]}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        [`title${key.charAt(0).toUpperCase() + key.slice(1)}`]: e.target.value,
                      }))
                    }
                    placeholder={`Title in ${label}${key === 'om' ? ' (required)' : ' (optional)'}`}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {editItem ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter/Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                filterCategory === c
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={fetchMedia}
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Media List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Youtube className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm">No YouTube media found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const title = getLocalizedText(item.title, lang);
            const broken = isBroken(item);
            const current = isCurrent(item);
            return (
              <div
                key={item._id}
                className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all ${
                  current
                    ? 'bg-red-50 border-red-300'
                    : broken
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Thumbnail */}
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={title}
                    className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-14 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Youtube className="w-6 h-6 text-slate-300" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900 truncate">{title}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded uppercase">
                      {item.category}
                    </span>
                    {current && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                        ON AIR
                      </span>
                    )}
                    {broken && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />Broken
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.speakerOrSinger}</p>
                  <a
                    href={item.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-red-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />YouTube
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                  <button
                    onClick={() => handleAddToQueue(item)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Add to radio queue"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    Queue
                  </button>
                  <button
                    onClick={() => handlePlayForEveryone(item)}
                    disabled={broken}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Play for all listeners now"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Play
                  </button>
                  <button
                    onClick={() => openEditForm(item)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
