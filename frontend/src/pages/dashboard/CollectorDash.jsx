import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import {
  Coins,
  Search,
  Filter,
  PlusCircle,
  FileCheck,
  Printer,
  Church,
  TrendingUp,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Phone,
  MapPin,
  Clock,
  Check,
  X,
  Upload,
  Eye,
  Smartphone,
  Building2,
  Banknote,
  Lock,
  Unlock,
  ZoomIn,
  MessageSquareWarning,
  RefreshCw
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  StatCard,
  DataTable,
  PageHeader,
  Modal,
  Toast,
  FormField,
  Spinner,
  DatePicker,
  DateRangePicker
} from '../../components/ui';
import ChurchStamp from '../../components/ChurchStamp';
import { ETHIOPIAN_MONTH_LIST, ETHIOPIAN_MONTHS, toEthiopian } from '../../utils/ethiopianCalendar';
import { formatDual, formatDate, getAddisToday } from '../../utils/dateFormat';

const SAFE_ETH_MONTHS = Array.isArray(ETHIOPIAN_MONTH_LIST)
  ? ETHIOPIAN_MONTH_LIST
  : (Array.isArray(ETHIOPIAN_MONTHS) ? ETHIOPIAN_MONTHS : []);

const PAYMENT_METHODS = [
  {
    id: 'TELEBIRR',
    label: 'Telebirr',
    sublabel: 'Itoophiyaa Telekoom',
    icon: Smartphone
  },
  {
    id: 'CBE_BIRR',
    label: 'CBE Birr',
    sublabel: 'Baankii Daldala Itoophiyaa',
    icon: Building2
  },
  {
    id: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    sublabel: 'Dabarsa Baankii',
    icon: CreditCard
  },
  {
    id: 'CASH',
    label: 'Cash (Callaa)',
    sublabel: 'Qarshii callaa funaanaatti',
    icon: Banknote
  }
];

const CONTRIBUTION_TYPES = [
  { value: 'MONTHLY', label: "Buusii Ji'aa (Monthly)" },
  { value: 'TITHE', label: 'Asraatii (Tithe)' },
  { value: 'DONATION', label: 'Arjoomina (Donation)' },
  { value: 'SPECIAL_OFFERING', label: 'Gumaacha Addaa' }
];

