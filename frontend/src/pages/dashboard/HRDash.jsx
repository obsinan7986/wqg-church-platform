import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Users,
  Search,
  Filter,
  Church,
  Calendar,
  CheckCircle,
  Award,
  IdCard,
  Briefcase,
  Printer,
  Phone,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  QrCode,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  DataTable,
  PageHeader,
  Modal,
  Tabs,
  EmptyState,
  Toast,
  FormField,
  Avatar,
  DatePicker
} from '../../components/ui';
import ChurchStamp from '../../components/ChurchStamp';
import { formatDate, formatDual, getAddisToday } from '../../utils/dateFormat';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const DEPARTMENT_OPTIONS = [
  'General Fellowship',
  'Choir / Faarfannaa',
  'Prayer / Kadhannaa',
  'Youth / Dargaggoota',
  'Charity / Arjoomina',
  'Elders / Jaarsolii',
  'Diaconia / Tajaajila Deeqonummaa'
];

const HRDash = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance'
  const [members, setMembers] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [churchFilter, setChurchFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Department Assignment Modal
  const [editingMember, setEditingMember] = useState(null);
  const [selectedDept, setSelectedDept] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  // Digital ID Card Modal
  const [activeIdCard, setActiveIdCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState('idle'); // 'loading' | 'loaded' | 'error' | 'none'

  const handleOpenIdCard = async (member) => {
    setActiveIdCard(member);
    if (member.avatarUrl) {
      setPhotoStatus('loading');
    } else {
      setPhotoStatus('none');
    }

    try {
      setCardLoading(true);
      const res = await api.get(`/hr/members/${member._id}`);
      if (res.data?.success && res.data.member) {
        setActiveIdCard(res.data.member);
        if (res.data.member.avatarUrl) {
          setPhotoStatus('loading');
        } else {
          setPhotoStatus('none');
        }
      }
    } catch (err) {
      console.warn('[HRDash] Fresh member fetch failed, using cached list data:', err);
    } finally {
      setCardLoading(false);
    }
  };

  // Attendance Form Modal
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    title: "Walga'ii Hafuuraa Dilbataa (Sunday Service)",
    serviceType: 'SUNDAY_SERVICE',
    originChurch: 'All Branches',
    date: getAddisToday(),
    presentMemberIds: [],
    notes: ''
  });
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Admin / HR Reset Password State
  const [resetModalData, setResetModalData] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [copiedReset, setCopiedReset] = useState(false);

  const handleResetPassword = async (member) => {
    try {
      setResettingId(member._id);
      const res = await api.post(`/hr/members/${member._id}/reset-password`);
      if (res.data?.success) {
        setResetModalData({
          member,
          temporaryPassword: res.data.temporaryPassword
        });
        setSuccessMsg(`Jechi icciitii yeroo ${member.fullName}'f qophaa'eera.`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Jecha icciitii haaromsuun hin danda\'amne.');
    } finally {
      setResettingId(null);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [membersRes, attendanceRes] = await Promise.all([
        api.get('/hr/members', {
          params: {
            originChurch: churchFilter,
            department: deptFilter,
            search: searchQuery
          }
        }),
        api.get('/hr/attendance')
      ]);

      if (membersRes.data?.success) {
        setMembers(membersRes.data.members || []);
      }
      if (attendanceRes.data?.success) {
        setAttendanceList(attendanceRes.data.attendance || []);
      }
    } catch (err) {
      console.error('[HRDash Fetch Error]:', err);
      setErrorMsg("Daataa miseensotaa fiduun hin danda'amne");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [churchFilter, deptFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMembers();
  };

  const handleAssignDept = async (e) => {
    e.preventDefault();
    if (!editingMember || !selectedDept) return;

    try {
      setSavingDept(true);
      const res = await api.put(`/hr/members/${editingMember._id}/department`, {
        department: selectedDept
      });

      if (res.data?.success) {
        setSuccessMsg(`Kutaan hojii ${editingMember.fullName} gara "${selectedDept}" jijjiirameera!`);
        setEditingMember(null);
        fetchMembers();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Assign Dept Error]:', err);
      setErrorMsg(err.response?.data?.message || "Kutaa hojii jijjiiruun hin danda'amne");
    } finally {
      setSavingDept(false);
    }
  };

  const handleToggleAttendanceMember = (memberId) => {
    setAttendanceForm((prev) => {
      const exists = prev.presentMemberIds.includes(memberId);
      return {
        ...prev,
        presentMemberIds: exists
          ? prev.presentMemberIds.filter((id) => id !== memberId)
          : [...prev.presentMemberIds, memberId]
      };
    });
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    try {
      setSavingAttendance(true);
      setErrorMsg('');
      const res = await api.post('/hr/attendance', attendanceForm);

      if (res.data?.success) {
        setSuccessMsg("Galmeen hirmaannaa milkaa'inaan qindaa'eera!");
        setShowAttendanceModal(false);
        setAttendanceForm({
          title: "Walga'ii Hafuuraa Dilbataa (Sunday Service)",
          serviceType: 'SUNDAY_SERVICE',
          originChurch: 'All Branches',
          date: getAddisToday(),
          presentMemberIds: [],
          notes: ''
        });
        fetchMembers();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Attendance Save Error]:', err);
      setErrorMsg(err.response?.data?.message || "Hirmaannaa galmeessuun hin danda'amne");
    } finally {
      setSavingAttendance(false);
    }
  };

  const churchOptions = Array.from(
    new Set(members.map((m) => m.originChurch).filter(Boolean))
  );

  const hrTabs = [
    { id: 'directory', label: 'Miseensota', count: members.length },
    { id: 'attendance', label: 'Hirmaannaa', count: attendanceList.length }
  ];

  const memberColumns = [
    {
      key: 'fullName',
      header: 'Maqaa Guutuu',
      render: (val, m) => (
        <div className="flex items-center space-x-3">
          <Avatar user={m} size="sm" />
          <div>
            <div className="font-bold text-slate-900 text-sm">{m.fullName}</div>
            <span className="text-[10px] text-slate-500">
              Galmaa'e: {formatDate(m.createdAt)}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'originChurch',
      header: 'Waldaa Irraa Dhufe',
      render: (val) => <span className="text-royal font-medium">{val}</span>
    },
    {
      key: 'address',
      header: 'Teessoo & Bilbila',
      render: (_, m) => (
        <div>
          <div>📍 {m.address?.city}, Ganda {m.address?.kebele}</div>
          <div className="text-[10px] text-slate-400">📞 {m.address?.phone}</div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Gahee (Role)',
      render: (val) => <Badge variant="muted" size="sm">{val}</Badge>
    },
    {
      key: 'department',
      header: 'Kutaa Hojii (Department)',
      render: (val) => <Badge variant="gold" size="sm">{val || 'General Fellowship'}</Badge>
    },
    {
      key: 'actions',
      header: 'Gochaalee',
      align: 'right',
      render: (_, m) => (
        <div className="flex items-center justify-end space-x-2">
          {['ADMIN', 'SUPER_ADMIN', 'HR'].includes(user?.role) && (
            <Button
              variant="ghost"
              size="sm"
              icon={KeyRound}
              loading={resettingId === m._id}
              onClick={() => handleResetPassword(m)}
              title="Jecha Icciitii Yeroo Qopheessi"
              className="text-amber-400 hover:text-amber-300"
            >
              Reset
            </Button>
          )}
          <Button
            data-tour="hr-dept-btn"
            variant="ghost"
            size="sm"
            icon={Briefcase}
            onClick={() => {
              setEditingMember(m);
              setSelectedDept(m.department || 'General Fellowship');
            }}
            title="Kutaa Hojii Ramadi"
          >
            Ramadi
          </Button>
          <Button
            data-tour="hr-idcard-btn"
            variant="secondary"
            size="sm"
            icon={IdCard}
            onClick={() => handleOpenIdCard(m)}
            title="Kaardii Eenyummaa"
          >
            Kaardii
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 text-slate-900">
      {/* Header Banner via PageHeader */}
      <PageHeader
        icon={Users}
        eyebrow="Kutaa Qabeenya Namaa & Hoggansa Miseensotaa (HR & Personnel)"
        title="Galmee Miseensotaa & Tajaajiltootaa"
        subtitle="Miseensota damee hundaa to'achuu, kutaalee tajaajilaatti ramaduu, fi Kaardii Eenyummaa (Digital ID) qopheessuu."
        actions={
          <div className="flex items-center space-x-3">
            <Tabs tabs={hrTabs} activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'attendance' && (
              <Button
                variant="primary"
                size="md"
                icon={CheckCircle}
                onClick={() => setShowAttendanceModal(true)}
              >
                Hirmaannaa Qabi
              </Button>
            )}
          </div>
        }
      />

      {/* Notifications */}
      <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />
      <Toast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />

      {/* Tab 1: Member Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <Card className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 sm:p-6">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <FormField
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Maqaa, Bilbila, ykn Magaalaan barbaadi..."
              />
            </form>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Church Filter */}
              <div className="flex items-center space-x-2">
                <Church className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <select
                  value={churchFilter}
                  onChange={(e) => setChurchFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                >
                  <option value="ALL">Waldaa Hundumaa</option>
                  {churchOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                >
                  <option value="ALL">Kutaa Hojii Hundumaa</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Members Table via DataTable */}
          <div data-tour="hr-member-table">
            <DataTable
              title={`Tarree Miseensota Galmaa'anii (${members.length})`}
              subtitle="Hoggansa Qabeenya Namaa"
              columns={memberColumns}
              data={members}
              loading={loading}
              emptyTitle="Miseensi tokkollee hin argamne"
              emptyDescription="Galmeen miseensotaa filannoo kanaaf hin argamne."
            />
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Tracking */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attendanceList.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={Calendar}
                  title="Galmeen hirmaannaa tokkollee hin jiru"
                  description="Walga'ii haaraa qabaachuuf hirmaannaa jalqabaa galmeessaa."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAttendanceModal(true)}
                    >
                      Hirmaannaa Jalqabaa Qabi
                    </Button>
                  }
                />
              </div>
            ) : (
              attendanceList.map((att) => (
                <Card
                  key={att._id}
                  className="space-y-4 hover:border-gold-400"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="gold" size="sm">
                      {att.serviceType}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {formatDual(att.date)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-base text-royal">{att.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">⛪ {att.originChurch}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-royal-tint border border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Hirmaattota Argaman:</span>
                    <span className="text-lg font-black text-royal">
                      {att.presentMembers?.length || 0}
                    </span>
                  </div>

                  {att.notes && (
                    <p className="text-[11px] text-slate-500 italic">"{att.notes}"</p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Galmeessaa: {att.recordedBy?.fullName}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Assign Department */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title="Kutaa Hojii Ramadi"
        maxWidth="max-w-md"
      >
        {editingMember && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-royal-tint border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">Miseensa:</span>
              <span className="text-sm font-black text-royal block">
                {editingMember.fullName}
              </span>
              <span className="text-slate-600 font-medium text-[11px] block">
                ⛪ {editingMember.originChurch}
              </span>
            </div>

            <FormField
              as="select"
              label="Kutaa Tajaajilaa Haaraa Filadhu:"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
            />

            <div className="pt-4 flex items-center justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={() => setEditingMember(null)}
              >
                Dhiisi
              </Button>
              <Button
                variant="primary"
                loading={savingDept}
                onClick={handleAssignDept}
              >
                Mirkaneessi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: Digital ID Card Preview & Print */}
      {activeIdCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in print:static print:p-0 print:bg-transparent">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden print:static print:overflow-visible print:shadow-none print:max-w-none print:border-none">
            {/* Modal Controls */}
            <div className="no-print print:hidden p-4 bg-royal text-white flex items-center justify-between border-b border-royal-dark">
              <span className="text-xs font-bold text-gold-300">
                Kaardii Eenyummaa Miseensichaa (Digital Member ID)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  disabled={photoStatus === 'loading'}
                  onClick={() => window.print()}
                  title={photoStatus === 'loading' ? "Suuraan fe'amaa jira..." : 'Maxxansi'}
                >
                  {photoStatus === 'loading' ? "Fe'amaa jira..." : 'Maxxansi'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveIdCard(null)}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* High-Fidelity Printable Member ID Card */}
            <div className="print-area p-6 bg-white text-slate-900 print:bg-white print:text-black print:p-8">
              <div className="p-6 rounded-3xl border-2 border-gold-400 bg-white shadow-xl space-y-5 relative overflow-hidden print:bg-white print:text-black print:border-slate-800 print:shadow-none">
                {/* Card Top Church Header */}
                <div className="flex items-center space-x-3 pb-3 border-b border-gold-400/50 print:border-slate-300">
                  <img
                    src="/logo-walda.jpg"
                    alt="Logo"
                    className="w-12 h-12 rounded-full object-cover border-2 border-gold-400 shadow print:border-slate-800"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div>
                    <h4 className="text-xs font-black text-royal print:text-black uppercase tracking-tight">
                      Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
                    </h4>
                    <span className="text-[9px] text-gold-600 print:text-slate-700 font-bold block uppercase tracking-wider">
                      Kaardii Miseensummaa • Official Member ID
                    </span>
                  </div>
                </div>

                {/* Member Photo & Basic Details */}
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-royal-tint print:bg-slate-100 border-2 border-gold-400 print:border-slate-400 overflow-hidden relative shrink-0 shadow-sm flex items-center justify-center">
                    {activeIdCard.avatarUrl && photoStatus !== 'error' ? (
                      <img
                        src={resolveMediaUrl(activeIdCard.avatarUrl)}
                        alt={activeIdCard.fullName}
                        className="w-full h-full object-cover"
                        onLoad={() => setPhotoStatus('loaded')}
                        onError={() => setPhotoStatus('error')}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-royal text-white print:bg-slate-200 print:text-black">
                        <span className="text-2xl sm:text-3xl font-black">
                          {activeIdCard.fullName?.charAt(0)?.toUpperCase() || 'M'}
                        </span>
                        <span className="text-[8px] font-bold mt-1 text-gold-300 print:text-slate-600 uppercase tracking-widest">
                          MEMBER
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 print:text-slate-600 uppercase tracking-wider block font-semibold">
                      Maqaa Guutuu
                    </span>
                    <h3 className="text-base font-black text-royal print:text-black leading-tight">
                      {activeIdCard.fullName}
                    </h3>
                    {activeIdCard.originChurch && activeIdCard.originChurch.trim() && (
                      <div className="text-[11px] font-bold text-slate-700 print:text-slate-800">
                        ⛪ {activeIdCard.originChurch}
                      </div>
                    )}
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-royal-tint print:bg-slate-100 text-royal print:text-black border border-royal/20 print:border-slate-400">
                      {activeIdCard.department || 'General Fellowship'}
                    </div>
                  </div>
                </div>

                {/* Additional Metadata */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 print:border-slate-300 text-[10px]">
                  <div>
                    <span className="text-slate-500 print:text-slate-600 block">Lakk. Eenyummaa (ID):</span>
                    <span className="font-mono font-bold text-royal print:text-black">
                      WQG-{activeIdCard._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 print:text-slate-600 block">Bilbila:</span>
                    <span className="font-bold text-slate-800 print:text-black">
                      {activeIdCard.address?.phone || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 print:text-slate-600 block">Teessoo:</span>
                    <span className="font-bold text-slate-800 print:text-black">
                      {activeIdCard.address?.city}, Ganda {activeIdCard.address?.kebele}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 print:text-slate-600 block">Gahee:</span>
                    <span className="font-bold text-royal print:text-black uppercase">
                      {activeIdCard.role}
                    </span>
                  </div>
                </div>

                {/* Card Footer with QR & Seal */}
                <div className="pt-3 border-t border-gold-400/40 print:border-slate-300 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-600 print:text-black">
                    <QrCode className="w-8 h-8 text-royal print:text-black" />
                    <span className="text-[8px] font-mono leading-tight">
                      WQG-AUTH<br />VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ChurchStamp
                      size={100}
                      date={activeIdCard.createdAt}
                      className="-rotate-6"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Take Attendance Session */}
      <Modal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        title="Hirmaannaa Walga'ii Galmeessi"
        icon={CheckCircle}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <FormField
            label="Mata-duree Sagantichaa"
            required
            value={attendanceForm.title}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, title: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              as="select"
              label="Gosa Sagantaa"
              required
              value={attendanceForm.serviceType}
              onChange={(e) =>
                setAttendanceForm({ ...attendanceForm, serviceType: e.target.value })
              }
              options={[
                { value: 'SUNDAY_SERVICE', label: 'Sunday Service (Sagantaa Dilbataa)' },
                { value: 'PRAYER_NIGHT', label: 'Prayer Night (Kadhannaa Halkan)' },
                { value: 'CHOIR_REHEARSAL', label: 'Choir Rehearsal (Shaakala Faarfannaa)' },
                { value: 'GENERAL_ASSEMBLY', label: "General Assembly (Yaa'ii Waliigalaa)" },
                { value: 'YOUTH_FELLOWSHIP', label: 'Youth Fellowship (Dargaggoota)' }
              ]}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Guyyaa <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={attendanceForm.date}
                onChange={(val) => setAttendanceForm({ ...attendanceForm, date: val })}
                dateOnly={true}
                max={getAddisToday()}
                required
              />
            </div>
          </div>

          {/* Attendance Member Checklist */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold block text-xs">
                Miseensota Argaman Mallatteessi ({attendanceForm.presentMemberIds.length} / {members.length}):
              </label>
              <button
                type="button"
                onClick={() => {
                  if (attendanceForm.presentMemberIds.length === members.length) {
                    setAttendanceForm({ ...attendanceForm, presentMemberIds: [] });
                  } else {
                    setAttendanceForm({
                      ...attendanceForm,
                      presentMemberIds: members.map((m) => m._id)
                    });
                  }
                }}
                className="text-[11px] text-gold-400 hover:underline font-bold"
              >
                {attendanceForm.presentMemberIds.length === members.length
                  ? 'Hunda Haqi'
                  : 'Hunda Filadhu'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-2xl bg-white border border-slate-200 p-3 space-y-2">
              {members.map((m) => {
                const isChecked = attendanceForm.presentMemberIds.includes(m._id);
                return (
                  <label
                    key={m._id}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-royal-tint border border-royal/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAttendanceMember(m._id)}
                        className="rounded text-royal focus:ring-royal"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">{m.fullName}</span>
                        <span className="text-[10px] text-slate-500">
                          ⛪ {m.originChurch} • {m.department}
                        </span>
                      </div>
                    </div>
                    {isChecked && (
                      <span className="text-[10px] font-bold text-royal">Argameera</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <FormField
            label="Yaada / Ibsa"
            value={attendanceForm.notes}
            onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
            placeholder="Ibsa dabalataa walga'ichaa"
          />

          <div className="pt-4 flex items-center justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => setShowAttendanceModal(false)}
            >
              Dhiisi
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingAttendance}
            >
              Galmeessi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Reset Password Temporary Password Modal */}
      <Modal
        isOpen={!!resetModalData}
        onClose={() => {
          setResetModalData(null);
          setCopiedReset(false);
        }}
        title="Jecha Icciitii Yeroo (Temporary Password)"
        icon={KeyRound}
        maxWidth="max-w-md"
      >
        {resetModalData && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Jechi icciitii yeroo miseensa <strong className="text-slate-900">{resetModalData.member?.fullName}</strong>'f qophaa'eera. Jecha icciitii kana miseensichaaf kennaa; yeroo jalqabaaf seenan akka jijjiiran ni dirqisiifamu.
            </p>

            <div className="p-4 rounded-2xl bg-royal-tint border-2 border-dashed border-gold-400 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Jecha Icciitii Yeroo:
                </span>
                <span className="text-lg font-mono font-black text-royal select-all">
                  {resetModalData.temporaryPassword}
                </span>
              </div>
              <Button
                variant={copiedReset ? 'primary' : 'secondary'}
                size="sm"
                icon={copiedReset ? Check : Copy}
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.temporaryPassword);
                  setCopiedReset(true);
                  setTimeout(() => setCopiedReset(false), 2000);
                }}
              >
                {copiedReset ? 'Waraabameera' : 'Waraabi'}
              </Button>
            </div>

            <p className="text-[11px] text-amber-700 italic">
              ⚠️ Jechi icciitii kun yeroo tokko qofa asitti mul'ata.
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResetModalData(null);
                  setCopiedReset(false);
                }}
              >
                Cufi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HRDash;
