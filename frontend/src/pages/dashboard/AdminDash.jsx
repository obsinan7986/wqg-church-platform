import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Shield,
  Image as ImageIcon,
  Tv
} from 'lucide-react';
import {
  Button,
  PageHeader,
  Modal,
  Tabs,
  Toast,
  FormField,
  DateTimePicker
} from '../../components/ui';

// Modular Tab Components
import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminStaffTab from './admin/AdminStaffTab';
import AdminBannersTab from './admin/AdminBannersTab';
import AdminMediaTab from './admin/AdminMediaTab';
import AdminAuditTab from './admin/AdminAuditTab';
import AdminCreateStaffTab from './admin/AdminCreateStaffTab';
import AdminContactSettingsTab from './admin/AdminContactSettingsTab';
import AdminContactInboxTab from './admin/AdminContactInboxTab';

const AdminDash = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Tabs: 'overview' | 'staff' | 'createStaff' | 'banners' | 'media' | 'uploads' | 'audit'
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create Staff Form
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    phone: '',
    password: '',
    role: 'ADMIN',
    department: '',
    originChurch: '',
    city: 'Finfinnee',
    kebele: '01'
  });
  const [creatingStaff, setCreatingStaff] = useState(false);

  // Role Edit Modal
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);

  // Banners state
  const [banners, setBanners] = useState([]);
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: { om: '', am: '', en: '' },
    description: { om: '', am: '', en: '' },
    imageUrl: '',
    linkUrl: '/services',
    badge: 'Ayyaana & Sagantaa Addaa',
    order: 0,
    isActive: true,
    activeFrom: '',
    activeTo: ''
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // YouTube Gospel Media state
  const [mediaList, setMediaList] = useState([]);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [mediaForm, setMediaForm] = useState({
    title: { om: '', am: '', en: '' },
    description: { om: '', am: '', en: '' },
    youtubeUrl: '',
    category: 'GOSPEL',
    speakerOrSinger: ''
  });
  const [savingMedia, setSavingMedia] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActions, setAuditActions] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [ovRes, banRes, medRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/banners?all=true'),
        api.get('/media')
      ]);

      if (ovRes.data?.success) {
        setOverview(ovRes.data.stats || null);
        setStaffList(ovRes.data.staffList || []);
      }
      if (banRes.data?.success) {
        setBanners(banRes.data.banners || []);
      }
      if (medRes.data?.success) {
        setMediaList(medRes.data.media || []);
      }
    } catch (err) {
      console.error('[AdminDash Fetch Error]:', err);
      setErrorMsg("Odeeffannoo sirnaa fiduun hin danda'amne");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingAudit(true);
      const res = await api.get('/audit-logs', {
        params: {
          action: actionFilter,
          search: auditSearch
        }
      });
      if (res.data?.success) {
        setAuditLogs(res.data.logs || []);
        setAuditActions(res.data.actions || []);
      }
    } catch (err) {
      console.error('[Audit Logs Fetch Error]:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit' && isSuperAdmin) {
      fetchAuditLogs();
    }
  }, [activeTab, actionFilter]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg('Akkaawuntii tajaajiltootaa banuuf mirga Super Admin qofaatu qaba.');
      return;
    }

    try {
      setCreatingStaff(true);
      setErrorMsg('');

      const payload = {
        fullName: newStaff.fullName,
        originChurch: (newStaff.originChurch || '').trim(),
        address: {
          city: newStaff.city,
          kebele: newStaff.kebele,
          phone: newStaff.phone
        },
        password: newStaff.password,
        role: newStaff.role,
        department: newStaff.department
      };

      const res = await api.post('/auth/create-staff', payload);
      if (res.data?.success) {
        setSuccessMsg(`Akkaawuntiin ${newStaff.role} (${newStaff.fullName}) milkaa'inaan uumameera!`);
        setNewStaff({
          fullName: '',
          phone: '',
          password: '',
          role: 'ADMIN',
          department: '',
          originChurch: '',
          city: 'Finfinnee',
          kebele: '01'
        });
        setActiveTab('staff');
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('[Create Staff Error]:', err);
      setErrorMsg(err.response?.data?.message || "Akkaawuntii uumuun hin danda'amne");
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editingStaff || !selectedRole) return;

    try {
      setSavingRole(true);
      const res = await api.put(`/admin/users/${editingStaff._id}/role`, {
        role: selectedRole
      });

      if (res.data?.success) {
        setSuccessMsg(`Gaheen ${editingStaff.fullName} gara "${selectedRole}" jijjiirameera!`);
        setEditingStaff(null);
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Update Role Error]:', err);
      setErrorMsg(err.response?.data?.message || "Gahee jijjiiruun hin danda'amne");
    } finally {
      setSavingRole(false);
    }
  };

  // Banner Actions
  const handleCreateBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.imageUrl || !bannerForm.title.om) {
      setErrorMsg('Suuraa fi Mata-duree Afaan Oromoo guutuu qabdu');
      return;
    }

    try {
      setSavingBanner(true);
      setErrorMsg('');
      const res = await api.post('/banners', bannerForm);
      if (res.data?.success) {
        setSuccessMsg("Beeksisni (Banner) milkaa'inaan maxxanfameera!");
        setShowAddBannerModal(false);
        setBannerForm({
          title: { om: '', am: '', en: '' },
          description: { om: '', am: '', en: '' },
          imageUrl: '',
          linkUrl: '/services',
          badge: 'Ayyaana & Sagantaa Addaa',
          order: 0,
          isActive: true,
          activeFrom: '',
          activeTo: ''
        });
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Create Banner Error]:', err);
      setErrorMsg(err.response?.data?.message || "Banner uumuun hin danda'amne");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (banner) => {
    try {
      const res = await api.put(`/banners/${banner._id}`, {
        isActive: !banner.isActive
      });
      if (res.data?.success) {
        setSuccessMsg(`Haalli beeksisaa jijjiirameera!`);
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('[Toggle Banner Error]:', err);
      setErrorMsg("Haala beeksisaa jijjiiruun hin danda'amne");
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Beeksisa kana haquu keessan mirkaneessituu?')) return;
    try {
      const res = await api.delete(`/banners/${bannerId}`);
      if (res.data?.success) {
        setSuccessMsg('Beeksisni haqeera!');
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('[Delete Banner Error]:', err);
      setErrorMsg("Banner haquun hin danda'amne");
    }
  };

  // YouTube Media Actions
  const handleCreateMedia = async (e) => {
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
        setSuccessMsg("Viidiyoon YouTube milkaa'inaan dabalamameera!");
        setShowAddMediaModal(false);
        setMediaForm({
          title: { om: '', am: '', en: '' },
          description: { om: '', am: '', en: '' },
          youtubeUrl: '',
          category: 'GOSPEL',
          speakerOrSinger: ''
        });
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('[Create Media Error]:', err);
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
        fetchOverview();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('[Delete Media Error]:', err);
      setErrorMsg("Meediyaa haquun hin danda'amne");
    }
  };

  const handleAuditSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  // Tabs Definition
  const adminTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'staff', label: 'Tajaajiltoota', count: staffList.length },
    { id: 'banners', label: 'Banners', count: banners.length },
    { id: 'media', label: 'YouTube', count: mediaList.length },
    { id: 'contactSettings', label: 'Contact & Links' },
    { id: 'inbox', label: 'Ergaa (Inbox)' },
    ...(isSuperAdmin ? [{ id: 'audit', label: 'Audit Logs' }] : []),
    ...(isSuperAdmin ? [{ id: 'createStaff', label: '+ Staff Haaraa' }] : [])
  ];

  return (
    <div className="space-y-8 text-slate-900">
      {/* Top Banner via PageHeader */}
      <PageHeader
        icon={Shield}
        eyebrow="Kutaa Qindaa'ina Sirnichaa & Eegumsa (Admin Settings & Audit)"
        title="Hoggansa Sirna Waldichaa & Tajaajiltootaa"
        subtitle={
          isSuperAdmin
            ? 'Mirkaneessa waliigalaa, beeksisa fuula duraa, uumama akkaawuntii tajaajiltootaa, fi Audit Logs.'
            : "Itti-fayyadama sirnichaa, beeksisoota, fi to'annoo tajaajilaa."
        }
        actions={<Tabs tabs={adminTabs} activeTab={activeTab} onChange={setActiveTab} />}
      />

      {/* Alert Toasts */}
      <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />
      <Toast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />

      {/* Tab 1: System Overview Metrics */}
      {activeTab === 'overview' && (
        <AdminOverviewTab
          overview={overview}
          bannersCount={banners.length}
          mediaCount={mediaList.length}
        />
      )}

      {/* Tab 2: Staff Directory & Role Management */}
      {activeTab === 'staff' && (
        <AdminStaffTab
          staffList={staffList}
          loading={loading}
          isSuperAdmin={isSuperAdmin}
          onEditRole={(st) => {
            setEditingStaff(st);
            setSelectedRole(st.role);
          }}
        />
      )}

      {/* Tab 3: Banners & Promotion Management */}
      {activeTab === 'banners' && (
        <AdminBannersTab
          banners={banners}
          onAddBanner={() => setShowAddBannerModal(true)}
          onToggleActive={handleToggleBannerActive}
          onDeleteBanner={handleDeleteBanner}
        />
      )}

      {/* Tab 4: YouTube Gospel Media Management */}
      {activeTab === 'media' && (
        <AdminMediaTab
          mediaList={mediaList}
          onAddMedia={() => setShowAddMediaModal(true)}
          onDeleteMedia={handleDeleteMedia}
        />
      )}

      {/* Tab: Contact & Site Links Settings */}
      {activeTab === 'contactSettings' && <AdminContactSettingsTab />}

      {/* Tab: Contact Inbox Messages */}
      {activeTab === 'inbox' && <AdminContactInboxTab />}

      {/* Tab 5: Audit Logs System (Strictly Super Admin) */}
      {activeTab === 'audit' && isSuperAdmin && (
        <AdminAuditTab
          auditLogs={auditLogs}
          auditActions={auditActions}
          auditSearch={auditSearch}
          onSearchChange={setAuditSearch}
          onSearchSubmit={handleAuditSearchSubmit}
          actionFilter={actionFilter}
          onFilterChange={setActionFilter}
          loadingAudit={loadingAudit}
        />
      )}

      {/* Tab 6: Create New Staff Form */}
      {activeTab === 'createStaff' && isSuperAdmin && (
        <AdminCreateStaffTab
          newStaff={newStaff}
          setNewStaff={setNewStaff}
          creatingStaff={creatingStaff}
          onSubmit={handleCreateStaff}
          onCancel={() => setActiveTab('staff')}
        />
      )}

      {/* Modal: Add New Banner */}
      <Modal
        isOpen={showAddBannerModal}
        onClose={() => setShowAddBannerModal(false)}
        title="Banner / Beeksisa Haaraa"
        icon={ImageIcon}
      >
        <form onSubmit={handleCreateBanner} className="space-y-4">
          <FormField
            label="Suuraa URL (Banner Graphic)"
            type="url"
            required
            value={bannerForm.imageUrl}
            onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
            placeholder="https://images.unsplash.com/..."
          />

          <FormField
            label="Mata-duree (Afaan Oromoo)"
            required
            value={bannerForm.title.om}
            onChange={(e) =>
              setBannerForm({
                ...bannerForm,
                title: { ...bannerForm.title, om: e.target.value }
              })
            }
            placeholder="fkn. Baga Ayyaana Qulqulluu Giyoorgisiin Isin Gahe!"
          />

          <FormField
            label="ርዕስ (አማርኛ - አማራጭ)"
            value={bannerForm.title.am}
            onChange={(e) =>
              setBannerForm({
                ...bannerForm,
                title: { ...bannerForm.title, am: e.target.value }
              })
            }
            placeholder="የርዕስ ትርጉም በአማርኛ"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Badge / Mallattoo"
              value={bannerForm.badge}
              onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value })}
              placeholder="fkn. Ayyaana Addaa"
            />

            <FormField
              label="Link URL"
              value={bannerForm.linkUrl}
              onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
              placeholder="/services ykn /dashboard"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateTimePicker
              label="Guyyaa Jalqabaa (Active From - Optional)"
              value={bannerForm.activeFrom}
              onChange={(val) => setBannerForm({ ...bannerForm, activeFrom: val })}
            />
            <DateTimePicker
              label="Guyyaa Xumuraa (Active To - Optional)"
              value={bannerForm.activeTo}
              onChange={(val) => setBannerForm({ ...bannerForm, activeTo: val })}
            />
          </div>

          <FormField
            as="textarea"
            label="Ibsa Gabaabaa"
            rows={3}
            value={bannerForm.description.om}
            onChange={(e) =>
              setBannerForm({
                ...bannerForm,
                description: { ...bannerForm.description, om: e.target.value }
              })
            }
            placeholder="Ibsa beeksisichaa Afaan Oromootiin..."
          />

          <div className="pt-4 flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddBannerModal(false)}
            >
              Dhiisi
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingBanner}
            >
              Maxxansi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add YouTube Media */}
      <Modal
        isOpen={showAddMediaModal}
        onClose={() => setShowAddMediaModal(false)}
        title="Viidiyoo YouTube Haaraa Galmeessi"
        icon={Tv}
      >
        <form onSubmit={handleCreateMedia} className="space-y-4">
          <FormField
            label="YouTube URL / Link"
            type="url"
            required
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
              options={[
                { value: 'GOSPEL', label: 'Wangeela (Gospel)' },
                { value: 'CHOIR', label: 'Faarfannaa (Choir)' },
                { value: 'PRAYER', label: 'Kadhannaa (Prayer)' },
                { value: 'SERMON', label: 'Lallaba (Sermon)' }
              ]}
            />

            <FormField
              label="Lallabaa / Faarfataa"
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
            value={mediaForm.title.om}
            onChange={(e) =>
              setMediaForm({
                ...mediaForm,
                title: { ...mediaForm.title, om: e.target.value }
              })
            }
            placeholder="Mata-duree Faarfannaa / Lallabaa"
          />

          <FormField
            label="ርዕስ (አማርኛ - አማራጭ)"
            value={mediaForm.title.am}
            onChange={(e) =>
              setMediaForm({
                ...mediaForm,
                title: { ...mediaForm.title, am: e.target.value }
              })
            }
            placeholder="የርዕስ ትርጉም በአማርኛ"
          />

          <div className="pt-4 flex items-center justify-end space-x-3">
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

      {/* Modal: Edit Staff Role */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Gahee Tajaajilaa Jijjiiri"
        maxWidth="max-w-md"
      >
        {editingStaff && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-royal-tint border border-slate-200 space-y-1">
              <span className="text-slate-500 block text-[11px]">Tajaajilaa:</span>
              <span className="text-sm font-black text-royal block">
                {editingStaff.fullName}
              </span>
              <span className="text-slate-600 font-medium text-[11px] block">
                ⛪ {editingStaff.originChurch}
              </span>
            </div>

            <FormField
              as="select"
              label="Gahee Haaraa Filadhu:"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={[
                { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
                { value: 'ADMIN', label: 'ADMIN' },
                { value: 'COLLECTOR', label: 'COLLECTOR' },
                { value: 'HR', label: 'HR' },
                { value: 'SECRETARY', label: 'SECRETARY' },
                { value: 'MEMBER', label: 'MEMBER' }
              ]}
            />

            <div className="pt-4 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingStaff(null)}
              >
                Dhiisi
              </Button>
              <Button
                variant="primary"
                loading={savingRole}
                onClick={handleUpdateRole}
              >
                Mirkaneessi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDash;