const CollectorDash = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { socket } = useSocket();

  // Top Tabs: 'records' | 'pending'
  const [activeTab, setActiveTab] = useState('records');

  const [contributions, setContributions] = useState([]);
  const [pendingContributions, setPendingContributions] = useState([]);
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & search for Records
  const [searchQuery, setSearchQuery] = useState('');
  const [churchFilter, setChurchFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [ethYearFilter, setEthYearFilter] = useState('');
  const [ethMonthFilter, setEthMonthFilter] = useState('');

  // New Contribution Modal Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    memberId: '',
    type: 'MONTHLY',
    amount: '',
    paymentMethod: 'TELEBIRR',
    originChurch: '',
    transactionRef: '',
    notes: '',
    paymentDate: getAddisToday()
  });
  const [isChurchEditable, setIsChurchEditable] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [modalBackendError, setModalBackendError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Searchable member combobox state
  const [memberSearchText, setMemberSearchText] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const comboboxRef = useRef(null);
  const fileInputRef = useRef(null);

  // Review Dialogs State
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Lightbox for proof screenshot
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Digital Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const promises = [
        api.get('/contributions', {
          params: {
            originChurch: churchFilter,
            type: typeFilter,
            search: searchQuery,
            startDate: dateRange.startDate || undefined,
            endDate: dateRange.endDate || undefined,
            ethYear: ethYearFilter || undefined,
            ethMonth: ethMonthFilter || undefined
          }
        }),
        api.get('/contributions/stats').catch(() => ({ data: { stats: null } })),
        api.get('/hr/members').catch((err) => {
          console.warn('[CollectorDash] GET /hr/members fallback:', err.message);
          return { data: { success: false, members: [] } };
        })
      ];

      const [contribRes, statsRes, membersRes] = await Promise.all(promises);

      const allContribs = contribRes.data?.contributions || [];
      if (contribRes.data?.success) {
        setContributions(allContribs.filter((c) => c.status !== 'PENDING'));
        setPendingContributions(allContribs.filter((c) => c.status === 'PENDING'));
      }

      if (statsRes.data?.success || statsRes.data?.stats) {
        setStats(statsRes.data.stats || null);
      }

      if (membersRes.data?.success && Array.isArray(membersRes.data.members) && membersRes.data.members.length > 0) {
        setMembers(membersRes.data.members);
      } else {
        // Fallback: extract distinct members from loaded contributions
        const membersMap = new Map();
        allContribs.forEach((c) => {
          if (c.member && c.member._id) {
            membersMap.set(c.member._id, c.member);
          }
        });
        if (membersMap.size > 0) {
          setMembers(Array.from(membersMap.values()));
        }
      }
    } catch (err) {
      console.error('[CollectorDash Fetch Error]:', err);
      setErrorMsg("Buusii fi galmee fiduun hin danda'amne (Failed to fetch records)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [churchFilter, typeFilter, dateRange.startDate, dateRange.endDate, ethYearFilter, ethMonthFilter]);

  // Real-time Socket listeners for collector dashboard
  useEffect(() => {
    if (!socket) return;

    const handleNewPending = (data) => {
      console.log('[Collector Socket] new_pending_payment:', data);
      if (data?.contribution) {
        setPendingContributions((prev) => [data.contribution, ...prev]);
        setSuccessMsg(
          `Kaffaltiin haaraan mirkaneessa eeggatu qarshii ${data.contribution.amount} ETB dhiyaateera!`
        );
      }
    };

    const handleReviewed = (data) => {
      console.log('[Collector Socket] contribution_reviewed:', data);
      setPendingContributions((prev) => prev.filter((c) => c._id !== data.contributionId));
      if (data?.status === 'PAID' && data.contribution) {
        setContributions((prev) => [data.contribution, ...prev]);
      }
    };

    socket.on('new_pending_payment', handleNewPending);
    socket.on('contribution_reviewed', handleReviewed);

    return () => {
      socket.off('new_pending_payment', handleNewPending);
      socket.off('contribution_reviewed', handleReviewed);
    };
  }, [socket]);

  // Close combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Filter members for the combobox dropdown
  const filteredMembers = members.filter((m) => {
    if (!memberSearchText || !memberSearchText.trim()) return true;
    const term = memberSearchText.toLowerCase();
    const nameMatch = m.fullName?.toLowerCase().includes(term);
    const phoneMatch =
      m.address?.phone?.includes(term) || m.phone?.includes(term);
    const churchMatch = m.originChurch?.toLowerCase().includes(term);
    return nameMatch || phoneMatch || churchMatch;
  });

  // Combobox: Selecting a member from dropdown
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setMemberSearchText(member.fullName);
    setFormData((prev) => ({
      ...prev,
      memberId: member._id, // Real ObjectId stored
      originChurch: member.originChurch || ''
    }));
    setMemberDropdownOpen(false);
    setIsChurchEditable(false);
    setFormErrors((prev) => ({ ...prev, memberId: undefined }));
  };

  // Combobox: Clear selected member
  const handleClearSelectedMember = () => {
    setSelectedMember(null);
    setMemberSearchText('');
    setFormData((prev) => ({
      ...prev,
      memberId: '',
      originChurch: ''
    }));
    setIsChurchEditable(false);
  };

  // Proof file selection
  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        proof: 'Suuraa qofa filadhaa (JPG, PNG, WebP)'
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        proof: 'Hangi suuraa 5MB caaluu hin danda\'u'
      }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, proof: undefined, nonCash: undefined }));
    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeProof = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form submit: Create Contribution directly by Collector
  const handleAddContribution = async (e) => {
    e.preventDefault();
    setModalBackendError('');

    const errors = {};
    if (!formData.memberId) {
      errors.memberId = 'Miseensa tarree keessaa filachuun dirqama (Member is required)';
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      errors.amount = 'Hangi qarshii 0 caaluu qaba (Amount must be > 0)';
    }

    if (formData.paymentMethod !== 'CASH') {
      if (!formData.transactionRef?.trim() && !proofFile) {
        errors.nonCash =
          'Kaffaltii kanaaf Lakk. Dabarsaa (Reference) ykn Suuraa Nagahee (Screenshot) dhiyeessuun dirqama.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({});

      const data = new FormData();
      data.append('memberId', formData.memberId);
      data.append('type', formData.type);
      data.append('amount', formData.amount);
      data.append('paymentMethod', formData.paymentMethod);
      data.append('originChurch', formData.originChurch || selectedMember?.originChurch || 'Headquarters');
      data.append('paymentDate', formData.paymentDate || getAddisToday());
      if (formData.transactionRef?.trim()) {
        data.append('transactionRef', formData.transactionRef.trim());
      }
      if (formData.notes?.trim()) {
        data.append('notes', formData.notes.trim());
      }
      if (proofFile) {
        data.append('proof', proofFile);
      }

      const res = await api.post('/contributions', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setSuccessMsg("Kaffaltiin milkaa'inaan galmaa'ee nagaheen qophaa'eera!");
        setShowAddModal(false);
        setActiveReceipt(res.data.contribution);
        // Reset form
        setFormData({
          memberId: '',
          type: 'MONTHLY',
          amount: '',
          paymentMethod: 'TELEBIRR',
          originChurch: '',
          transactionRef: '',
          notes: '',
          paymentDate: getAddisToday()
        });
        setSelectedMember(null);
        setMemberSearchText('');
        removeProof();
        fetchData();
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    } catch (err) {
      console.error('[Add Contribution Error]:', err);
      const readableError =
        err.response?.data?.message || "Kaffaltii galmeessuun hin danda'amne. Mee irra deebi'aa yaalaa.";
      setModalBackendError(readableError);
    } finally {
      setSubmitting(false);
    }
  };

  // Collector Approves a Pending Payment
  const handleApprovePayment = async (contribution) => {
    try {
      setReviewingId(contribution._id);
      setErrorMsg('');

      const res = await api.patch(`/contributions/${contribution._id}/approve`);
      if (res.data?.success) {
        setSuccessMsg(
          `Kaffaltiin qarshii ${contribution.amount} ETB (${contribution.member?.fullName}) milkaa'inaan mirkanaa'eera!`
        );
        // Open receipt for the approved item
        setActiveReceipt(res.data.contribution);
        // Move from pending to contributions
        setPendingContributions((prev) => prev.filter((p) => p._id !== contribution._id));
        setContributions((prev) => [res.data.contribution, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error('[Approve Payment Error]:', err);
      setErrorMsg(
        err.response?.data?.message || "Kaffaltii mirkaneessuun hin danda'amne"
      );
    } finally {
      setReviewingId(null);
    }
  };

  // Open Reject Dialog
  const handleOpenRejectDialog = (contribution) => {
    setRejectionTarget(contribution);
    setRejectionReason('');
    setRejectionError('');
    setRejectModalOpen(true);
  };

  // Collector Rejects a Pending Payment
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectionError('Sababa kaffaltiin didameef ibsuun dirqama (Rejection reason is required)');
      return;
    }

    try {
      setReviewLoading(true);
      setRejectionError('');

      const res = await api.patch(`/contributions/${rejectionTarget._id}/reject`, {
        rejectionReason: rejectionReason.trim()
      });

      if (res.data?.success) {
        setSuccessMsg("Kaffaltichi hin fudhatamne, miseensichaaf beeksisni darbeera.");
        setRejectModalOpen(false);
        setPendingContributions((prev) => prev.filter((p) => p._id !== rejectionTarget._id));
        fetchData();
      }
    } catch (err) {
      console.error('[Reject Payment Error]:', err);
      setRejectionError(
        err.response?.data?.message || "Kaffaltii diduun hin danda'amne"
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Distinct church list for filter
  const churchOptions = Array.from(
    new Set([
      ...members.map((m) => m.originChurch),
      ...contributions.map((c) => c.originChurch || c.member?.originChurch)
    ].filter(Boolean))
  );

  // Table Columns for Approved Contributions
  const columns = [
    {
      key: 'receiptNumber',
      header: 'Lakk. Nagahee',
      render: (val) => <span className="font-mono font-bold text-gold-400">{val || '—'}</span>
    },
    {
      key: 'member',
      header: 'Miseensa',
      render: (_, row) => (
        <div>
          <div className="font-bold text-white">{row.member?.fullName || 'N/A'}</div>
          <div className="text-[10px] text-slate-400">
            {row.member?.address?.phone || row.member?.phone || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'originChurch',
      header: 'Waldaa Irraa Dhufe'
    },
    {
      key: 'type',
      header: 'Gosa Kaffaltii',
      render: (val) => <Badge variant="muted" size="sm">{val}</Badge>
    },
    {
      key: 'amount',
      header: 'Hanga (ETB)',
      render: (val) => <span className="font-black text-gold-400 text-sm">{val?.toLocaleString()} ETB</span>
    },
    {
      key: 'paymentMethod',
      header: 'Mala Kaffaltii',
      render: (val, row) => (
        <div>
          <span className="text-slate-300 font-semibold">{val}</span>
          {row.transactionRef && (
            <div className="text-[10px] font-mono text-slate-400">Ref: {row.transactionRef}</div>
          )}
        </div>
      )
    },
    {
      key: 'paymentDate',
      header: 'Guyyaa',
      render: (val, row) => (
        <span className="text-slate-700 text-[11px] font-medium">
          {formatDual(val || row.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Gocha',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Printer}
          onClick={() => setActiveReceipt(row)}
        >
          Nagahee
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-8 text-slate-900">
      {/* Top Banner via PageHeader */}
      <PageHeader
        icon={Coins}
        eyebrow="Kutaa Faayinaansii & Buusii (Finance & Collector)"
        title="Buusii, Asraatii fi Gumaacha Waldichaa"
        subtitle="Kaffaltiiwwan miseensotaa to'achuu, mirkaneessuu, galmeessuu, fi nagahee seera-qabeessa (Digital Receipt) kennuu."
        actions={
          <div className="flex items-center space-x-2">
            <Button
              data-tour="collector-add-btn"
              variant="primary"
              size="md"
              icon={PlusCircle}
              onClick={() => {
                setShowAddModal(true);
                setModalBackendError('');
                setFormErrors({});
              }}
            >
              Kaffaltii Haaraa Galmeessi
            </Button>
          </div>
        }
      />

      {/* Alert Toasts */}
      <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />
      <Toast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />

      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          icon={TrendingUp}
          label="Ida'ama Qarshii Walitti Qabame"
          value={stats ? `${stats.totalRevenue.toLocaleString()} ETB` : '0 ETB'}
          goldValue
          subtext="Buusii fi Gumaacha hunda"
        />

        <StatCard
          icon={Clock}
          label="Mirkaneessa Kan Eeggatan"
          value={pendingContributions.length}
          goldValue={pendingContributions.length > 0}
          trend={pendingContributions.length > 0 ? `${pendingContributions.length} Haaraa` : 'Xumurameera'}
          subtext="Pending Approvals"
        />

        <StatCard
          icon={Receipt}
          label="Baay'ina Nagahee (Receipts)"
          value={stats ? stats.count : contributions.length}
          subtext="Nagahee kaffaltii qophaa'e"
        />

        <StatCard
          icon={Church}
          label="Asraatii & Arjoomina"
          value={
            stats
              ? `${((stats.byType?.TITHE || 0) + (stats.byType?.DONATION || 0)).toLocaleString()} ETB`
              : '0 ETB'
          }
          goldValue
          subtext="Asraatii fi deggersa addaa"
        />
      </div>

      {/* Monthly Report Grouped by Ethiopian Month */}
      {stats?.byEthMonth && Object.keys(stats.byEthMonth).length > 0 && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-royal flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-500" />
              <span>Gabaasa Buusii Ji'oota Itoophiyaa (Ethiopian Calendar Monthly Report)</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">Buusii Qulqulluu (Approved)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(stats.byEthMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 6)
              .map(([key, total]) => {
                const [year, monthNum] = key.split('-');
                const monthObj = SAFE_ETH_MONTHS.find((m) => m.id === parseInt(monthNum, 10));
                const monthName = monthObj ? (monthObj.om?.name || monthObj.en) : `Month ${monthNum}`;
                return (
                  <div key={key} className="p-3 rounded-xl bg-royal-tint/60 border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-700 truncate">{monthName} {year}</div>
                    <div className="text-[10px] text-slate-400 font-mono mb-1">{monthObj?.am || ''}</div>
                    <div className="text-xs font-black text-gold-600">{Number(total).toLocaleString()} ETB</div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Tabs Switcher: Records vs Pending Approvals */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'records'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-royal-tint'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Kaffaltiiwwan Galmaa'an ({contributions.length})</span>
        </button>

        <button
          data-tour="collector-pending-tab"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'pending'
              ? 'bg-royal text-white shadow-md'
              : 'text-slate-600 hover:text-royal hover:bg-royal-tint'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Kaffaltii Eeggatan (Pending Approvals)</span>
          {pendingContributions.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'pending'
                  ? 'bg-gold-500 text-royal'
                  : 'bg-gold-500 text-royal animate-pulse'
              }`}
            >
              {pendingContributions.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: RECORDS TABLE */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <Card className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 sm:p-6">
            <form noValidate onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <FormField
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Maqaa, Bilbila, ykn Nagaheen barbaadi..."
              />
            </form>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Origin Church Filter */}
              <div className="flex items-center space-x-2">
                <Church className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <select
                  value={churchFilter}
                  onChange={(e) => setChurchFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                >
                  <option value="ALL">Waldaa Hundumaa (All Churches)</option>
                  {churchOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                >
                  <option value="ALL">Gosa Hundumaa (All Types)</option>
                  <option value="MONTHLY">Buusii Ji'aa (Monthly)</option>
                  <option value="TITHE">Asraatii (Tithe)</option>
                  <option value="DONATION">Arjoomina (Donation)</option>
                  <option value="SPECIAL_OFFERING">Gumaacha Addaa</option>
                </select>
              </div>

              {/* Ethiopian Month + Year Quick Selector */}
              <div className="flex items-center space-x-1.5 bg-royal-tint/40 p-1 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-royal px-1">🇪🇹 EC:</span>
                <select
                  value={ethMonthFilter}
                  onChange={(e) => setEthMonthFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-royal"
                >
                  <option value="">Ji'a (All)</option>
                  {SAFE_ETH_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.om?.name || m.en} ({m.am})
                    </option>
                  ))}
                </select>
                <select
                  value={ethYearFilter}
                  onChange={(e) => setEthYearFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-royal"
                >
                  <option value="">Waggaa (All)</option>
                  {[2016, 2017, 2018, 2019, 2020].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Picker */}
              <div className="w-full sm:w-auto">
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={(r) => setDateRange(r)}
                  onClear={() => setDateRange({ startDate: '', endDate: '' })}
                />
              </div>
            </div>
          </Card>

          {/* Contributions Table via DataTable */}
          <DataTable
            title={`Tarree Kaffaltiiwwan Galmaa'anii (${contributions.length})`}
            subtitle="Kaffaltiiwwan mirkanaa'an fi seera-qabeeyyii"
            columns={columns}
            data={contributions}
            loading={loading}
            emptyTitle="Galmeen kaffaltii hin argamne"
            emptyDescription="Galmeen kaffaltii filannoo kanaaf hin argamne."
          />
        </div>
      )}

      {/* VIEW 2: PENDING APPROVALS TAB */}
      {activeTab === 'pending' && (
        <Card className="shadow-md border border-slate-200 space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-royal flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold-500" />
                <span>Kaffaltii Mirkaneessa Eeggatan ({pendingContributions.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Miseensonni karaa Telebirr/Baankii kaffaltii dhiyeessanii ragaa qoradhaa mirkaneessaa.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchData}
            >
              Haaromsi
            </Button>
          </div>

          {pendingContributions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-royal-tint border border-slate-200 flex items-center justify-center text-gold-500">
                <CheckCircle2 className="w-8 h-8 text-gold-500" />
              </div>
              <h3 className="text-base font-black text-royal">Kaffaltiin eeggatu hin jiru</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kaffaltiiwwan miseensota irraa dhiyaatan hundi mirkanaa'aniiru ykn hin dhiyaanne.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Stacked Cards (< 640px) */}
              <div className="sm:hidden space-y-3">
                {pendingContributions.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {item.member?.fullName || 'Miseensa'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.member?.address?.phone || item.member?.phone || 'N/A'}
                        </div>
                      </div>
                      <Badge variant="muted" size="sm">{item.type}</Badge>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-royal font-mono">
                        {item.amount?.toLocaleString()} <span className="text-xs font-bold text-slate-500">ETB</span>
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        {item.originChurch || item.member?.originChurch || 'Waldaa'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mala Kaffaltii</span>
                        <span className="font-semibold text-slate-800">{item.paymentMethod}</span>
                        {item.transactionRef && (
                          <div className="text-[10px] font-mono text-royal bg-royal-tint px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5 truncate max-w-full">
                            Ref: {item.transactionRef}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Guyyaa</span>
                        <span className="font-medium text-slate-700">
                          {formatDual(item.paymentDate || item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl">
                        "{item.notes}"
                      </p>
                    )}

                    {item.proofUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(item.proofUrl)}
                        className="w-full py-2 px-3 rounded-xl bg-royal-tint text-royal text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-royal-tint/80 transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-gold-600" />
                        <span>Suuraa Nagahee Ilaali</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={reviewingId === item._id}
                        onClick={() => handleApprovePayment(item)}
                        className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-royal font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm disabled:opacity-50"
                      >
                        {reviewingId === item._id ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Mirkaneessi</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={reviewingId === item._id}
                        onClick={() => handleOpenRejectDialog(item)}
                        className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                      >
                        <X className="w-4 h-4" />
                        <span>Didi (Reject)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/Tablet Table (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-royal-tint text-[11px] font-bold uppercase text-royal border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Miseensa</th>
                      <th className="py-3 px-3">Gosa & Waldaa</th>
                      <th className="py-3 px-3">Hanga (ETB)</th>
                      <th className="py-3 px-3">Mala & Lakk. Dabarsaa</th>
                      <th className="py-3 px-3">Guyyaa</th>
                      <th className="py-3 px-3 text-center">Suuraa Nagahee</th>
                      <th className="py-3 px-3 text-right">Gocha (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingContributions.map((item) => (
                      <tr key={item._id} className="hover:bg-royal-tint/40 transition-colors">
                        {/* Member */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {item.member?.fullName || 'Miseensa'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {item.member?.address?.phone || item.member?.phone || 'N/A'}
                          </div>
                        </td>

                        {/* Type & Church */}
                        <td className="py-3 px-3">
                          <Badge variant="muted" size="sm">{item.type}</Badge>
                          <div className="text-[10px] text-slate-600 mt-0.5 font-medium">
                            {item.originChurch || item.member?.originChurch || 'Waldaa'}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 font-black text-sm text-royal font-mono">
                          {item.amount?.toLocaleString()} ETB
                        </td>

                        {/* Method & Reference */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.paymentMethod}</div>
                          {item.transactionRef ? (
                            <div className="text-[10px] font-mono text-royal bg-royal-tint px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                              Ref: {item.transactionRef}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No ref</span>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{item.notes}</p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-slate-700 text-[11px] font-medium">
                          {formatDual(item.paymentDate || item.createdAt)}
                        </td>

                        {/* Screenshot thumbnail */}
                        <td className="py-3 px-3 text-center">
                          {item.proofUrl ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(item.proofUrl)}
                              className="group relative inline-block rounded-xl overflow-hidden border border-slate-200 hover:border-gold-400 transition-all shadow-sm"
                              title="Suuraa guutuu ilaaluuf cuqaasaa"
                            >
                              <img
                                src={item.proofUrl}
                                alt="Payment proof thumbnail"
                                className="w-12 h-12 object-cover"
                              />
                              <div className="absolute inset-0 bg-royal/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Suuraan hin jiru</span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              disabled={reviewingId === item._id}
                              onClick={() => handleApprovePayment(item)}
                              className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-royal font-black text-xs flex items-center space-x-1 transition-all shadow-sm disabled:opacity-50"
                            >
                              {reviewingId === item._id ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mirkaneessi</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={reviewingId === item._id}
                              onClick={() => handleOpenRejectDialog(item)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center space-x-1 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Didi</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* MODAL 1: RECORD NEW CONTRIBUTION (Collector Form) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Kaffaltii Haaraa Galmeessi"
        icon={Coins}
        maxWidth="max-w-2xl"
      >
        <form noValidate onSubmit={handleAddContribution} className="space-y-5">
          {/* Backend Error Alert if any */}
          {modalBackendError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{modalBackendError}</span>
            </div>
          )}

          {/* 1. Member Combobox & Origin Church (Auto-fill + Toggle) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Searchable Member Combobox */}
            <div className="relative" ref={comboboxRef}>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Miseensa Filadhu (Member) <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Maqaa ykn Bilbilaan barbaadi..."
                  value={memberSearchText}
                  onFocus={() => setMemberDropdownOpen(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemberSearchText(val);
                    setMemberDropdownOpen(true);
                    // Clear memberId if text was manually modified and no longer matches selected
                    if (selectedMember && val !== selectedMember.fullName) {
                      setSelectedMember(null);
                      setFormData((prev) => ({ ...prev, memberId: '' }));
                    }
                  }}
                  className={`w-full bg-white border ${
                    formErrors.memberId ? 'border-red-500' : 'border-slate-200'
                  } rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal`}
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />

                {selectedMember && (
                  <button
                    type="button"
                    onClick={handleClearSelectedMember}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {formErrors.memberId && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.memberId}</p>
              )}

              {/* Combobox Dropdown List */}
              {memberDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Miseensi hin argamne (No matching member found)
                    </div>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className={`w-full text-left p-2.5 hover:bg-royal-tint transition-colors flex items-center justify-between text-xs ${
                          formData.memberId === m._id ? 'bg-royal-tint text-royal font-bold' : 'text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{m.fullName}</span>
                            {m.role && m.role !== 'MEMBER' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-royal-tint text-royal border border-slate-200">
                                {m.role}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {m.address?.phone || m.phone || 'No phone'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-600 truncate">
                              <Church className="w-2.5 h-2.5 text-slate-400" />
                              {m.originChurch || 'Waldaa'}
                            </span>
                          </div>
                        </div>
                        {formData.memberId === m._id && (
                          <Check className="w-4 h-4 text-royal shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Auto-filled Origin Church with Edit Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Waldaa Irraa Dhufe (Filannoo / Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setIsChurchEditable(!isChurchEditable)}
                  className="text-[11px] text-royal hover:underline font-semibold flex items-center gap-1 transition-colors"
                >
                  {isChurchEditable ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>Banaadha</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Sirreessi</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                readOnly={!isChurchEditable}
                value={formData.originChurch}
                onChange={(e) => setFormData({ ...formData, originChurch: e.target.value })}
                placeholder="Waldaa miseensichaa"
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors ${
                  !isChurchEditable
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-royal text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/30'
                }`}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {isChurchEditable ? 'Goolabuuf deebi\'aa cufaa' : 'Miseensa filatame irraa ofumaan guutama'}
              </p>
            </div>
          </div>

          {/* 2. Contribution Type, Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gosa Kaffaltii (Type) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
              >
                {CONTRIBUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hanga Qarshii (ETB) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder="fkn. 500"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value });
                  if (formErrors.amount) setFormErrors({ ...formErrors, amount: undefined });
                }}
                className={`w-full bg-white border ${
                  formErrors.amount ? 'border-red-500' : 'border-slate-200'
                } rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal`}
              />
              {formErrors.amount && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{formErrors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Guyyaa Kaffaltii <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={formData.paymentDate}
                onChange={(val) => setFormData({ ...formData, paymentDate: val })}
                max={getAddisToday()}
                dateOnly={true}
                required
              />
            </div>
          </div>

          {/* 3. Payment Method: 4 Selectable Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mala Kaffaltii (Payment Method) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = formData.paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, paymentMethod: method.id });
                      if (formErrors.nonCash) setFormErrors({ ...formErrors, nonCash: undefined });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-royal bg-royal-tint text-royal ring-2 ring-royal/30 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-royal/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-royal' : 'text-slate-500'}`} />
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-royal" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">{method.label}</div>
                      <div className="text-[9px] text-slate-500 truncate">{method.sublabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Non-Cash Fields: Transaction Reference + Screenshot Upload (Hidden for Cash) */}
          {formData.paymentMethod !== 'CASH' && (
            <div className="p-3.5 rounded-xl bg-royal-tint/60 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-royal uppercase tracking-wider">
                  Ragaa Kaffaltii Baankii / Telebirr
                </span>
                <span className="text-[10px] text-slate-500 italic">
                  Reference ykn Screenshot galchaa
                </span>
              </div>

              {formErrors.nonCash && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-600">
                  {formErrors.nonCash}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Transaction Reference Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lakk. Dabarsaa (Transaction Reference)
                  </label>
                  <input
                    type="text"
                    placeholder="fkn. TB2489X... / FT2409..."
                    value={formData.transactionRef}
                    onChange={(e) => {
                      setFormData({ ...formData, transactionRef: e.target.value });
                      if (formErrors.nonCash) setFormErrors({ ...formErrors, nonCash: undefined });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Suuraa Nagahee (Screenshot Upload)
                  </label>

                  {!proofPreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-gold-400 rounded-xl p-2.5 flex items-center justify-center cursor-pointer bg-white transition-colors gap-2"
                    >
                      <Upload className="w-4 h-4 text-gold-500" />
                      <span className="text-xs text-slate-600">Suuraa filadhaa (Max 5MB)</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleProofFileChange}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gold-400/50 bg-white p-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img
                          src={proofPreview}
                          alt="Screenshot preview"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer"
                          onClick={() => setLightboxUrl(proofPreview)}
                        />
                        <div className="text-[11px]">
                          <p className="font-bold text-slate-900 truncate max-w-[120px]">
                            {proofFile?.name || 'Screenshot'}
                          </p>
                          <p className="text-[10px] text-royal font-bold">
                            {(proofFile?.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeProof}
                        className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        title="Haqi"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {formErrors.proof && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">{formErrors.proof}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Yaada / Ibsa Dabalataa (Optional Notes)
            </label>
            <input
              type="text"
              placeholder="Ibsa kaffaltii (optional)..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
            />
          </div>

          {/* Sticky Modal Footer (Cancel + Save Buttons) */}
          <div className="sticky bottom-0 bg-white -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 border-t border-slate-200 flex items-center justify-end space-x-3 z-10">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setShowAddModal(false)}
            >
              Dhiisi (Cancel)
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={submitting}
              icon={Check}
            >
              Galmeessi & Nagahee Uumi
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: REJECTION REASON DIALOG */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Kaffaltii Didi (Reject Payment)"
        icon={MessageSquareWarning}
        maxWidth="max-w-md"
      >
        <form noValidate onSubmit={handleConfirmReject} className="space-y-4">
          <p className="text-xs text-slate-600">
            Sababa kaffaltiin qarshii <strong className="text-royal font-black">{rejectionTarget?.amount} ETB</strong> kaffalaa{' '}
            <strong className="text-slate-900">{rejectionTarget?.member?.fullName}</strong> itti hin fudhatamne galchaa.
            Miseensichi beeksisa kana battalumatti argata.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Sababa Didameef (Reason) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="3"
              required
              placeholder="fkn. Lakk. Dabarsaa (Reference) sirrii miti, ykn qarshiin herrega keenya hin geenye..."
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectionError) setRejectionError('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
            />
            {rejectionError && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{rejectionError}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Dhiisi
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={reviewLoading}
              disabled={reviewLoading}
              icon={X}
            >
              Kaffaltii Didi (Confirm Rejection)
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lightbox Modal for Proof Screenshot */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 border border-slate-200 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2 border-b border-slate-200">
              <span className="text-xs font-bold text-royal">Ragaa Kaffaltii (Screenshot Proof)</span>
              <button
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto max-h-[75vh]">
              <img
                src={lightboxUrl}
                alt="Payment proof"
                className="max-h-[70vh] rounded-xl object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DIGITAL PRINTABLE RECEIPT (NAGAHEE) */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in print:static print:p-0 print:bg-transparent">
          <div className="w-full max-w-xl rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200 print:static print:overflow-visible print:shadow-none print:max-w-none print:border-none">
            {/* Header Actions (Not printed) */}
            <div className="no-print print:hidden p-4 bg-royal text-white flex items-center justify-between border-b border-royal-dark">
              <span className="text-xs font-bold text-gold-300">
                Nagahee Kaffaltii Seera-Qabeessa (Official Digital Receipt)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={handlePrintReceipt}
                >
                  Maxxansi (Print)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveReceipt(null)}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div className="print-area p-8 sm:p-10 space-y-6 bg-white text-slate-900" id="printable-receipt">
              {/* Church Branding Header */}
              <div className="flex items-center justify-between pb-6 border-b-2 border-gold-500/80">
                <div className="flex items-center space-x-4">
                  <img
                    src="/logo-walda.jpg"
                    alt="Logo"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gold-500 shadow-md"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div>
                    <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-950 uppercase leading-snug">
                      Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii
                    </h2>
                    <p className="text-[11px] font-bold text-slate-600">
                      የቅዱስ ጊዮርጊስ የክብር ማኅበር • St. George Association
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-gold-50 text-gold-900 border border-gold-400">
                      Nagahee Galii Waldichaa (Official Cash Receipt)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                    Lakk. Nagahee
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-gold-600">
                    {activeReceipt.receiptNumber || '—'}
                  </span>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Kaffalaa (Member Name):
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {activeReceipt.member?.fullName || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Guyyaa (Date):
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {formatDual(activeReceipt.paymentDate || activeReceipt.createdAt, { includeTime: true })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Waldaa Irraa Dhufe (Origin Church):
                  </span>
                  <span className="text-xs font-bold text-gold-900">
                    {activeReceipt.originChurch || activeReceipt.member?.originChurch || 'St. George Fellowship'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Lakkoofsa Bilbilaa:
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {activeReceipt.member?.address?.phone || activeReceipt.member?.phone || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Gosa Kaffaltii (Category):
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">
                    {activeReceipt.type}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Mala Kaffaltii (Method):
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {activeReceipt.paymentMethod}
                    {activeReceipt.transactionRef ? ` (${activeReceipt.transactionRef})` : ''}
                  </span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-gold-500 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-black block">
                    Hanga Qarshii Kaffalame (Amount Paid)
                  </span>
                  <span className="text-xs text-slate-500 italic">
                    {activeReceipt.notes ? `Ibsa: ${activeReceipt.notes}` : "Kaffaltiin qulqulluun galmaa'eera"}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gold-600">
                  {activeReceipt.amount?.toLocaleString()} ETB
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Funaanaa / Mirkaneessaa (Authorized Reviewer):
                  </span>
                  <span className="font-extrabold text-slate-900 block mt-0.5">
                    {activeReceipt.collector?.fullName || activeReceipt.reviewedBy?.fullName || user?.fullName || 'Collector'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Gahee: {activeReceipt.collector?.role || user?.role || 'Staff'}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <ChurchStamp
                    size={100}
                    date={activeReceipt.paymentDate || activeReceipt.createdAt}
                    className="-rotate-6"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold">
                    Chaappaa & Mallattoo Waldichaa
                  </span>
                </div>
              </div>

              {/* Footer Note */}
              <p className="text-[9px] text-center text-slate-400 border-t border-slate-100 pt-3">
                Waaqayyo buusii fi gumaacha keessan haa eebbisu! • Waldaa Angafa Wareegamtoota Qulquluu Giyoorgisii
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorDash;
