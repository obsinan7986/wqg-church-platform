import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import {
  Coins,
  Send,
  Printer,
  Smartphone,
  Building2,
  CreditCard,
  Banknote,
  Upload,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  FileText,
  Church,
  Calendar,
  RefreshCw,
  ArrowRight,
  Copy,
  Check,
  Plus,
  Settings,
  Trash2
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  PageHeader,
  Modal,
  Toast,
  FormField,
  Spinner,
  DatePicker
} from '../../components/ui';
import ChurchStamp from '../../components/ChurchStamp';
import { formatDual, getAddisToday } from '../../utils/dateFormat';

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
    sublabel: 'Dabarsa Baankii (CBE/Awash/OIB)',
    icon: CreditCard
  },
  {
    id: 'CASH',
    label: 'Cash (Harkaaniin)',
    sublabel: 'Qarshii callaa funaanaatti',
    icon: Banknote
  }
];

const CONTRIBUTION_TYPES = [
  { value: 'MONTHLY', label: "Buusii Ji'aa (Monthly Contribution)" },
  { value: 'TITHE', label: 'Asraatii / Kudhanirraa Tokko (Tithe)' },
  { value: 'DONATION', label: 'Arjoomina Waldichaa (Donation)' },
  { value: 'SPECIAL_OFFERING', label: 'Gumaacha Addaa (Special Offering)' }
];

