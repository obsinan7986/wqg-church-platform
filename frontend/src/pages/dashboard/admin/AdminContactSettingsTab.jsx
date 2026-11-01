import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';
import { useSocket } from '../../../context/SocketContext';
import {
  Save,
  Radio,
  Video,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Lock,
  Globe,
  Clock,
  MapPin,
  Mail,
  Phone,
  Share2
} from 'lucide-react';
import { Card, Button, Badge, Spinner } from '../../../components/ui';

const KNOWN_PLATFORMS = [
  'FACEBOOK',
  'YOUTUBE',
  'TELEGRAM',
  'TIKTOK',
  'INSTAGRAM',
  'WHATSAPP',
  'OTHER'
];

const MEETING_PLATFORMS = ['ZOOM', 'MEET', 'YOUTUBE', 'TELEGRAM', 'OTHER'];

const AdminContactSettingsTab = () => {
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Settings form state
  const [settings, setSettings] = useState({
    emails: [''],
    phones: [''],
    address: { om: '', am: '', en: '' },
    mapUrl: '',
    officeHours: { om: '', am: '', en: '' },
    socialLinks: [],
    liveMeeting: {
      title: { om: '', am: '', en: '' },
      platform: 'ZOOM',
      url: '',
      meetingId: '',
      passcode: '',
      isLive: false,
      nextStartAt: '',
      scheduleText: { om: '', am: '', en: '' },
      visibility: 'PUBLIC'
    }
  });

  // Fetch admin settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/site-settings/admin');
      if (res.data?.success && res.data.settings) {
        const s = res.data.settings;

        // Ensure array safety and structure
        setSettings({
          emails: s.emails?.length ? s.emails : [''],
          phones: s.phones?.length ? s.phones : [''],
          address: s.address || { om: '', am: '', en: '' },
          mapUrl: s.mapUrl || '',
          officeHours: s.officeHours || { om: '', am: '', en: '' },
          socialLinks: KNOWN_PLATFORMS.map((platform) => {
            const found = (s.socialLinks || []).find((l) => l.platform === platform);
            return {
              platform,
              url: found?.url || '',
              enabled: found ? Boolean(found.enabled) : false
            };
          }),
          liveMeeting: {
            title: s.liveMeeting?.title || { om: '', am: '', en: '' },
            platform: s.liveMeeting?.platform || 'ZOOM',
            url: s.liveMeeting?.url || '',
            meetingId: s.liveMeeting?.meetingId || '',
            passcode: s.liveMeeting?.passcode || '',
            isLive: Boolean(s.liveMeeting?.isLive),
            nextStartAt: s.liveMeeting?.nextStartAt
              ? new Date(s.liveMeeting.nextStartAt).toISOString().slice(0, 16)
              : '',
            scheduleText: s.liveMeeting?.scheduleText || { om: '', am: '', en: '' },
            visibility: s.liveMeeting?.visibility || 'PUBLIC'
          }
        });
      }
    } catch (err) {
      setErrorMessage('Failed to load site settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Quick toggle live
  const handleToggleLive = async () => {
    try {
      setTogglingLive(true);
      setErrorMessage('');
      const res = await api.put('/site-settings/live-toggle');
      if (res.data?.success) {
        setSettings((prev) => ({
          ...prev,
          liveMeeting: {
            ...prev.liveMeeting,
            isLive: res.data.isLive
          }
        }));
        setStatusMessage(
          res.data.isLive
            ? 'Meeting is now LIVE! Broadcast banner activated.'
            : 'Meeting live broadcast has ENDED.'
        );
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to toggle live meeting status.'
      );
    } finally {
      setTogglingLive(false);
    }
  };

  // Save full settings
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setStatusMessage(null);

    // Prepare payload
    const payload = {
      emails: settings.emails.filter((e) => e.trim().length > 0),
      phones: settings.phones.filter((p) => p.trim().length > 0),
      address: settings.address,
      mapUrl: settings.mapUrl.trim(),
      officeHours: settings.officeHours,
      socialLinks: settings.socialLinks.filter((s) => s.url.trim().length > 0),
      liveMeeting: {
        ...settings.liveMeeting,
        nextStartAt: settings.liveMeeting.nextStartAt
          ? new Date(settings.liveMeeting.nextStartAt).toISOString()
          : null
      }
    };

    try {
      const res = await api.put('/site-settings', payload);
      if (res.data?.success) {
        setStatusMessage('Site settings updated and broadcast successfully!');
        setTimeout(() => setStatusMessage(null), 4000);
        fetchSettings();
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to save settings. Please verify URLs and fields.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Helper arrays
  const addEmailField = () =>
    setSettings((prev) => ({ ...prev, emails: [...prev.emails, ''] }));
  const removeEmailField = (idx) =>
    setSettings((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== idx)
    }));

  const addPhoneField = () =>
    setSettings((prev) => ({ ...prev, phones: [...prev.phones, ''] }));
  const removePhoneField = (idx) =>
    setSettings((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== idx)
    }));

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500 text-xs">
        <Spinner size="lg" />
        <span>Loading site settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* ══════ QUICK LIVE TOGGLE CARD ══════ */}
      <Card className="p-6 border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-red-600" />
              <h3 className="text-base font-black text-slate-900">
                Live Meeting Quick Broadcast Toggle
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              When toggled ON, the red pulsing LIVE banner immediately appears on Home and Contact
              without redeploying.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                settings.liveMeeting.isLive
                  ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              {settings.liveMeeting.isLive ? '● LIVE NOW' : 'OFFLINE'}
            </span>

            <Button
              variant={settings.liveMeeting.isLive ? 'outline' : 'primary'}
              size="sm"
              disabled={togglingLive}
              onClick={handleToggleLive}
              className={
                settings.liveMeeting.isLive
                  ? 'border-red-500 text-red-600 hover:bg-red-50'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
            >
              {togglingLive ? (
                <Spinner size="xs" />
              ) : settings.liveMeeting.isLive ? (
                'End Live Now'
              ) : (
                'Go Live Now'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ══════ MAIN EDIT FORM ══════ */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: LIVE MEETING CONFIGURATION */}
        <Card className="p-6 border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-royal" />
              <h3 className="text-base font-black text-slate-900">
                Live Meeting & Fellowship Details
              </h3>
            </div>
            <Badge variant="solid-gold">Public & Member Controls</Badge>
          </div>

          {/* Titles in 3 Languages */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Meeting Title (om / am / en)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Title in Afaan Oromoo"
                value={settings.liveMeeting.title.om || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: {
                      ...settings.liveMeeting,
                      title: { ...settings.liveMeeting.title, om: e.target.value }
                    }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="Title in አማርኛ"
                value={settings.liveMeeting.title.am || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: {
                      ...settings.liveMeeting,
                      title: { ...settings.liveMeeting.title, am: e.target.value }
                    }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="Title in English"
                value={settings.liveMeeting.title.en || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: {
                      ...settings.liveMeeting,
                      title: { ...settings.liveMeeting.title, en: e.target.value }
                    }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>
          </div>

          {/* Platform, URL, Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Platform</label>
              <select
                value={settings.liveMeeting.platform}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: { ...settings.liveMeeting, platform: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none bg-white"
              >
                {MEETING_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Join URL (Zoom, Meet, YouTube, Telegram)
              </label>
              <input
                type="url"
                placeholder="https://zoom.us/j/..."
                value={settings.liveMeeting.url}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: { ...settings.liveMeeting, url: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Visibility</label>
              <select
                value={settings.liveMeeting.visibility}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: { ...settings.liveMeeting, visibility: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none bg-white"
              >
                <option value="PUBLIC">PUBLIC (Anyone can join)</option>
                <option value="MEMBERS">MEMBERS ONLY (Requires login)</option>
              </select>
            </div>
          </div>

          {/* Meeting ID, Passcode, Next Start Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Meeting ID</label>
              <input
                type="text"
                placeholder="849 2049 1823"
                value={settings.liveMeeting.meetingId}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: { ...settings.liveMeeting, meetingId: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Passcode</label>
              <input
                type="text"
                placeholder="777777"
                value={settings.liveMeeting.passcode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: { ...settings.liveMeeting, passcode: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Next Start Time (UTC / Addis Local)
              </label>
              <input
                type="datetime-local"
                value={settings.liveMeeting.nextStartAt}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: { ...settings.liveMeeting, nextStartAt: e.target.value }
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>
          </div>

          {/* Schedule Text in 3 Languages */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Schedule Recurrence Text (om / am / en)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Kamisa fi Dilbata sa'aatii 12:00 Galgala"
                value={settings.liveMeeting.scheduleText.om || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: {
                      ...settings.liveMeeting,
                      scheduleText: {
                        ...settings.liveMeeting.scheduleText,
                        om: e.target.value
                      }
                    }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="ሐሙስ እና እሁድ ከምሽቱ 12:00 ሰዓት"
                value={settings.liveMeeting.scheduleText.am || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: {
                      ...settings.liveMeeting,
                      scheduleText: {
                        ...settings.liveMeeting.scheduleText,
                        am: e.target.value
                      }
                    }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="Every Thursday & Sunday at 6:00 PM"
                value={settings.liveMeeting.scheduleText.en || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    liveMeeting: {
                      ...settings.liveMeeting,
                      scheduleText: {
                        ...settings.liveMeeting.scheduleText,
                        en: e.target.value
                      }
                    }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 2: OFFICIAL EMAILS & PHONES */}
        <Card className="p-6 border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-royal" />
              <h3 className="text-base font-black text-slate-900">
                Official Emails & Phone Numbers
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emails List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-royal" />
                  <span>Official Emails</span>
                </label>
                <button
                  type="button"
                  onClick={addEmailField}
                  className="text-xs font-bold text-royal hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Email</span>
                </button>
              </div>

              <div className="space-y-2">
                {settings.emails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const copy = [...settings.emails];
                        copy[idx] = e.target.value;
                        setSettings({ ...settings, emails: copy });
                      }}
                      placeholder="e.g. contact@church.org"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
                    />
                    {settings.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Phones List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-royal" />
                  <span>Official Phones</span>
                </label>
                <button
                  type="button"
                  onClick={addPhoneField}
                  className="text-xs font-bold text-royal hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Phone</span>
                </button>
              </div>

              <div className="space-y-2">
                {settings.phones.map((phone, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => {
                        const copy = [...settings.phones];
                        copy[idx] = e.target.value;
                        setSettings({ ...settings, phones: copy });
                      }}
                      placeholder="e.g. +251911000001"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none font-mono"
                    />
                    {settings.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhoneField(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 3: ADDRESS, MAP URL, & OFFICE HOURS */}
        <Card className="p-6 border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-royal" />
            <h3 className="text-base font-black text-slate-900">
              Address, Google Maps & Office Hours
            </h3>
          </div>

          {/* Address in 3 languages */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Church Address (om / am / en)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Address in Afaan Oromoo"
                value={settings.address.om || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    address: { ...settings.address, om: e.target.value }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="Address in አማርኛ"
                value={settings.address.am || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    address: { ...settings.address, am: e.target.value }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="Address in English"
                value={settings.address.en || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    address: { ...settings.address, en: e.target.value }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>
          </div>

          {/* Google Maps Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Google Maps URL (must be maps.google.com or maps.app.goo.gl)
            </label>
            <input
              type="url"
              placeholder="https://maps.google.com/?q=..."
              value={settings.mapUrl}
              onChange={(e) => setSettings({ ...settings, mapUrl: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
            />
          </div>

          {/* Office Hours in 3 languages */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Office Hours (om / am / en)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Wiixata - Jimaata: 2:30 - 11:30"
                value={settings.officeHours.om || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeHours: { ...settings.officeHours, om: e.target.value }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="ሰኞ - አርብ፡ 2:30 - 11:30"
                value={settings.officeHours.am || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeHours: { ...settings.officeHours, am: e.target.value }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
              <input
                type="text"
                placeholder="Monday - Friday: 8:30 AM - 5:30 PM"
                value={settings.officeHours.en || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeHours: { ...settings.officeHours, en: e.target.value }
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-royal focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* SECTION 4: SOCIAL MEDIA LINKS */}
        <Card className="p-6 border-slate-200 bg-white space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-royal" />
            <h3 className="text-base font-black text-slate-900">
              Social Media Channels
            </h3>
          </div>

          <div className="space-y-4">
            {settings.socialLinks.map((item, idx) => (
              <div
                key={item.platform}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center space-x-3 w-40 shrink-0">
                  <input
                    type="checkbox"
                    id={`social-enable-${idx}`}
                    checked={item.enabled}
                    onChange={(e) => {
                      const copy = [...settings.socialLinks];
                      copy[idx].enabled = e.target.checked;
                      setSettings({ ...settings, socialLinks: copy });
                    }}
                    className="w-4 h-4 text-royal rounded border-slate-300 focus:ring-royal"
                  />
                  <label
                    htmlFor={`social-enable-${idx}`}
                    className="font-bold text-xs text-slate-800 cursor-pointer"
                  >
                    {item.platform}
                  </label>
                </div>

                <div className="flex-1">
                  <input
                    type="url"
                    disabled={!item.enabled}
                    value={item.url}
                    onChange={(e) => {
                      const copy = [...settings.socialLinks];
                      copy[idx].url = e.target.value;
                      setSettings({ ...settings, socialLinks: copy });
                    }}
                    placeholder={`https://${item.platform.toLowerCase()}.com/...`}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-royal focus:outline-none transition-opacity ${
                      item.enabled
                        ? 'border-slate-300 bg-white opacity-100'
                        : 'border-slate-200 bg-slate-100 opacity-60'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SAVE SUBMIT BUTTON */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button
            type="submit"
            variant="solid-gold"
            size="md"
            disabled={saving}
            className="min-w-[180px] shadow-md font-black"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <Spinner size="sm" />
                <span>Saving Settings...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminContactSettingsTab;
