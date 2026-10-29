import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import {
  Megaphone,
  Calendar,
  Clock,
  Radio,
  Image as ImageIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Pin,
  Eye,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Bell,
  Sparkles,
  MapPin,
  Play,
  Layers,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card, Button, Badge, Modal, FormField, Toast, Spinner, EmptyState, DateTimePicker, TimePicker } from '../../components/ui';
import { getLocalizedText } from '../../utils/localized';
import { useDateSettings } from '../../context/DateSettingsContext';
import { FIXED_CHURCH_FEASTS, toEthiopian, toGregorian } from '../../utils/ethiopianCalendar';
import { getAddisToday, formatTimeRange } from '../../utils/dateFormat';
import { formatEventDate, formatTimeOnly, getEventDateBadge } from '../../utils/dateFormatter';

const WHEN_SUGGESTIONS = [
  'Yeroo hunda',
  'Galgalaa yeroo hunda',
  'Ganama yeroo hunda',
  'Waree duraa',
  'Waree booda',
  'Guyyaa',
  'Halkan'
];

const parseTimeToMinutes = (val) => {
  if (typeof val === 'number') return Math.max(0, Math.min(1439, Math.floor(val)));
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const ProgramsManager = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { formatDate, formatDateTime, formatTime, formatDual, calendarPref, clockPref, currentLang } = useDateSettings();

  const isSecretary = user?.role === 'SECRETARY';
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // Sub-tabs: announcements | events | schedule | live | banners
  const [activeSubTab, setActiveSubTab] = useState('announcements');

  // Data states
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [banners, setBanners] = useState([]);
  const [liveMeeting, setLiveMeeting] = useState(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Weekly schedule active group filter: SUNDAY_SERVICE | YOUTH | LIVE
  const [scheduleGroup, setScheduleGroup] = useState('SUNDAY_SERVICE');

  // Modals state
  const [modalType, setModalType] = useState(null); // 'announcement' | 'event' | 'schedule' | 'banner' | 'scheduleLive'
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, item }

  // Multilingual form tab in modals: 'om' | 'am' | 'en'
  const [formLangTab, setFormLangTab] = useState('om');

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Common form fields
  const [title, setTitle] = useState({ om: '', am: '', en: '' });
  const [description, setDescription] = useState({ om: '', am: '', en: '' });
  const [imageUrl, setImageUrl] = useState('');
  const [pinned, setPinned] = useState(false);
  const [audience, setAudience] = useState('ALL');
  const [publishStatus, setPublishStatus] = useState('DRAFT'); // 'DRAFT' | 'PUBLISHED'
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notifyMembers, setNotifyMembers] = useState(false);

  // Event specific fields
  const [eventType, setEventType] = useState('OTHER');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [recurrence, setRecurrence] = useState('NONE');
  const [ethDay, setEthDay] = useState('');
  const [ethMonth, setEthMonth] = useState('');

  // ScheduleItem specific fields
  const [scheduleItemGroup, setScheduleItemGroup] = useState('SUNDAY_SERVICE');
  const [whenText, setWhenText] = useState({ om: '', am: '', en: '' });
  const [timeText, setTimeText] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [scheduleCustomTextActive, setScheduleCustomTextActive] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:30');
  const [scheduleEndTime, setScheduleEndTime] = useState('10:00');
  const [scheduleEndsNextDay, setScheduleEndsNextDay] = useState(false);
  const [scheduleClockType, setScheduleClockType] = useState('INTERNATIONAL');
  const [whatText, setWhatText] = useState({ om: '', am: '', en: '' });
  const [itemOrder, setItemOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Form error and dirty state across modals
  const [modalErrors, setModalErrors] = useState({});
  const [modalAlertMsg, setModalAlertMsg] = useState('');
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Live preview & time rules for schedule modal
  const timeCrossesMidnight = React.useMemo(() => {
    const sMin = parseTimeToMinutes(scheduleStartTime);
    const eMin = parseTimeToMinutes(scheduleEndTime);
    if (sMin !== null && eMin !== null) {
      return eMin <= sMin;
    }
    return false;
  }, [scheduleStartTime, scheduleEndTime]);

  const generatedFallbackText = React.useMemo(() => {
    return `${scheduleStartTime || '00:00'} - ${scheduleEndTime || '00:00'}${scheduleEndsNextDay ? ' (+1)' : ''}`;
  }, [scheduleStartTime, scheduleEndTime, scheduleEndsNextDay]);

  const livePreviewTime = React.useMemo(() => {
    if (scheduleCustomTextActive && customTime.trim()) {
      return customTime.trim();
    }
    if (scheduleStartTime) {
      const formatted = formatTimeRange(scheduleStartTime, scheduleEndTime || scheduleStartTime, {
        clock: scheduleClockType,
        locale: currentLang
      });
      return `${formatted}${scheduleEndsNextDay ? ' (+1)' : ''}`;
    }
    return '00:00 - 00:00';
  }, [scheduleCustomTextActive, customTime, scheduleStartTime, scheduleEndTime, scheduleClockType, currentLang, scheduleEndsNextDay]);

  // Banner specific fields
  const [bannerBadge, setBannerBadge] = useState('Ayyaana & Sagantaa Addaa');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('/services');

  // Live schedule form fields
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  const [liveScheduledDate, setLiveScheduledDate] = useState('');

  // Fetch Announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get('/announcements');
      if (res.data?.success) {
        setAnnouncements(res.data.announcements || []);
      }
    } catch (err) {
      console.error('[fetchAnnouncements Error]:', err);
    }
  }, []);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/events');
      if (res.data?.success) {
        setEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('[fetchEvents Error]:', err);
    }
  }, []);

  // Fetch Schedule
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await api.get('/schedule');
      if (res.data?.success) {
        setScheduleItems(res.data.items || []);
      }
    } catch (err) {
      console.error('[fetchSchedule Error]:', err);
    }
  }, []);

  // Fetch Banners
  const fetchBanners = useCallback(async () => {
    try {
      const res = await api.get('/banners?all=true');
      if (res.data?.success) {
        setBanners(res.data.banners || []);
      }
    } catch (err) {
      console.error('[fetchBanners Error]:', err);
    }
  }, []);

  // Fetch Live Info
  const fetchLive = useCallback(async () => {
    try {
      const res = await api.get('/live/active');
      if (res.data?.success) {
        setLiveMeeting(res.data.meeting || null);
      }
    } catch (err) {
      console.error('[fetchLive Error]:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAnnouncements(),
      fetchEvents(),
      fetchSchedule(),
      fetchBanners(),
      fetchLive()
    ]).finally(() => setLoading(false));
  }, [fetchAnnouncements, fetchEvents, fetchSchedule, fetchBanners, fetchLive]);

  // Socket auto refresh on content_updated
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchAnnouncements();
      fetchEvents();
      fetchSchedule();
      fetchBanners();
      fetchLive();
    };
    socket.on('content_updated', handleUpdate);
    return () => socket.off('content_updated', handleUpdate);
  }, [socket, fetchAnnouncements, fetchEvents, fetchSchedule, fetchBanners, fetchLive]);

  // Image upload handler
  const handleImageUpload = async (e, uploadType = 'banners') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setToast({
        type: 'error',
        message: 'Suuraan filatame 3MB ol ta\'uu hin qabu (Image size cannot exceed 3MB).'
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      let endpoint = '/banners/upload';
      if (uploadType === 'announcements') endpoint = '/announcements/upload';
      if (uploadType === 'events') endpoint = '/events/upload';

      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data.url) {
        setImageUrl(res.data.url);
        setToast({
          type: 'success',
          message: 'Suuraan Cloudinary irratti fe\'ameera (Image uploaded successfully)!'
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Suuraa fe\'uu hin dandeenye (Failed to upload image).'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Reset form
  const resetForm = (targetGroup = scheduleGroup) => {
    setTitle({ om: '', am: '', en: '' });
    setDescription({ om: '', am: '', en: '' });
    setImageUrl('');
    setPinned(false);
    setAudience('ALL');
    setPublishStatus(isSecretary ? 'DRAFT' : 'PUBLISHED');
    setPublishAt(new Date().toISOString());
    setExpiresAt('');
    setNotifyMembers(false);

    setEventType('OTHER');
    setStartAt(new Date(Date.now() + 86400000).toISOString());
    setEndAt('');
    setLocation('');
    setLinkUrl('');
    setRecurrence('NONE');
    setEthDay('');
    setEthMonth('');

    const group = targetGroup || scheduleGroup || 'SUNDAY_SERVICE';
    setScheduleItemGroup(group);
    setWhenText({ om: '', am: '', en: '' });
    setTimeText('');
    setCustomTime('');
    setScheduleCustomTextActive(false);
    setScheduleStartTime('08:30');
    setScheduleEndTime('10:00');
    setScheduleEndsNextDay(false);
    setScheduleClockType('INTERNATIONAL');
    setWhatText({ om: '', am: '', en: '' });

    // Compute default order = highest order in that group + 1
    const groupItems = scheduleItems.filter((it) => it.group === group);
    const maxOrder = groupItems.reduce((max, it) => Math.max(max, it.order || 0), 0);
    setItemOrder(maxOrder + 1);
    setIsActive(true);

    setBannerBadge('Ayyaana & Sagantaa Addaa');
    setBannerLinkUrl('/services');

    setLiveTitle('');
    setLiveDescription('');
    setLiveScheduledDate(new Date(Date.now() + 86400000).toISOString());

    setEditItem(null);
    setFormLangTab('om');
    setModalErrors({});
    setModalAlertMsg('');
    setIsFormDirty(false);
  };

  // Safe Modal Close with unsaved changes confirmation
  const handleModalClose = () => {
    if (isFormDirty) {
      const confirmDiscard = window.confirm(
        'Jijjiirama hin qusatamne qabda. Cufuu barbaaddaa? (You have unsaved changes. Discard?)'
      );
      if (!confirmDiscard) return;
    }
    setModalType(null);
    setEditItem(null);
    setIsFormDirty(false);
    setModalErrors({});
    setModalAlertMsg('');
  };

  // Open Create Modal
  const handleOpenCreate = (type) => {
    resetForm();
    setModalType(type);
  };

  // Quick-Add Feast helper
  const handleQuickAddFeast = (feast) => {
    setTitle({
      om: feast.name.om,
      am: feast.name.am,
      en: feast.name.en
    });
    setDescription({
      om: `Ayyaana Qulqulluu: ${feast.name.om}`,
      am: `የቤተክርስቲያን በዓል: ${feast.name.am}`,
      en: `Church Feast: ${feast.name.en}`
    });
    setEventType('FEAST');
    setRecurrence(feast.type);
    setEthDay(feast.ethDay);
    setEthMonth(feast.ethMonth || '');

    // Next occurrence in Addis time
    const todayStr = getAddisToday();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const ethToday = toEthiopian({ year: ty, month: tm, day: td });
    let targetYear = ethToday.year;
    let targetMonth = feast.ethMonth || ethToday.month;

    if (feast.type === 'ETH_MONTHLY') {
      if (ethToday.day > feast.ethDay) {
        targetMonth = ethToday.month === 13 ? 1 : ethToday.month + 1;
        if (targetMonth === 1) targetYear++;
      }
    } else if (feast.type === 'ETH_YEARLY') {
      if (
        ethToday.month > feast.ethMonth ||
        (ethToday.month === feast.ethMonth && ethToday.day > feast.ethDay)
      ) {
        targetYear++;
      }
    }

    const targetGreg = toGregorian(targetYear, targetMonth, feast.ethDay);
    const gregIso = new Date(
      Date.UTC(targetGreg.year, targetGreg.month - 1, targetGreg.day, 6, 0, 0)
    ).toISOString();
    setStartAt(gregIso);
  };

  // Open Edit Modal
  const handleOpenEdit = (type, item) => {
    resetForm();
    setEditItem(item);
    setModalType(type);

    if (type === 'announcement') {
      setTitle({
        om: item.title?.om || '',
        am: item.title?.am || '',
        en: item.title?.en || ''
      });
      setDescription({
        om: item.description?.om || '',
        am: item.description?.am || '',
        en: item.description?.en || ''
      });
      setImageUrl(item.imageUrl || '');
      setPinned(Boolean(item.pinned));
      setAudience(item.audience || 'ALL');
      setPublishStatus(item.status || 'DRAFT');
      setPublishAt(item.publishAt ? new Date(item.publishAt).toISOString() : '');
      setExpiresAt(item.expiresAt ? new Date(item.expiresAt).toISOString() : '');
    } else if (type === 'event') {
      setTitle({
        om: item.title?.om || '',
        am: item.title?.am || '',
        en: item.title?.en || ''
      });
      setDescription({
        om: item.description?.om || '',
        am: item.description?.am || '',
        en: item.description?.en || ''
      });
      setEventType(item.type || 'OTHER');
      setStartAt(item.startAt ? new Date(item.startAt).toISOString() : '');
      setEndAt(item.endAt ? new Date(item.endAt).toISOString() : '');
      setLocation(item.location || '');
      setImageUrl(item.imageUrl || '');
      setLinkUrl(item.linkUrl || '');
      setAudience(item.audience || 'ALL');
      setPublishStatus(item.status || 'DRAFT');
      setRecurrence(item.recurrence || 'NONE');
      setEthDay(item.ethDay || '');
      setEthMonth(item.ethMonth || '');
    } else if (type === 'schedule') {
      setScheduleItemGroup(item.group || 'SUNDAY_SERVICE');
      setWhenText({
        om: item.when?.om || '',
        am: item.when?.am || '',
        en: item.when?.en || ''
      });
      // Start time calculation
      let sStr = item.startTime || '';
      if (item.startMinutes !== undefined && item.startMinutes !== null) {
        const sh = Math.floor(item.startMinutes / 60);
        const sm = item.startMinutes % 60;
        sStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      }
      // End time calculation
      let eStr = item.endTime || '';
      if (item.endMinutes !== undefined && item.endMinutes !== null) {
        const eh = Math.floor(item.endMinutes / 60);
        const em = item.endMinutes % 60;
        eStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
      }
      setScheduleStartTime(sStr || '08:30');
      setScheduleEndTime(eStr || '10:00');
      setScheduleEndsNextDay(Boolean(item.endsNextDay));
      setScheduleClockType(item.clockType || 'INTERNATIONAL');
      setCustomTime(item.customTime || '');
      setScheduleCustomTextActive(Boolean(item.customTime && item.customTime.trim()));
      setTimeText(item.time || '');
      setWhatText({
        om: item.what?.om || '',
        am: item.what?.am || '',
        en: item.what?.en || ''
      });
      setItemOrder(item.order !== undefined ? item.order : 0);
      setIsActive(item.isActive !== undefined ? item.isActive : true);
      setModalErrors({});
      setModalAlertMsg('');
      setIsFormDirty(false);
    } else if (type === 'banner') {
      setTitle({
        om: item.title?.om || '',
        am: item.title?.am || '',
        en: item.title?.en || ''
      });
      setDescription({
        om: item.description?.om || '',
        am: item.description?.am || '',
        en: item.description?.en || ''
      });
      setImageUrl(item.imageUrl || '');
      setBannerBadge(item.badge || 'Ayyaana & Sagantaa Addaa');
      setBannerLinkUrl(item.linkUrl || '/services');
      setItemOrder(item.order || 0);
      setIsActive(item.isActive !== undefined ? item.isActive : true);
    }
  };

  // Open Duplicate
  const handleDuplicate = (type, item) => {
    handleOpenEdit(type, item);
    setEditItem(null); // Clear edit id so it saves as new
    setTitle((prev) => ({
      om: `${prev.om} (Waraabbii / Copy)`,
      am: prev.am ? `${prev.am} (ቅጂ)` : '',
      en: prev.en ? `${prev.en} (Copy)` : ''
    }));
    setPublishStatus(isSecretary ? 'DRAFT' : 'DRAFT'); // Default copy to draft
  };

  // Save Announcement
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    const errs = {};

    const resolvedTitleOm = (title.om || title.am || title.en || '').trim();
    if (!resolvedTitleOm) {
      errs['title.om'] = 'Mata duree galchaa (Please enter a title).';
    }

    const resolvedDescOm = (description.om || description.am || description.en || resolvedTitleOm || '').trim();

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      setModalAlertMsg(Object.values(errs)[0]);
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setModalErrors({});
    setModalAlertMsg('');
    setFormLoading(true);
    try {
      const payload = {
        title: {
          om: resolvedTitleOm,
          am: (title.am || resolvedTitleOm).trim(),
          en: (title.en || resolvedTitleOm).trim()
        },
        description: {
          om: resolvedDescOm,
          am: (description.am || resolvedDescOm).trim(),
          en: (description.en || resolvedDescOm).trim()
        },
        imageUrl,
        pinned,
        audience,
        status: isSecretary ? 'DRAFT' : publishStatus,
        publishAt: publishAt ? new Date(publishAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notifyMembers
      };

      if (editItem) {
        await api.put(`/announcements/${editItem._id}`, payload);
        setToast({ type: 'success', message: 'Beeksiisni haaromfameera (Announcement updated)!' });
      } else {
        await api.post('/announcements', payload);
        setToast({ type: 'success', message: 'Beeksiisni uumameera (Announcement created)!' });
      }

      setModalType(null);
      setEditItem(null);
      setIsFormDirty(false);
      fetchAnnouncements();
      if (socket) socket.emit('content_updated', { type: 'ANNOUNCEMENT' });
    } catch (err) {
      const serverErrs = err.response?.data?.errors;
      if (serverErrs && typeof serverErrs === 'object') setModalErrors(serverErrs);
      setModalAlertMsg(err.response?.data?.message || 'Hojichi hin milkoofne (Operation failed).');
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setFormLoading(false);
    }
  };

  // Save Event
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    const errs = {};

    const resolvedTitleOm = (title.om || title.am || title.en || '').trim();
    if (!resolvedTitleOm) {
      errs['title.om'] = 'Mata duree galchaa (Please enter an event title).';
    }

    const resolvedDescOm = (description.om || description.am || description.en || resolvedTitleOm || '').trim();

    if (!startAt) {
      errs.startAt = 'Guyyaan sagantaa dirqama (Start date required).';
    }
    if (endAt && new Date(endAt) <= new Date(startAt)) {
      errs.endAt = 'Yeroon xumuraa yeroo jalqabaa booda ta\'uu qaba (End date must be after start date).';
    }

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      setModalAlertMsg(Object.values(errs)[0]);
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setModalErrors({});
    setModalAlertMsg('');
    setFormLoading(true);
    try {
      const payload = {
        title: {
          om: resolvedTitleOm,
          am: (title.am || resolvedTitleOm).trim(),
          en: (title.en || resolvedTitleOm).trim()
        },
        description: {
          om: resolvedDescOm,
          am: (description.am || resolvedDescOm).trim(),
          en: (description.en || resolvedDescOm).trim()
        },
        type: eventType,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        location,
        imageUrl,
        linkUrl,
        audience,
        status: isSecretary ? 'DRAFT' : publishStatus,
        recurrence,
        ethDay: ethDay ? Number(ethDay) : null,
        ethMonth: ethMonth ? Number(ethMonth) : null,
        notifyMembers
      };

      if (editItem) {
        await api.put(`/events/${editItem._id}`, payload);
        setToast({ type: 'success', message: 'Sagantaan haaromfameera (Event updated)!' });
      } else {
        await api.post('/events', payload);
        setToast({ type: 'success', message: 'Sagantaan uumameera (Event created)!' });
      }

      setModalType(null);
      setEditItem(null);
      setIsFormDirty(false);
      fetchEvents();
      if (socket) socket.emit('content_updated', { type: 'EVENT' });
    } catch (err) {
      const serverErrs = err.response?.data?.errors;
      if (serverErrs && typeof serverErrs === 'object') setModalErrors(serverErrs);
      setModalAlertMsg(err.response?.data?.message || 'Hojichi hin milkoofne (Operation failed).');
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setFormLoading(false);
    }
  };

  // Save Schedule Item
  const handleSaveScheduleItem = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!scheduleItemGroup) {
      errs.group = 'Garee sagantaa (group) filachuun dirqama';
    }

    const resolvedWhatOm = (whatText.om || whatText.am || whatText.en || '').trim();
    if (!resolvedWhatOm) {
      errs['what.om'] = 'Gosa tajaajilaa (What) galchaa';
    }

    const resolvedWhenOm = (whenText.om || whenText.am || whenText.en || 'Yeroo hunda').trim();
    if (!resolvedWhenOm) {
      errs['when.om'] = 'Yeroo (When) galchaa';
    } else {
      const timeRegex = /^\s*(\d{1,2}(:\d{2})?(\s*[-to–]\s*\d{1,2}(:\d{2})?)?(\s*(am|pm|AM|PM))?)\s*$/;
      if (timeRegex.test(resolvedWhenOm)) {
        errs['when.om'] = 'Yeroon (when) ibsa yeroo ta\'uu qaba (fkn: "Galgalaa yeroo hunda"), sa\'aatii ta\'uu hin danda\'u';
      }
    }

    if (!scheduleStartTime) {
      errs.startTime = "Sa'aatii jalqabaa filadhu";
    }
    if (!scheduleEndTime) {
      errs.endTime = "Sa'aatii xumuraa filadhu";
    }

    const startMin = parseTimeToMinutes(scheduleStartTime);
    const endMin = parseTimeToMinutes(scheduleEndTime);

    if (startMin === null) {
      errs.startTime = "Sa'aatiin jalqabaa dogoggora";
    }
    if (endMin === null) {
      errs.endTime = "Sa'aatiin xumuraa dogoggora";
    }

    if (startMin !== null && endMin !== null) {
      if (!scheduleEndsNextDay && endMin <= startMin) {
        errs.endTime = "Sa'aatiin xumuraa sa'aatii jalqabaa booda ta'uu qaba ykn 'Guyyaa itti aanutti xumurama' filadhu";
      }
    }

    const parsedOrder = Number(itemOrder);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
      errs.order = "Tartiibni lakkoofsa guutuu >= 0 ta'uu qaba";
    }

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      setModalAlertMsg(Object.values(errs)[0]);
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setModalErrors({});
    setModalAlertMsg('');
    setFormLoading(true);

    try {
      const payload = {
        group: scheduleItemGroup,
        when: {
          om: resolvedWhenOm,
          am: (whenText.am || resolvedWhenOm).trim(),
          en: (whenText.en || resolvedWhenOm).trim()
        },
        what: {
          om: resolvedWhatOm,
          am: (whatText.am || resolvedWhatOm).trim(),
          en: (whatText.en || resolvedWhatOm).trim()
        },
        startMinutes: startMin,
        endMinutes: endMin,
        endsNextDay: scheduleEndsNextDay,
        clockType: scheduleClockType,
        customTime: scheduleCustomTextActive ? customTime.trim() : '',
        order: parsedOrder,
        isActive: Boolean(isActive),
        notifyMembers
      };

      if (editItem) {
        await api.put(`/schedule/${editItem._id}`, payload);
        setToast({ type: 'success', message: 'Sagantaan torbee haaromfameera (Schedule updated)!' });
      } else {
        await api.post('/schedule', payload);
        setToast({ type: 'success', message: 'Sagantaan torbee dabalamameera (Schedule item created)!' });
      }

      setModalType(null);
      setEditItem(null);
      setIsFormDirty(false);
      fetchSchedule();
      if (socket) socket.emit('content_updated', { type: 'SCHEDULE' });
    } catch (err) {
      console.error('[handleSaveScheduleItem Error]:', err);
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setModalErrors(serverErrors);
      }
      setModalAlertMsg(err.response?.data?.message || 'Hojichi hin milkoofne (Operation failed).');
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setFormLoading(false);
    }
  };

  // Reorder Schedule Item
  const handleMoveScheduleItem = async (item, direction) => {
    const groupItems = scheduleItems
      .filter((it) => it.group === scheduleGroup)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const index = groupItems.findIndex((it) => it._id === item._id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groupItems.length) return;

    // Swap order values
    const swapped = [...groupItems];
    const temp = swapped[index];
    swapped[index] = swapped[targetIndex];
    swapped[targetIndex] = temp;

    const reorderedPayload = swapped.map((it, idx) => ({
      id: it._id,
      order: idx + 1
    }));

    try {
      await api.put('/schedule/reorder', { items: reorderedPayload });
      fetchSchedule();
      if (socket) socket.emit('content_updated', { type: 'SCHEDULE' });
    } catch (err) {
      console.error('[handleMoveScheduleItem Error]:', err);
    }
  };

  // Save Banner
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    const errs = {};

    const resolvedTitleOm = (title.om || title.am || title.en || '').trim();
    if (!resolvedTitleOm) {
      errs['title.om'] = 'Mata duree galchaa (Please enter a banner title).';
    }
    if (!imageUrl.trim()) {
      errs.imageUrl = 'Suuraan banner dirqama (Banner image required).';
    }

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      setModalAlertMsg(Object.values(errs)[0]);
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setModalErrors({});
    setModalAlertMsg('');
    setFormLoading(true);
    try {
      const payload = {
        title: {
          om: resolvedTitleOm,
          am: (title.am || resolvedTitleOm).trim(),
          en: (title.en || resolvedTitleOm).trim()
        },
        description: {
          om: (description.om || description.am || description.en || '').trim(),
          am: (description.am || description.om || '').trim(),
          en: (description.en || description.om || '').trim()
        },
        imageUrl,
        badge: bannerBadge,
        linkUrl: bannerLinkUrl,
        order: Number(itemOrder),
        isActive
      };

      if (editItem) {
        await api.put(`/banners/${editItem._id}`, payload);
        setToast({ type: 'success', message: 'Banner haaromfameera (Banner updated)!' });
      } else {
        await api.post('/banners', payload);
        setToast({ type: 'success', message: 'Banner uumameera (Banner created)!' });
      }

      setModalType(null);
      setEditItem(null);
      setIsFormDirty(false);
      fetchBanners();
      if (socket) socket.emit('content_updated', { type: 'BANNER' });
    } catch (err) {
      const serverErrs = err.response?.data?.errors;
      if (serverErrs && typeof serverErrs === 'object') setModalErrors(serverErrs);
      setModalAlertMsg(err.response?.data?.message || 'Hojichi hin milkoofne (Operation failed).');
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setFormLoading(false);
    }
  };

  // Schedule Live Meeting
  const handleScheduleLive = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!liveTitle.trim()) {
      errs.liveTitle = 'Mata dureen walga\'ii dirqama (Live title required).';
    }
    if (!liveScheduledDate) {
      errs.liveScheduledDate = 'Guyyaa fi sa\'aatiin sagantaa dirqama (Scheduled date & time required).';
    } else if (new Date(liveScheduledDate).getTime() < Date.now() - 60000) {
      errs.liveScheduledDate = 'Guyyaan sagantaa darbeera (Scheduled date cannot be in the past).';
    }

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      setModalAlertMsg(Object.values(errs)[0]);
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setModalErrors({});
    setModalAlertMsg('');
    setFormLoading(true);
    try {
      const payload = {
        title: liveTitle.trim(),
        description: liveDescription.trim(),
        scheduledDate: new Date(liveScheduledDate)
      };

      await api.post('/live/schedule', payload);
      setToast({ type: 'success', message: 'Sagantaan Live qophaa\'eera (Live meeting scheduled)!' });
      setModalType(null);
      setEditItem(null);
      setIsFormDirty(false);
      fetchLive();
      if (socket) socket.emit('content_updated', { type: 'LIVE' });
    } catch (err) {
      const serverErrs = err.response?.data?.errors;
      if (serverErrs && typeof serverErrs === 'object') setModalErrors(serverErrs);
      setModalAlertMsg(err.response?.data?.message || 'Live qopheessuu hin dandeenye (Failed to schedule live).');
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, item } = deleteConfirm;

    try {
      if (type === 'announcement') {
        await api.delete(`/announcements/${item._id}`);
        fetchAnnouncements();
      } else if (type === 'event') {
        await api.delete(`/events/${item._id}`);
        fetchEvents();
      } else if (type === 'schedule') {
        await api.delete(`/schedule/${item._id}`);
        fetchSchedule();
      } else if (type === 'banner') {
        await api.delete(`/banners/${item._id}`);
        fetchBanners();
      }
      setToast({ type: 'success', message: 'Milkaa\'inaan haqameera (Successfully deleted)!' });
      if (socket) socket.emit('content_updated', { type: type.toUpperCase() });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Haqquu hin dandeenye (Failed to delete).'
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications (Rendered high above all modals & overlays) */}
      {toast && (
        <div className="fixed top-5 right-5 z-[99999] max-w-md w-full px-4 pointer-events-auto animate-in slide-in-from-top-2 duration-200">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
            className="shadow-2xl ring-1 ring-black/10"
          />
        </div>
      )}

      {/* Header with Title and Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-royal tracking-tight flex items-center space-x-2.5">
            <Layers className="w-6 h-6 text-gold-500" />
            <span>To'annoo Sagantaalee & Beeksisootaa</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Programs, Announcements, Weekly Schedule, Live Broadcast & Banners Management
          </p>
        </div>

        {/* Action Button for currently active tab */}
        <div data-tour="prog-create-btn" className="flex items-center space-x-2">
          {activeSubTab === 'announcements' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => handleOpenCreate('announcement')}
            >
              {isSecretary ? 'Wixinee Beeksisaa (Draft)' : 'Beeksisa Haaraa'}
            </Button>
          )}

          {activeSubTab === 'events' && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => handleOpenCreate('event')}
            >
              {isSecretary ? 'Wixinee Sagantaa (Draft)' : 'Sagantaa Haaraa'}
            </Button>
          )}

          {activeSubTab === 'schedule' && canManage && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => handleOpenCreate('schedule')}
            >
              Yeroo Kadhannaa Dabali
            </Button>
          )}

          {activeSubTab === 'live' && canManage && (
            <Button
              variant="primary"
              size="md"
              icon={Radio}
              onClick={() => handleOpenCreate('scheduleLive')}
            >
              Live Haaraa Qopheessi
            </Button>
          )}

          {activeSubTab === 'banners' && canManage && (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => handleOpenCreate('banner')}
            >
              Banner Haaraa
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Tab Switcher Navigation */}
      <div data-tour="prog-subtabs" className="flex overflow-x-auto space-x-2 p-1 bg-royal-tint rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => { setActiveSubTab('announcements'); setSearchTerm(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'announcements'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-white/60'
          }`}
        >
          <Megaphone className="w-4 h-4 text-gold-400" />
          <span>Beeksisoota (Announcements)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {announcements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('events'); setSearchTerm(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'events'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-white/60'
          }`}
        >
          <Calendar className="w-4 h-4 text-gold-400" />
          <span>Sagantaalee (Events)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {events.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('schedule'); setSearchTerm(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'schedule'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-white/60'
          }`}
        >
          <Clock className="w-4 h-4 text-gold-400" />
          <span>Yeroo Kadhannaa (Weekly Schedule)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {scheduleItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('live'); setSearchTerm(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'live'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-white/60'
          }`}
        >
          <Radio className="w-4 h-4 text-gold-400" />
          <span>Tajaajila Kallattii (Live Studio)</span>
          {liveMeeting && liveMeeting.status === 'LIVE' && (
            <span className="ml-1.5 flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setActiveSubTab('banners'); setSearchTerm(''); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === 'banners'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-white/60'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-gold-400" />
          <span>Banners Fuula Duraa</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {banners.length}
          </span>
        </button>
      </div>

      {/* ════════ SUB-TAB 1: ANNOUNCEMENTS ════════ */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Barbaadi (Search announcements)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all"
              />
            </div>
            {isSecretary && (
              <Badge variant="muted" size="sm">
                Secretary: Wixinee qofa uumuu dandeessu (Drafts only)
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Spinner size="lg" />
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Beeksisni hin jiru"
              description="Beeksisa haaraa maxxansuuf qabduu 'Beeksisa Haaraa' fayyadamaa."
              action={
                <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenCreate('announcement')}>
                  Beeksisa Uumi
                </Button>
              }
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="py-3.5 px-4">Mata Duree (Title)</th>
                      <th className="py-3.5 px-4">Audience</th>
                      <th className="py-3.5 px-4">Haala (Status)</th>
                      <th className="py-3.5 px-4">Guyyaa Maxxansaa</th>
                      <th className="py-3.5 px-4">Guyyaa Dhumu</th>
                      <th className="py-3.5 px-4 text-right">Gochaalee (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {announcements
                      .filter((a) => {
                        if (!searchTerm) return true;
                        const q = searchTerm.toLowerCase();
                        return (
                          (a.title?.om && a.title.om.toLowerCase().includes(q)) ||
                          (a.title?.am && a.title.am.toLowerCase().includes(q)) ||
                          (a.title?.en && a.title.en.toLowerCase().includes(q))
                        );
                      })
                      .map((a) => (
                        <tr key={a._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center space-x-2">
                              {a.pinned && (
                                <Pin className="w-3.5 h-3.5 text-gold-600 fill-gold-500/20 shrink-0" />
                              )}
                              <div>
                                <div className="font-bold text-royal line-clamp-1">
                                  {getLocalizedText(a.title, i18n.language)}
                                </div>
                                <div className="text-[11px] text-slate-500 line-clamp-1">
                                  {getLocalizedText(a.description, i18n.language)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {a.audience}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={a.status === 'PUBLISHED' ? 'solid-gold' : 'muted'}
                              size="sm"
                            >
                              {a.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {formatDual(a.publishAt)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {a.expiresAt ? formatDual(a.expiresAt) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicate('announcement', a)}
                                title="Waraabbi (Duplicate)"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-royal-tint transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit('announcement', a)}
                                  title="Gulaali (Edit)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-royal-tint transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm({ type: 'announcement', item: a })}
                                  title="Haqi (Delete)"
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ SUB-TAB 2: EVENTS ════════ */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Barbaadi (Search events)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Spinner size="lg" />
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sagantaan hin jiru"
              description="Sagantaa haaraa qopheessuuf qabduu 'Sagantaa Haaraa' fayyadamaa."
              action={
                <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenCreate('event')}>
                  Sagantaa Uumi
                </Button>
              }
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="py-3.5 px-4">Guyyaa</th>
                      <th className="py-3.5 px-4">Mata Duree (Title)</th>
                      <th className="py-3.5 px-4">Gosa (Type)</th>
                      <th className="py-3.5 px-4">Bakka (Location)</th>
                      <th className="py-3.5 px-4">Haala (Status)</th>
                      <th className="py-3.5 px-4 text-right">Gochaalee (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events
                      .filter((ev) => {
                        if (!searchTerm) return true;
                        const q = searchTerm.toLowerCase();
                        return (
                          (ev.title?.om && ev.title.om.toLowerCase().includes(q)) ||
                          (ev.location && ev.location.toLowerCase().includes(q))
                        );
                      })
                      .map((ev) => (
                        <tr key={ev._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-royal">
                              {formatDual(ev.startAt)}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                              <span>{formatTime(ev.startAt, { showDeviceNote: true })}</span>
                              {ev.recurrence && ev.recurrence !== 'NONE' && (
                                <span className="px-1.5 py-0.2 rounded bg-gold-100 text-gold-900 font-bold text-[9px]">
                                  {ev.recurrence === 'ETH_MONTHLY' ? `Ji'a hunda (${ev.ethDay})` : `Waggaa hunda (${ev.ethMonth}/${ev.ethDay})`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-royal line-clamp-1">
                              {getLocalizedText(ev.title, i18n.language)}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {getLocalizedText(ev.description, i18n.language)}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-royal-tint text-royal border border-gold-500/30 uppercase">
                              {ev.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {ev.location || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={ev.status === 'PUBLISHED' ? 'solid-gold' : 'muted'}
                              size="sm"
                            >
                              {ev.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicate('event', ev)}
                                title="Waraabbi (Duplicate)"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-royal-tint transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit('event', ev)}
                                  title="Gulaali (Edit)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-royal-tint transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm({ type: 'event', item: ev })}
                                  title="Haqi (Delete)"
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ SUB-TAB 3: WEEKLY SCHEDULE ════════ */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-5">
          {/* Group Switcher Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setScheduleGroup('SUNDAY_SERVICE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scheduleGroup === 'SUNDAY_SERVICE'
                    ? 'bg-royal text-white shadow-xs'
                    : 'text-slate-600 hover:text-royal'
                }`}
              >
                Card 1: Sunday Service (Kadhannaa)
              </button>
              <button
                type="button"
                onClick={() => setScheduleGroup('YOUTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scheduleGroup === 'YOUTH'
                    ? 'bg-royal text-white shadow-xs'
                    : 'text-slate-600 hover:text-royal'
                }`}
              >
                Card 2: Youth Ministry (Dargaggoota)
              </button>
              <button
                type="button"
                onClick={() => setScheduleGroup('LIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scheduleGroup === 'LIVE'
                    ? 'bg-royal text-white shadow-xs'
                    : 'text-slate-600 hover:text-royal'
                }`}
              >
                Card 3: Live Broadcast (Kallattii)
              </button>
            </div>

            <div className="text-xs text-slate-500 italic">
              Tartiiba jijjiiruuf xiyyee ol/gadi fayyadamaa (Use up/down to reorder).
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="py-3 px-4 w-12">Tartiiba</th>
                    <th className="py-3 px-4">Gosa Tajaajilaa (What)</th>
                    <th className="py-3 px-4">Yeroo (When)</th>
                    <th className="py-3 px-4">Sa'aatii (Time)</th>
                    <th className="py-3 px-4">Haala (Status)</th>
                    <th className="py-3 px-4 text-right">Gochaalee (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduleItems
                    .filter((it) => it.group === scheduleGroup)
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((it, idx, arr) => (
                      <tr key={it._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">
                          {idx + 1}.
                        </td>
                        <td className="py-3 px-4 font-bold text-royal">
                          {getLocalizedText(it.what, i18n.language)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {getLocalizedText(it.when, i18n.language)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-royal text-white shadow-xs">
                            {it.time}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={it.isActive ? 'solid-gold' : 'muted'} size="sm">
                            {it.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveScheduleItem(it, 'up')}
                                  title="Ol Siqsi (Move up)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === arr.length - 1}
                                  onClick={() => handleMoveScheduleItem(it, 'down')}
                                  title="Gadi Siqsi (Move down)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit('schedule', it)}
                                  title="Gulaali (Edit)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-royal hover:bg-royal-tint"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm({ type: 'schedule', item: it })}
                                  title="Haqi (Delete)"
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════ SUB-TAB 4: LIVE BROADCAST ════════ */}
      {activeSubTab === 'live' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-300 text-red-600 flex items-center justify-center">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base text-royal">
                    Haala Tajaajila Kallattii (Current Live Session)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kutaa Live WebRTC fi qophii sagantaa kallattii
                  </p>
                </div>
              </div>

              {liveMeeting && (
                <Badge variant={liveMeeting.status === 'LIVE' ? 'solid-gold' : 'muted'} size="md">
                  {liveMeeting.status}
                </Badge>
              )}
            </div>

            {liveMeeting ? (
              <div className="space-y-3">
                <div className="p-4 bg-royal-tint rounded-xl border border-slate-200/60">
                  <h4 className="font-black text-sm text-royal">{liveMeeting.title}</h4>
                  <p className="text-xs text-slate-600 mt-1">{liveMeeting.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-3 text-xs text-slate-500 font-mono gap-1">
                    <span>Guyyaa: {formatDateTime(liveMeeting.scheduledDate, { showDeviceNote: true })}</span>
                    <span>({formatDual(liveMeeting.scheduledDate)})</span>
                    <span>Qophii: {liveMeeting.status}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <a
                    href="/dashboard/live"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Radio className="w-4 h-4 text-gold-400" />
                    <span>Gara Live Studio Seenaa</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gold-400 ml-1" />
                  </a>

                  {canManage && (
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => handleOpenCreate('scheduleLive')}
                    >
                      Sagantaa Live Haaraa Qopheessi
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Radio}
                title="Sagantaan Live amma hin jiru"
                description="Sagantaa kallattii haaraa qopheessuuf qabduu gadii cuqaasaa."
                action={
                  canManage && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Radio}
                      onClick={() => handleOpenCreate('scheduleLive')}
                    >
                      Live Qopheessi
                    </Button>
                  )
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ════════ SUB-TAB 5: BANNERS ════════ */}
      {activeSubTab === 'banners' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-royal flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-gold-500" />
                <span>To'annoo Beeksisoota Fuula Duraa (Homepage Banners)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Banners uploaded to Cloudinary (folder: wqg/banners) appear as slides in the Home Hero.
              </p>
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => handleOpenCreate('banner')}
              >
                Banner Haaraa Dabali
              </Button>
            )}
          </div>

          {banners.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="Beeksisni banner hin jiru"
              description="Banner haaraa maxxansuuf qabduu 'Banner Haaraa Dabali' fayyadamaa."
              action={
                canManage && (
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenCreate('banner')}>
                    Banner Haaraa Dabali
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((b) => (
                <div
                  key={b._id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-gold-500/60 transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-[21/9] w-full bg-slate-100 overflow-hidden">
                    <img
                      src={b.imageUrl}
                      alt={getLocalizedText(b.title, i18n.language)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/hero/hero1.jpg';
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

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4 className="font-black text-base text-royal">
                        {getLocalizedText(b.title, i18n.language)}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {getLocalizedText(b.description, i18n.language)}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      {canManage && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit('banner', b)}
                            className="font-bold text-royal hover:underline"
                          >
                            Gulaali (Edit)
                          </button>
                        </div>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ type: 'banner', item: b })}
                          className="font-bold text-red-600 hover:underline"
                        >
                          Haqi (Delete)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ MODAL: CREATE / EDIT ANNOUNCEMENT ════════ */}
      {modalType === 'announcement' && (
        <Modal
          isOpen={true}
          onClose={handleModalClose}
          title={editItem ? 'Beeksisa Gulaali (Edit Announcement)' : 'Beeksisa Haaraa Uumi (New Announcement)'}
          size="lg"
        >
          <form noValidate onSubmit={handleSaveAnnouncement} className="flex flex-col min-h-0">
            {/* Scrollable Modal Body */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
              {/* Alert at top */}
              {modalAlertMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">Dogoggora (Validation Error)</strong>
                    <span>{modalAlertMsg}</span>
                  </div>
                </div>
              )}
            {/* 3-Language Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-500 mr-2">Afaan (Language):</span>
              <button
                type="button"
                onClick={() => setFormLangTab('om')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formLangTab === 'om' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Afaan Oromoo
              </button>
              <button
                type="button"
                onClick={() => setFormLangTab('am')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formLangTab === 'am' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                አማርኛ (Amharic)
              </button>
              <button
                type="button"
                onClick={() => setFormLangTab('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formLangTab === 'en' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                English (Optional)
              </button>
            </div>

            {/* Language-dependent inputs */}
            {formLangTab === 'om' && (
              <div className="space-y-3">
                <FormField label="Mata Duree (Title - Afaan Oromoo)" required error={modalErrors['title.om']}>
                  <input
                    type="text"
                    value={title.om}
                    onChange={(e) => {
                      setTitle({ ...title, om: e.target.value });
                      setIsFormDirty(true);
                      if (modalErrors['title.om']) setModalErrors((prev) => ({ ...prev, 'title.om': null }));
                    }}
                    placeholder="Mata duree beeksisaa galchaa..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
                <FormField label="Ibsa Guutuu (Description - Afaan Oromoo)">
                  <textarea
                    rows={4}
                    value={description.om}
                    onChange={(e) => {
                      setDescription({ ...description, om: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="Ibsa beeksisaa bal'inaan galchaa (Filannoo)..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
              </div>
            )}

            {formLangTab === 'am' && (
              <div className="space-y-3">
                <FormField label="ርእስ (Title - Amharic)">
                  <input
                    type="text"
                    value={title.am}
                    onChange={(e) => setTitle({ ...title, am: e.target.value })}
                    placeholder="የማስታወቂያውን ርእስ ያስገቡ..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
                <FormField label="ዝርዝር መግለጫ (Description - Amharic)">
                  <textarea
                    rows={4}
                    value={description.am}
                    onChange={(e) => setDescription({ ...description, am: e.target.value })}
                    placeholder="የማስታወቂያውን ዝርዝር መግለጫ ያስገቡ..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
              </div>
            )}

            {formLangTab === 'en' && (
              <div className="space-y-3">
                <FormField label="Title (English)">
                  <input
                    type="text"
                    value={title.en}
                    onChange={(e) => setTitle({ ...title, en: e.target.value })}
                    placeholder="Enter announcement title in English..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
                <FormField label="Description (English)">
                  <textarea
                    rows={4}
                    value={description.en}
                    onChange={(e) => setDescription({ ...description, en: e.target.value })}
                    placeholder="Enter detailed description in English..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
              </div>
            )}

            {/* Cloudinary Image Upload with Live Preview */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Suuraa Beeksisaa (Image - max 3MB, Cloudinary):</span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-red-500 hover:underline text-[11px]"
                  >
                    Haqi (Remove image)
                  </button>
                )}
              </label>

              <div className="flex items-center space-x-3">
                <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-royal-tint hover:bg-royal-light text-royal border border-gold-500/40 text-xs font-bold transition-all">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-royal" />
                  ) : (
                    <Upload className="w-4 h-4 text-gold-600" />
                  )}
                  <span>{uploadingImage ? 'Fe\'aa jira...' : 'Suuraa Filadhu (Upload)'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'announcements')}
                  />
                </label>
                <span className="text-[11px] text-slate-400">JPG, PNG, WebP (max 3 MB)</span>
              </div>

              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden h-36 w-full border border-slate-200 mt-2 bg-slate-50">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Publishing options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <FormField label="Audience">
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                >
                  <option value="ALL">Hundaaf (ALL - Public)</option>
                  <option value="MEMBERS">Miseensota Qofa (MEMBERS)</option>
                  <option value="STAFF">Staff Qofa (STAFF)</option>
                </select>
              </FormField>

              <FormField label="Haala (Status)">
                <select
                  value={isSecretary ? 'DRAFT' : publishStatus}
                  disabled={isSecretary}
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 disabled:bg-slate-100"
                >
                  <option value="PUBLISHED">Maxxansi (PUBLISHED)</option>
                  <option value="DRAFT">Wixinee (DRAFT)</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DateTimePicker
                label="Guyyaa Maxxansaa (Publish At)"
                value={publishAt}
                onChange={setPublishAt}
              />
              <DateTimePicker
                label="Guyyaa Dhumu (Expires At - Optional)"
                value={expiresAt}
                onChange={setExpiresAt}
              />
            </div>

            {/* Checkboxes: Pin & Notify Members */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded text-royal focus:ring-royal"
                />
                <span className="flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-gold-600" />
                  Gubbaatti Qabi (Pin to top)
                </span>
              </label>

              {!isSecretary && (
                <label className="flex items-center space-x-2 text-xs font-bold text-royal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyMembers}
                    onChange={(e) => setNotifyMembers(e.target.checked)}
                    className="rounded text-royal focus:ring-royal"
                  />
                  <span className="flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-gold-600" />
                    Miseensotaaf ergi (Notify members via notification)
                  </span>
                </label>
              )}
            </div>

            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3 mt-4 flex justify-end space-x-3 z-10">
              <Button variant="ghost" size="md" type="button" onClick={handleModalClose}>
                Dhiisi (Cancel)
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={formLoading}
                disabled={formLoading}
              >
                {editItem ? 'Haaromsi (Update)' : isSecretary ? 'Wixinee Olkaa\'i (Save Draft)' : 'Maxxansi (Publish)'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════ MODAL: CREATE / EDIT EVENT ════════ */}
      {modalType === 'event' && (
        <Modal
          isOpen={true}
          onClose={handleModalClose}
          title={editItem ? 'Sagantaa Gulaali (Edit Event)' : 'Sagantaa Haaraa Uumi (New Event)'}
          size="lg"
        >
          <form noValidate onSubmit={handleSaveEvent} className="flex flex-col min-h-0">
            {/* Scrollable Modal Body */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
              {/* Alert at top */}
              {modalAlertMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">Dogoggora (Validation Error)</strong>
                    <span>{modalAlertMsg}</span>
                  </div>
                </div>
              )}
            {/* 3-Language Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-500 mr-2">Afaan (Language):</span>
              <button
                type="button"
                onClick={() => setFormLangTab('om')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formLangTab === 'om' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Afaan Oromoo
              </button>
              <button
                type="button"
                onClick={() => setFormLangTab('am')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formLangTab === 'am' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                አማርኛ (Amharic)
              </button>
              <button
                type="button"
                onClick={() => setFormLangTab('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formLangTab === 'en' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                English (Optional)
              </button>
            </div>

            {/* Language inputs */}
            {formLangTab === 'om' && (
              <div className="space-y-3">
                <FormField label="Mata Duree Sagantaa (Title - Afaan Oromoo)" required error={modalErrors['title.om']}>
                  <input
                    type="text"
                    value={title.om}
                    onChange={(e) => {
                      setTitle({ ...title, om: e.target.value });
                      setIsFormDirty(true);
                      if (modalErrors['title.om']) setModalErrors((prev) => ({ ...prev, 'title.om': null }));
                    }}
                    placeholder="Mata duree sagantaa..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
                <FormField label="Ibsa Sagantaa (Description - Afaan Oromoo)">
                  <textarea
                    rows={3}
                    value={description.om}
                    onChange={(e) => {
                      setDescription({ ...description, om: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="Ibsa sagantaa bal'inaan (Filannoo)..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
              </div>
            )}

            {formLangTab === 'am' && (
              <div className="space-y-3">
                <FormField label="የመርሐ-ግብር ርእስ (Title - Amharic)">
                  <input
                    type="text"
                    value={title.am}
                    onChange={(e) => setTitle({ ...title, am: e.target.value })}
                    placeholder="የመርሐ-ግብሩን ርእስ ያስገቡ..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
                <FormField label="የመርሐ-ግብር ዝርዝር (Description - Amharic)">
                  <textarea
                    rows={3}
                    value={description.am}
                    onChange={(e) => setDescription({ ...description, am: e.target.value })}
                    placeholder="የመርሐ-ግብሩን ዝርዝር መግለጫ..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
              </div>
            )}

            {formLangTab === 'en' && (
              <div className="space-y-3">
                <FormField label="Event Title (English)">
                  <input
                    type="text"
                    value={title.en}
                    onChange={(e) => setTitle({ ...title, en: e.target.value })}
                    placeholder="Enter event title in English..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
                <FormField label="Event Description (English)">
                  <textarea
                    rows={3}
                    value={description.en}
                    onChange={(e) => setDescription({ ...description, en: e.target.value })}
                    placeholder="Enter event description..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                  />
                </FormField>
              </div>
            )}

            {/* Church Feast Quick-Add Buttons */}
            <div className="p-3 bg-amber-50/70 border border-gold-300 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-royal">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                  <span>Ayyaanota Dhaabbataa (Fixed Church Feasts Quick-Add)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Kalandara Itiyoophiyaa</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FIXED_CHURCH_FEASTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleQuickAddFeast(f)}
                    className="px-2.5 py-1 bg-white hover:bg-gold-50 border border-gold-300/80 rounded-lg text-[11px] font-bold text-royal shadow-2xs hover:border-gold-500 transition-all"
                  >
                    † {f.name[currentLang] || f.name.om}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Type & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Gosa (Event Type)">
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                >
                  <option value="CEREMONY">Ayyaana (CEREMONY)</option>
                  <option value="FEAST">Bara Haaromsaa / Ayyaana (FEAST)</option>
                  <option value="MEETING">Walga'ii (MEETING)</option>
                  <option value="TRAINING">Leenjii (TRAINING)</option>
                  <option value="LIVE">Kallattii (LIVE)</option>
                  <option value="OTHER">Kaan (OTHER)</option>
                </select>
              </FormField>

              <DateTimePicker
                label="Yeroo Jalqabaa (Start Date & Time) *"
                value={startAt}
                onChange={setStartAt}
                required
              />

              <DateTimePicker
                label="Yeroo Xumuraa (End Date & Time)"
                value={endAt}
                onChange={setEndAt}
              />
            </div>

            {/* Church Calendar Recurrence */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="Irra-deebii (Recurrence)">
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-royal"
                  >
                    <option value="NONE">Al-tokko Qofa (NONE)</option>
                    <option value="ETH_MONTHLY">Ji'a Hunda (Ethiopian Monthly)</option>
                    <option value="ETH_YEARLY">Waggaa Hunda (Ethiopian Yearly)</option>
                  </select>
                </FormField>

                {recurrence === 'ETH_MONTHLY' && (
                  <FormField label="Guyyaa Ji'aa (Eth Day 1-30)">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={ethDay}
                      onChange={(e) => setEthDay(e.target.value)}
                      placeholder="Fkn: 23 (Qulqulluu Giyoorgis)"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-bold"
                    />
                  </FormField>
                )}

                {recurrence === 'ETH_YEARLY' && (
                  <>
                    <FormField label="Ji'a (Eth Month 1-13)">
                      <select
                        value={ethMonth}
                        onChange={(e) => setEthMonth(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-bold"
                      >
                        <option value="">Filadhaa</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((m) => (
                          <option key={m} value={m}>
                            {m} ({currentLang === 'am' ? ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'][m - 1] : ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'][m - 1]})
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Guyyaa (Eth Day 1-30)">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={ethDay}
                        onChange={(e) => setEthDay(e.target.value)}
                        placeholder="Fkn: 23"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-bold"
                      />
                    </FormField>
                  </>
                )}
              </div>
            </div>

            {/* Location & Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Bakka (Location / Venue)">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Fkn: Masaraa Qulqulluu Giyoorgisii, Finfinnee"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                />
              </FormField>

              <FormField label="Geessituu (Link URL - Optional)">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/services ykn https://..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                />
              </FormField>
            </div>

            {/* Cloudinary Image Upload */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Suuraa Sagantaa (Event Image - max 3MB, Cloudinary):</span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-red-500 hover:underline text-[11px]"
                  >
                    Haqi (Remove image)
                  </button>
                )}
              </label>

              <div className="flex items-center space-x-3">
                <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-royal-tint hover:bg-royal-light text-royal border border-gold-500/40 text-xs font-bold transition-all">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-royal" />
                  ) : (
                    <Upload className="w-4 h-4 text-gold-600" />
                  )}
                  <span>{uploadingImage ? 'Fe\'aa jira...' : 'Suuraa Filadhu (Upload)'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'events')}
                  />
                </label>
                <span className="text-[11px] text-slate-400">JPG, PNG, WebP (max 3 MB)</span>
              </div>

              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden h-36 w-full border border-slate-200 mt-2 bg-slate-50">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Status & Notify Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <FormField label="Audience">
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                >
                  <option value="ALL">Hundaaf (ALL - Public)</option>
                  <option value="MEMBERS">Miseensota Qofa (MEMBERS)</option>
                  <option value="STAFF">Staff Qofa (STAFF)</option>
                </select>
              </FormField>

              <FormField label="Haala (Status)">
                <select
                  value={isSecretary ? 'DRAFT' : publishStatus}
                  disabled={isSecretary}
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 disabled:bg-slate-100"
                >
                  <option value="PUBLISHED">Maxxansi (PUBLISHED)</option>
                  <option value="DRAFT">Wixinee (DRAFT)</option>
                </select>
              </FormField>
            </div>

            {!isSecretary && (
              <label className="flex items-center space-x-2 text-xs font-bold text-royal cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={notifyMembers}
                  onChange={(e) => setNotifyMembers(e.target.checked)}
                  className="rounded text-royal focus:ring-royal"
                />
                <span className="flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-gold-600" />
                  Miseensotaaf ergi (Notify members of new event)
                </span>
              </label>
            )}

            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3 mt-4 flex justify-end space-x-3 z-10">
              <Button variant="ghost" size="md" type="button" onClick={handleModalClose}>
                Dhiisi (Cancel)
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={formLoading}
                disabled={formLoading}
              >
                {editItem ? 'Haaromsi (Update)' : isSecretary ? 'Wixinee Olkaa\'i (Save Draft)' : 'Maxxansi (Publish)'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════ MODAL: CREATE / EDIT SCHEDULE ITEM ════════ */}
      {modalType === 'schedule' && (
        <Modal
          isOpen={true}
          onClose={handleModalClose}
          title={editItem ? 'Yeroo Kadhannaa Gulaali (Edit Schedule)' : 'Yeroo Kadhannaa Haaraa Dabali (Add Schedule)'}
          size="lg"
        >
          <form noValidate onSubmit={handleSaveScheduleItem} className="flex flex-col min-h-0">
            {/* Scrollable Modal Body */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
              {/* Alert at top */}
              {modalAlertMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">Dogoggora (Validation Error)</strong>
                    <span>{modalAlertMsg}</span>
                  </div>
                </div>
              )}

              {/* Group Selector */}
              <div data-error={!!modalErrors.group}>
                <FormField label="Garee Sagantaa (Group) *" required error={modalErrors.group}>
                  <select
                    value={scheduleItemGroup}
                    onChange={(e) => {
                      setScheduleItemGroup(e.target.value);
                      setIsFormDirty(true);
                      if (modalErrors.group) setModalErrors((prev) => ({ ...prev, group: null }));
                    }}
                    className={`w-full px-3.5 py-2 rounded-xl bg-white border text-xs text-slate-800 font-bold transition ${
                      modalErrors.group ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300'
                    }`}
                  >
                    <option value="SUNDAY_SERVICE">Card 1: Sunday Service (Kadhannaa fi Sagalee Waaqayyoo)</option>
                    <option value="YOUTH">Card 2: Youth Ministry (Dargaggoota & Faarfannaa)</option>
                    <option value="LIVE">Card 3: Live Broadcast (Walga'ii Kallattii)</option>
                  </select>
                </FormField>
              </div>

              {/* Time Configuration with TimePickers and clockType */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gold-600" />
                    <span>Sa'aatii Sagantaa (Service Time)</span>
                  </span>
                  <div className="flex items-center p-0.5 bg-slate-200 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleClockType('ETHIOPIAN');
                        setIsFormDirty(true);
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        scheduleClockType === 'ETHIOPIAN' ? 'bg-royal text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      🇪🇹 Eth Clock
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScheduleClockType('INTERNATIONAL');
                        setIsFormDirty(true);
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        scheduleClockType === 'INTERNATIONAL' ? 'bg-royal text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      🌍 24h
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div data-error={!!modalErrors.startTime}>
                    <TimePicker
                      label="Sa'aatii Jalqabaa (Start Time) *"
                      value={scheduleStartTime}
                      onChange={(val) => {
                        setScheduleStartTime(val);
                        setIsFormDirty(true);
                        if (modalErrors.startTime) setModalErrors((prev) => ({ ...prev, startTime: null }));
                      }}
                      clockType={scheduleClockType}
                      onClockTypeChange={setScheduleClockType}
                      error={modalErrors.startTime}
                    />
                  </div>
                  <div data-error={!!modalErrors.endTime}>
                    <TimePicker
                      label="Sa'aatii Xumuraa (End Time) *"
                      value={scheduleEndTime}
                      onChange={(val) => {
                        setScheduleEndTime(val);
                        setIsFormDirty(true);
                        if (modalErrors.endTime) setModalErrors((prev) => ({ ...prev, endTime: null }));
                      }}
                      clockType={scheduleClockType}
                      onClockTypeChange={setScheduleClockType}
                      error={modalErrors.endTime}
                    />
                  </div>
                </div>

                {/* Ends next day checkbox if time crosses midnight */}
                {timeCrossesMidnight && (
                  <div className="pt-1">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer bg-amber-50 p-2.5 rounded-xl border border-gold-300">
                      <input
                        type="checkbox"
                        checked={scheduleEndsNextDay}
                        onChange={(e) => {
                          setScheduleEndsNextDay(e.target.checked);
                          setIsFormDirty(true);
                          if (modalErrors.endTime) setModalErrors((prev) => ({ ...prev, endTime: null }));
                        }}
                        className="rounded text-royal focus:ring-royal w-4 h-4"
                      />
                      <span>Guyyaa itti aanutti xumurama (Service crosses midnight / Ends next day)</span>
                    </label>
                  </div>
                )}

                {/* Fallback & Custom text switch */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Barreeffama Sa'aatii (Fallback text):</span>
                    <label className="flex items-center space-x-2 cursor-pointer text-[11px] font-bold text-royal">
                      <span>Barreeffama addaa barreessi (Custom text)</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={scheduleCustomTextActive}
                        onClick={() => {
                          const next = !scheduleCustomTextActive;
                          setScheduleCustomTextActive(next);
                          setIsFormDirty(true);
                        }}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          scheduleCustomTextActive ? 'bg-royal' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            scheduleCustomTextActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  {scheduleCustomTextActive ? (
                    <input
                      type="text"
                      value={customTime}
                      onChange={(e) => {
                        setCustomTime(e.target.value);
                        setIsFormDirty(true);
                      }}
                      placeholder="Fkn: 08:30 - 11:30 ykn Yeroo Dilbataa..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 focus:border-royal focus:ring-1 focus:ring-royal"
                    />
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                      {generatedFallbackText}
                    </div>
                  )}
                </div>
              </div>

              {/* "When" Combobox with suggestions + free text */}
              <div className="space-y-1.5" data-error={!!modalErrors['when.om']}>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Yeroo (When - Afaan Oromoo) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Ibsa yeroo (descriptive phrase)</span>
                </label>
                <input
                  type="text"
                  value={whenText.om}
                  onChange={(e) => {
                    setWhenText({ ...whenText, om: e.target.value });
                    setIsFormDirty(true);
                    if (modalErrors['when.om']) setModalErrors((prev) => ({ ...prev, 'when.om': null }));
                  }}
                  placeholder="Fkn: Galgalaa yeroo hunda, Ganama yeroo hunda..."
                  className={`w-full px-3.5 py-2 rounded-xl bg-white border text-xs text-slate-800 transition ${
                    modalErrors['when.om'] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300 focus:border-royal focus:ring-2 focus:ring-royal/20'
                  }`}
                />
                {/* Suggestions chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Filannoo:</span>
                  {WHEN_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setWhenText((prev) => ({ ...prev, om: sug }));
                        setIsFormDirty(true);
                        if (modalErrors['when.om']) setModalErrors((prev) => ({ ...prev, 'when.om': null }));
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition border ${
                        whenText.om === sug
                          ? 'bg-royal text-white border-royal shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
                {modalErrors['when.om'] && (
                  <p className="text-xs text-red-600 font-semibold">{modalErrors['when.om']}</p>
                )}
              </div>

              {/* "What" (Afaan Oromoo required, Amharic & English optional) */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5">
                  <span className="text-xs font-bold text-slate-500 mr-2">Afaan (What):</span>
                  <button
                    type="button"
                    onClick={() => setFormLangTab('om')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      formLangTab === 'om' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Afaan Oromoo *
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLangTab('am')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      formLangTab === 'am' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    አማርኛ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLangTab('en')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      formLangTab === 'en' ? 'bg-royal text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    English
                  </button>
                </div>

                {formLangTab === 'om' && (
                  <div data-error={!!modalErrors['what.om']}>
                    <FormField label="Gosa Tajaajilaa (What - Afaan Oromoo) *" required error={modalErrors['what.om']}>
                      <input
                        type="text"
                        value={whatText.om}
                        onChange={(e) => {
                          setWhatText({ ...whatText, om: e.target.value });
                          setIsFormDirty(true);
                          if (modalErrors['what.om']) setModalErrors((prev) => ({ ...prev, 'what.om': null }));
                        }}
                        placeholder="Fkn: Kadhana, Farfanaa, Korsii..."
                        className={`w-full px-3.5 py-2 rounded-xl bg-white border text-xs text-slate-800 ${
                          modalErrors['what.om'] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300'
                        }`}
                      />
                    </FormField>
                  </div>
                )}
                {formLangTab === 'am' && (
                  <FormField label="የአገልግሎት ዓይነት (What - Amharic)">
                    <input
                      type="text"
                      value={whatText.am}
                      onChange={(e) => {
                        setWhatText({ ...whatText, am: e.target.value });
                        setIsFormDirty(true);
                      }}
                      placeholder="ምሳሌ፡ ጸሎት፣ ዝማሬ፣ ኮርስ..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                    />
                  </FormField>
                )}
                {formLangTab === 'en' && (
                  <FormField label="Service Type (What - English)">
                    <input
                      type="text"
                      value={whatText.en}
                      onChange={(e) => {
                        setWhatText({ ...whatText, en: e.target.value });
                        setIsFormDirty(true);
                      }}
                      placeholder="e.g. Prayer, Choir Rehearsal, Bible Study..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                    />
                  </FormField>
                )}
              </div>

              {/* Order & Status Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div data-error={!!modalErrors.order}>
                  <FormField label="Tartiiba (Order) *" error={modalErrors.order}>
                    <input
                      type="number"
                      min={0}
                      value={itemOrder}
                      onChange={(e) => {
                        setItemOrder(e.target.value);
                        setIsFormDirty(true);
                        if (modalErrors.order) setModalErrors((prev) => ({ ...prev, order: null }));
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-bold"
                    />
                  </FormField>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Haala (Status)</span>
                      <span className="text-[11px] text-slate-500">
                        {isActive ? "Mul'ata (Active)" : 'Dhokataa (Inactive)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => {
                        setIsActive(!isActive);
                        setIsFormDirty(true);
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        isActive ? 'bg-royal' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Home Row Preview */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Preview On Home:
                </span>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Clock className="w-4 h-4 text-gold-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {whatText[currentLang] || whatText.om || 'Gosa Tajaajilaa (Service Name)'}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {whenText[currentLang] || whenText.om || 'Yeroo Sagantaa (When)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-royal text-white shadow-xs whitespace-nowrap">
                      {livePreviewTime}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium mt-0.5">
                      {scheduleClockType === 'ETHIOPIAN' ? "Sa'aatii Itoophiyaa" : 'International (24h)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3 mt-4 flex justify-end space-x-3 z-10">
              <Button variant="ghost" size="md" type="button" onClick={handleModalClose}>
                Dhiisi (Cancel)
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={formLoading}
                disabled={formLoading}
              >
                {editItem ? 'Kuusi' : 'Dabali'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════ MODAL: CREATE / EDIT BANNER ════════ */}
      {modalType === 'banner' && (
        <Modal
          isOpen={true}
          onClose={handleModalClose}
          title={editItem ? 'Banner Gulaali (Edit Banner)' : 'Banner Haaraa Dabali (Add Banner)'}
          size="lg"
        >
          <form noValidate onSubmit={handleSaveBanner} className="flex flex-col min-h-0">
            {/* Scrollable Modal Body */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
              {/* Alert at top */}
              {modalAlertMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">Dogoggora (Validation Error)</strong>
                    <span>{modalAlertMsg}</span>
                  </div>
                </div>
              )}

              <div data-error={!!modalErrors['title.om']}>
                <FormField label="Mata Duree (Title - Afaan Oromoo)" required error={modalErrors['title.om']}>
                  <input
                    type="text"
                    value={title.om}
                    onChange={(e) => {
                      setTitle({ ...title, om: e.target.value });
                      setIsFormDirty(true);
                      if (modalErrors['title.om']) setModalErrors((prev) => ({ ...prev, 'title.om': null }));
                    }}
                    placeholder="Fkn: Ayyaana Qulqulluu Giyoorgisii"
                    className={`w-full px-3.5 py-2 rounded-xl bg-white border text-xs text-slate-800 ${
                      modalErrors['title.om'] ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300'
                    }`}
                  />
                </FormField>
              </div>

              <FormField label="Ibsa (Description - Afaan Oromoo)">
                <textarea
                  rows={2}
                  value={description.om}
                  onChange={(e) => {
                    setDescription({ ...description, om: e.target.value });
                    setIsFormDirty(true);
                  }}
                  placeholder="Ibsa gabaabaa..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                />
              </FormField>

              {/* Cloudinary Image Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-100" data-error={!!modalErrors.imageUrl}>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Suuraa Banner (Cloudinary Upload - max 3MB) *</span>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setIsFormDirty(true);
                      }}
                      className="text-red-500 hover:underline text-[11px]"
                    >
                      Haqi
                    </button>
                  )}
                </label>

                <div className="flex items-center space-x-3">
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-royal-tint hover:bg-royal-light text-royal border border-gold-500/40 text-xs font-bold transition-all">
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-royal" />
                    ) : (
                      <Upload className="w-4 h-4 text-gold-600" />
                    )}
                    <span>{uploadingImage ? 'Fe\'aa jira...' : 'Suuraa Filadhu (Upload to Cloudinary)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        handleImageUpload(e, 'banners');
                        setIsFormDirty(true);
                        if (modalErrors.imageUrl) setModalErrors((prev) => ({ ...prev, imageUrl: null }));
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">Folder: wqg/banners (max 3 MB)</span>
                </div>

                {modalErrors.imageUrl && (
                  <p className="text-xs text-red-600 font-semibold">{modalErrors.imageUrl}</p>
                )}

                {imageUrl && (
                  <div className="relative rounded-xl overflow-hidden h-40 w-full border border-slate-200 mt-2 bg-slate-50">
                    <img src={imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Badge Text">
                  <input
                    type="text"
                    value={bannerBadge}
                    onChange={(e) => {
                      setBannerBadge(e.target.value);
                      setIsFormDirty(true);
                    }}
                    placeholder="Ayyaana & Sagantaa Addaa"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                  />
                </FormField>

                <FormField label="Link URL">
                  <input
                    type="text"
                    value={bannerLinkUrl}
                    onChange={(e) => {
                      setBannerLinkUrl(e.target.value);
                      setIsFormDirty(true);
                    }}
                    placeholder="/services"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                  />
                </FormField>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3 mt-4 flex justify-end space-x-3 z-10">
              <Button variant="ghost" size="md" type="button" onClick={handleModalClose}>
                Dhiisi (Cancel)
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={formLoading}
                disabled={formLoading}
              >
                {editItem ? 'Kuusi' : 'Dabali'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════ MODAL: SCHEDULE LIVE MEETING ════════ */}
      {modalType === 'scheduleLive' && (
        <Modal
          isOpen={true}
          onClose={handleModalClose}
          title="Sagantaa Live Haaraa Qopheessi (Schedule Live Session)"
          size="md"
        >
          <form noValidate onSubmit={handleScheduleLive} className="flex flex-col min-h-0">
            {/* Scrollable Modal Body */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pr-2">
              {/* Alert at top */}
              {modalAlertMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold">Dogoggora (Validation Error)</strong>
                    <span>{modalAlertMsg}</span>
                  </div>
                </div>
              )}

              <div data-error={!!modalErrors.liveTitle}>
                <FormField label="Mata Duree Sagantaa Live" required error={modalErrors.liveTitle}>
                  <input
                    type="text"
                    value={liveTitle}
                    onChange={(e) => {
                      setLiveTitle(e.target.value);
                      setIsFormDirty(true);
                      if (modalErrors.liveTitle) setModalErrors((prev) => ({ ...prev, liveTitle: null }));
                    }}
                    placeholder="Fkn: Kadhannaa fi Sagalee Waaqayyoo Kallattii"
                    className={`w-full px-3.5 py-2 rounded-xl bg-white border text-xs text-slate-800 font-bold ${
                      modalErrors.liveTitle ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300'
                    }`}
                  />
                </FormField>
              </div>

              <FormField label="Ibsa Sagantaa">
                <textarea
                  rows={3}
                  value={liveDescription}
                  onChange={(e) => {
                    setLiveDescription(e.target.value);
                    setIsFormDirty(true);
                  }}
                  placeholder="Ibsa sagantaa kallattii..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                />
              </FormField>

              <div data-error={!!modalErrors.liveScheduledDate}>
                <DateTimePicker
                  label="Guyyaa fi Sa'aatii (Scheduled Date & Time) *"
                  value={liveScheduledDate}
                  onChange={(val) => {
                    setLiveScheduledDate(val);
                    setIsFormDirty(true);
                    if (modalErrors.liveScheduledDate) setModalErrors((prev) => ({ ...prev, liveScheduledDate: null }));
                  }}
                  error={modalErrors.liveScheduledDate}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-royal-tint border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-royal flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                  <span>Notice:</span>
                </div>
                <p>
                  Sagantaan kun yeroo qophaa'u fuula duraa (Home) irratti strip ta'ee amantoota hundaaf ni mul'ata.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3 mt-4 flex justify-end space-x-3 z-10">
              <Button variant="ghost" size="md" type="button" onClick={handleModalClose}>
                Dhiisi (Cancel)
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={formLoading}
                disabled={formLoading}
              >
                Qopheessi (Schedule Live)
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════ DELETE CONFIRMATION MODAL ════════ */}
      {deleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title="Haqqii Mirkaneessaa (Confirm Deletion)"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <p className="font-bold">Qabiyyee kana haqquu barbaadduu?</p>
                <p className="mt-1 text-red-700">
                  Hojichi erga raawwatamee booda deebisuun hin danda'amu (This action cannot be undone).
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="ghost" size="md" onClick={() => setDeleteConfirm(null)}>
                Dhiisi (Cancel)
              </Button>
              <Button variant="danger" size="md" onClick={handleConfirmDelete}>
                Eeyyee, Haqi (Delete)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProgramsManager;