const MemberPaymentDash = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'submit'
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Submit Form state
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'MONTHLY',
    amount: '',
    paymentMethod: 'TELEBIRR',
    transactionRef: '',
    notes: '',
    transactionDate: getAddisToday()
  });
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const fileInputRef = useRef(null);

  // Digital Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Lightbox for proof preview in member history
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Where to pay: Payment Accounts state
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    method: 'TELEBIRR',
    accountName: '',
    accountNumber: '',
    bankName: '',
    instructions: ''
  });
  const [savingAccount, setSavingAccount] = useState(false);

  // Fetch Member's Payments
  const fetchMyPayments = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/contributions/my');
      if (res.data?.success) {
        setPayments(res.data.contributions || []);
      }
    } catch (err) {
      console.error('[fetchMyPayments Error]:', err);
      setErrorMsg("Kaffaltiiwwan fiduun hin danda'amne (Failed to load payments)");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Payment Accounts ("Where to Pay")
  const fetchPaymentAccounts = async () => {
    try {
      const res = await api.get('/contributions/payment-accounts');
      if (res.data?.success) {
        setPaymentAccounts(res.data.accounts || []);
      }
    } catch (err) {
      console.warn('[fetchPaymentAccounts Error]:', err.message);
    }
  };

  useEffect(() => {
    fetchMyPayments();
    fetchPaymentAccounts();
  }, []);

  const handleCopyAccount = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateOrUpdateAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.accountName || !accountForm.accountNumber) return;
    try {
      setSavingAccount(true);
      await api.post('/contributions/payment-accounts', accountForm);
      setSuccessMsg("Akkaawuntiin kaffaltii milkaa'inaan dabalameera!");
      setAccountForm({
        method: 'TELEBIRR',
        accountName: '',
        accountNumber: '',
        bankName: '',
        instructions: ''
      });
      fetchPaymentAccounts();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Akkaawuntii dabaluun hin danda'amne");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    try {
      await api.delete(`/contributions/payment-accounts/${id}`);
      setSuccessMsg("Akkaawuntiin kaffaltii haqameera!");
      fetchPaymentAccounts();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Haqamuun hin danda'amne");
    }
  };

  // Real-time socket listener for instant approval/rejection updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      setPayments((prev) =>
        prev.map((p) => {
          if (p._id === data.contributionId) {
            return {
              ...p,
              status: data.status,
              receiptNumber: data.receiptNumber || p.receiptNumber,
              rejectionReason: data.rejectionReason || p.rejectionReason,
              ...(data.contribution || {})
            };
          }
          return p;
        })
      );

      if (data.status === 'PAID') {
        setSuccessMsg(`Kaffaltiin keessan ${data.receiptNumber ? `(Lakk. ${data.receiptNumber})` : ''} mirkanaa'eera!`);
      } else if (data.status === 'REJECTED') {
        setErrorMsg(`Kaffaltiin keessan hin fudhatamne. Sababa: ${data.rejectionReason || 'Ibsi hin jiru'}`);
      }
    };

    socket.on('payment_status_updated', handleStatusUpdate);

    return () => {
      socket.off('payment_status_updated', handleStatusUpdate);
    };
  }, [socket]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (proofPreview) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        proof: 'Suuraa qofa (JPG, PNG, WebP) fe\'uu dandeessu.'
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        proof: 'Hangi suuraa 5MB caaluu hin danda\'u.'
      }));
      return;
    }

    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }

    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setFormErrors((prev) => ({ ...prev, proof: undefined, nonCash: undefined }));
  };

  const removeProof = () => {
    if (proofPreview) {
      URL.revokeObjectURL(proofPreview);
    }
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const errors = {};

    const amountNum = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amountNum) || amountNum <= 0) {
      errors.amount = 'Hanga qarshii sirrii galchaa (Positive number required).';
    }

    // Screenshot is required for non-cash payments
    if (formData.paymentMethod !== 'CASH') {
      if (!proofFile && !formData.transactionRef.trim()) {
        errors.nonCash = 'Kaffaltii digitaliif Lakk. Dabarsaa (Reference) ykn Suuraa Nagahee (Screenshot) dhiyeessuun dirqama.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const submitData = new FormData();
      submitData.append('type', formData.type);
      submitData.append('amount', formData.amount);
      submitData.append('paymentMethod', formData.paymentMethod);
      submitData.append('transactionDate', formData.transactionDate || getAddisToday());
      if (formData.transactionRef.trim()) {
        submitData.append('transactionRef', formData.transactionRef.trim());
      }
      if (formData.notes.trim()) {
        submitData.append('notes', formData.notes.trim());
      }
      if (proofFile) {
        submitData.append('proof', proofFile);
      }

      const res = await api.post('/contributions/submit', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        setSuccessMsg("Kaffaltiin keessan milkaa'inaan dhiyaateera! Funaanaan yeroo mirkaneessu beeksifamtu.");
        setFormData({
          type: 'MONTHLY',
          amount: '',
          paymentMethod: 'TELEBIRR',
          transactionRef: '',
          notes: '',
          transactionDate: getAddisToday()
        });
        removeProof();
        fetchMyPayments();
        setActiveTab('list');
      }
    } catch (err) {
      console.error('[Submit Payment Error]:', err);
      const message = err.response?.data?.message || "Kaffaltii dhiyeessuun hin danda'amne. Irra deebi'aa yaalaa.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const renderStatusBadge = (status, rejectionReason) => {
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-royal text-white shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-gold-400" />
          Mirkanaa'eera (Approved)
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
            Hin Fudhatamne (Rejected)
          </span>
          {rejectionReason && (
            <span className="text-[11px] text-red-700 font-medium bg-red-50/60 px-2 py-0.5 rounded border border-red-200 max-w-xs">
              Sababa: {rejectionReason}
            </span>
          )}
        </div>
      );
    }
    // Default PENDING: gold outline
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border-2 border-gold-500 text-gold-600 bg-gold-50">
        <Clock className="w-3.5 h-3.5 mr-1 animate-pulse text-gold-600" />
        Eeggachaa Jira (Pending)
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Page Header */}
      <PageHeader
        icon={Coins}
        eyebrow="Kutaa Kaffaltii & Buusii (Member Payments)"
        title="Kaffaltiiwwan Koo & Buusii Raawwadhu"
        subtitle="Kaffaltii haaraa dhiyeessuu, haala kaffaltii hordofuu, fi nagahee seera-qabeessa buufachuu."
        actions={
          <div data-tour="payment-tabs" className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Button
              variant={activeTab === 'list' ? 'primary' : 'outline'}
              size="sm"
              icon={FileText}
              onClick={() => setActiveTab('list')}
            >
              Kaffaltiiwwan Koo ({payments.length})
            </Button>
            <Button
              variant={activeTab === 'submit' ? 'primary' : 'outline'}
              size="sm"
              icon={Send}
              onClick={() => setActiveTab('submit')}
            >
              Kaffaltii Haaraa Raawwadhu
            </Button>
          </div>
        }
      />

      {/* Alert Toasts */}
      {successMsg && <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />}
      {errorMsg && <Toast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />}

      {/* Tab 1: Submit Payment Form */}
      {activeTab === 'submit' && (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-royal flex items-center gap-2">
              <Coins className="w-5 h-5 text-gold-600" />
              <span>Unka Kaffaltii Dhiyeessuu (Payment Submission Form)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gosa buusii fi mala kaffaltii filachuun kaffaltii keessan dhiyeessaa. Funaanaan yeroo mirkaneessu nagaheen isiniif kennama.
            </p>
          </div>

          {/* Where to Pay Section */}
          <div className="rounded-2xl p-4 sm:p-5 bg-royal-tint border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2 text-royal font-bold text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-gold-600" />
                <span>Bakka Kaffaltii (Where to Pay - Official Church Accounts)</span>
              </div>
              {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Settings}
                  onClick={() => setManageAccountsOpen(true)}
                >
                  Akkaawuntiiwwan Sirreessi
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paymentAccounts.filter((a) => a.active).map((acc) => {
                const isCopied = copiedId === acc._id;
                return (
                  <div
                    key={acc._id}
                    className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-2 hover:border-gold-500 transition-colors shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="gold" size="sm">{acc.method}</Badge>
                      {acc.bankName && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{acc.bankName}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-600 font-medium truncate">{acc.accountName}</p>
                      <p className="text-sm font-mono font-black text-royal tracking-wider">{acc.accountNumber}</p>
                      {acc.instructions && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{acc.instructions}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(acc._id, acc.accountNumber)}
                      className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-royal hover:bg-royal-dark text-white shadow-xs'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-gold-400" />}
                      <span>{isCopied ? 'Kopiyameera!' : 'Lakk. Kopiisi'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Contribution Type, Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Gosa Kaffaltii (Contribution Type) <span className="text-gold-600 font-bold">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-[16px] sm:text-xs text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                >
                  {CONTRIBUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Hanga Qarshii (Amount in ETB) <span className="text-gold-600 font-bold">*</span>
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
                    formErrors.amount ? 'border-red-500' : 'border-slate-300'
                  } rounded-xl px-3.5 py-2.5 text-[16px] sm:text-sm text-slate-900 font-mono min-h-[44px] focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal`}
                />
                {formErrors.amount && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Guyyaa Kaffaltii (Transaction Date) <span className="text-gold-600 font-bold">*</span>
                </label>
                <DatePicker
                  value={formData.transactionDate}
                  onChange={(val) => setFormData({ ...formData, transactionDate: val })}
                  max={getAddisToday()}
                  dateOnly={true}
                  required
                />
              </div>
            </div>

            {/* 2. Payment Method Selector Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Mala Kaffaltii Filadhaa (Select Payment Method) <span className="text-gold-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-royal bg-royal-tint/60 text-royal ring-2 ring-royal/30 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-royal-tint/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-royal' : 'text-slate-400'}`} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-gold-500" />}
                      </div>
                      <div>
                        <div className="text-xs font-black leading-tight text-slate-900">{method.label}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{method.sublabel}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Non-Cash Method Fields (Reference + Screenshot) */}
            {formData.paymentMethod !== 'CASH' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-royal-tint/40 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-royal uppercase tracking-wider">
                    Ragaa Kaffaltii (Payment Verification)
                  </span>
                  <span className="text-[11px] text-slate-500 italic">
                    Lakk. Dabarsaa ykn Suuraa Nagahee guutaa
                  </span>
                </div>

                {formErrors.nonCash && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {formErrors.nonCash}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Transaction Reference Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Lakk. Dabarsaa (Transaction Reference)
                    </label>
                    <input
                      type="text"
                      placeholder="fkn. TB24089912... ykn FT2409..."
                      value={formData.transactionRef}
                      onChange={(e) => {
                        setFormData({ ...formData, transactionRef: e.target.value });
                        if (formErrors.nonCash) setFormErrors({ ...formErrors, nonCash: undefined });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Lakkoofsa kaffaltii Telebirr / CBE irraa isiniif dhufe.
                    </p>
                  </div>

                  {/* Payment Screenshot Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Suuraa Nagahee Kaffaltii (Screenshot Upload)
                    </label>

                    {!proofPreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-royal rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors"
                      >
                        <Upload className="w-5 h-5 text-gold-600 mb-1" />
                        <span className="text-xs text-slate-700 font-semibold">Suuraa filachuuf cuqaasaa</span>
                        <span className="text-[10px] text-slate-500">JPG, PNG, WebP (Max 5 MB)</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex items-center justify-between shadow-xs">
                        <div className="flex items-center space-x-3">
                          <img
                            src={proofPreview}
                            alt="Screenshot preview"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer"
                            onClick={() => setLightboxUrl(proofPreview)}
                          />
                          <div className="text-xs">
                            <p className="font-bold text-slate-900 truncate max-w-[150px]">
                              {proofFile?.name || 'Screenshot'}
                            </p>
                            <p className="text-[10px] text-royal font-bold">
                              {(proofFile?.size / 1024).toFixed(0)} KB • Filatameera
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeProof}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          title="Haqi (Remove)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {formErrors.proof && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.proof}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Notes (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Yaada / Ibsa Dabalataa (Optional Notes)
              </label>
              <textarea
                rows="2"
                placeholder="Ibsa kaffaltii (optional)..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setActiveTab('list');
                  setFormErrors({});
                }}
              >
                Dhiisi (Cancel)
              </Button>
              <Button
                data-tour="payment-submit-btn"
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                disabled={submitting}
                icon={Send}
              >
                Kaffaltii Dhiyeessi (Submit Payment)
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: My Payments List */}
      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-royal flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold-600" />
                <span>Kaffaltiiwwan Koo (My Payments History)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kaffaltiiwwan duraan raawwattan, haala isaanii, fi nagahee seera-qabeessa.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={fetchMyPayments}
              >
                Haaromsi
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={() => setActiveTab('submit')}
              >
                Kaffaltii Haaraa
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Spinner size="lg" variant="royal" />
              <p className="text-xs font-semibold">Galmee kaffaltii fidaa jira...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-royal-tint border border-slate-200 flex items-center justify-center text-gold-600">
                <Coins className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-royal">Kaffaltiin galmaa'e hin jiru</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hanga ammaatti kaffaltii tokkollee hin raawwanne. Kaffaltii buusii ji'aa ykn arjoominaa dhiyeessuuf button armaan gadii cuqaasaa.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                icon={Send}
                onClick={() => setActiveTab('submit')}
              >
                Kaffaltii Jalqabaa Dhiyeessi
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Stacked Cards (< 640px) */}
              <div className="sm:hidden space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment._id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="font-mono text-xs font-bold text-royal">
                        {payment.receiptNumber || 'Lakk. Eeggachaa jira'}
                      </div>
                      <div>
                        {renderStatusBadge(payment.status, payment.rejectionReason)}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-royal">
                        {payment.amount?.toLocaleString()} <span className="text-xs font-bold text-slate-500">ETB</span>
                      </span>
                      <span className="text-xs font-bold text-slate-800 bg-royal-tint/60 px-2.5 py-1 rounded-lg">
                        {payment.type}
                      </span>
                    </div>

                    {payment.notes && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl">
                        "{payment.notes}"
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mala Kaffaltii</span>
                        <span className="font-semibold text-slate-800">{payment.paymentMethod}</span>
                        {payment.transactionRef && (
                          <div className="text-[10px] font-mono text-slate-500 truncate">
                            Ref: {payment.transactionRef}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Guyyaa</span>
                        <span className="font-medium text-slate-700">
                          {formatDual(payment.paymentDate || payment.createdAt)}
                        </span>
                      </div>
                    </div>

                    {payment.proofUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(payment.proofUrl)}
                        className="w-full py-2 px-3 rounded-xl bg-royal-tint text-royal text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-royal-tint/80 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-gold-600" />
                        <span>Suuraa Ragaa Kaffaltii Ilaali</span>
                      </button>
                    )}

                    {payment.status === 'PAID' && (
                      <Button
                        variant="outline"
                        size="md"
                        icon={Printer}
                        className="w-full min-h-[44px]"
                        onClick={() => setActiveReceipt(payment)}
                      >
                        Nagahee Maxxansi (Print Receipt)
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop/Tablet Table (>= 640px) */}
              <div data-tour="payment-table" className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-royal-tint text-[11px] font-bold uppercase text-royal border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Lakk. Nagahee</th>
                      <th className="py-3 px-3">Gosa Kaffaltii</th>
                      <th className="py-3 px-3">Hanga (ETB)</th>
                      <th className="py-3 px-3">Mala & Ragaa</th>
                      <th className="py-3 px-3">Guyyaa</th>
                      <th className="py-3 px-3">Haala (Status)</th>
                      <th className="py-3 px-3 text-right">Gocha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-royal-tint/30 transition-colors">
                        {/* Receipt number */}
                        <td className="py-3 px-3 font-mono font-bold text-royal">
                          {payment.receiptNumber || '—'}
                        </td>

                        {/* Contribution Type */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900">{payment.type}</span>
                          {payment.notes && (
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{payment.notes}</p>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 font-black text-sm text-royal">
                          {payment.amount?.toLocaleString()} ETB
                        </td>

                        {/* Method & Ref / Screenshot */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{payment.paymentMethod}</div>
                          {payment.transactionRef && (
                            <div className="text-[10px] font-mono text-slate-500">
                              Ref: {payment.transactionRef}
                            </div>
                          )}
                          {payment.proofUrl && (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(payment.proofUrl)}
                              className="mt-1 text-[10px] text-royal hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Eye className="w-3 h-3 text-gold-600" />
                              <span>Suuraa Ilaali</span>
                            </button>
                          )}
                        </td>

                        {/* Payment Date */}
                        <td className="py-3 px-3 text-slate-700 text-[11px] font-medium">
                          {formatDual(payment.paymentDate || payment.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {renderStatusBadge(payment.status, payment.rejectionReason)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 text-right">
                          {payment.status === 'PAID' ? (
                            <Button
                              data-tour="payment-receipt-btn"
                              variant="outline"
                              size="sm"
                              icon={Printer}
                              onClick={() => setActiveReceipt(payment)}
                            >
                              Nagahee Maxxansi
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {payment.status === 'PENDING' ? 'Eeggachaa jira' : 'Hin eeyyamamne'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lightbox Modal for Proof Screenshot */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 border border-slate-200 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2 border-b border-slate-100">
              <span className="text-xs font-bold text-royal">Ragaa Kaffaltii (Screenshot Proof)</span>
              <button
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto max-h-[75vh]">
              <img
                src={lightboxUrl}
                alt="Payment proof"
                className="max-h-[70vh] rounded-xl object-contain mx-auto border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Digital Printable Receipt Modal (Printed documents stay white/black, ChurchStamp ink = #DC2626 Red) */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in print:static print:p-0 print:bg-transparent">
          <div className="w-full max-w-xl rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200 print:static print:overflow-visible print:shadow-none print:max-w-none print:border-none">
            {/* Header Actions (Not printed) */}
            <div className="no-print print:hidden p-4 bg-royal text-white flex items-center justify-between border-b border-royal-dark">
              <span className="text-xs font-bold text-gold-400">
                Nagahee Kaffaltii Seera-Qabeessa (Official Digital Receipt)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="gold"
                  size="sm"
                  icon={Printer}
                  onClick={handlePrintReceipt}
                >
                  Maxxansi (Print)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-gold-300"
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
                    className="w-16 h-16 rounded-full object-cover border-2 border-gold-500 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div>
                    <h2 className="text-sm sm:text-base font-black tracking-tight text-royal uppercase leading-snug">
                      Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
                    </h2>
                    <p className="text-[11px] font-bold text-slate-600">
                      የቅዱስ ጊዮርጊስ የክብር ማኅበር • St. George Association
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-gold-50 text-royal border border-gold-400">
                      Nagahee Galii Waldichaa (Official Cash Receipt)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">
                    Lakk. Nagahee
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-royal">
                    {activeReceipt.receiptNumber}
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
                    {activeReceipt.member?.fullName || user?.fullName || 'N/A'}
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
                  <span className="text-xs font-bold text-royal">
                    {activeReceipt.originChurch || user?.originChurch || 'St. George Fellowship'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                    Lakkoofsa Bilbilaa:
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {activeReceipt.member?.address?.phone || user?.phone || 'N/A'}
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
              <div className="p-4 rounded-2xl bg-royal-tint/50 border-2 border-dashed border-gold-500 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-600 font-black block">
                    Hanga Qarshii Kaffalame (Amount Paid)
                  </span>
                  <span className="text-xs text-slate-500 italic">
                    {activeReceipt.notes ? `Ibsa: ${activeReceipt.notes}` : "Kaffaltiin qulqulluun galmaa'eera"}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-royal">
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
                    {activeReceipt.collector?.fullName || activeReceipt.reviewedBy?.fullName || 'Collector / Admin'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Gahee: {activeReceipt.collector?.role || 'Staff'}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <ChurchStamp
                    size={100}
                    date={activeReceipt.paymentDate || activeReceipt.createdAt}
                    className="-rotate-6"
                    colorClass="text-royal print:text-black"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold">
                    Chaappaa & Mallattoo Waldichaa
                  </span>
                </div>
              </div>

              {/* Footer Note */}
              <p className="text-[9px] text-center text-slate-400 border-t border-slate-100 pt-3">
                Waaqayyo buusii fi gumaacha keessan haa eebbisu! • Waldaa Angafa Wareegamtoota Qulqulluu Giyoorgisii
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Payment Accounts Management Modal */}
      <Modal
        isOpen={manageAccountsOpen}
        onClose={() => setManageAccountsOpen(false)}
        title="Akkaawuntiiwwan Kaffaltii Bulchi (Manage Payment Accounts)"
        icon={Settings}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Create new account form */}
          <form noValidate onSubmit={handleCreateOrUpdateAccount} className="p-4 rounded-2xl bg-royal-tint border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-royal uppercase tracking-wider">
              Akkaawuntii Haaraa Dabali (Add Payment Account)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Mala (Method)</label>
                <select
                  value={accountForm.method}
                  onChange={(e) => setAccountForm({ ...accountForm, method: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-royal"
                >
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CBE_BIRR">CBE Birr</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Maqaa Akkaawuntii</label>
                <input
                  type="text"
                  required
                  placeholder="fkn. Waldaa Qulqulluu Giyoorgisii"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Lakk. Akkaawuntii / Bilbila</label>
                <input
                  type="text"
                  required
                  placeholder="fkn. 1000123456789 ykn 0911..."
                  value={accountForm.accountNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Maqaa Baankii (Bank Name - Optional)</label>
                <input
                  type="text"
                  placeholder="fkn. Commercial Bank of Ethiopia"
                  value={accountForm.bankName}
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-royal"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">Qajeelfama / Ibsa (Instructions)</label>
              <input
                type="text"
                placeholder="fkn. Erga kaffaltanii booda screenshot dhiyeessaa"
                value={accountForm.instructions}
                onChange={(e) => setAccountForm({ ...accountForm, instructions: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-royal"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" loading={savingAccount} icon={Plus}>
                Akkaawuntii Galchi
              </Button>
            </div>
          </form>

          {/* List of existing accounts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-royal uppercase tracking-wider">
              Akkaawuntiiwwan Jiran ({paymentAccounts.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {paymentAccounts.map((acc) => (
                <div
                  key={acc._id}
                  className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs shadow-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <Badge variant="gold" size="sm">{acc.method}</Badge>
                      <span className="font-bold text-royal font-mono">{acc.accountNumber}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{acc.accountName} {acc.bankName ? `(${acc.bankName})` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc._id)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    title="Haqi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemberPaymentDash;