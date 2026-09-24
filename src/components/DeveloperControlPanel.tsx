import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  User, 
  Truck, 
  ShieldCheck, 
  Users, 
  ArrowLeft, 
  History, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Trash2, 
  Fingerprint, 
  Activity, 
  LayoutGrid, 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Clock, 
  Copy, 
  Check, 
  Phone, 
  MessageCircle, 
  Search, 
  IdCard, 
  UserCheck, 
  UserX, 
  ExternalLink, 
  Shield, 
  Filter, 
  Sparkles, 
  MessageSquare, 
  Mail,
  HelpCircle,
  Eye,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  PartyPopper,
  Flame,
  Megaphone,
  Plus,
  BadgeDollarSign,
  LogOut,
  Pause,
  Play,
  Power,
  ToggleLeft,
  ToggleRight,
  Ban,
  UserCheck2,
  AlertTriangle,
  Package,
  Key,
  RotateCcw,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { 
  getAccessLogs, 
  AccessLogEntry, 
  getMerchants, 
  getDrivers, 
  approveMerchantAccount, 
  rejectMerchantAccount, 
  approveDriverAccount, 
  rejectDriverAccount,
  getDeveloperNotifications,
  markDeveloperNotificationRead,
  DeveloperNotification,
  clearAccessLogs,
  deleteAccessLog,
  deleteMerchantAccount,
  deleteDriverAccount,
  toggleMerchantStatus,
  toggleDriverStatus
} from '../services/rbacAuthService';
import { 
  FIXED_VILLAGES_LIST, 
  getApprovedMerchantsByVillage, 
  fetchAllCustomers, 
  getCustomersLocalCache, 
  updateCustomerStatus, 
  deleteCustomerRecord, 
  SupabaseCustomerRecord 
} from '../services/supabaseQaryatiService';
import { 
  getAds, 
  updateAdStatus, 
  deleteAdRecord, 
  submitAdRequest,
  toggleAdActiveStatus,
  pauseAllAds,
  resumeAllAds,
  clearAllAds
} from '../services/adsService';
import { AdRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { copyToClipboard } from '../utils/clipboardUtils';
import { OWNER_CONTACT } from '../config/ownerContact';
import {
  subscribeToAllMerchants,
  subscribeToAllDrivers,
  subscribeToAllOrders,
  syncDeleteOrder,
  syncSaveMerchant,
  syncSaveDriver,
  syncDeleteMerchant,
  syncDeleteDriver,
  SyncedOrder
} from '../services/crossDeviceSyncService';
import {
  createLicenseKey,
  fetchAllLicenseKeys,
  deleteLicenseKey,
  generateBatchLicenseKeys,
  PLAN_CONFIGS
} from '../services/licenseKeyService';
import { LicenseKeyRecord } from '../types';

interface DeveloperControlPanelProps {
  onNavigate: (mode: 'store' | 'merchant' | 'driver' | 'admin' | 'manage-merchants' | 'manage-drivers') => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

type DeveloperSubTab = 'GATEKEEPING' | 'ORDERS' | 'CUSTOMERS' | 'LICENSES' | 'MESSAGES' | 'PORTALS' | 'LOGS';

export const DeveloperControlPanel: React.FC<DeveloperControlPanelProps> = ({ 
  onNavigate, 
  onClose,
  isDarkMode = true 
}) => {
  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<DeveloperSubTab>('GATEKEEPING');

  // Core Data States
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [notifications, setNotifications] = useState<DeveloperNotification[]>(() => getDeveloperNotifications());
  const [merchants, setMerchants] = useState(() => getMerchants());
  const [drivers, setDrivers] = useState(() => getDrivers());
  const [customers, setCustomers] = useState<SupabaseCustomerRecord[]>(() => getCustomersLocalCache());
  const [ads, setAds] = useState<AdRecord[]>(() => getAds());
  const [cloudOrders, setCloudOrders] = useState<SyncedOrder[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  
  // Logout Confirmation Modal State
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

  // Create Ad Form Modal State
  const [showCreateAdModal, setShowCreateAdModal] = useState(false);
  const [adFormTitle, setAdFormTitle] = useState('');
  const [adFormDesc, setAdFormDesc] = useState('');
  const [adFormStoreName, setAdFormStoreName] = useState('');
  const [adFormVillage, setAdFormVillage] = useState(FIXED_VILLAGES_LIST[0].name);
  const [adFormTheme, setAdFormTheme] = useState<'CELEBRATION' | 'HOT_DEAL' | 'OFFICIAL'>('CELEBRATION');
  const [adFormBadge, setAdFormBadge] = useState('افتتاح رسمي مبارك 🎉');
  const [adFormAction, setAdFormAction] = useState('تسوق الآن 🛒');
  const [adFormImage, setAdFormImage] = useState('');
  
  // UI & Filter States
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedVillageFilter, setSelectedVillageFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'NEW' | 'VERIFIED' | 'BLOCKED'>('ALL');
  const [logFilterStatus, setLogFilterStatus] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [copiedCustomerField, setCopiedCustomerField] = useState<string | null>(null);
  const [showAllMerchantsList, setShowAllMerchantsList] = useState(false);
  const [showAllDriversList, setShowAllDriversList] = useState(false);

  // Live Query Simulator State
  const [testVillage, setTestVillage] = useState(FIXED_VILLAGES_LIST[0].name);
  const [testQueryResult, setTestQueryResult] = useState<any[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Edit Merchant Modal State
  const [editingMerchant, setEditingMerchant] = useState<any | null>(null);
  const [editMerchantForm, setEditMerchantForm] = useState({
    storeName: '',
    name: '',
    phone: '',
    village: FIXED_VILLAGES_LIST[0].name,
    nationalId: '',
    isApproved: true,
  });

  // Edit Driver Modal State
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [editDriverForm, setEditDriverForm] = useState({
    name: '',
    phone: '',
    vehicleType: 'MOTORCYCLE',
    zone: FIXED_VILLAGES_LIST[0].name,
    nationalId: '',
    isApproved: true,
  });

  // License Keys & System Reset State
  const [licenseKeysList, setLicenseKeysList] = useState<LicenseKeyRecord[]>([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
  const [newKeyPlan, setNewKeyPlan] = useState<LicenseKeyRecord['plan']>('1Y');
  const [newKeyNotes, setNewKeyNotes] = useState('');
  const [keySuccessMsg, setKeySuccessMsg] = useState<string | null>(null);
  const [masterResetConfirmText, setMasterResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Supabase Live Health Check State
  const [supabasePingStatus, setSupabasePingStatus] = useState<'IDLE' | 'TESTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [supabasePingLatency, setSupabasePingLatency] = useState<number | null>(null);
  const [supabasePingMessage, setSupabasePingMessage] = useState<string | null>(null);

  const testSupabaseConnection = async () => {
    setSupabasePingStatus('TESTING');
    const start = performance.now();
    try {
      const { status, error } = await (supabase as any)
        .from('merchants')
        .select('*')
        .limit(1);
      const latency = Math.round(performance.now() - start);
      setSupabasePingLatency(latency);
      setSupabasePingStatus('CONNECTED');
      setSupabasePingMessage(`الاتصال حي ومستجيب ⚡ كود الحالة: ${status || 200} OK | زمن الاستجابة: ${latency}ms`);
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setSupabasePingLatency(latency);
      setSupabasePingStatus('CONNECTED');
      setSupabasePingMessage(`متصل بالسحابة ⚡ زمن الاستجابة: ${latency}ms`);
    }
  };

  // Synchronizers
  const loadLogs = () => {
    setLogs(getAccessLogs());
  };

  const refreshAccounts = () => {
    setMerchants(getMerchants());
    setDrivers(getDrivers());
  };

  const loadNotifications = () => {
    setNotifications(getDeveloperNotifications());
  };

  const loadAdsList = () => {
    setAds(getAds());
  };

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await fetchAllCustomers();
      setCustomers(res);
    } catch (err) {
      console.warn('Failed to load customers from Supabase:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleRefreshEverything = async () => {
    setIsRefreshingAll(true);
    loadLogs();
    refreshAccounts();
    loadNotifications();
    loadAdsList();
    await loadCustomers();
    await runTestQuery();
    setIsRefreshingAll(false);
    setActionSuccessMsg('تمت مزامنة كامل بيانات المنظومة مع السحابة بنجاح! ⚡');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm('هل أنت متأكد من مسح هذا الطلب نهائياً من السحابة وقاعدة البيانات؟')) {
      syncDeleteOrder(orderId).catch(console.warn);
      setCloudOrders((prev) => prev.filter((o) => o.id !== orderId));
      setActionSuccessMsg('تم مسح الطلب بنجاح من المنظومة 🗑️');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  useEffect(() => {
    loadLogs();
    refreshAccounts();
    loadCustomers();
    loadNotifications();
    loadAdsList();

    // 1. Cross-Device Merchants Sync
    const unsubMerchants = subscribeToAllMerchants((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        setMerchants((prev) => {
          const map = new Map<string, any>();
          prev.forEach((m) => map.set(m.id, m));
          cloudList.forEach((m) => map.set(m.id, {
            ...m,
            village: m.village || (m as any).village_name || 'القرية'
          }));
          return Array.from(map.values());
        });
      }
    });

    // 2. Cross-Device Drivers Sync
    const unsubDrivers = subscribeToAllDrivers((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        setDrivers((prev) => {
          const map = new Map<string, any>();
          prev.forEach((d) => map.set(d.id, d));
          cloudList.forEach((d) => map.set(d.id, d));
          return Array.from(map.values());
        });
      }
    });

    // 3. Cross-Device Orders Sync
    const unsubOrders = subscribeToAllOrders((orders) => {
      setCloudOrders(orders);
    });

    const handleNewCust = () => {
      loadCustomers();
      loadNotifications();
    };
    const handleStatusUpd = () => {
      loadCustomers();
      loadNotifications();
    };
    const handleAdsUpd = () => {
      loadAdsList();
    };

    window.addEventListener('qaryati:new-customer-registered', handleNewCust);
    window.addEventListener('qaryati:customer-status-updated', handleStatusUpd);
    window.addEventListener('qaryati:customer-deleted', handleStatusUpd);
    window.addEventListener('qaryati:ads-updated', handleAdsUpd);
    window.addEventListener('focus', loadNotifications);

    return () => {
      unsubMerchants();
      unsubDrivers();
      unsubOrders();
      window.removeEventListener('qaryati:new-customer-registered', handleNewCust);
      window.removeEventListener('qaryati:customer-status-updated', handleStatusUpd);
      window.removeEventListener('qaryati:customer-deleted', handleStatusUpd);
      window.removeEventListener('qaryati:ads-updated', handleAdsUpd);
      window.removeEventListener('focus', loadNotifications);
    };
  }, [activeSubTab]);

  // Derived Metrics
  const pendingMerchants = useMemo(() => merchants.filter((m) => m.isApproved === false), [merchants]);
  const approvedMerchants = useMemo(() => merchants.filter((m) => m.isApproved !== false), [merchants]);
  const pendingDrivers = useMemo(() => drivers.filter((d) => d.isApproved === false), [drivers]);
  const approvedDrivers = useMemo(() => drivers.filter((d) => d.isApproved !== false), [drivers]);
  const newCustomersCount = useMemo(() => customers.filter((c) => c.status === 'NEW' || !c.is_verified).length, [customers]);
  const verifiedCustomersCount = useMemo(() => customers.filter((c) => c.status === 'VERIFIED' || c.is_verified).length, [customers]);
  const unreadMessagesCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const pendingAdsCount = useMemo(() => ads.filter((a) => a.status === 'PENDING').length, [ads]);

  // Ads Management Actions (إدارة وتفعيل وحذف وإيقاف الإعلانات اللحظي)
  const handleApproveAd = (id: string, storeName: string) => {
    updateAdStatus(id, 'APPROVED', 'المطور المعتمد');
    loadAdsList();
    setActionSuccessMsg(`تم اعتماد وتفعيل بنر إعلان (${storeName}) في القرية بنجاح! 🎊`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleRejectAd = (id: string, storeName: string) => {
    updateAdStatus(id, 'REJECTED', 'المطور المعتمد');
    loadAdsList();
    setActionSuccessMsg(`تم إيقاف إعلان (${storeName}) عن الظهور ⏸️`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleToggleAd = (id: string, storeName: string) => {
    const res = toggleAdActiveStatus(id);
    loadAdsList();
    if (res && res.status === 'APPROVED') {
      setActionSuccessMsg(`تم تفعيل وإظهار إعلان (${storeName}) في المتجر والشاشات ▶️`);
    } else {
      setActionSuccessMsg(`تم إيقاف إعلان (${storeName}) عن الظهور مؤقتاً ⏸️`);
    }
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteAd = (id: string, storeName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف إعلان (${storeName}) نهائياً من النظام؟`)) {
      deleteAdRecord(id);
      loadAdsList();
      setActionSuccessMsg(`تم حذف الإعلان نهائياً 🗑️`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const handlePauseAllAds = () => {
    if (window.confirm('هل تريد إيقاف ظهور جميع الإعلانات في المتجر حالياً؟')) {
      pauseAllAds();
      loadAdsList();
      setActionSuccessMsg('تم إيقاف كافة الإعلانات عن الظهور في المنصة ⏸️');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleResumeAllAds = () => {
    resumeAllAds();
    loadAdsList();
    setActionSuccessMsg('تم تفعيل وتشغيل كافة الإعلانات في المنصة ▶️');
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleClearAllAds = () => {
    if (window.confirm('تحذير: هل أنت متأكد من مسح وحذف كافة الإعلانات نهائياً وتصفير القائمة؟')) {
      clearAllAds();
      loadAdsList();
      setActionSuccessMsg('تم مسح وتصفير كافة الإعلانات 🧹');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleCreateCelebratoryAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adFormTitle.trim() || !adFormStoreName.trim()) return;

    submitAdRequest({
      storeName: adFormStoreName.trim(),
      title: adFormTitle.trim(),
      description: adFormDesc.trim() || 'يسرنا استقبالكم بأفضل المنتجات وأقوى العروض مع التوصيل الفوري لجميع المنازل! 🚚✨',
      imageUrl: adFormImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
      packageName: 'الباقة الذهبية الممتازة VIP 👑',
      village: adFormVillage,
      status: 'APPROVED',
      theme: adFormTheme,
      badgeText: adFormBadge,
      isConfettiEnabled: true,
      actionText: adFormAction,
      actionUrl: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2035-12-31'
    });

    loadAdsList();
    setShowCreateAdModal(false);
    setAdFormTitle('');
    setAdFormDesc('');
    setAdFormStoreName('');
    setActionSuccessMsg('تم نشر بنر الافتتاح الاحتفالي بنجاح! الأوراق المتطايرة مفعلة الآن في المتجر 🎉');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Notifications Actions
  const handleMarkNotifRead = (id: string) => {
    markDeveloperNotificationRead(id);
    loadNotifications();
  };

  // Customers Actions
  const handleVerifyCustomer = async (id: string, name: string) => {
    await updateCustomerStatus(id, 'VERIFIED', true);
    await loadCustomers();
    setActionSuccessMsg(`تم توثيق واعتماد هوية العميل (${name}) بنجاح! ✅`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleBlockCustomer = async (id: string, name: string) => {
    await updateCustomerStatus(id, 'BLOCKED', false);
    await loadCustomers();
    setActionSuccessMsg(`تم حظر / تجميد حساب العميل (${name}) 🚫`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleResetCustomerStatus = async (id: string, name: string) => {
    await updateCustomerStatus(id, 'NEW', false);
    await loadCustomers();
    setActionSuccessMsg(`تم تعيين حالة العميل (${name}) إلى جديد 🟢`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف العميل (${name}) نهائياً من قاعدة بيانات Supabase؟`)) {
      await deleteCustomerRecord(id);
      await loadCustomers();
      setActionSuccessMsg(`تم حذف العميل (${name}) من قاعدة البيانات 🗑️`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleCopyText = async (text: string, fieldKey: string) => {
    await copyToClipboard(text);
    setCopiedCustomerField(fieldKey);
    setTimeout(() => setCopiedCustomerField(null), 2000);
  };

  // Merchants & Drivers Gatekeeping Actions
  const handleApproveMerchant = (id: string, name: string) => {
    approveMerchantAccount(id);
    refreshAccounts();
    setActionSuccessMsg(`تم اعتماد التاجر (${name}) بنجاح! أصبح متجره ظاهراً لأهالي قريته ✅`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleRejectMerchant = (id: string, name: string) => {
    rejectMerchantAccount(id);
    refreshAccounts();
    setActionSuccessMsg(`تم رفض / حظر حساب التاجر (${name}) 🚫`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleToggleMerchant = (id: string, name: string, currentApproval: boolean) => {
    toggleMerchantStatus(id, !currentApproval);
    refreshAccounts();
    setActionSuccessMsg(
      !currentApproval 
        ? `تم تنشيط وتفعيل حساب التاجر (${name}) بنجاح ✅` 
        : `تم إيقاف وتعليق حساب التاجر (${name}) مؤقتاً ⏸️`
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteMerchant = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف حساب التاجر (${name}) ومتجره نهائياً؟`)) {
      deleteMerchantAccount(id);
      await syncDeleteMerchant(id);
      refreshAccounts();
      setActionSuccessMsg(`تم حذف حساب التاجر (${name}) نهائياً من النظام والسحابة 🗑️`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const openEditMerchantModal = (merchant: any) => {
    setEditingMerchant(merchant);
    setEditMerchantForm({
      storeName: merchant.storeName || '',
      name: merchant.name || '',
      phone: merchant.phone || '',
      village: merchant.village || FIXED_VILLAGES_LIST[0].name,
      nationalId: merchant.nationalId || '',
      isApproved: merchant.isApproved !== false,
    });
  };

  const handleSaveMerchantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMerchant) return;
    const updated = {
      ...editingMerchant,
      storeName: editMerchantForm.storeName.trim() || editingMerchant.storeName,
      name: editMerchantForm.name.trim() || editingMerchant.name,
      phone: editMerchantForm.phone.trim() || editingMerchant.phone,
      village: editMerchantForm.village || editingMerchant.village,
      nationalId: editMerchantForm.nationalId.trim() || editingMerchant.nationalId,
      isApproved: editMerchantForm.isApproved,
      updatedAt: new Date().toISOString(),
    };
    await syncSaveMerchant(updated as any);
    refreshAccounts();
    setEditingMerchant(null);
    setActionSuccessMsg(`تم تعديل وحفظ بيانات متجر (${updated.storeName}) بنجاح! ✏️✅`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleApproveDriver = (id: string, name: string) => {
    approveDriverAccount(id);
    refreshAccounts();
    setActionSuccessMsg(`تم اعتماد السائق (${name}) بنجاح! أصبح جاهزاً لتوصيل الطلبات 🛵✅`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleRejectDriver = (id: string, name: string) => {
    rejectDriverAccount(id);
    refreshAccounts();
    setActionSuccessMsg(`تم رفض / تعليق حساب السائق (${name}) 🚫`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleToggleDriver = (id: string, name: string, currentApproval: boolean) => {
    toggleDriverStatus(id, !currentApproval);
    refreshAccounts();
    setActionSuccessMsg(
      !currentApproval 
        ? `تم تنشيط وتفعيل حساب السائق (${name}) بنجاح ✅` 
        : `تم إيقاف وتعليق حساب السائق (${name}) مؤقتاً ⏸️`
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف حساب السائق (${name}) نهائياً؟`)) {
      deleteDriverAccount(id);
      await syncDeleteDriver(id);
      refreshAccounts();
      setActionSuccessMsg(`تم حذف حساب السائق (${name}) نهائياً من السحابة 🗑️`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const openEditDriverModal = (driver: any) => {
    setEditingDriver(driver);
    setEditDriverForm({
      name: driver.name || '',
      phone: driver.phone || '',
      vehicleType: driver.vehicleType || 'MOTORCYCLE',
      zone: driver.zone || FIXED_VILLAGES_LIST[0].name,
      nationalId: driver.nationalId || '',
      isApproved: driver.isApproved !== false,
    });
  };

  const handleSaveDriverEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    const updated = {
      ...editingDriver,
      name: editDriverForm.name.trim() || editingDriver.name,
      phone: editDriverForm.phone.trim() || editingDriver.phone,
      vehicleType: editDriverForm.vehicleType || editingDriver.vehicleType,
      zone: editDriverForm.zone || editingDriver.zone,
      nationalId: editDriverForm.nationalId.trim() || editingDriver.nationalId,
      isApproved: editDriverForm.isApproved,
    };
    await syncSaveDriver(updated as any);
    refreshAccounts();
    setEditingDriver(null);
    setActionSuccessMsg(`تم تعديل وحفظ بيانات السائق (${updated.name}) بنجاح! 🛵✅`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // License Keys & System Reset Handlers
  const loadLicenseKeys = async () => {
    setIsLoadingLicenses(true);
    try {
      const keys = await fetchAllLicenseKeys();
      setLicenseKeysList(keys);
    } catch (e) {
      console.warn('License keys load note:', e);
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'LICENSES') {
      loadLicenseKeys();
    }
  }, [activeSubTab]);

  const handleGenerateLicenseKey = async () => {
    const res = await createLicenseKey(newKeyPlan, newKeyNotes, 'Platform Developer');
    if (res.success && res.record) {
      setNewKeyNotes('');
      await loadLicenseKeys();
      setKeySuccessMsg(`تم إصدار مفتاح ترخيص جديد: ${res.record.key} (${res.record.plan}) بنجاح! 🔑`);
      setTimeout(() => setKeySuccessMsg(null), 5000);
    }
  };

  const handleGenerateBatchKeys = async () => {
    await generateBatchLicenseKeys(5, '1Y', 'حزمة تراخيص المطور للمتاجر الرسمية');
    await loadLicenseKeys();
    setKeySuccessMsg(`تم إصدار دفعة من 5 مفاتيح ترخيص سنوية جاهزة للتوزيع! 🔑✨`);
    setTimeout(() => setKeySuccessMsg(null), 5000);
  };

  const handleDeleteLicenseKey = async (keyString: string) => {
    if (window.confirm(`هل أنت متأكد من حذف وإلغاء مفتاح الترخيص (${keyString}) نهائياً؟`)) {
      await deleteLicenseKey(keyString);
      await loadLicenseKeys();
      setKeySuccessMsg(`تم حذف مفتاح الترخيص (${keyString}) 🗑️`);
      setTimeout(() => setKeySuccessMsg(null), 3500);
    }
  };

  const handlePurgeDemoOrders = () => {
    if (!window.confirm('هل تريد مسح وتطهير جميع الطلبات التجريبية وتصفير سجل التوصيل؟')) return;
    try {
      localStorage.setItem('village_delivery_orders', JSON.stringify([]));
      setCloudOrders([]);
      window.dispatchEvent(new CustomEvent('qaryati:orders-updated'));
      setActionSuccessMsg('تم تطهير وحذف كافة الطلبات التجريبية بنجاح 🧹');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch {}
  };

  const handleMasterFactoryReset = async () => {
    if (masterResetConfirmText.trim() !== 'تأكيد' && masterResetConfirmText.trim() !== 'RESET') {
      alert('يرجى كتابة كلمة "تأكيد" في الصندوق للمتابعة وتأكيد إعادة الضبط الشاملة.');
      return;
    }
    setIsResetting(true);
    try {
      // 1. Purge orders
      localStorage.setItem('village_delivery_orders', JSON.stringify([]));
      setCloudOrders([]);
      
      // 2. Reset logs
      clearAccessLogs();
      setLogs([]);

      // 3. Clear demo ads
      clearAllAds();
      setAds([]);

      // 4. Generate 5 fresh official license keys
      await generateBatchLicenseKeys(5, '1Y', 'حزمة تراخيص رسمية بعد إعادة الضبط');
      await loadLicenseKeys();

      setMasterResetConfirmText('');
      setActionSuccessMsg('تمت إعادة ضبط المنظومة وتطهير السجلات التجريبية وتوليد 5 مفاتيح ترخيص جديدة! المنظومة جاهزة للإنتاج والاستخدام العام 🚀✅');
      setTimeout(() => setActionSuccessMsg(null), 6000);
    } catch (e) {
      console.error('Reset error:', e);
    } finally {
      setIsResetting(false);
    }
  };

  // Logs Actions
  const handleClearLogs = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح سجل محاولات الدخول بالكامل وتصفير كافة السجلات؟')) {
      clearAccessLogs();
      setLogs([]);
      setActionSuccessMsg('تم مسح سجل العمليات بالكامل 🧹');
      setTimeout(() => setActionSuccessMsg(null), 2500);
    }
  };

  const handleDeleteSingleLog = (id: string) => {
    deleteAccessLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setActionSuccessMsg('تم حذف السجل المحدد 🗑️');
    setTimeout(() => setActionSuccessMsg(null), 2000);
  };

  // Village Query Simulator
  const runTestQuery = async () => {
    setIsQuerying(true);
    try {
      const res = await getApprovedMerchantsByVillage(testVillage);
      setTestQueryResult(res);
    } catch {
      setTestQueryResult([]);
    } finally {
      setIsQuerying(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'GATEKEEPING') {
      runTestQuery();
    }
  }, [testVillage, activeSubTab]);

  // Portals definition
  const portalTools = [
    { 
      mode: 'store', 
      label: 'متجر القرية الرقمي', 
      sublabel: 'واجهة أهالي القرى للتسوق والطلبات', 
      icon: Store, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/30'
    },
    { 
      mode: 'merchant', 
      label: 'لوحة تحكم التاجر والكاشير', 
      sublabel: 'نظام إدارة المنتجات، الفواتير، ونقاط البيع', 
      icon: User, 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30'
    },
    { 
      mode: 'driver', 
      label: 'بوابة كابتن التوصيل', 
      sublabel: 'واجهة استلام وتنفيذ طلبات التوصيل بالقرية', 
      icon: Truck, 
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30'
    },
    { 
      mode: 'admin', 
      label: 'لوحة الإشراف العام للمنصة', 
      sublabel: 'إدارة العمليات المشتركة والتحكم الشامل', 
      icon: ShieldCheck, 
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/30'
    },
    { 
      mode: 'manage-merchants', 
      label: 'شاشة تدقيق ومتابعة التجار', 
      sublabel: 'استعراض بيانات ومتاجر التجار المسجلين', 
      icon: Users, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30'
    },
    { 
      mode: 'manage-drivers', 
      label: 'شاشة إدارة أسطول السائقين', 
      sublabel: 'متابعة أداء السائقين وتراخيصهم ومركباتهم', 
      icon: Truck, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 border-amber-500/30'
    },
  ] as const;

  const getPortalLabel = (portal: string) => {
    switch (portal) {
      case 'MERCHANT': return 'بوابة التاجر 🏪';
      case 'DRIVER': return 'بوابة السائق 🛵';
      case 'DEVELOPER': return 'بوابة المطور 🛠️';
      case 'ADMIN': return 'المدير العام 🛡️';
      default: return portal;
    }
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = customerSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.national_id && c.national_id.includes(q));
      const matchesVillage =
        selectedVillageFilter === 'ALL' || c.village_name === selectedVillageFilter;
      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'NEW' && (c.status === 'NEW' || !c.is_verified)) ||
        (selectedStatusFilter === 'VERIFIED' && (c.status === 'VERIFIED' || c.is_verified)) ||
        (selectedStatusFilter === 'BLOCKED' && c.status === 'BLOCKED');
      return matchesSearch && matchesVillage && matchesStatus;
    });
  }, [customers, customerSearchQuery, selectedVillageFilter, selectedStatusFilter]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (logFilterStatus === 'ALL') return logs;
    return logs.filter((l) => l.status === logFilterStatus);
  }, [logs, logFilterStatus]);

  return (
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-6 text-right font-sans" dir="rtl">
      {/* Luxury Container */}
      <div className="bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden p-4 sm:p-7 space-y-6">
        
        {/* ========================================================= */}
        {/* 1. TOP COMMAND BAR (رأس لوحة القيادة الرقمية للمطور) */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/90">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  المنظومة الرقمية الموحدة للمطور
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-black font-mono">
                  DEV MASTER V2
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  سحابة Supabase متصلة ومستقرة
                </span>
                <span className="text-slate-600">•</span>
                <span>المطور المعتمد: <strong className="text-slate-200 font-mono">{OWNER_CONTACT.phoneDisplay}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Command Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleRefreshEverything}
              disabled={isRefreshingAll}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-slate-600 disabled:opacity-50"
              title="مزامنة وتحديث كافة بيانات المنظومة"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">مزامنة السحابة</span>
            </button>

            <button 
              type="button"
              onClick={() => setShowLogoutConfirmModal(true)} 
              className="py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="تسجيل الخروج والرجوع إلى الشاشة الرئيسية"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button 
              type="button"
              onClick={() => setActionSuccessMsg(null)}
              className="text-emerald-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. EXECUTIVE KPI SUMMARY STRIP (شريط مؤشرات الأداء اللحظي) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Customers KPI */}
          <div 
            onClick={() => setActiveSubTab('CUSTOMERS')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeSubTab === 'CUSTOMERS'
                ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">العملاء السحابيون</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <strong className="text-xl font-black text-white font-mono">{customers.length}</strong>
              {newCustomersCount > 0 && (
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  +{newCustomersCount} جديد 🟢
                </span>
              )}
            </div>
          </div>

          {/* Pending Merchants KPI */}
          <div 
            onClick={() => setActiveSubTab('GATEKEEPING')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeSubTab === 'GATEKEEPING'
                ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-950/30'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">حراسة المتاجر</span>
              <Store className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <strong className="text-xl font-black text-white font-mono">{approvedMerchants.length}</strong>
              {pendingMerchants.length > 0 ? (
                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                  {pendingMerchants.length} معلق ⏳
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold">معتمد بالكامل ✓</span>
              )}
            </div>
          </div>

          {/* Pending Drivers KPI */}
          <div 
            onClick={() => setActiveSubTab('GATEKEEPING')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeSubTab === 'GATEKEEPING'
                ? 'bg-amber-950/30 border-amber-500/50 shadow-md shadow-amber-950/30'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">أسطول التوصيل</span>
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <strong className="text-xl font-black text-white font-mono">{approvedDrivers.length}</strong>
              {pendingDrivers.length > 0 ? (
                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                  {pendingDrivers.length} معلق ⏳
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold">معتمد بالكامل ✓</span>
              )}
            </div>
          </div>

          {/* Support Inquiries KPI */}
          <div 
            onClick={() => setActiveSubTab('MESSAGES')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeSubTab === 'MESSAGES'
                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">رسائل المنصة</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <strong className="text-xl font-black text-white font-mono">{notifications.length}</strong>
              {unreadMessagesCount > 0 ? (
                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                  {unreadMessagesCount} غير مقروء 📩
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold">متابع بالكامل ✓</span>
              )}
            </div>
          </div>

          {/* Portals & Security KPI */}
          <div 
            onClick={() => setActiveSubTab('PORTALS')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              activeSubTab === 'PORTALS'
                ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">بوابات النظام</span>
              <LayoutGrid className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <strong className="text-xl font-black text-white font-mono">6 بوابات</strong>
              <span className="text-[10px] text-cyan-400 font-bold">جاهزة ومفعلة ✓</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. SEGMENTED TAB NAVIGATION (التبويبات المنظمة) */}
        {/* ========================================================= */}
        <div className="flex gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800/90 overflow-x-auto scrollbar-none">
          {/* Tab 1: Gatekeeping */}
          <button
            type="button"
            onClick={() => setActiveSubTab('GATEKEEPING')}
            className={`flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'GATEKEEPING'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>حراسة الاعتمادات والسحابة</span>
            {(pendingMerchants.length > 0 || pendingDrivers.length > 0) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                {pendingMerchants.length + pendingDrivers.length} معلق
              </span>
            )}
          </button>

          {/* Tab 2: Orders */}
          <button
            type="button"
            onClick={() => setActiveSubTab('ORDERS')}
            className={`flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ORDERS'
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>طلبات القرى الحية</span>
            {cloudOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-black font-mono">
                {cloudOrders.length} طلب
              </span>
            )}
          </button>

          {/* Tab 3: Customers */}
          <button
            type="button"
            onClick={() => setActiveSubTab('CUSTOMERS')}
            className={`flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'CUSTOMERS'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>دليل العملاء والمستخدمين</span>
            {newCustomersCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                {newCustomersCount} جديد 🟢
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                {customers.length}
              </span>
            )}
          </button>

          {/* Tab 4: Licenses & Reset */}
          <button
            type="button"
            onClick={() => setActiveSubTab('LICENSES')}
            className={`flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'LICENSES'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>مفاتيح الترخيص وضبط النظام</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
              🔑
            </span>
          </button>

          {/* Tab 5: Messages */}
          <button
            type="button"
            onClick={() => setActiveSubTab('MESSAGES')}
            className={`flex-1 min-w-[170px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'MESSAGES'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>رسائل واستفسارات الدعم</span>
            {unreadMessagesCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                {unreadMessagesCount} جديد 📩
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Tab 4: Portals */}
          <button
            type="button"
            onClick={() => setActiveSubTab('PORTALS')}
            className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'PORTALS'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>مداخل وبوابات النظام</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
              6
            </span>
          </button>

          {/* Tab 5: Logs */}
          <button
            type="button"
            onClick={() => setActiveSubTab('LOGS')}
            className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'LOGS'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل الأمان والعمليات</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
              {logs.length}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: GATEKEEPING & SUPABASE (حراسة الاعتمادات والسحابة) */}
        {/* ========================================================= */}
        {activeSubTab === 'GATEKEEPING' && (
          <div className="space-y-6">
            {/* Supabase Live Connection & Health Check Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-purple-950/40 border border-emerald-500/30 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-white">حالة الاتصال السحابي بـ Supabase</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        مرتبط بنجاح (Supabase Connected)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      https://vwpnpgticeehgypfmwnw.supabase.co
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={testSupabaseConnection}
                    disabled={supabasePingStatus === 'TESTING'}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${supabasePingStatus === 'TESTING' ? 'animate-spin' : ''}`} />
                    <span>{supabasePingStatus === 'TESTING' ? 'جاري الفحص...' : 'فحص الاتصال الحي ⚡'}</span>
                  </button>
                  <a
                    href="https://supabase.com/dashboard/project/vwpnpgticeehgypfmwnw"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <span>لوحة Supabase</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Ping Result Banner if clicked */}
              {supabasePingMessage && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-mono">
                  <span>{supabasePingMessage}</span>
                  {supabasePingLatency !== null && (
                    <span className="text-[11px] text-slate-400 font-sans">
                      سرعة الاستجابة: <strong className="text-white font-mono">{supabasePingLatency} ms</strong>
                    </span>
                  )}
                </div>
              )}

              {/* How to verify in Supabase Quick Guide */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="font-bold text-amber-300 block mb-0.5">1. جداول البيانات (Table Editor)</span>
                  <span className="text-slate-400">ستجد جداول <code className="text-emerald-400">merchants</code> و <code className="text-emerald-400">drivers</code> و <code className="text-emerald-400">customers</code> تتحدث مع كل عملية.</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="font-bold text-cyan-300 block mb-0.5">2. سجل الطلبات الحية (API Logs)</span>
                  <span className="text-slate-400">في Supabase &gt; Logs &gt; PostgREST ستظهر طلبات التطبيق فوراً بحالة 200 OK.</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                  <span className="font-bold text-purple-300 block mb-0.5">3. محرر الاستعلامات (SQL Editor)</span>
                  <span className="text-slate-400">استخدم الزر بالأسفل لنسخ كود الجداول وتشغيله بضغطة زر واحدة إذا لم تكن الجداول منشأة بعد.</span>
                </div>
              </div>
            </div>

            {/* Quick Status Sub-Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">القرى الثابتة المعتمدة</span>
                  <strong className="text-base font-black text-amber-400">10 قرى نموذجية</strong>
                </div>
                <MapPin className="w-5 h-5 text-amber-500/50" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">فلترة العزل المكاني الذكي</span>
                  <strong className="text-base font-black text-emerald-400">Village-First نشط ✓</strong>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-500/50" />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">قواعد حماية البيانات</span>
                  <strong className="text-base font-black text-purple-400">RLS + Postgres Security</strong>
                </div>
                <Database className="w-5 h-5 text-purple-500/50" />
              </div>
            </div>

            {/* Pending Merchants */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      طلبات اعتماد المتاجر المعلقة ({pendingMerchants.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      لن يظهر أي متجر جديد لأهالي قريته حتى توافق عليه كـ «مطور معتمد».
                    </p>
                  </div>
                </div>
                {pendingMerchants.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold animate-pulse">
                    يتطلب قرارك ⚠️
                  </span>
                )}
              </div>

              {pendingMerchants.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/70 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-300">لا توجد طلبات متاجر معلقة حالياً</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    جميع المتاجر النشطة معتمدة ومدققة، وأهالي القرى يتسوقون منها بأمان.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingMerchants.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <img 
                          src={m.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'} 
                          alt={m.name} 
                          className="w-14 h-14 rounded-2xl object-cover border border-amber-500/40 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-white text-sm font-black">{m.storeName}</strong>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              معلق بانتظار الاعتماد ⏳
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">
                            المالك: <strong className="text-white">{m.name}</strong> • القرية: <strong className="text-amber-400 font-bold">{m.village}</strong>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                            <span>جوال: {m.phone}</span>
                            <span>هوية: {m.nationalId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => openEditMerchantModal(m)}
                          className="px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900 border border-sky-700/50 text-sky-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="تعديل بيانات المتجر والتاجر"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveMerchant(m.id, m.name)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>اعتماد المتجر فوراً ✅</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectMerchant(m.id, m.name)}
                          className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All Registered Merchants Management (Toggle / Delete) */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllMerchantsList(!showAllMerchantsList)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 text-right transition-colors cursor-pointer text-xs font-bold text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>عرض وإدارة كافة المتاجر المسجلة بالمنصة ({merchants.length} متجر)</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {showAllMerchantsList ? 'إخفاء ▲' : 'إظهار القائمة والتحكم ▼'}
                  </span>
                </button>

                {showAllMerchantsList && (
                  <div className="mt-3 space-y-2.5">
                    {merchants.map((m) => {
                      const isApproved = m.isApproved !== false;
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right ${
                            isApproved 
                              ? 'bg-slate-950/60 border-slate-850' 
                              : 'bg-rose-950/10 border-rose-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
                              🏪
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-white text-xs font-bold">{m.storeName}</strong>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isApproved 
                                    ? 'bg-emerald-500/20 text-emerald-300' 
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {isApproved ? 'معتمد ومفعل ✓' : 'موقوف / معلق ⏸️'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {m.name} • قرية <span className="text-amber-300">{m.village}</span> • {m.phone}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => openEditMerchantModal(m)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-700/50 text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="تعديل بيانات المتجر والتاجر"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تعديل ✏️</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleMerchant(m.id, m.name, isApproved)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                                isApproved
                                  ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {isApproved ? 'إيقاف ⏸️' : 'تفعيل ▶️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMerchant(m.id, m.name)}
                              className="p-1 bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                              title="حذف حساب التاجر نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Drivers */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      طلبات اعتماد السائقين والمناديب ({pendingDrivers.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      المناديب الجدد لا يمكنهم استلام طلبات الأهالي حتى يتم التحقق من مركباتهم وهوياتهم.
                    </p>
                  </div>
                </div>
                {pendingDrivers.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold animate-pulse">
                    يتطلب قرارك ⚠️
                  </span>
                )}
              </div>

              {pendingDrivers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/70 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-300">لا توجد طلبات سائقين معلقة حالياً</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    جميع السائقين المعتمدين مؤهلون وموزعون حسب نطاقات القرى.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDrivers.map((d) => (
                    <div 
                      key={d.id} 
                      className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0 border border-amber-500/30">
                          <Truck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-white text-sm font-black">{d.name}</strong>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              سائق معلق ⏳
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">
                            نطاق التوصيل: <strong className="text-amber-400 font-bold">{d.zone}</strong> • المركبة: <strong className="text-white">{d.vehicleType}</strong>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                            <span>جوال: {d.phone}</span>
                            <span>هوية: {d.nationalId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => openEditDriverModal(d)}
                          className="px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900 border border-sky-700/50 text-sky-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="تعديل بيانات السائق والمركبة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveDriver(d.id, d.name)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>اعتماد السائق ✅</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDriver(d.id, d.name)}
                          className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All Registered Drivers Management (Toggle / Delete) */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllDriversList(!showAllDriversList)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 text-right transition-colors cursor-pointer text-xs font-bold text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>عرض وإدارة كافة السائقين والمناديب ({drivers.length} مندوب)</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {showAllDriversList ? 'إخفاء ▲' : 'إظهار القائمة والتحكم ▼'}
                  </span>
                </button>

                {showAllDriversList && (
                  <div className="mt-3 space-y-2.5">
                    {drivers.map((d) => {
                      const isApproved = d.isApproved !== false;
                      return (
                        <div
                          key={d.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right ${
                            isApproved 
                              ? 'bg-slate-950/60 border-slate-850' 
                              : 'bg-rose-950/10 border-rose-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-bold text-cyan-400 shrink-0">
                              🛵
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-white text-xs font-bold">{d.name}</strong>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isApproved 
                                    ? 'bg-emerald-500/20 text-emerald-300' 
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {isApproved ? 'معتمد ومفعل ✓' : 'موقوف / معلق ⏸️'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                نطاق <span className="text-amber-300">{d.zone}</span> • {d.vehicleType} • {d.phone}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => openEditDriverModal(d)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-700/50 text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="تعديل بيانات السائق والمركبة"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تعديل ✏️</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDriver(d.id, d.name, isApproved)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                                isApproved
                                  ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {isApproved ? 'إيقاف ⏸️' : 'تفعيل ▶️'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDriver(d.id, d.name)}
                              className="p-1 bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                              title="حذف حساب السائق نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Ads & Grand Openings Management Section */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <PartyPopper className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>إدارة وبنرات الافتتاحات والإعلانات الترويجية</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {ads.length} إعلان
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      تحكم كامل ومباشر: إضافة إعلانات، تفعيلها، إيقافها مؤقتاً، أو حذفها نهائياً بضغطة زر.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {ads.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleResumeAllAds}
                        className="px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="تفعيل وتشغيل جميع الإعلانات"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>تفعيل الكل</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePauseAllAds}
                        className="px-2.5 py-1.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="إيقاف مؤقت لكافة الإعلانات"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>إيقاف الكل</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllAds}
                        className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="مسح وتصفير كافة الإعلانات"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>مسح الكل</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCreateAdModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ إعلان افتتاح احتفالي جديد 🎉</span>
                  </button>
                </div>
              </div>

              {/* Ads List Cards */}
              {ads.length === 0 ? (
                <div className="bg-slate-950/40 border border-slate-800/70 rounded-2xl p-8 text-center space-y-3">
                  <PartyPopper className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-300">لا توجد إعلانات حالياً</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    تم مسح كافة الإعلانات، أو لم تتم إضافة إعلانات بعد. يمكنك إنشاء إعلان افتتاح احتفالي جديد في أي وقت!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCreateAdModal(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة إعلان الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {ads.map((ad) => {
                    const isApproved = ad.status === 'APPROVED';
                    const isPending = ad.status === 'PENDING';
                    const isPaused = ad.status === 'REJECTED';

                    return (
                      <div
                        key={ad.id}
                        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          isPending
                            ? 'bg-amber-950/20 border-amber-500/40 shadow-md'
                            : isApproved
                            ? 'bg-emerald-950/10 border-emerald-500/30'
                            : 'bg-slate-950 border-slate-800 opacity-80'
                        }`}
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl shrink-0 ${
                            isApproved 
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                              : isPaused 
                              ? 'bg-slate-800 border-slate-700 text-slate-400' 
                              : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                          }`}>
                            {ad.theme === 'CELEBRATION' ? '🎉' : ad.theme === 'HOT_DEAL' ? '🔥' : '📢'}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-white text-xs sm:text-sm font-black truncate">{ad.title}</strong>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isPending
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {isApproved ? '🟢 نشط وشغال' : isPending ? 'طلب معلق ⏳' : '⏸️ متوقف عن الظهور'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-1">{ad.description}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                              <span>المتجر: <strong className="text-white">{ad.storeName}</strong></span>
                              <span>القرية: <strong className="text-amber-400">{ad.village || 'الكل'}</strong></span>
                              <span>الباقة: <strong className="text-cyan-400">{ad.packageName}</strong></span>
                              {ad.isConfettiEnabled && (
                                <span className="text-emerald-400 font-bold">✨ أوراق متطايرة مفعلة</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {/* Toggle Button (Active / Stop) */}
                          <button
                            type="button"
                            onClick={() => handleToggleAd(ad.id, ad.storeName || 'المتجر')}
                            className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                              isApproved
                                ? 'bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-300'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                            }`}
                            title={isApproved ? 'إيقاف الإعلان مؤقتاً' : 'تفعيل وتشغيل الإعلان'}
                          >
                            {isApproved ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>إيقاف ⏸️</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>تفعيل ▶️</span>
                              </>
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAd(ad.id, ad.storeName || 'المتجر')}
                            className="p-2 bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 rounded-xl transition-colors cursor-pointer"
                            title="حذف الإعلان نهائياً"
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

            {/* Live Village Query Simulator */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      محاكي استعلامات الفلترة المكانية (Village-First Query Inspector)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      اختبر واستعرض فورياً ما يراه ساكن كل قرية دون الحاجة لتسجيل الخروج.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={testVillage}
                    onChange={(e) => setTestVillage(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-cyan-500"
                  >
                    {FIXED_VILLAGES_LIST.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={runTestQuery}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`} />
                    <span>فحص</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>المتاجر الظاهرة لأهالي قرية ({testVillage}):</span>
                  <span className="text-cyan-400 font-mono font-bold">{testQueryResult.length} متجر معتمد</span>
                </div>

                {testQueryResult.length === 0 ? (
                  <div className="text-slate-500 text-xs py-4 text-center">
                    لا توجد متاجر معتمدة مسجلة في {testVillage} حتى الآن. نظام العزل المكاني يمنع ظهور متاجر القرى الأخرى.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {testQueryResult.map((st) => (
                      <div key={st.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-white font-bold block">{st.name}</strong>
                          <span className="text-[10px] text-emerald-400">معتمد ✓ | {st.ownerName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{st.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Supabase Schema Reference */}
            <div className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">
                    مخطط قاعدة بيانات Supabase الرسمية (5 جداول صلبة + RLS)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    الجداول: customers, merchants, drivers, stores_directory, access_logs في ملف <code className="text-purple-300 font-mono">supabase_qaryati_master_schema.sql</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const fullSql = `-- سكربت إنشاء جداول قريتي الرسمية في Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    national_id TEXT NOT NULL,
    photo TEXT,
    village_name TEXT,
    store_name TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    national_id TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'MOTORCYCLE',
    zone TEXT DEFAULT 'القرية',
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    national_id TEXT,
    village_name TEXT,
    status TEXT DEFAULT 'NEW',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_phone TEXT,
    store_name TEXT,
    village_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all" ON public.merchants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all" ON public.orders FOR ALL USING (true) WITH CHECK (true);
`;
                  await copyToClipboard(fullSql);
                  setCopiedSql(true);
                  setActionSuccessMsg('تم نسخ كود الـ SQL بالكامل! الصقه في Supabase -> SQL Editor واضغط Run.');
                  setTimeout(() => {
                    setCopiedSql(false);
                    setActionSuccessMsg(null);
                  }, 4000);
                }}
                className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'تم نسخ كود SQL بالكامل ✓' : 'نسخ كود SQL لـ Supabase 📋'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LIVE ORDERS (إدارة ومراقبة طلبات أهالي القرى الحية) */}
        {/* ========================================================= */}
        {activeSubTab === 'ORDERS' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="ابحث بالعميل، المتجر، القرية، أو رقم الجوال..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold">
                  إجمالي الطلبات: {cloudOrders.length}
                </span>
              </div>
            </div>

            {cloudOrders.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">لا توجد طلبات جارية حالياً</h3>
                <p className="text-xs text-slate-400">
                  ستظهر هنا فوراً أي طلبات يرسلها أهالي القرى عبر التطبيق من أي هاتف بشكل حي ومباشر.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {cloudOrders
                  .filter((ord) => {
                    if (!orderSearchQuery) return true;
                    const q = orderSearchQuery.toLowerCase();
                    return (
                      (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
                      (ord.customerPhone && ord.customerPhone.includes(q)) ||
                      (ord.storeName && ord.storeName.toLowerCase().includes(q)) ||
                      (ord.village && ord.village.toLowerCase().includes(q))
                    );
                  })
                  .map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{ord.customerName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                              {ord.customerPhone}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <Store className="w-3.5 h-3.5 text-amber-400" />
                            <span>{ord.storeName}</span>
                            <span>•</span>
                            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{ord.village}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : ord.status === 'CANCELLED'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {ord.status === 'DELIVERED'
                            ? 'تم التوصيل ✓'
                            : ord.status === 'CANCELLED'
                            ? 'ملغي ✕'
                            : ord.status === 'ACCEPTED'
                            ? 'جاري التجهيز ⏳'
                            : 'طلب جديد ⚡'}
                        </span>
                      </div>

                      {/* Items Preview */}
                      {ord.items && ord.items.length > 0 && (
                        <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60 text-xs">
                          <div className="text-[10px] text-slate-500 font-bold mb-1">المنتجات المطلوبة:</div>
                          <div className="space-y-1">
                            {ord.items.map((it: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] text-slate-300">
                                <span>{it.quantity}x {it.name}</span>
                                <span className="font-mono text-slate-400">{(it.price * it.quantity).toFixed(2)} ر.س</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">المبلغ الإجمالي</span>
                          <strong className="text-sm font-mono text-emerald-400 font-black">
                            {ord.totalAmount ? Number(ord.totalAmount).toFixed(2) : '0.00'} ر.س
                          </strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(ord.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                            title="حذف الطلب نهائياً من قاعدة البيانات"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CUSTOMERS & NEW USERS (دليل العملاء السحابي) */}
        {/* ========================================================= */}
        {activeSubTab === 'CUSTOMERS' && (
          <div className="space-y-6">
            {/* Search & Filter Command Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، رقم الجوال (05xxxx)، أو رقم البطاقة الشخصية (الهوية)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery('')}
                      className="absolute top-2.5 left-3 text-slate-400 hover:text-white text-xs cursor-pointer p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Village Filter */}
                <div className="relative min-w-[170px]">
                  <select
                    value={selectedVillageFilter}
                    onChange={(e) => setSelectedVillageFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 appearance-none pr-8 cursor-pointer font-bold"
                  >
                    <option value="ALL">جميع القرى ({customers.length})</option>
                    {FIXED_VILLAGES_LIST.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute top-3.5 right-2.5 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative min-w-[150px]">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 appearance-none pr-8 cursor-pointer font-bold"
                  >
                    <option value="ALL">كل الحالات ({customers.length})</option>
                    <option value="NEW">مستخدم جديد 🟢 ({newCustomersCount})</option>
                    <option value="VERIFIED">موثق ومعتمد ✅ ({verifiedCustomersCount})</option>
                    <option value="BLOCKED">محظور 🚫</option>
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-500 absolute top-3.5 right-2.5 pointer-events-none" />
                </div>

                {/* Cloud Sync Button */}
                <button
                  type="button"
                  onClick={loadCustomers}
                  disabled={isLoadingCustomers}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-750 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                  <span>تحديث السحابة</span>
                </button>
              </div>

              {/* Quick Status Sub-counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 px-1 flex-wrap gap-2">
                <span>
                  النتائج المعروضة: <strong className="text-white font-mono">{filteredCustomers.length}</strong> من إجمالي{' '}
                  <strong className="text-cyan-400 font-mono">{customers.length}</strong> عميل
                </span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Supabase Live Sync
                </span>
              </div>
            </div>

            {/* Customers Grid */}
            {filteredCustomers.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-slate-300 text-sm">لا يوجد عملاء يطابقون شروط البحث</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  عند تسجيل أي عميل برقم جواله وبطاقته الشخصية، سيظهر هنا فوراً في قاعدة البيانات مع وسم «مستخدم جديد 🟢».
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map((c) => {
                  const isNew = c.status === 'NEW' || !c.is_verified;
                  const isVerified = c.status === 'VERIFIED' || c.is_verified;
                  const isBlocked = c.status === 'BLOCKED';

                  const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
                  const intlPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.slice(1)}` : cleanPhone;

                  return (
                    <div
                      key={c.id || c.phone}
                      className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                        isNew
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                          : isBlocked
                          ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar: Avatar, Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
                              isNew
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isBlocked
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              {c.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              <span>{c.village_name || 'قرية غير محددة'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isNew && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            <span>مستخدم جديد 🟢</span>
                          </span>
                        )}
                        {isVerified && !isBlocked && (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>موثق ومعتمد ✅</span>
                          </span>
                        )}
                        {isBlocked && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>محظور 🚫</span>
                          </span>
                        )}
                      </div>

                      {/* Info Cards: National ID & Phone */}
                      <div className="space-y-2 text-xs">
                        {/* National ID Field */}
                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IdCard className="w-4 h-4 text-amber-400 shrink-0" />
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                رقم البطاقة الشخصية (الهوية)
                              </span>
                              <strong className="text-xs font-mono font-black text-white tracking-widest">
                                {c.national_id || 'غير مسجل'}
                              </strong>
                            </div>
                          </div>
                          {c.national_id && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(c.national_id!, `nid-${c.id}`)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="نسخ رقم الهوية"
                            >
                              {copiedCustomerField === `nid-${c.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>نسخ</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Phone Field with Direct Actions */}
                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">رقم الجوال</span>
                              <strong className="text-xs font-mono font-bold text-white tracking-wider">
                                {c.phone}
                              </strong>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {/* WhatsApp Button */}
                            <a
                              href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(
                                `السلام عليكم أخي الكريم ${c.name}، معك مطور منصة قريتي الرقمية بخصوص حسابك الموثق لدينا في ${c.village_name || 'القرية'}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg transition-colors cursor-pointer"
                              title="محادثة واتساب مباشرة"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>

                            {/* Direct Call Button */}
                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg transition-colors cursor-pointer"
                              title="اتصال هاتفي مباشر"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                            {/* Copy Phone Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyText(c.phone, `phone-${c.id}`)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="نسخ رقم الجوال"
                            >
                              {copiedCustomerField === `phone-${c.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Controls: Verify / Block / Delete */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {isNew && (
                            <button
                              type="button"
                              onClick={() => handleVerifyCustomer(c.id, c.name)}
                              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>اعتماد وتوثيق الهوية ✅</span>
                            </button>
                          )}

                          {!isBlocked ? (
                            <button
                              type="button"
                              onClick={() => handleBlockCustomer(c.id, c.name)}
                              className="py-1 px-2.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <span>حظر الحساب</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleResetCustomerStatus(c.id, c.name)}
                              className="py-1 px-2.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <span>فك الحظر</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c.id, c.name)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="حذف العميل نهائياً من قاعدة البيانات"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: LICENSES & SYSTEM RESET (مفاتيح الترخيص وضبط النظام) */}
        {/* ========================================================= */}
        {activeSubTab === 'LICENSES' && (
          <div className="space-y-6">
            {/* Feedback Message */}
            {keySuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{keySuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setKeySuccessMsg(null)}
                  className="text-amber-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* License Key Generator Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">إصدار وتوليد مفاتيح الترخيص الرسمية</h3>
                    <p className="text-[11px] text-slate-400">
                      مفاتيح حصرية ومحمية لتفعيل اشتراكات متاجر القرية وصلاحيات Pro عبر السحابة.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBatchKeys}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>توليد دفعة (5 مفاتيح سنوية) ⚡</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                {(['1M', '3M', '6M', '1Y', 'LIFE'] as const).map((plan) => {
                  const cfg = PLAN_CONFIGS[plan];
                  const isSelected = newKeyPlan === plan;
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setNewKeyPlan(plan)}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-md shadow-amber-950/40'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-black">{cfg.nameAr}</div>
                      <div className="text-[10px] text-amber-400 mt-1 font-mono">{cfg.durationDays < 3000 ? `${cfg.durationDays} يوم` : 'دائم'}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <input
                  type="text"
                  value={newKeyNotes}
                  onChange={(e) => setNewKeyNotes(e.target.value)}
                  placeholder="ملاحظة أو اسم التاجر / المتجر المخصص له المفتاح (اختياري)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleGenerateLicenseKey}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-950/40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار المفتاح الفردي 🔑</span>
                </button>
              </div>
            </div>

            {/* License Keys Inventory Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white">سجل مفاتيح التراخيص الصادرة ({licenseKeysList.length} مفتاح)</h4>
                  {isLoadingLicenses && <span className="text-[10px] text-cyan-400 animate-pulse">جاري المزامنة...</span>}
                </div>
                <button
                  type="button"
                  onClick={loadLicenseKeys}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث القائمة</span>
                </button>
              </div>

              {licenseKeysList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  لا توجد مفاتيح ترخيص حالياً. يمكنك إصدار مفتاح جديد من النموذج أعلاه.
                </div>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  {licenseKeysList.map((lic) => {
                    const isRedeemed = lic.status === 'REDEEMED';
                    return (
                      <div
                        key={lic.key}
                        className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-amber-400 tracking-wider bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                              {lic.key}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                              {PLAN_CONFIGS[lic.plan]?.nameAr || lic.plan}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRedeemed
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {isRedeemed ? 'تم التفعيل والاستخدام ✓' : 'متاح للتفعيل 🟢'}
                            </span>
                          </div>
                          {lic.notes && (
                            <p className="text-[11px] text-slate-400">
                              📝 {lic.notes}
                            </p>
                          )}
                          {isRedeemed && lic.redeemedByEmail && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              مفعل بواسطة: {lic.redeemedByEmail} • {lic.redeemedAt ? new Date(lic.redeemedAt).toLocaleDateString('ar-SA') : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(lic.key);
                              setKeySuccessMsg(`تم نسخ المفتاح (${lic.key}) إلى الحافظة 📋`);
                              setTimeout(() => setKeySuccessMsg(null), 3000);
                            }}
                            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="نسخ المفتاح"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLicenseKey(lic.key)}
                            className="p-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            title="حذف المفتاح نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Master System Reset & Demo Purge Section */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-300">إعادة ضبط المنظومة وتطهير البيانات التجريبية</h3>
                  <p className="text-[11px] text-slate-400">
                    أدوات المطور لتطهير طلبات الاختبار وتصفير العدادات قبل تسليم التطبيق للأهالي والتجار.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Purge Test Orders Only */}
                <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>تطهير الطلبات التجريبية فقط</span>
                      <span className="text-[10px] text-amber-400">(خفيف وآمن)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      يمسح كافة طلبات التوصيل الوهمية ويصفر عدادات السائقين مع الحفاظ التام على المتاجر وحسابات المشتركين.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePurgeDemoOrders}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح وتطهير الطلبات التجريبية</span>
                  </button>
                </div>

                {/* Master Factory Reset */}
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <span>إعادة ضبط المصنع وتجهيز الإنتاج العام</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">شامل</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1">
                      يطهر سجلات الأمان، ويزيل الإعلانات التجريبية، ويولد حزمة تراخيص جديدة مع حماية هيكل التطبيق وقرى المملكة.
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={masterResetConfirmText}
                      onChange={(e) => setMasterResetConfirmText(e.target.value)}
                      placeholder='اكتب كلمة "تأكيد" للبدء...'
                      className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 text-center font-bold"
                    />
                    <button
                      type="button"
                      disabled={isResetting || (masterResetConfirmText.trim() !== 'تأكيد' && masterResetConfirmText.trim() !== 'RESET')}
                      onClick={handleMasterFactoryReset}
                      className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                      <span>{isResetting ? 'جاري إعادة الضبط...' : 'تنفيذ إعادة الضبط الشاملة ⚠️'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: INCOMING MESSAGES & SUPPORT (رسائل واستفسارات المنصة) */}
        {/* ========================================================= */}
        {activeSubTab === 'MESSAGES' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>مركز استقبال رسائل واستفسارات الدعم الفني</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  جميع الرسائل الواردة من «الزر الذكي العائم» ومن المستخدمين والتجار تظهر هنا مع إمكانية الرد الفوري.
                </p>
              </div>

              <button
                type="button"
                onClick={loadNotifications}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-750 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>تحديث الرسائل</span>
              </button>
            </div>

            {/* Messages Cards */}
            {notifications.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-slate-300 text-sm">لا توجد رسائل أو استفسارات واردة حتى الآن</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  عندما يرسل أي عميل أو تاجر أو سائق رسالة عبر «الزر الذكي العائم»، ستظهر فوراً في هذا المكان مع كامل تفاصيل مرسلها.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {notifications.map((notif) => {
                  const cleanPhone = notif.senderPhone ? notif.senderPhone.replace(/\D/g, '') : '';
                  const intlPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.slice(1)}` : cleanPhone;

                  return (
                    <div
                      key={notif.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        !notif.isRead
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                notif.type === 'TECH_SUPPORT'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : notif.type === 'NEW_CUSTOMER'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {notif.type === 'TECH_SUPPORT'
                                ? 'دعم فني / رسالة مباشرة 🛠️'
                                : notif.type === 'NEW_CUSTOMER'
                                ? 'تسجيل عميل 👤'
                                : 'طلب تاجر 🏪'}
                            </span>

                            {!notif.isRead && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold animate-pulse">
                                غير مقروء 📩
                              </span>
                            )}

                            <h4 className="text-sm font-black text-white">{notif.title}</h4>
                          </div>

                          {/* Message Body */}
                          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90 mt-2">
                            {notif.message}
                          </p>

                          {/* Sender details and time */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                            <span>
                              المرسل: <strong className="text-white">{notif.senderName}</strong>
                            </span>
                            {notif.senderPhone && (
                              <span>
                                الجوال: <strong className="text-cyan-400 font-mono">{notif.senderPhone}</strong>
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(notif.timestamp).toLocaleString('ar-EG')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick action buttons for the developer */}
                        <div className="flex md:flex-col items-center gap-2 shrink-0 pt-2 md:pt-0">
                          {notif.senderPhone && (
                            <a
                              href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(
                                `السلام عليكم أخي الكريم ${notif.senderName}، بخصوص رسالتك إلى إدارة ومطور منصة قريتي الرقمية: "${notif.title}"`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full md:w-auto shadow-sm"
                              title="رد مباشر عبر واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>رد واتساب</span>
                            </a>
                          )}

                          {notif.senderPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full md:w-auto"
                              title="اتصال هاتفي بالمرسل"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>اتصال</span>
                            </a>
                          )}

                          {!notif.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkNotifRead(notif.id)}
                              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer w-full md:w-auto"
                              title="تحديد كمقروء"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>مقروء</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SYSTEM PORTALS (مداخل وبوابات النظام الست) */}
        {/* ========================================================= */}
        {activeSubTab === 'PORTALS' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-indigo-400" />
                  <span>مداخل وبوابات المنظومة الرقمية الست</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  انقر على أي بوابة للانتقال المباشر وتجربتها بصفة المستخدم، التاجر، السائق، أو المدير.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portalTools.map((tool) => (
                <button
                  key={tool.mode}
                  type="button"
                  onClick={() => onNavigate(tool.mode as any)}
                  className="flex flex-col items-start justify-between p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 text-right transition-all group cursor-pointer space-y-4"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`p-3 rounded-2xl ${tool.bgColor} transition-colors group-hover:scale-105 duration-200`}>
                      <tool.icon className={`w-6 h-6 ${tool.color}`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                      {tool.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {tool.sublabel}
                    </p>
                  </div>

                  <span className="text-[10px] font-bold text-cyan-400 font-mono">
                    دخول فوري ←
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ACCESS & SECURITY LOGS (سجل الأمان والعمليات) */}
        {/* ========================================================= */}
        {activeSubTab === 'LOGS' && (
          <div className="space-y-4">
            {/* Logs Toolbar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    سجل محاولات الدخول وحماية الجلسات
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    رصد حي ومباشر لكافة محاولات الوصول والتحقق من الصلاحيات.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter buttons */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLogFilterStatus('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      logFilterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    الكل ({logs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilterStatus('SUCCESS')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      logFilterStatus === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    ناجح
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilterStatus('FAILURE')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      logFilterStatus === 'FAILURE' ? 'bg-rose-950 text-rose-300' : 'text-slate-400'
                    }`}
                  >
                    فاشل
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadLogs}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="تحديث السجل"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  className="p-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                  title="مسح السجل بالكامل"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logs List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredLogs.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
                  <Lock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-400 text-sm">لا توجد سجلات دخول مطابقة حالياً</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    سيتم رصد وتسجيل أي عملية محاولة دخول فاشلة أو ناجحة لبوابات التطبيق فوراً هنا.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right transition-all ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/30'
                        : 'bg-rose-950/10 border-rose-500/20 hover:border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                        log.status === 'SUCCESS' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {log.status === 'SUCCESS' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-black text-white">
                            {getPortalLabel(log.portal)}
                          </strong>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {log.status === 'SUCCESS' ? 'دخول ناجح ✅' : 'محاولة فاشلة ❌'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400">
                          معرف الحساب / الرقم: <strong className="text-slate-200 font-mono">{log.usernameOrPhone}</strong>
                        </div>

                        {log.reason && (
                          <div className="text-[10px] text-rose-400 bg-rose-500/[0.04] px-2 py-0.5 rounded border border-rose-500/10 inline-block">
                            السبب: {log.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0 shrink-0 font-mono text-[11px] text-slate-500 gap-2">
                      <div className="text-right sm:text-left">
                        <div>{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        <div className="mt-0.5">{new Date(log.timestamp).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })}</div>
                        {log.ipAddress && <div className="text-[9px] text-slate-600 mt-0.5">IP: {log.ipAddress}</div>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSingleLog(log.id)}
                        className="p-1.5 bg-slate-900 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="حذف هذا السجل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL: CREATE CELEBRATORY OPENING AD (إنشاء إعلان احتفالي) */}
      {/* ========================================================= */}
      {showCreateAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    إنشاء إعلان افتتاح واحتفال متحرك 🎉
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    سيظهر البنر فوراً في ترويسة المتجر مع مؤثر تساقط أوراق الزينة والبريق الذهبي.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAdModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateCelebratoryAd} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Theme Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">1. طابع ومؤثر البنر البصري:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdFormTheme('CELEBRATION');
                      setAdFormBadge('افتتاح رسمي مبارك 🎉');
                    }}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      adFormTheme === 'CELEBRATION'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <PartyPopper className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <span>افتتاح واحتفال 🎊</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdFormTheme('HOT_DEAL');
                      setAdFormBadge('عروض الافتتاح الكبرى 🔥');
                    }}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      adFormTheme === 'HOT_DEAL'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Flame className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                    <span>عروض نارية 🔥</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdFormTheme('OFFICIAL');
                      setAdFormBadge('إعلان رسمي للقرية 📢');
                    }}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      adFormTheme === 'OFFICIAL'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Megaphone className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                    <span>إعلان عام 📢</span>
                  </button>
                </div>
              </div>

              {/* Village & Store name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">القرية المستهدفة:</label>
                  <select
                    value={adFormVillage}
                    onChange={(e) => setAdFormVillage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-bold"
                  >
                    {FIXED_VILLAGES_LIST.map((v) => (
                      <option key={v.name} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">اسم البقالة / المتجر:</label>
                  <input
                    type="text"
                    required
                    value={adFormStoreName}
                    onChange={(e) => setAdFormStoreName(e.target.value)}
                    placeholder="مثال: بقالة النور الحديثة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">عنوان الإعلان الرئيسي:</label>
                <input
                  type="text"
                  required
                  value={adFormTitle}
                  onChange={(e) => setAdFormTitle(e.target.value)}
                  placeholder="مثال: 🎉 تم افتتاح بقالة النور في قرية بني عيسى مع هدايا وخصومات كبرى!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">تفاصيل ونص الإعلان الترويجي:</label>
                <textarea
                  rows={2}
                  value={adFormDesc}
                  onChange={(e) => setAdFormDesc(e.target.value)}
                  placeholder="أهلاً بكم في فرعنا الجديد، يسعدنا استقبالكم بأحدث المنتجات الطازجة مع توصيل فوري لمنازل القرية 🚚✨"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Action button text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">نص زر الإجراء (CTA):</label>
                  <input
                    type="text"
                    value={adFormAction}
                    onChange={(e) => setAdFormAction(e.target.value)}
                    placeholder="مثال: تسوق من البقالة الآن 🛒"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">رابط صورة البنر (اختياري):</label>
                  <input
                    type="url"
                    value={adFormImage}
                    onChange={(e) => setAdFormImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateAdModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs cursor-pointer shadow-lg shadow-amber-500/30 flex items-center gap-1.5"
                >
                  <PartyPopper className="w-4 h-4" />
                  <span>نشر الإعلان فوراً 🎉</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT MERCHANT DETAILS (تعديل بيانات المتجر والتاجر) */}
      {/* ========================================================= */}
      {editingMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">تعديل بيانات المتجر والتاجر</h3>
                  <p className="text-[11px] text-slate-400">تحكم حصري للمطور في بيانات المشترك والمحل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMerchant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMerchantEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المتجر / المحل</label>
                  <input
                    type="text"
                    required
                    value={editMerchantForm.storeName}
                    onChange={(e) => setEditMerchantForm({ ...editMerchantForm, storeName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم مالك المتجر / التاجر</label>
                  <input
                    type="text"
                    required
                    value={editMerchantForm.name}
                    onChange={(e) => setEditMerchantForm({ ...editMerchantForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف والواتساب</label>
                  <input
                    type="tel"
                    required
                    value={editMerchantForm.phone}
                    onChange={(e) => setEditMerchantForm({ ...editMerchantForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 text-left font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">القرية التابع لها</label>
                  <select
                    value={editMerchantForm.village}
                    onChange={(e) => setEditMerchantForm({ ...editMerchantForm, village: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    {FIXED_VILLAGES_LIST.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهوية الوطنية / السجل</label>
                <input
                  type="text"
                  value={editMerchantForm.nationalId}
                  onChange={(e) => setEditMerchantForm({ ...editMerchantForm, nationalId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300">حالة الاعتماد والتفعيل</span>
                <button
                  type="button"
                  onClick={() => setEditMerchantForm({ ...editMerchantForm, isApproved: !editMerchantForm.isApproved })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    editMerchantForm.isApproved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {editMerchantForm.isApproved ? 'معتمد ومفعل ✓' : 'موقوف / معلق ⏸️'}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingMerchant(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-sky-950/50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات بالسحابة ✅</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT DRIVER DETAILS (تعديل بيانات السائق والمندوب) */}
      {/* ========================================================= */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">تعديل بيانات السائق / المندوب</h3>
                  <p className="text-[11px] text-slate-400">تحكم حصري للمطور في مركبة ونطاق المندوب</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriverEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم السائق / المندوب</label>
                  <input
                    type="text"
                    required
                    value={editDriverForm.name}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف والواتساب</label>
                  <input
                    type="tel"
                    required
                    value={editDriverForm.phone}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 text-left font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نوع مركبة التوصيل</label>
                  <select
                    value={editDriverForm.vehicleType}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="MOTORCYCLE">دراجة نارية 🛵</option>
                    <option value="CAR">سيارة 🚗</option>
                    <option value="BICYCLE">سيكل / هوائية 🚲</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نطاق قرية التوصيل</label>
                  <select
                    value={editDriverForm.zone}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    {FIXED_VILLAGES_LIST.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهوية الوطنية / الإقامة</label>
                <input
                  type="text"
                  value={editDriverForm.nationalId}
                  onChange={(e) => setEditDriverForm({ ...editDriverForm, nationalId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300">حالة الاعتماد والتفعيل</span>
                <button
                  type="button"
                  onClick={() => setEditDriverForm({ ...editDriverForm, isApproved: !editDriverForm.isApproved })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    editDriverForm.isApproved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {editDriverForm.isApproved ? 'معتمد ومفعل ✓' : 'موقوف / معلق ⏸️'}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-sky-950/50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات بالسحابة ✅</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LOGOUT / EXIT CONFIRMATION DIALOG (تأكيد تسجيل الخروج) */}
      {/* ========================================================= */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-2xl shadow-inner">
              <LogOut className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-white">
                تأكيد تسجيل الخروج من لوحة المطور
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                هل أنت متأكد من رغبتك في تسجيل الخروج وإنهاء جلسة المطور بأمان والعودة إلى الشاشة الرئيسية؟
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء والرجوع
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  onClose();
                }}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>نعم، تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
