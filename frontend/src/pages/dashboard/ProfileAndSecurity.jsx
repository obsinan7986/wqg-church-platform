import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useDateSettings } from '../../context/DateSettingsContext';
import api from '../../api/axios';
import {
  User,
  Shield,
  Coins,
  Camera,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  History,
  KeyRound,
  Globe,
  Building,
  MapPin,
  Mail,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  PageHeader,
  FormField,
  Modal,
  Toast,
  Spinner,
  Avatar
} from '../../components/ui';
import MemberPaymentDash from './MemberPaymentDash';

const ProfileAndSecurity = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser, updateToken, logout } = useAuth();
  const { formatDateTime, setCalendarPref: ctxSetCal, setClockPref: ctxSetClock } = useDateSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'profile' | 'security' | 'payments'
  const initialTab = searchParams.get('subtab') || (user?.mustChangePassword ? 'security' : 'profile');
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: 'profile', subtab: tabId });
  };

  // Toast message state
  const [toast, setToast] = useState(null);

  // ════════════════════════════════════════════════
  // TAB 1: PROFILE STATE
  // ════════════════════════════════════════════════
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    originChurch: user?.originChurch || '',
    city: user?.address?.city || '',
    kebele: user?.address?.kebele || '',
    email: user?.email || '',
    languagePref: user?.languagePref || 'om',
    calendarPref: user?.calendarPref || (user?.languagePref === 'en' ? 'GREGORIAN' : 'ETHIOPIAN'),
    clockPref: user?.clockPref || 'INTERNATIONAL'
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);

  // Phone Change state
  const [phoneForm, setPhoneForm] = useState({
    newPhone: '',
    currentPassword: ''
  });
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneErrors, setPhoneErrors] = useState({});

  // ════════════════════════════════════════════════
  // TAB 2: SECURITY STATE
  // ════════════════════════════════════════════════
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Logout all modal state
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Security activity state
  const [securityActivities, setSecurityActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Sync profile form when user object updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        originChurch: user.originChurch || '',
        city: user.address?.city || '',
        kebele: user.address?.kebele || '',
        email: user.email || '',
        languagePref: user.languagePref || 'om',
        calendarPref: user.calendarPref || (user.languagePref === 'en' ? 'GREGORIAN' : 'ETHIOPIAN'),
        clockPref: user.clockPref || 'INTERNATIONAL'
      });
    }
  }, [user]);

  // If user must change password, force to security tab
  useEffect(() => {
    if (user?.mustChangePassword) {
      setActiveTab('security');
    }
  }, [user?.mustChangePassword]);

  // Fetch security activity when security tab is opened
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityActivity();
    }
  }, [activeTab]);

  const fetchSecurityActivity = async () => {
    try {
      setLoadingActivity(true);
      const res = await api.get('/auth/security-activity');
      if (res.data?.success) {
        setSecurityActivities(res.data.activities || []);
      }
    } catch (err) {
      console.warn('[fetchSecurityActivity Error]:', err.message);
    } finally {
      setLoadingActivity(false);
    }
  };

  // ════════════════════════════════════════════════
  // PROFILE HANDLERS
  // ════════════════════════════════════════════════
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setToast({ type: 'error', message: 'Suuraa qofa (JPG, PNG, WebP) filadhaa.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: 'error', message: 'Hangi suuraa 2MB caaluu hin danda\'u.' });
      return;
    }

    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        updateUser(res.data.user || { avatarUrl: res.data.avatarUrl });
        setToast({ type: 'success', message: "Suuraan profile milkaa'inaan haaromfameera!" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Suuraa fe'uun hin danda'amne.";
      setToast({ type: 'error', message: msg });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setAvatarDeleting(true);
      const res = await api.delete('/auth/avatar');
      if (res.data?.success) {
        updateUser(res.data.user || { avatarUrl: null });
        setToast({ type: 'success', message: 'Suuraan profile haqameera.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Suuraa haquun hin danda'amne.";
      setToast({ type: 'error', message: msg });
    } finally {
      setAvatarDeleting(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!profileForm.fullName.trim()) {
      errors.fullName = 'Maqaa guutuu barreessuun dirqama.';
    }
    if (!profileForm.originChurch.trim()) {
      errors.originChurch = 'Waldaa irraa dhuftan filachuun dirqama.';
    }
    if (profileForm.email && !/^\S+@\S+\.\S+$/.test(profileForm.email.trim())) {
      errors.email = 'Email sirrii miti.';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    try {
      setProfileSaving(true);
      setProfileErrors({});

      const payload = {
        fullName: profileForm.fullName.trim(),
        originChurch: profileForm.originChurch.trim(),
        address: {
          city: profileForm.city.trim(),
          kebele: profileForm.kebele.trim()
        },
        email: profileForm.email.trim() || undefined,
        languagePref: profileForm.languagePref,
        calendarPref: profileForm.calendarPref,
        clockPref: profileForm.clockPref
      };

      const res = await api.patch('/auth/profile', payload);

      if (res.data?.success) {
        updateUser(res.data.user);
        if (profileForm.calendarPref) ctxSetCal(profileForm.calendarPref);
        if (profileForm.clockPref) ctxSetClock(profileForm.clockPref);
        setToast({ type: 'success', message: "Profile keessan milkaa'inaan haaromfameera!" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Profile haaromsuun hin danda'amne.";
      setToast({ type: 'error', message: msg });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePhone = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!phoneForm.newPhone.trim()) {
      errors.newPhone = 'Lakkoofsa bilbilaa haaraa guutaa.';
    }
    if (!phoneForm.currentPassword) {
      errors.currentPassword = 'Jecha icciitii (password) keessan galchaa.';
    }

    if (Object.keys(errors).length > 0) {
      setPhoneErrors(errors);
      return;
    }

    try {
      setPhoneSaving(true);
      setPhoneErrors({});

      const res = await api.put('/auth/change-phone', {
        newPhone: phoneForm.newPhone.trim(),
        currentPassword: phoneForm.currentPassword
      });

      if (res.data?.success) {
        updateUser(res.data.user);
        setPhoneForm({ newPhone: '', currentPassword: '' });
        setToast({ type: 'success', message: "Lakkoofsi bilbilaa milkaa'inaan jijjiirameera!" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Bilbila jijjiiruun hin danda'amne.";
      setToast({ type: 'error', message: msg });
    } finally {
      setPhoneSaving(false);
    }
  };

  // ════════════════════════════════════════════════
  // PASSWORD STRENGTH CALCULATOR
  // ════════════════════════════════════════════════
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Dadhabaa', color: 'bg-slate-300' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Dadhabaa (Weak)', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Giddu-galeessa (Fair)', color: 'bg-gold-500' };
    if (score === 3) return { score: 3, label: 'Gaarii (Good)', color: 'bg-royal' };
    return { score: 4, label: "Baay'ee Cimmaa (Strong)", color: 'bg-emerald-600' };
  };

  const passwordStrength = calculatePasswordStrength(passwordForm.newPassword);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Jecha icciitii ammaa galchaa.';
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = 'Jecha icciitii haaraa galchaa.';
    } else {
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!regex.test(passwordForm.newPassword)) {
        errors.newPassword = 'Jechi icciitii yoo xiqqaate qubee 8, qubee guddaa, qubee xiqqaa fi lakkoofsa qabaachuu qaba.';
      }
    }
    if (passwordForm.newPassword !== passwordForm.confirm) {
      errors.confirm = 'Jechi icciitii haaromfamee fi mirkaneessi walsimuu qabu.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordErrors({});

      const res = await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirm: passwordForm.confirm
      });

      if (res.data?.success) {
        if (res.data.token) {
          updateToken(res.data.token);
        }
        if (res.data.user) {
          updateUser(res.data.user);
        }
        setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
        setToast({
          type: 'success',
          message: "Jechi icciitii keessan milkaa'inaan jijjiirameera! Meeshaaleen biraa hundi keessaa bahaniiru."
        });
        fetchSecurityActivity();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Jecha icciitii jijjiiruun hin danda'amne.";
      setToast({ type: 'error', message: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setLoggingOutAll(true);
      const res = await api.post('/auth/logout-all');
      if (res.data?.success) {
        setShowLogoutAllModal(false);
        setToast({
          type: 'success',
          message: 'Meeshaalee hunda irraa bahameera! Amma amansiisaadha.'
        });
        fetchSecurityActivity();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Meeshaalee irraa baasuun hin danda'amne.";
      setToast({ type: 'error', message: msg });
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        icon={Shield}
        eyebrow="Qindaa'ina Dhuunfaa & Nageenya (Account & Security)"
        title="Profile Koo & Nageenya Akkaawuntii"
        subtitle="Odeeffannoo profile haaromsuu, jecha icciitii eeguu, fi kaffaltiiwwan buusii raawwachuu."
        actions={
          <div className="flex items-center space-x-1.5 bg-royal-tint p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => handleTabChange('profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'profile'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-royal hover:bg-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile (Eenyummaa)</span>
            </button>
            <button
              onClick={() => handleTabChange('security')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'security'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-royal hover:bg-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Nageenya (Security)</span>
              {user?.mustChangePassword && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping ml-1" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('payments')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'payments'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-royal hover:bg-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Kaffaltii Koo (My Payments)</span>
            </button>
          </div>
        }
      />

      {/* Toast Feedback */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Force Password Change Warning Banner */}
      {user?.mustChangePassword && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-start space-x-3.5">
          <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-black text-sm text-red-900">
              Jecha Icciitii Haaromsaa (Password Change Required)
            </h4>
            <p className="text-red-700 leading-relaxed">
              Akkaawuntiin keessan jecha icciitii yeroo (temporary password) qaba. Nageenya akkaawuntii keessaniif dura jecha icciitii haaraa cimmaa uumuun dirqama.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 1: PROFILE
          ════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Avatar & Summary (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-5 shadow-sm">
              <div className="relative inline-block mx-auto">
                <Avatar user={user} size="xl" className="shadow-md" />
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <Spinner size="sm" variant="white" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-royal">{user?.fullName}</h3>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <Badge variant="gold">{user?.role}</Badge>
                  {user?.department && (
                    <Badge variant="outline">{user.department}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  📍 {user?.originChurch || 'Damee Haramaya'}
                </p>
              </div>

              {/* Avatar Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2">
                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs shadow-xs transition-all">
                  <Camera className="w-3.5 h-3.5 text-gold-400" />
                  <span>{avatarUploading ? "Fe'aa jira..." : 'Suuraa Jijjiiri'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleAvatarFileChange}
                    disabled={avatarUploading}
                    className="hidden"
                  />
                </label>

                {user?.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={avatarDeleting}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs transition-colors"
                    title="Suuraa Haqi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Change Phone Section (Login ID) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Smartphone className="w-4 h-4 text-royal" />
                <h4 className="text-xs font-black text-royal uppercase tracking-wider">
                  Bilbila Jijjiiri (Change Login ID)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Lakkoofsi bilbilaa mallattoo seensaa (login ID) keessani. Jijjiiruuf jecha icciitii keessan mirkaneessaa.
              </p>

              <form onSubmit={handleChangePhone} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bilbila Ammaa: <span className="text-royal font-mono">{user?.address?.phone || user?.phone}</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Lakkoofsa haaraa (fkn. 09...)"
                    value={phoneForm.newPhone}
                    onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                  />
                  {phoneErrors.newPhone && (
                    <p className="text-[10px] text-red-600 mt-1">{phoneErrors.newPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jecha Icciitii Ammaa (Current Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPhonePassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={phoneForm.currentPassword}
                      onChange={(e) => setPhoneForm({ ...phoneForm, currentPassword: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 pr-9 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhonePassword(!showPhonePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPhonePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {phoneErrors.currentPassword && (
                    <p className="text-[10px] text-red-600 mt-1">{phoneErrors.currentPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={phoneSaving}
                  className="w-full"
                >
                  Bilbila Haaromsi
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Whitelisted Profile Form (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-royal flex items-center gap-2">
                    <User className="w-5 h-5 text-gold-600" />
                    <span>Odeeffannoo Eenyummaa (Profile Information)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Maqaa, waldaa, teessoo fi filannoo afaanii sirreessaa.
                  </p>
                </div>
                <Badge variant="outline">{user?.role}</Badge>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Maqaa Guutuu (Full Name) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    />
                    {profileErrors.fullName && (
                      <p className="text-[10px] text-red-600 mt-1">{profileErrors.fullName}</p>
                    )}
                  </div>

                  {/* Origin Church */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Waldaa Irraa Dhufe (Origin Church) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.originChurch}
                      onChange={(e) => setProfileForm({ ...profileForm, originChurch: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    />
                    {profileErrors.originChurch && (
                      <p className="text-[10px] text-red-600 mt-1">{profileErrors.originChurch}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Magaalaa (City)
                    </label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    />
                  </div>

                  {/* Kebele */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ganda (Kebele)
                    </label>
                    <input
                      type="text"
                      value={profileForm.kebele}
                      onChange={(e) => setProfileForm({ ...profileForm, kebele: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email (Optional, unique sparse) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email (Filannoo / Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="fkn. user@example.com"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    />
                    {profileErrors.email && (
                      <p className="text-[10px] text-red-600 mt-1">{profileErrors.email}</p>
                    )}
                  </div>

                  {/* Language Preference */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Afaan Filatamaa (Language)
                    </label>
                    <select
                      value={profileForm.languagePref}
                      onChange={(e) => setProfileForm({ ...profileForm, languagePref: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    >
                      <option value="om">Afaan Oromoo</option>
                      <option value="am">አማርኛ (Amharic)</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  {/* Calendar Preference */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Kalandara (Calendar System)
                    </label>
                    <select
                      value={profileForm.calendarPref}
                      onChange={(e) => setProfileForm({ ...profileForm, calendarPref: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    >
                      <option value="ETHIOPIAN">🇪🇹 Itiyoophiyaa / ኢትዮጵያ (Ethiopian Calendar)</option>
                      <option value="GREGORIAN">🌍 Idil-addunyaa / ግሪጎሪያን (Gregorian Calendar)</option>
                    </select>
                  </div>

                  {/* Clock Preference */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Sa'aatii (Clock System)
                    </label>
                    <select
                      value={profileForm.clockPref}
                      onChange={(e) => setProfileForm({ ...profileForm, clockPref: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                    >
                      <option value="INTERNATIONAL">🌍 24-Hour International (Idil-addunyaa)</option>
                      <option value="ETHIOPIAN">🇪🇹 12-Hour Ethiopian Clock (Sa'aatii Itiyoophiyaa / የኢትዮጵያ አቆጣጠር)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={profileSaving}
                  >
                    Haaromsa Ol-kaa'i (Save Changes)
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 2: SECURITY
          ════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Change Password Form (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-black text-royal flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-gold-600" />
                    <span>Jecha Icciitii Jijjiiri (Change Password)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jechi icciitii yoo xiqqaate qubee 8, qubee guddaa, qubee xiqqaa fi lakkoofsa qabaachuu qaba.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jecha Icciitii Ammaa (Current Password) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 pr-10 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-[11px] text-red-600 mt-1">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jecha Icciitii Haaraa (New Password) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 pr-10 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-[11px] text-red-600 mt-1">{passwordErrors.newPassword}</p>
                    )}

                    {/* Password Strength Meter */}
                    {passwordForm.newPassword && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-semibold">Cimina Jecha Icciitii:</span>
                          <span className="font-bold text-slate-900">{passwordStrength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jecha Icciitii Mirkaneessi (Confirm Password) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 pr-10 focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.confirm && (
                      <p className="text-[11px] text-red-600 mt-1">{passwordErrors.confirm}</p>
                    )}
                  </div>

                  {/* Policy Checklist */}
                  <div className="p-3 rounded-xl bg-royal-tint/60 border border-slate-200 space-y-1.5 text-[11px] text-slate-700">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${passwordForm.newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Yoo xiqqaate qubee 8 (Min 8 characters)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${/[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword) ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Qubee guddaa fi xiqqaa (Upper & Lowercase)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${/\d/.test(passwordForm.newPassword) ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Lakkoofsa (At least one number)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={passwordSaving}
                      icon={Lock}
                    >
                      Jecha Icciitii Jijjiiri
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Logout All Devices & 2FA Info (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Logout of all devices Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                  <LogOut className="w-5 h-5 text-red-600" />
                  <h4 className="text-sm font-black text-royal">
                    Meeshaalee Hunda Irraa Bahi (Logout All Devices)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Meeshaaleen ykn browseriin biraa kan akkaawuntii kanaan banaman yoo jiraatan hunda keessaa baasa.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={LogOut}
                  onClick={() => setShowLogoutAllModal(true)}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-bold"
                >
                  Meeshaalee Hunda Irraa Bahi
                </Button>
              </div>

              {/* 2FA PlaceHolder Card (TODO specified) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Mirkaneessa Sadarkaa Lammaffaa (2FA)
                    </h4>
                  </div>
                  <Badge variant="outline" size="sm">Dhiyoo Kana</Badge>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tajaajilli 2FA Authenticator App (Google Authenticator) nageenya akkaawuntii dabalataaf dhiyoo kanatti hojiirra oola.
                </p>
                <div className="text-[11px] text-royal font-mono italic">
                  {/* TODO: Implement 2FA TOTP in next iteration */}
                  // Status: 2FA Feature Roadmap (TODO)
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Recent Security Activity (Last 10 events) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-gold-600" />
                <h4 className="text-sm font-black text-royal">
                  Sochii Nageenyaa Dhihoo (Recent Security Activity)
                </h4>
              </div>
              <span className="text-xs text-slate-500">Tartiiba 10n darban</span>
            </div>

            {loadingActivity ? (
              <div className="py-8 flex items-center justify-center space-y-2 text-slate-500 text-xs">
                <Spinner size="sm" variant="royal" />
                <span className="ml-2">Galmee fidaa jira...</span>
              </div>
            ) : securityActivities.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Galmeen sochii nageenyaa ammaaf hin jiru.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="text-[10px] uppercase font-bold text-royal bg-royal-tint border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Gocha (Action)</th>
                      <th className="py-2.5 px-3">Ibsa (Details)</th>
                      <th className="py-2.5 px-3">Meeshaa / IP</th>
                      <th className="py-2.5 px-3 text-right">Guyyaa & Sa'aatii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {securityActivities.map((act, i) => (
                      <tr key={i} className="hover:bg-royal-tint/40">
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              act.action.includes('FAILED')
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : act.action.includes('PASSWORD')
                                ? 'bg-gold-500/20 text-royal border border-gold-500/50'
                                : 'bg-royal-tint text-royal border border-royal/20'
                            }`}
                          >
                            {act.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-xs text-slate-800">
                          {act.details || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-500">
                          <div>{act.ipAddress || '127.0.0.1'}</div>
                          <div className="truncate max-w-[200px]" title={act.userAgent}>
                            {act.userAgent ? act.userAgent.slice(0, 35) + '...' : 'Browser Session'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-sans">
                          {formatDateTime(act.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: MY PAYMENTS
          ════════════════════════════════════════════════ */}
      {activeTab === 'payments' && (
        <MemberPaymentDash />
      )}

      {/* Logout All Devices Confirmation Modal */}
      <Modal
        isOpen={showLogoutAllModal}
        onClose={() => setShowLogoutAllModal(false)}
        title="Meeshaalee Hunda Irraa Bahi"
        icon={LogOut}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Dhuguma meeshaalee fi browseroota hunda irraa bahuu barbaadduu? Tarkaanfiin kun token hunda ni balleessa; meeshaa kana dabalatee irra deebiin seenuun isin barbaachisa.
          </p>
          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutAllModal(false)}
            >
              Dhiisi
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loggingOutAll}
              onClick={handleLogoutAllDevices}
            >
              Eeyyee, Hunda Irraa Bahi
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfileAndSecurity;