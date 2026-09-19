import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Store,
  Crown,
  Truck,
  Users,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Home,
  RefreshCw,
  TrendingUp,
  Settings,
  DollarSign,
  Phone,
  MapPin,
  Sparkles,
  Lock,
  Eye,
  Barcode,
  Megaphone,
  Globe,
  Sliders,
  Copy,
  Check,
  Trash2,
  KeyRound,
  Camera,
  Volume2,
  Printer,
  FileText,
  Share2,
  CheckSquare,
  Square,
  QrCode,
  Tag,
  Palette,
  ExternalLink,
  Code2,
  Info,
  PackagePlus,
  LogOut,
  Edit3,
  Save,
} from 'lucide-react';
import { clearAllSystemSessions } from '../services/rbacAuthService';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { StoreDirectoryRecord, DeliveryOrder, StoreSettings, LicenseKeyRecord } from '../types';
import {
  getStoresDirectory,
  saveStoresDirectory,
  addStoreToDirectory,
  toggleStoreProStatus,
  getDeliveryOrders,
  createDeliveryOrder
} from '../services/deliveryService';
import {
  createLicenseKey,
  fetchAllLicenseKeys,
  deleteLicenseKey,
  PLAN_CONFIGS
} from '../services/licenseKeyService';
import {
  PlatformAd,
  BarcodePlatformConfig,
  PlatformDeveloperSettings,
  getPlatformAds,
  savePlatformAds,
  addPlatformAd,
  togglePlatformAdStatus,
  deletePlatformAd,
  getBarcodePlatformConfig,
  saveBarcodePlatformConfig,
  getPlatformDeveloperSettings,
  savePlatformDeveloperSettings,
  getApprovedVillages,
  addApprovedVillage,
  deleteApprovedVillage
} from '../services/platformSettingsService';

interface PlatformAdminViewProps {
  settings: StoreSettings;
  isRTL: boolean;
  onReturnToStore: () => void;
  onOpenMerchant: (storeInfo?: { name: string; village: string; isPro?: boolean; merchantPin?: string }) => void;
  onOpenLanding: () => void;
}

type AdminTab = 'LICENSES' | 'BARCODE' | 'ADS' | 'SETTINGS' | 'LANGUAGE' | 'STORES_ORDERS' | 'VILLAGES_STORES';

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  settings: propSettings,
  isRTL: propIsRTL,
  onReturnToStore,
  onOpenMerchant,
  onOpenLanding,
}) => {
  const {
    settings,
    updateSettings,
    language,
    setLanguage,
    isRTL,
    items,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('LICENSES');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // --- Subscriptions & Licenses State ---
  const [keysList, setKeysList] = useState<LicenseKeyRecord[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LicenseKeyRecord['plan']>('1Y');
  const [licenseNotes, setLicenseNotes] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [latestGenerated, setLatestGenerated] = useState<LicenseKeyRecord | null>(null);
  const [keysSearchQuery, setKeysSearchQuery] = useState('');

  const loadLicenseKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const keys = await fetchAllLicenseKeys();
      setKeysList(keys);
    } catch (e) {
      console.warn('Failed to load license keys:', e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadLicenseKeys();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createLicenseKey(selectedPlan, licenseNotes.trim(), 'Platform Developer');
      if (res.success && res.record) {
        setLatestGenerated(res.record);
        setLicenseNotes('');
        showToast(`تم إنشاء مفتاح الترخيص بنجاح: ${res.record.key}`);
        loadLicenseKeys();
      }
    } catch {
      showToast('حدث خطأ أثناء توليد المفتاح');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('تم نسخ مفتاح الترخيص إلى الحافظة');
  };

  const handleDeleteKey = async (keyId: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف مفتاح الترخيص هذا؟')) {
      await deleteLicenseKey(keyId);
      loadLicenseKeys();
      showToast('تم حذف مفتاح الترخيص');
    }
  };

  // --- Barcode Engine & Templates State ---
  const [barcodeConfig, setBarcodeConfig] = useState<BarcodePlatformConfig>(() => getBarcodePlatformConfig());
  const [testBarcodeText, setTestBarcodeText] = useState('6281000123456');
  const [testBarcodeFormat, setTestBarcodeFormat] = useState<'CODE128' | 'EAN13'>('CODE128');
  const [testQrUrl, setTestQrUrl] = useState<string>('');
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Render barcode whenever testBarcodeText changes
  useEffect(() => {
    if (barcodeSvgRef.current && testBarcodeText.trim()) {
      try {
        JsBarcode(barcodeSvgRef.current, testBarcodeText.trim(), {
          format: testBarcodeFormat,
          width: 2,
          height: 50,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        // Fallback to code128 if EAN13 checksum fails
        try {
          JsBarcode(barcodeSvgRef.current, testBarcodeText.trim(), {
            format: 'CODE128',
            width: 2,
            height: 50,
            displayValue: true,
          });
        } catch {}
      }
    }

    if (testBarcodeText.trim()) {
      QRCode.toDataURL(testBarcodeText.trim(), { width: 120, margin: 1 })
        .then((url) => setTestQrUrl(url))
        .catch(() => setTestQrUrl(''));
    }
  }, [testBarcodeText, testBarcodeFormat, activeTab]);

  const handleSaveBarcodeConfig = () => {
    saveBarcodePlatformConfig(barcodeConfig);
    // Also synchronize sticker settings to store settings
    updateSettings({
      stickerSettings: {
        ...settings.stickerSettings,
        showStoreName: barcodeConfig.showStoreNameOnSticker,
        showPrice: barcodeConfig.showPriceOnSticker,
        showBarcodeText: barcodeConfig.showBarcodeTextOnSticker,
        showItemName: barcodeConfig.showItemNameOnSticker,
        labelWidthMm: barcodeConfig.stickerLabelWidthMm,
        labelHeightMm: barcodeConfig.stickerLabelHeightMm,
        fontSize: barcodeConfig.stickerFontSize,
      }
    });
    showToast('تم حفظ وتطبيق إعدادات نظام وقارئ الباركود بنجاح');
  };

  // --- Ads & Campaign Manager State ---
  const [adsList, setAdsList] = useState<PlatformAd[]>(() => getPlatformAds());
  const [showAddAdModal, setShowAddAdModal] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdSubtitle, setNewAdSubtitle] = useState('');
  const [newAdBadge, setNewAdBadge] = useState('عرض خاص 🌟');
  const [newAdCode, setNewAdCode] = useState('');
  const [newAdGradient, setNewAdGradient] = useState('from-emerald-600 via-teal-600 to-cyan-700');

  const handleAddAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim()) return;
    addPlatformAd({
      title: newAdTitle.trim(),
      subtitle: newAdSubtitle.trim() || 'عرض حصري لأهالي القرية الكرام',
      badge: newAdBadge.trim() || 'عرض مميز',
      discountCode: newAdCode.trim() || undefined,
      actionText: 'تصفح العرض',
      bgGradient: newAdGradient,
      isActive: true,
    });
    setAdsList(getPlatformAds());
    setNewAdTitle('');
    setNewAdSubtitle('');
    setNewAdCode('');
    setShowAddAdModal(false);
    showToast('تمت إضافة الإعلان الترويجي ونشره في متجر القرية');
  };

  const handleToggleAd = (id: string) => {
    togglePlatformAdStatus(id);
    setAdsList(getPlatformAds());
    showToast('تم تحديث حالة الإعلان');
  };

  const handleDeleteAd = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
      deletePlatformAd(id);
      setAdsList(getPlatformAds());
      showToast('تم حذف الإعلان');
    }
  };

  // --- Platform & App Global Developer Settings ---
  const [devSettings, setDevSettings] = useState<PlatformDeveloperSettings>(() => getPlatformDeveloperSettings());
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSaveDeveloperSettings = (e: React.FormEvent) => {
    e.preventDefault();
    let updated = { ...devSettings };
    if (newPin.trim()) {
      if (newPin !== confirmPin) {
        alert('رمز PIN الجديد غير متطابق مع التأكيد');
        return;
      }
      updated.developerPin = newPin.trim();
    }
    savePlatformDeveloperSettings(updated);
    // Sync with global store settings
    updateSettings({
      storeName: updated.platformName,
      phone: updated.supportPhone,
      currency: updated.defaultCurrency,
      footerNote: updated.receiptFooterNote,
    });
    setNewPin('');
    setConfirmPin('');
    showToast('تم حفظ إعدادات المنصة وحساب المطور وتطبيقها بنجاح');
  };

  // --- Stores Directory & Orders State ---
  const [stores, setStores] = useState<StoreDirectoryRecord[]>(() => getStoresDirectory());
  const [orders, setOrders] = useState<DeliveryOrder[]>(() => getDeliveryOrders());
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [newMerchantPin, setNewMerchantPin] = useState('1234');
  const [newIsPro, setNewIsPro] = useState(true);
  const [createdStoreModal, setCreatedStoreModal] = useState<StoreDirectoryRecord | null>(null);

  // --- Approved Villages & Store Editing State ---
  const [approvedVillages, setApprovedVillages] = useState<string[]>(() => getApprovedVillages());
  const [newVillageInput, setNewVillageInput] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editStoreName, setEditStoreName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [suspendModalStore, setSuspendModalStore] = useState<StoreDirectoryRecord | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState('');

  const handleOpenSuspendModal = (store: StoreDirectoryRecord) => {
    setSuspendModalStore(store);
    setSuspendReasonInput(store.suspendReason || '');
  };

  const handleConfirmSuspend = () => {
    if (!suspendModalStore) return;
    const currentStores = getStoresDirectory();
    const updated = currentStores.map((s) => {
      if (s.id === suspendModalStore.id) {
        return {
          ...s,
          status: 'SUSPENDED' as const,
          suspendReason: suspendReasonInput.trim() || 'تم حظر وتجميد المتجر من قِبل إدارة المنصة لمخالفة الشروط والأحكام.',
        };
      }
      return s;
    });
    saveStoresDirectory(updated);
    setStores(updated);
    setSuspendModalStore(null);
    setSuspendReasonInput('');
    showToast('تم حظر وتجميد المتجر بنجاح وإخفائه من تطبيق العملاء');
  };

  const handleUnsuspendStore = (storeId: string) => {
    const currentStores = getStoresDirectory();
    const updated = currentStores.map((s) => {
      if (s.id === storeId) {
        return {
          ...s,
          status: 'ACTIVE' as const,
          suspendReason: undefined,
        };
      }
      return s;
    });
    saveStoresDirectory(updated);
    setStores(updated);
    showToast('تم إلغاء الحظر وإعادة تنشيط المتجر بنجاح');
  };

  const handleDeleteStorePermanent = (storeId: string, storeName: string) => {
    if (confirm(`⚠️ هل أنت متأكد من الحذف النهائي للمتجر "${storeName}"؟ سيتم إزالته تماماً من المنصة ولن يظهر في تطبيق العملاء أبداً.`)) {
      const currentStores = getStoresDirectory();
      const updated = currentStores.filter((s) => s.id !== storeId);
      saveStoresDirectory(updated);
      setStores(updated);
      showToast(`تم الحذف النهائي للمتجر ${storeName}`);
    }
  };

  const handleAddVillageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVillageInput.trim()) return;
    const updated = addApprovedVillage(newVillageInput.trim());
    setApprovedVillages(updated);
    setNewVillageInput('');
    showToast('تمت إضافة القرية المعتمدة بنجاح');
  };

  const handleDeleteVillageItem = (vil: string) => {
    if (confirm(`هل أنت متأكد من حذف ${vil} من قائمة القرى المعتمدة؟`)) {
      const updated = deleteApprovedVillage(vil);
      setApprovedVillages(updated);
      showToast('تم حذف القرية بنجاح');
    }
  };

  const handleStartEditStore = (store: StoreDirectoryRecord) => {
    setEditingStoreId(store.id);
    setEditStoreName(store.name);
    setEditOwnerName(store.ownerName);
    setEditPhone(store.phone);
    setEditVillage(store.cityOrVillage);
    setEditStatus(store.status || 'ACTIVE');
  };

  const handleSaveStoreEdit = (storeId: string) => {
    const currentStores = getStoresDirectory();
    const updated = currentStores.map((s) => {
      if (s.id === storeId) {
        return {
          ...s,
          name: editStoreName.trim() || s.name,
          ownerName: editOwnerName.trim() || s.ownerName,
          phone: editPhone.trim() || s.phone,
          cityOrVillage: editVillage.trim() || s.cityOrVillage,
          status: editStatus,
        };
      }
      return s;
    });
    saveStoresDirectory(updated);
    setStores(updated);
    setEditingStoreId(null);
    showToast('تم تحديث بيانات المتجر بنجاح بواسطة المطور');
  };

  const refreshStoresAndOrders = () => {
    setStores(getStoresDirectory());
    setOrders(getDeliveryOrders());
  };

  const handleToggleStorePro = (storeId: string) => {
    toggleStoreProStatus(storeId);
    refreshStoresAndOrders();
    showToast('تم تغيير ترخيص المتجر بنجاح');
  };

  const handleAddStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newPhone.trim()) return;
    const addedStore = addStoreToDirectory({
      name: newStoreName.trim(),
      ownerName: newOwnerName.trim() || 'صاحب المتجر',
      phone: newPhone.trim(),
      cityOrVillage: newVillage.trim() || 'القرية',
      itemsCount: 0,
      isPro: newIsPro,
      planName: newIsPro ? 'باقة PRO (مفعلة من مالك المنصة)' : 'الباقة المجانية',
      status: 'ACTIVE',
      merchantPin: newMerchantPin.trim() || '1234',
    });
    setCreatedStoreModal(addedStore);
    setNewStoreName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewVillage('');
    setNewMerchantPin('1234');
    setShowAddStoreModal(false);
    refreshStoresAndOrders();
    showToast(`تمت إضافة المتجر وفتح حسابه المحمي: ${addedStore.name}`);
  };

  const proStoresCount = stores.filter((s) => s.isPro).length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-12"
    >
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-purple-900/30 px-4 py-3 shadow-lg shadow-purple-950/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-950/60">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base text-white">
                  لوحة تحكم مطور ومالك المنصة
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Platform Owner & Dev
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                الباركود • الاشتراكات والتراخيص • الإعلانات • إعدادات التطبيق واللغة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReturnToStore}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">متجر القرية</span>
            </button>

            <button
              type="button"
              onClick={onOpenMerchant}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">لوحة التاجر</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearAllSystemSessions();
                onOpenLanding();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 hover:text-white border border-rose-600/50 hover:border-rose-500 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              title="تسجيل الخروج الفوري ومسح الجلسة"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">تسجيل خروج</span>
            </button>

            <button
              type="button"
              onClick={onOpenLanding}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="العودة للشاشة الرئيسية"
            >
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto w-full flex-1 p-4 sm:p-6 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>مفاتيح التراخيص الصادرة</span>
            </span>
            <div className="text-2xl font-black text-amber-300 font-mono mt-1">{keysList.length}</div>
            <span className="text-[10px] text-slate-500">
              {keysList.filter((k) => !k.is_used).length} مفتاح جاهز للتفعيل
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>الإعلانات الترويجية</span>
            </span>
            <div className="text-2xl font-black text-cyan-300 font-mono mt-1">{adsList.length}</div>
            <span className="text-[10px] text-slate-500">
              {adsList.filter((a) => a.isActive).length} إعلان نشط بمتجر القرية
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-purple-400" />
              <span>نظام الباركود</span>
            </span>
            <div className="text-sm font-black text-purple-300 mt-2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>{barcodeConfig.defaultCamera === 'environment' ? 'الكاميرا الخلفية' : 'الأمامية'}</span>
            </div>
            <span className="text-[10px] text-slate-500">مع ملصقات {barcodeConfig.stickerLabelWidthMm}x{barcodeConfig.stickerLabelHeightMm} مم</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>شبكة المتاجر المشتركة</span>
            </span>
            <div className="text-2xl font-black text-emerald-300 font-mono mt-1">{stores.length}</div>
            <span className="text-[10px] text-slate-500">{proStoresCount} متجر بباقة PRO</span>
          </div>
        </div>

        {/* Primary Unified Navigation Tabs */}
        <div className="bg-slate-900/90 border border-purple-900/30 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('LICENSES')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LICENSES'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>الاشتراكات والتراخيص ({keysList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BARCODE')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'BARCODE'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-purple-400" />
            <span>إدارة الباركود والملصقات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ADS')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ADS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>الإعلانات والترويج ({adsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span>إعدادات التطبيق والمنصة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LANGUAGE')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LANGUAGE'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>اللغة والواجهة ({language === 'ar' ? 'العربية' : 'English'})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STORES_ORDERS')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'STORES_ORDERS'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-teal-400" />
            <span>المتاجر والطلبات ({stores.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VILLAGES_STORES')}
            className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'VILLAGES_STORES'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>إدارة القرى والمتاجر المستقلة ({approvedVillages.length})</span>
          </button>
        </div>

        {/* TAB 1: SUBSCRIPTIONS & LICENSES */}
        {activeTab === 'LICENSES' && (
          <div className="space-y-5">
            {/* Generate Key Form */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-black text-base text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <span>توليد وإصدار مفاتيح تراخيص باقات PRO</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    قم بإنشاء مفاتيح تفعيل مشفرة لتزويد تجار القرية والمشتركين بباقة PRO غير المحدودة.
                  </p>
                </div>
                <div className="text-xs font-mono text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  صيغة المفتاح: FLOW-XXXX-XXXX-XXXX
                </div>
              </div>

              <form onSubmit={handleGenerateKey} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نوع باقة الترخيص</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="1M">شهر واحد (30 يوم) - 49 ر.س</option>
                    <option value="3M">3 أشهر (90 يوم) - 129 ر.س</option>
                    <option value="6M">6 أشهر (180 يوم) - 229 ر.س</option>
                    <option value="1Y">سنة كاملة (365 يوم) - 399 ر.س</option>
                    <option value="LIFE">رخصة دائمة مدى الحياة - 890 ر.س</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات أو اسم المتجر التابع له</label>
                  <input
                    type="text"
                    value={licenseNotes}
                    onChange={(e) => setLicenseNotes(e.target.value)}
                    placeholder="مثال: تموينات الفلاح - أبو عبد الله"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>توليد مفتاح ترخيص فوري</span>
                  </button>
                </div>
              </form>

              {/* Latest Generated Alert Banner */}
              {latestGenerated && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
                  <div>
                    <div className="text-[11px] font-bold text-purple-300">تم إصدار المفتاح الجديد بنجاح:</div>
                    <div className="font-mono text-base font-black text-white mt-0.5 tracking-wider">
                      {latestGenerated.key}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      الخطة: {PLAN_CONFIGS[latestGenerated.plan]?.nameAr} {latestGenerated.notes ? `• ${latestGenerated.notes}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(latestGenerated.key)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {copiedKey === latestGenerated.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === latestGenerated.key ? 'تم النسخ!' : 'نسخ المفتاح'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Keys Table & Management */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-sm text-white">سجل مفاتيح التراخيص الصادرة ({keysList.length})</h3>
                  <p className="text-xs text-slate-400">قائمة المفاتيح وحالة استخدامها في المتاجر</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
                    <input
                      type="text"
                      value={keysSearchQuery}
                      onChange={(e) => setKeysSearchQuery(e.target.value)}
                      placeholder="بحث عن مفتاح أو متجر..."
                      className="bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadLicenseKeys}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="تحديث القائمة"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 font-bold">مفتاح الترخيص</th>
                      <th className="pb-2.5 font-bold">الباقة والمدة</th>
                      <th className="pb-2.5 font-bold">حالة الاستخدام</th>
                      <th className="pb-2.5 font-bold">تاريخ الإصدار</th>
                      <th className="pb-2.5 font-bold">المتجر / الملاحظة</th>
                      <th className="pb-2.5 font-bold text-left">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {keysList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          لا توجد مفاتيح تراخيص صادرة حالياً. استخدم النموذج أعلاه لإنشاء أول مفتاح.
                        </td>
                      </tr>
                    ) : (
                      keysList
                        .filter(
                          (k) =>
                            k.key.toLowerCase().includes(keysSearchQuery.toLowerCase()) ||
                            (k.notes && k.notes.toLowerCase().includes(keysSearchQuery.toLowerCase()))
                        )
                        .map((keyRec) => (
                          <tr key={keyRec.id} className="hover:bg-slate-850/50">
                            <td className="py-3 font-mono font-bold text-white tracking-wide">
                              {keyRec.key}
                            </td>
                            <td className="py-3 text-slate-300 font-medium">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {PLAN_CONFIGS[keyRec.plan]?.nameAr || keyRec.plan}
                              </span>
                            </td>
                            <td className="py-3">
                              {keyRec.is_used ? (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                                  <Lock className="w-3 h-3" /> تم التفعيل
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> متاح وجاهز
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-slate-400 font-mono text-[11px]">
                              {new Date(keyRec.created_at).toLocaleDateString('ar-SA')}
                            </td>
                            <td className="py-3 text-slate-300 max-w-[150px] truncate">
                              {keyRec.notes || '—'}
                            </td>
                            <td className="py-3 text-left">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(keyRec.key)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                  title="نسخ المفتاح"
                                >
                                  {copiedKey === keyRec.key ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKey(keyRec.id)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="حذف المفتاح"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BARCODE & STICKERS ENGINE */}
        {activeTab === 'BARCODE' && (
          <div className="space-y-5">
            {/* Live Interactive Barcode Tester */}
            <div className="bg-slate-900/90 border border-purple-900/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-black text-base text-white flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-purple-400" />
                    <span>مختبر ومولد الباركود التفاعلي للمطور</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    اختبر توليد وقراءة الباركود، رموز الاستجابة السريعة (QR)، وتخصيص ملصقات الأسعار بدقة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">تنسيق الرمز:</span>
                  <button
                    type="button"
                    onClick={() => setTestBarcodeFormat('CODE128')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      testBarcodeFormat === 'CODE128'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    CODE-128
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestBarcodeFormat('EAN13')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      testBarcodeFormat === 'EAN13'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    EAN-13
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      النص أو الرقم لاختبار التوليد (رمز الصنف)
                    </label>
                    <input
                      type="text"
                      value={testBarcodeText}
                      onChange={(e) => setTestBarcodeText(e.target.value)}
                      placeholder="أدخل أي رقم أو باركود..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                    <span className="font-bold">أمثلة سريعة:</span>
                    <button
                      type="button"
                      onClick={() => setTestBarcodeText('6281000123456')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono"
                    >
                      6281000123456
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestBarcodeText('FLOW-ITEM-9988')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono"
                    >
                      FLOW-ITEM-9988
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestBarcodeText('100000000001')}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono"
                    >
                      100000000001
                    </button>
                  </div>
                </div>

                {/* Live Sticker Card Preview */}
                <div className="bg-white text-slate-900 rounded-2xl p-4 shadow-xl border border-slate-200 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
                  {barcodeConfig.showStoreNameOnSticker && (
                    <div className="text-[11px] font-black text-slate-800 border-b border-slate-200 pb-1 w-full truncate">
                      {settings.storeName || 'متجر قريتي'}
                    </div>
                  )}

                  {barcodeConfig.showItemNameOnSticker && (
                    <div className="text-xs font-bold text-slate-900 mt-1.5 truncate max-w-full">
                      صنف تجريبي للمعاينة
                    </div>
                  )}

                  <div className="my-2 bg-white flex items-center justify-center overflow-hidden">
                    <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
                  </div>

                  <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200">
                    {barcodeConfig.showPriceOnSticker && (
                      <div className="text-xs font-black text-emerald-700 font-mono">
                        السعر: 15.00 {settings.currency || 'ر.س'}
                      </div>
                    )}
                    {testQrUrl && (
                      <img src={testQrUrl} alt="QR" className="w-7 h-7 rounded border border-slate-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scanner Engine & Sticker Dimensions Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scanner Engine Config */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">إعدادات قارئ وكاميرا الباركود</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الكاميرا الافتراضية للماسح</label>
                    <select
                      value={barcodeConfig.defaultCamera}
                      onChange={(e) =>
                        setBarcodeConfig({ ...barcodeConfig, defaultCamera: e.target.value as any })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="environment">الكاميرا الخلفية (Environment / Back) - مستحسن للهواتف</option>
                      <option value="user">الكاميرا الأمامية (User / Front) - لأجهزة التابلت والشاشات</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeConfig.soundBeep}
                        onChange={(e) =>
                          setBarcodeConfig({ ...barcodeConfig, soundBeep: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                      />
                      <span>تشغيل صفير صوتي (Beep Sound) عند مسح أي باركود بنجاح</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeConfig.vibrateOnScan}
                        onChange={(e) =>
                          setBarcodeConfig({ ...barcodeConfig, vibrateOnScan: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                      />
                      <span>اهتزاز الهاتف (Haptic Vibration) عند اكتمال القراءة</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeConfig.autoAddQuantity}
                        onChange={(e) =>
                          setBarcodeConfig({ ...barcodeConfig, autoAddQuantity: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                      />
                      <span>زيادة الكمية تلقائياً (+1) عند تكرار قراءة نفس الباركود في الكاشير</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Printable Sticker Dimensions Config */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">إعدادات ملصقات وطباعة الباركود</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">عرض الملصق (مم mm)</label>
                      <input
                        type="number"
                        value={barcodeConfig.stickerLabelWidthMm}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            stickerLabelWidthMm: Number(e.target.value) || 38,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">ارتفاع الملصق (مم mm)</label>
                      <input
                        type="number"
                        value={barcodeConfig.stickerLabelHeightMm}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            stickerLabelHeightMm: Number(e.target.value) || 25,
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeConfig.showStoreNameOnSticker}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            showStoreNameOnSticker: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                      />
                      <span>طباعة اسم المتجر في أعلى الملصق</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeConfig.showItemNameOnSticker}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            showItemNameOnSticker: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                      />
                      <span>طباعة اسم الصنف والمنتج</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeConfig.showPriceOnSticker}
                        onChange={(e) =>
                          setBarcodeConfig({
                            ...barcodeConfig,
                            showPriceOnSticker: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                      />
                      <span>طباعة سعر البيع والعملة</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveBarcodeConfig}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                  >
                    حفظ وتطبيق إعدادات الباركود والملصقات
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADS & ANNOUNCEMENTS MANAGER */}
        {activeTab === 'ADS' && (
          <div className="space-y-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-black text-base text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-cyan-400" />
                    <span>إدارة الإعلانات الترويجية وعروض متجر القرية</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تظهر هذه الإعلانات في شريط الترويج أعلى متجر القرية والعملاء وتطبيق الجوال لجذب الزبائن وزيادة المبيعات.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAdModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة إعلان ترويجي جديد</span>
                </button>
              </div>

              {/* Ads Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {adsList.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                    لا توجد إعلانات ترويجية حالياً. اضغط على "إضافة إعلان جديد" لتنشيط أول حملة ترويجية.
                  </div>
                ) : (
                  adsList.map((ad) => (
                    <div
                      key={ad.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group"
                    >
                      {/* Live Banner Preview Inside Ad Card */}
                      <div
                        className={`bg-gradient-to-r ${ad.bgGradient} rounded-xl p-3.5 text-white shadow-md relative overflow-hidden`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-md">
                            {ad.badge}
                          </span>
                          {ad.discountCode && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-slate-900">
                              كود: {ad.discountCode}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-white">{ad.title}</h4>
                        <p className="text-[11px] text-white/80 mt-0.5 line-clamp-2">{ad.subtitle}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">الحالة:</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ad.isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ad.isActive ? 'نشط في المتجر' : 'متوقف'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleAd(ad.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            {ad.isActive ? 'إيقاف مؤقت' : 'تفعيل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAd(ad.id)}
                            className="p-1.5 rounded-lg bg-slate-850 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="حذف الإعلان"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: APP & PLATFORM SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="space-y-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <h2 className="font-black text-base text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-400" />
                  <span>إعدادات التطبيق العامة وهوية منصة المطور</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  التحكم في بيانات المنصة، العملة الافتراضية، نسبة الضريبة، ورمز PIN لحماية لوحة المطور.
                </p>
              </div>

              <form onSubmit={handleSaveDeveloperSettings} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم المنصة أو التطبيق الموحد</label>
                    <input
                      type="text"
                      required
                      value={devSettings.platformName}
                      onChange={(e) => setDevSettings({ ...devSettings, platformName: e.target.value })}
                      placeholder="مثال: منصة قريتي الموحدة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم مطور ومالك المنصة</label>
                    <input
                      type="text"
                      value={devSettings.developerOwnerName}
                      onChange={(e) => setDevSettings({ ...devSettings, developerOwnerName: e.target.value })}
                      placeholder="مثال: مطور ومالك المنصة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">رقم هاتف الدعم الفني وواتساب المنصة</label>
                    <input
                      type="tel"
                      value={devSettings.supportPhone}
                      onChange={(e) => setDevSettings({ ...devSettings, supportPhone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني للمطور</label>
                    <input
                      type="email"
                      value={devSettings.supportEmail}
                      onChange={(e) => setDevSettings({ ...devSettings, supportEmail: e.target.value })}
                      placeholder="developer@qaryati.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">العملة الافتراضية للنظام</label>
                    <input
                      type="text"
                      value={devSettings.defaultCurrency}
                      onChange={(e) => setDevSettings({ ...devSettings, defaultCurrency: e.target.value })}
                      placeholder="ر.س"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
                    <input
                      type="number"
                      value={devSettings.taxRatePercent}
                      onChange={(e) => setDevSettings({ ...devSettings, taxRatePercent: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تذييل الفواتير والإيصالات الافتراضي</label>
                  <textarea
                    rows={2}
                    value={devSettings.receiptFooterNote}
                    onChange={(e) => setDevSettings({ ...devSettings, receiptFooterNote: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    إعلان وتنبيه المنصة العام (خاص بمطور ومالك المنصة 📢)
                  </label>
                  <input
                    type="text"
                    value={devSettings.developerAnnouncement || ''}
                    onChange={(e) => setDevSettings({ ...devSettings, developerAnnouncement: e.target.value })}
                    placeholder="مثال: مرحباً بكم في منصة قريتي الموحدة | النظام السحابي محدث ويعمل بكفاءة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    هذا التنبيه العام خاص بمطور التطبيق لإرسال إشعارات المنصة، وهو محمي بالكامل ولا يمكن للتجار تعديله.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رابط صورة الواجهة الرئيسية والشاشة (Hero Image URL 🖼️)
                  </label>
                  <input
                    type="url"
                    value={devSettings.heroImageUrl || ''}
                    onChange={(e) => setDevSettings({ ...devSettings, heroImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... (رابط الصورة الخلفية أو البانر الرئيسي)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    تستطيع كمطور تغيير صورة الغلاف والبانر الرئيسي للشاشة الأولى للمنصة مباشرة عبر هذا الرابط.
                  </span>
                </div>

                {/* Welcome Splash Configuration */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-400">إعدادات شاشة الترحيب الخاصة (Welcome Splash Screen)</span>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={devSettings.showWelcomeSplash}
                        onChange={(e) => setDevSettings({ ...devSettings, showWelcomeSplash: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                      />
                      <span>تفعيل شاشة الترحيب عند بدء التطبيق</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">عنوان الترحيب الرئيسي</label>
                    <input
                      type="text"
                      value={devSettings.welcomeTitle || ''}
                      onChange={(e) => setDevSettings({ ...devSettings, welcomeTitle: e.target.value })}
                      placeholder="البوابة الرسمية لمنظومة قريتي الرقمية"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">النص التعريفي / التوصيف</label>
                    <input
                      type="text"
                      value={devSettings.welcomeSubtitle || ''}
                      onChange={(e) => setDevSettings({ ...devSettings, welcomeSubtitle: e.target.value })}
                      placeholder="منصة موحدة لإدارة متجر القرية، طلبات التوصيل..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">رابط صورة شاشة الترحيب (Image URL)</label>
                    <input
                      type="url"
                      value={devSettings.welcomeImageUrl || ''}
                      onChange={(e) => setDevSettings({ ...devSettings, welcomeImageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Maintenance Mode Configuration */}
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <div>
                        <span className="font-black text-xs text-amber-300">وضع الصيانة والتحديثات الكبرى (Maintenance Mode)</span>
                        <p className="text-[11px] text-slate-400">إظهار رسالة عامة للعملاء لمنع استقبال طلبات جديدة مؤقتاً أثناء الصيانة.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={devSettings.maintenanceMode}
                        onChange={(e) => setDevSettings({ ...devSettings, maintenanceMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {devSettings.maintenanceMode && (
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-[11px] font-bold text-amber-200">الرسالة العامة المعروضة للعملاء أثناء الصيانة:</label>
                      <textarea
                        rows={3}
                        value={devSettings.maintenanceMessage || ''}
                        onChange={(e) => setDevSettings({ ...devSettings, maintenanceMessage: e.target.value })}
                        placeholder="أدخل رسالة الصيانة للعملاء..."
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>

                {/* Security PIN Change */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <KeyRound className="w-4 h-4" />
                    <span>تغيير رمز مرور مطور ومالك المنصة (PIN)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="أدخل رمز PIN جديد (اتركه فارغاً للإبقاء على القديم)..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="تأكيد رمز PIN الجديد..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={devSettings.allowPublicStore}
                      onChange={(e) => setDevSettings({ ...devSettings, allowPublicStore: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700"
                    />
                    <span>إتاحة متجر القرية العام للزوار والعملاء بدون تسجيل دخول</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={devSettings.allowDriverRegistration}
                      onChange={(e) => setDevSettings({ ...devSettings, allowDriverRegistration: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700"
                    />
                    <span>السماح لمناديب التوصيل بالدخول واستلام الطلبات</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-colors cursor-pointer"
                  >
                    حفظ وتطبيق إعدادات المنصة الشاملة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: LANGUAGE & LOCALIZATION */}
        {activeTab === 'LANGUAGE' && (
          <div className="space-y-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <h2 className="font-black text-base text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <span>إعدادات اللغة والاتجاه والواجهة (Language & Regional)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تحديد لغة العرض الرسمية للمنصة، وتخصيص اتجاه القراءة ونظام الأرقام والتواريخ.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Arabic Card */}
                <div
                  onClick={() => {
                    setLanguage('ar');
                    updateSettings({ language: 'ar' });
                    showToast('تم ضبط لغة المنصة على اللغة العربية (RTL)');
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    language === 'ar'
                      ? 'bg-blue-950/40 border-blue-500/70 shadow-lg shadow-blue-950/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-base text-white">اللغة العربية (Arabic)</span>
                    {language === 'ar' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        اللغة النشطة حالياً ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    واجهة كاملة باللغة العربية مع اتجاه من اليمين إلى اليسار (RTL)، مصممة خصيصاً للمتاجر العربية.
                  </p>
                </div>

                {/* English Card */}
                <div
                  onClick={() => {
                    setLanguage('en');
                    updateSettings({ language: 'en' });
                    showToast('Platform language set to English (LTR)');
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    language === 'en'
                      ? 'bg-blue-950/40 border-blue-500/70 shadow-lg shadow-blue-950/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-base text-white">English (LTR)</span>
                    {language === 'en' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Currently Active ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Full English interface with Left-to-Right orientation, designed for international cashier & receipts.
                  </p>
                </div>
              </div>

              {/* Regional Summary Info */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <span>
                  يتم حفظ تفضيلات اللغة تلقائياً في حساب المتجر والمنظومة وتطبيقها في شاشات الكاشير، الفواتير، ونظام التوصيل.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STORES DIRECTORY & DELIVERY ORDERS */}
        {activeTab === 'STORES_ORDERS' && (
          <div className="space-y-5">
            {/* Stores Section */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-400" />
                    <span>دليل المتاجر المشتركة في الشبكة ({stores.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400">إدارة المتاجر المحلية وترقيتها إلى باقة PRO</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStoreModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة متجر جديد</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {stores.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3 hover:border-purple-500/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-white text-sm block">{st.name}</span>
                            <div className="flex items-center gap-1 text-[11px] text-purple-300 font-bold mt-0.5">
                              <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                              <span>القرية: {st.cityOrVillage}</span>
                            </div>
                          </div>
                        </div>

                        {st.isPro ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            PRO 👑
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 shrink-0">
                            مجاني
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-500 block text-[10px]">المالك:</span>
                          <span className="font-semibold">{st.ownerName}</span> ({st.phone})
                        </div>
                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-500 block text-[10px]">حساب التاجر المحمي:</span>
                          <span className="font-mono text-amber-300 font-bold">PIN: {st.merchantPin || '1234'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenMerchant({
                            name: st.name,
                            village: st.cityOrVillage,
                            isPro: st.isPro,
                            merchantPin: st.merchantPin || '1234',
                          });
                          showToast(`تم فتح حساب التاجر: ${st.name} (${st.cityOrVillage})`);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                        title="دخول حساب التاجر لإضافة الأصناف وإدارتها"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span>فتح حساب التاجر لإضافة الأصناف 🔐</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStorePro(st.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          st.isPro
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {st.isPro ? 'إلغاء PRO' : 'ترقية PRO 👑'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orders Section */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>مراقبة حركة طلبات التوصيل الجارية ({orders.length})</span>
              </h3>

              <div className="space-y-2">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    لا توجد طلبات توصيل مسجلة حالياً.
                  </div>
                ) : (
                  orders.slice(0, 10).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">#{ord.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                            {ord.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          العميل: {ord.customerName} ({ord.customerPhone}) • {ord.customerAddress}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-white text-sm">
                        {ord.totalAmount} {settings.currency || 'ر.س'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Ad Modal */}
      {showAddAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-cyan-400" />
              <span>إضافة إعلان ترويجي جديد لمتجر القرية</span>
            </h3>

            <form onSubmit={handleAddAdSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">عنوان الإعلان الرئيسي</label>
                <input
                  type="text"
                  required
                  value={newAdTitle}
                  onChange={(e) => setNewAdTitle(e.target.value)}
                  placeholder="مثال: خصم 20% على كافة المخبوزات الطازجة!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نص التوضيح والعرض</label>
                <input
                  type="text"
                  value={newAdSubtitle}
                  onChange={(e) => setNewAdSubtitle(e.target.value)}
                  placeholder="مثال: يسري العرض حتى نهاية الأسبوع أو نفاد الكمية"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">شارة الإعلان</label>
                  <input
                    type="text"
                    value={newAdBadge}
                    onChange={(e) => setNewAdBadge(e.target.value)}
                    placeholder="عرض خاص 🌟"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">كود الخصم (اختياري)</label>
                  <input
                    type="text"
                    value={newAdCode}
                    onChange={(e) => setNewAdCode(e.target.value)}
                    placeholder="QARYATI20"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">لون وتدرج الخلفية</label>
                <select
                  value={newAdGradient}
                  onChange={(e) => setNewAdGradient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="from-emerald-600 via-teal-600 to-cyan-700">أخضر زمردي ونيلي (Emerald & Cyan)</option>
                  <option value="from-amber-600 via-orange-600 to-rose-700">برتقالي وذهبي دافئ (Amber & Rose)</option>
                  <option value="from-purple-600 via-indigo-600 to-blue-700">بنفسجي ملكي (Purple & Blue)</option>
                  <option value="from-rose-600 via-pink-600 to-red-700">وردي وأحمر ناري (Pink & Red)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  نشر الإعلان بالمتجر
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAdModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">إضافة متجر جديد لشبكة قريتي</h3>
            <form onSubmit={handleAddStoreSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المتجر / التموينات</label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="مثال: تموينات الفلاح"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم صاحب المتجر</label>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="مثال: عبد الله السالم"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم القرية أو الموقع (إلزامي)</label>
                <input
                  type="text"
                  required
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  placeholder="مثال: قرية السعادة"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رمز الدخول المحمي لحساب التاجر (PIN)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newMerchantPin}
                  onChange={(e) => setNewMerchantPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono tracking-widest focus:outline-none focus:border-purple-500 text-center"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">رمز مرور سري لحماية حساب التاجر عند الدخول وإضافة الأصناف</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="proCheck"
                  checked={newIsPro}
                  onChange={(e) => setNewIsPro(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                />
                <label htmlFor="proCheck" className="text-xs font-bold text-amber-300 cursor-pointer">
                  تفعيل باقة PRO فوراً للمتجر 👑
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  حفظ المتجر وفتح حسابه المحمي
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Created Successfully & Protected Merchant Account Opened Modal */}
        {/* TAB: VILLAGES & STORES INDEPENDENT MANAGEMENT */}
        {activeTab === 'VILLAGES_STORES' && (
          <div className="space-y-6">
            {/* 1. Approved Villages Management Card */}
            <div className="bg-slate-900/90 border border-purple-900/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-black text-base text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-400" />
                    <span>إدارة القرى المعتمدة في المنصة (القائمة الحصرية)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    التحكم الكامل بالقرى المعتمدة التي تظهر للعملاء والتجار (إضافة، تعديل، أو حذف أي قرية فوراً).
                  </p>
                </div>
              </div>

              {/* Add Village Form */}
              <form onSubmit={handleAddVillageSubmit} className="flex gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="text"
                    required
                    value={newVillageInput}
                    onChange={(e) => setNewVillageInput(e.target.value)}
                    placeholder="أدخل اسم القرية المعتمدة الجديدة (مثال: قرية الجديدة)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة قرية معتمدة</span>
                </button>
              </form>

              {/* Villages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {approvedVillages.map((vil, index) => (
                  <div
                    key={vil}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-sm hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{vil}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVillageItem(vil)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="حذف القرية"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Stores Data Management & Direct Editing Card */}
            <div className="bg-slate-900/90 border border-purple-900/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-black text-base text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-emerald-400" />
                    <span>إدارة وتعديل بيانات المتاجر بشكل مستقل (لوحة المطور)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تعديل اسم المتجر، اسم المالك، رقم الجوال، القرية التابعة، أو حالة الحساب مباشرة وبشكل مستقل عن باقي الأطراف.
                  </p>
                </div>
              </div>

              {/* Stores List with Edit Capabilities */}
              <div className="space-y-3">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 transition-all shadow-md space-y-3"
                  >
                    {editingStoreId === store.id ? (
                      /* Inline Edit Form */
                      <div className="space-y-3 p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم المتجر</label>
                            <input
                              type="text"
                              value={editStoreName}
                              onChange={(e) => setEditStoreName(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم المالك</label>
                            <input
                              type="text"
                              value={editOwnerName}
                              onChange={(e) => setEditOwnerName(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الجوال</label>
                            <input
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">القرية التابعة</label>
                            <select
                              value={editVillage}
                              onChange={(e) => setEditVillage(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            >
                              {approvedVillages.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">حالة الحساب</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            >
                              <option value="ACTIVE">نشط (يعمل طبيعي)</option>
                              <option value="SUSPENDED">موقوف (مجمد)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleSaveStoreEdit(store.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>حفظ التعديلات</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStoreId(null)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Row */
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                            <Store className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-white text-sm truncate">{store.name}</h3>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                store.isPro ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {store.planName || 'الباقة المجانية'}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                store.status === 'SUSPENDED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {store.status === 'SUSPENDED' ? '⛔ موقوف / محظور' : '✅ نشط'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span>👤 {store.ownerName}</span>
                              <span>📱 {store.phone}</span>
                              <span className="text-rose-400 font-bold">📍 {store.cityOrVillage}</span>
                            </p>
                            {store.status === 'SUSPENDED' && store.suspendReason && (
                              <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded-lg mt-1.5">
                                <strong>سبب الحظر:</strong> {store.suspendReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartEditStore(store)}
                            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStorePro(store.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                              store.isPro
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {store.isPro ? 'إلغاء PRO' : 'ترقية PRO'}
                          </button>

                          {store.status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              onClick={() => handleUnsuspendStore(store.id)}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                              إلغاء الحظر
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenSuspendModal(store)}
                              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                              حظر / تجميد
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteStorePermanent(store.id, store.name)}
                            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            title="حذف نهائي من المنصة"
                          >
                            حذف نهائي
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {createdStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">
                  تم إنشاء المتجر وفتح حساب التاجر بنجاح 🚀
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تم تخصيص حساب محمي للتاجر لإضافة الأصناف وإدارة المخزون
                </p>
              </div>
            </div>

            {/* Highlighted Store and Village Information Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-slate-400 font-bold">اسم المتجر:</span>
                </div>
                <span className="text-sm font-black text-white">{createdStoreModal.name}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-400 font-bold">اسم القرية / الموقع:</span>
                </div>
                <span className="text-sm font-black text-emerald-300">{createdStoreModal.cityOrVillage}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span className="text-xs text-slate-400 font-bold">صاحب المتجر (التاجر):</span>
                </div>
                <span className="text-xs font-bold text-slate-200">{createdStoreModal.ownerName} ({createdStoreModal.phone})</span>
              </div>

              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400 font-bold">رمز الحماية الخاص بحساب التاجر (PIN):</span>
                </div>
                <span className="text-sm font-black text-amber-300 font-mono tracking-widest px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  {createdStoreModal.merchantPin || '1234'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400 font-bold">حالة الباقة والترخيص:</span>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  createdStoreModal.isPro
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {createdStoreModal.planName}
                </span>
              </div>
            </div>

            {/* Direct action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const target = createdStoreModal;
                  setCreatedStoreModal(null);
                  onOpenMerchant({
                    name: target.name,
                    village: target.cityOrVillage,
                    isPro: target.isPro,
                    merchantPin: target.merchantPin || '1234',
                  });
                  showToast(`تم فتح حساب التاجر: ${target.name} (${target.cityOrVillage})`);
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" />
                <span>دخول حساب التاجر فوراً لإضافة الأصناف 🚀</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const credentialsText = `🏪 منصة قريتي - بيانات حساب التاجر الجديد\n📍 القرية: ${createdStoreModal.cityOrVillage}\n🏬 اسم المتجر: ${createdStoreModal.name}\n👤 اسم التاجر: ${createdStoreModal.ownerName}\n📱 الهاتف: ${createdStoreModal.phone}\n🔐 رمز الدخول المحمي (PIN): ${createdStoreModal.merchantPin || '1234'}\n👑 الترخيص: ${createdStoreModal.planName}\n\nرابط إدارة المتجر وإضافة الأصناف:\n${window.location.origin}/?portal=merchant`;
                    navigator.clipboard.writeText(credentialsText);
                    showToast('تم نسخ بيانات المتجر ورابط الدخول إلى الحافظة');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>نسخ بيانات حساب التاجر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreatedStoreModal(null)}
                  className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {suspendModalStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base">
                  حظر وتجميد متجر: {suspendModalStore.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  حدد سبب الحظر أو التجميد ليتم عرضه للتاجر في لوحة التحكم الخاصة به وإخفاء المتجر من تطبيق العملاء.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">سبب الحظر / التجميد (إلزامي أو توضيحي)</label>
              <textarea
                rows={3}
                value={suspendReasonInput}
                onChange={(e) => setSuspendReasonInput(e.target.value)}
                placeholder="مثال: عدم الالتزام بالأسعار المعتمدة، وجود شكاوى متكررة من العملاء، أو انتهاء فترة الترخيص..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2 rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-950"
              >
                تأكيد حظر المتجر
              </button>
              <button
                type="button"
                onClick={() => setSuspendModalStore(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
