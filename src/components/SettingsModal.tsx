import React, { useState } from 'react';
import {
  X,
  Store,
  Download,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Trash2,
  AlertTriangle,
  Coins,
  CheckCircle2,
  Globe,
  Cloud,
  Smartphone,
  Rocket,
  RefreshCw,
  Crown,
  Wifi,
  WifiOff,
  HardDrive,
  Zap,
  Share2,
  HelpCircle,
  Send,
  MessageSquare,
  MessageCircle,
  Bell,
  Key,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWA } from '../context/PWAContext';
import { useSubscription } from '../context/SubscriptionContext';
import { POPULAR_CURRENCIES } from '../data/currencies';
import { CloudBackupsManager } from './CloudBackupsManager';
import { MultiCurrencySettingsTab } from './MultiCurrencySettingsTab';
import { submitMerchantSupport, getDeveloperNotifications } from '../services/rbacAuthService';
import { OWNER_CONTACT } from '../config/ownerContact';

export type SettingsTabType = 'GENERAL' | 'CURRENCY' | 'BACKUPS' | 'SUBSCRIPTIONS' | 'SUPPORT' | 'SUBSCRIPTIONS_SUPPORT';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: SettingsTabType;
  onOpenShareModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, initialTab = 'GENERAL', onOpenShareModal }) => {
  const {
    settings,
    updateSettings,
    exportDataJSON,
    importDataJSON,
    clearAllData,
    language,
    setLanguage,
    t,
    isRTL,
  } = useApp();

  const {
    isInstalled,
    isInstallable,
    setShowInstallPromptModal,
    updateAvailable,
    newVersionInfo,
    applyUpdate,
    checkForUpdates,
    checkingForUpdates,
    isOnline,
    cachedResourcesCount,
    cacheStrategy,
    refreshOfflineCache,
  } = usePWA();

  const { isPro, subscription, setShowSubscriptionModal, activateLicenseKey, freeItemLimit } = useSubscription();

  // Normalize initial tab
  const getNormalizedTab = (tab?: string): 'GENERAL' | 'CURRENCY' | 'BACKUPS' | 'SUBSCRIPTIONS_SUPPORT' => {
    if (tab === 'SUBSCRIPTIONS' || tab === 'SUPPORT' || tab === 'SUBSCRIPTIONS_SUPPORT') return 'SUBSCRIPTIONS_SUPPORT';
    if (tab === 'CURRENCY') return 'CURRENCY';
    if (tab === 'BACKUPS') return 'BACKUPS';
    return 'GENERAL';
  };

  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'CURRENCY' | 'BACKUPS' | 'SUBSCRIPTIONS_SUPPORT'>(() => getNormalizedTab(initialTab));
  const [serviceSubSection, setServiceSubSection] = useState<'PLANS' | 'SUPPORT'>(() => initialTab === 'SUPPORT' ? 'SUPPORT' : 'PLANS');
  const [isWarmingCache, setIsWarmingCache] = useState(false);
  const [cacheWarmedSuccess, setCacheWarmedSuccess] = useState(false);

  // Dev Support Ticket State inside Settings
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmittedSuccess, setSupportSubmittedSuccess] = useState(false);
  const [developerReplies, setDeveloperReplies] = useState(() => getDeveloperNotifications());

  // License Key State
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseKeyStatusMsg, setLicenseKeyStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendSupportRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    submitMerchantSupport({
      merchantId: 'merchant-id',
      merchantName: settings.storeName || 'متجر القرية',
      storeName: settings.storeName || 'متجر القرية',
      message: supportMessage.trim(),
      phone: settings.phone || '0500000000',
    });
    setSupportSubmittedSuccess(true);
    setSupportMessage('');
    setDeveloperReplies(getDeveloperNotifications());
    setTimeout(() => setSupportSubmittedSuccess(false), 4000);
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;
    const res = await activateLicenseKey(licenseKeyInput.trim());
    if (res.success) {
      setLicenseKeyStatusMsg({ type: 'success', text: language === 'ar' ? 'تم تفعيل مفتاح الترخيص بنجاح! 🎉' : 'License key activated!' });
      setLicenseKeyInput('');
    } else {
      setLicenseKeyStatusMsg({ type: 'error', text: (res as any).error || (language === 'ar' ? 'مفتاح الترخيص غير صحيح!' : 'Invalid license key!') });
    }
  };

  const [storeName, setStoreName] = useState(settings.storeName);
  const [phone, setPhone] = useState(settings.phone);
  const [taxNumber, setTaxNumber] = useState(settings.taxNumber);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [footerNote, setFooterNote] = useState(settings.footerNote);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      phone,
      taxNumber,
      address,
      currency: currency.trim() || 'ر.س',
      footerNote,
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDataJSON(content);
        if (success) {
          setImportStatus(language === 'ar' ? 'تم استيراد النسخة الاحتياطية بنجاح!' : 'Backup imported successfully!');
          setTimeout(() => {
            setImportStatus(null);
            onClose();
          }, 1500);
        } else {
          setImportStatus(language === 'ar' ? 'فشل قراءة الملف. تأكد من صحة ملف JSON.' : 'Failed to read file. Please check JSON format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800/60 text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">{t.storeSettings}</h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'تخصيص هوية المتجر والعملات والنسخ الاحتياطي السحابي' : 'Store configuration, currencies & cloud backups'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-xl p-1.5 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveSubTab('GENERAL')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer truncate ${
              activeSubTab === 'GENERAL'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{t.storeSettings}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SUBSCRIPTIONS_SUPPORT')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer truncate ${
              activeSubTab === 'SUBSCRIPTIONS_SUPPORT'
                ? 'bg-gradient-to-r from-amber-950/90 to-purple-950/90 text-amber-300 shadow-sm border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{language === 'ar' ? 'الاشتراكات والدعم الفني' : 'Subscriptions & Support'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CURRENCY')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer truncate ${
              activeSubTab === 'CURRENCY'
                ? 'bg-amber-950/80 text-amber-300 shadow-sm border border-amber-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{t.multiCurrencyTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('BACKUPS')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer truncate ${
              activeSubTab === 'BACKUPS'
                ? 'bg-emerald-950/80 text-emerald-300 shadow-sm border border-emerald-600/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{t.cloudBackupsTitle}</span>
          </button>
        </div>

        {/* Tab 1: Multi-Currency & Exchange Rates */}
        {activeSubTab === 'CURRENCY' && <MultiCurrencySettingsTab />}

        {/* Tab 2: Cloud Backups Manager */}
        {activeSubTab === 'BACKUPS' && <CloudBackupsManager />}

        {/* NEW UNIFIED SECTION: Subscriptions & Developer Tech Support */}
        {activeSubTab === 'SUBSCRIPTIONS_SUPPORT' && (
          <div className="space-y-4 text-xs animate-fadeIn">
            {/* Top Sub-Navigation Segment Switcher */}
            <div className="p-1 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setServiceSubSection('PLANS')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  serviceSubSection === 'PLANS'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>{language === 'ar' ? 'باقات واشتراكات المتجر (PRO)' : 'Store Subscriptions & PRO'}</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceSubSection('SUPPORT')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  serviceSubSection === 'SUPPORT'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>{language === 'ar' ? 'الدعم الفني والمساعدة المباشرة' : 'Direct Tech Support'}</span>
                {developerReplies.filter(r => !r.isRead).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </button>
            </div>

            {/* SUB-SECTION 1: PLANS & PRO SUBSCRIPTION */}
            {serviceSubSection === 'PLANS' && (
              <div className="space-y-4">
                {/* Pro Status Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        isPro ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black shadow-amber-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Crown className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm sm:text-base text-white">
                            {subscription.planName || (isPro ? 'باقة المحترف PRO 👑' : 'الباقة الأساسية المجانية')}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isPro ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isPro ? 'نشطة ✓' : 'مجانية'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isPro
                            ? (language === 'ar' ? 'سعة غير محدودة للمنتجات والفواتير والمزامنة السحابية' : 'Unlimited catalog, invoices & cloud sync')
                            : (language === 'ar' ? `مقتصرة على ${freeItemLimit} صنف فقط مع حفظ محلي` : `Limited to ${freeItemLimit} items with local storage`)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setShowSubscriptionModal(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isPro ? (language === 'ar' ? 'تجديد أو ترقية الباقة' : 'Renew / Upgrade') : (language === 'ar' ? 'ترقية إلى باقة PRO ⚡' : 'Upgrade to PRO ⚡')}</span>
                    </button>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">{language === 'ar' ? 'الأيام المتبقية' : 'Days Left'}</span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {isPro ? `${subscription.daysRemaining} يوم` : (language === 'ar' ? 'حساب مجاني' : 'Free')}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">{language === 'ar' ? 'سعة الأصناف' : 'Capacity'}</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        {isPro ? 'غير محدود ∞' : `${freeItemLimit} منتج`}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block mb-0.5">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ar-SA') : (language === 'ar' ? 'مفتوح / دائم' : 'Permanent')}
                      </span>
                    </div>
                  </div>

                  {/* Pro Features highlights */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                    <span className="text-[11px] font-bold text-amber-400 block mb-2">
                      {language === 'ar' ? 'مميزات باقة المحترف (FlowApp Pro):' : 'Pro Plan Features:'}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>إضافة وتعديل أصناف ومخزون بلا حدود</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>فواتير إلكترونية ومبيعات غير محدودة</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>مزامنة سحابية فائقة الأمان على جميع أجهزتك</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>شارة المتجر المعتمد وعرض حصري لعملاء القرية</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* License Key Activation Form */}
                <form onSubmit={handleActivateLicense} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>{language === 'ar' ? 'تفعيل مفتاح ترخيص PRO الرقمي للمطور' : 'Activate PRO Digital License Key'}</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">FLOW-PRO-XXXX</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'إذا حصلت على كود تفعيل أو مفتاح ترخيص من مالك المنصة، أدخله هنا لتفعيل المتجر فوراً.'
                      : 'If you have a license key from the owner, enter it below to activate immediately.'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={licenseKeyInput}
                      onChange={(e) => setLicenseKeyInput(e.target.value)}
                      placeholder="FLOW-PRO-XXXX-XXXX"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!licenseKeyInput.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer disabled:opacity-50 transition-colors shadow"
                    >
                      {language === 'ar' ? 'تفعيل المفتاح' : 'Activate'}
                    </button>
                  </div>
                  {licenseKeyStatusMsg && (
                    <p className={`text-[11px] font-bold ${licenseKeyStatusMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {licenseKeyStatusMsg.text}
                    </p>
                  )}
                </form>
              </div>
            )}

            {/* SUB-SECTION 2: DEV SUPPORT & HELP */}
            {serviceSubSection === 'SUPPORT' && (
              <div className="space-y-4">
                {/* Official WhatsApp & Contact Card */}
                <div className="bg-gradient-to-r from-emerald-950/60 via-slate-950 to-teal-950/60 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm">
                        {language === 'ar' ? 'الدعم المباشر عبر الواتساب للمطور' : 'Official WhatsApp Dev Support'}
                      </h4>
                      <p className="text-[11px] text-emerald-300 mt-0.5">
                        {language === 'ar'
                          ? `تواصل فوري وسريع مع فريق التطوير: ${OWNER_CONTACT.phoneDisplay}`
                          : `Fast direct contact: ${OWNER_CONTACT.phoneDisplay}`}
                      </p>
                    </div>
                  </div>

                  <a
                    href={OWNER_CONTACT.getWhatsAppUrl({ storeName: settings.storeName })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'محادثة واتساب فورية 💬' : 'Chat on WhatsApp 💬'}</span>
                  </a>
                </div>

                {/* Tech Support Ticket Form */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>{language === 'ar' ? 'إرسال تذكرة دعم فني / استفسار للمطور' : 'Send Tech Ticket / Developer Query'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'أرسل أي مشكلة تقنية أو استفسار بخصوص المتجر، وسيتلقى المطور إشعاراً في لوحة التحكم للرد عليك ومساعدتك.'
                      : 'Submit any technical inquiry, and the developer will be notified instantly.'}
                  </p>

                  <form onSubmit={handleSendSupportRequest} className="space-y-2.5">
                    <textarea
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder={language === 'ar' ? 'اكتب تفاصيل استفسارك أو مشكلتك هنا بوضوح...' : 'Type your message or inquiry here...'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex items-center justify-between">
                      {supportSubmittedSuccess && (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم إرسال تذكرتك للمطور بنجاح ✓</span>
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={!supportMessage.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow ml-auto"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إرسال التذكرة للمطور 🚀' : 'Send Ticket 🚀'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Support Replies Log */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>{language === 'ar' ? 'سجل التذاكر والردود السابقة' : 'Ticket History & Replies'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">({developerReplies.length})</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {developerReplies.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-4 bg-slate-900/50 rounded-xl border border-slate-900">
                        {language === 'ar' ? 'لا توجد تذاكر دعم مرسلة بعد' : 'No previous tickets found'}
                      </p>
                    ) : (
                      developerReplies.map((ticket) => (
                        <div key={ticket.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{ticket.title}</span>
                            <span className="text-slate-500 font-mono text-[9px]">{new Date(ticket.timestamp).toLocaleString('ar-SA')}</span>
                          </div>
                          <p className="text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">{ticket.message}</p>
                          {ticket.quickReply ? (
                            <div className="text-purple-300 bg-purple-950/50 p-2 rounded-lg border border-purple-500/30 space-y-0.5">
                              <span className="text-[10px] font-bold text-purple-400 block">رد المطور الرسمي:</span>
                              <p>{ticket.quickReply}</p>
                            </div>
                          ) : (
                            <p className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                              <span>⏳ قيد المراجعة وبانتظار رد المطور...</span>
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: General Store Settings */}
        {activeSubTab === 'GENERAL' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Language Switcher */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
              <label className="text-slate-300 font-bold block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.language}:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg border font-bold cursor-pointer transition-all ${
                    language === 'ar'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>🇸🇦 العربية (RTL)</span>
                  {language === 'ar' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg border font-bold cursor-pointer transition-all ${
                    language === 'en'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>🇺🇸 English (LTR)</span>
                  {language === 'en' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Store Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t.storeName}:</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t.phone}:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Tax Number & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t.taxNumber}:</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">{t.address}:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Currency Customization */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  {t.currencyAndPricing}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded">
                  {currency || 'ر.س'}
                </span>
              </div>

              {/* Quick Currency Selection Grid */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block">{t.choosePopularCurrency}:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_CURRENCIES.map((curr) => {
                    const isSelected = currency.trim() === curr.symbol.trim() || currency.trim() === curr.name;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setCurrency(curr.symbol)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/50 border-amber-500/80 text-amber-200 font-bold shadow-sm'
                            : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-base leading-none">{curr.flag}</span>
                          <div className="truncate">
                            <div className="text-[11px] font-bold truncate">{language === 'ar' ? curr.name : curr.code}</div>
                            <div className="text-[10px] text-slate-400 font-mono">({curr.symbol})</div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mx-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Currency input field */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 shrink-0">{t.customSymbol}:</span>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="SAR, $, AED, EUR..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-500 text-center"
                />
              </div>
            </div>

            {/* Footer Note */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">{t.invoiceFooter}:</label>
              <input
                type="text"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
              />
            </div>

            {/* Pro Subscription & License Management Card */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ar' ? 'باقة الاشتراك والترخيص (Pro)' : 'Pro License & Subscription'}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isPro ? 'text-amber-300 bg-amber-950 border border-amber-500/40' : 'text-slate-400 bg-slate-800'}`}>
                  {isPro
                    ? (subscription.expiresAt ? `${subscription.daysRemaining} يوم متبقي` : 'دائم 👑')
                    : (language === 'ar' ? 'الخطة المجانية' : 'Free Plan')}
                </span>
              </div>

              <div className="p-3 bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border border-amber-500/50 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">
                    {isPro ? (subscription.planName || 'باقة المحترف مفعلة') : (language === 'ar' ? 'الخطة الأساسية (75 صنفاً)' : 'Free Starter (75 Items)')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isPro
                      ? (language === 'ar' ? 'أصناف ومزامنة سحابية غير محدودة' : 'Unlimited inventory & cloud features')
                      : (language === 'ar' ? 'ترقية لفتح الأصناف والمزامنة وكروت التفعيل' : 'Upgrade for unlimited items & offline keys')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setShowSubscriptionModal(true);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black rounded-xl shadow cursor-pointer active:scale-95 shrink-0"
                >
                  {isPro ? (language === 'ar' ? 'إدارة الترخيص 👑' : 'Manage Pro 👑') : (language === 'ar' ? 'ترقية الحساب ⚡' : 'Upgrade ⚡')}
                </button>
              </div>
            </div>

            {/* App Installation, Share & Real-Time Updates Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ar' ? 'قسم المشاركة وتثبيت التطبيق (PWA & Share)' : 'App Installation & Share Section'}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                  {newVersionInfo?.version ? `v${newVersionInfo.version}` : 'v2.4.0'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{language === 'ar' ? 'حالة التثبيت على الجهاز:' : 'Installation Status:'}</span>
                  <span className={`font-bold ${isInstalled ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {isInstalled
                      ? (language === 'ar' ? 'مثبت بنجاح ✅' : 'Installed ✅')
                      : (language === 'ar' ? 'جاهز للتثبيت 📱' : 'Ready to install 📱')}
                  </span>
                </div>

                {updateAvailable && (
                  <div className="p-2.5 bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/50 rounded-lg flex items-center justify-between gap-2 animate-pulse">
                    <div className="flex items-center gap-2 min-w-0">
                      <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-black text-white truncate">
                        {language === 'ar' ? 'يتوفر إصدار أحدث للتطبيق!' : 'New update ready!'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={applyUpdate}
                      className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg shadow cursor-pointer active:scale-95 shrink-0"
                    >
                      {language === 'ar' ? 'تحديث الآن ⚡' : 'Update Now ⚡'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Share App Button inside Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenShareModal) {
                        onOpenShareModal();
                      } else {
                        try {
                          navigator.clipboard.writeText(window.location.href);
                          alert('تم نسخ رابط التطبيق للحافظة بنجاح! 🔗');
                        } catch {}
                      }
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 text-xs font-bold rounded-xl border border-sky-500/40 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Share2 className="w-4 h-4 text-sky-400" />
                    <span>{language === 'ar' ? 'مشاركة رابط التطبيق 🔗' : 'Share App Link 🔗'}</span>
                  </button>

                  {/* Install App Button inside Settings */}
                  {!isInstalled ? (
                    <button
                      type="button"
                      onClick={() => setShowInstallPromptModal(true)}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-950 to-teal-950 hover:from-cyan-900 hover:to-teal-900 border border-cyan-500/50 text-cyan-200 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-98"
                    >
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>{language === 'ar' ? 'تثبيت التطبيق على جهازك 📱' : 'Install App 📱'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={checkForUpdates}
                      disabled={checkingForUpdates}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 text-teal-400 ${checkingForUpdates ? 'animate-spin' : ''}`} />
                      <span>{checkingForUpdates ? (language === 'ar' ? 'جارٍ الفحص...' : 'Checking...') : (language === 'ar' ? 'فحص التحديثات' : 'Check Updates')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Offline & Remote Areas (Stale-While-Revalidate) Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'ar' ? 'التخزين المؤقت للمناطق النائية (SWR Offline)' : 'Remote Areas Offline Engine (SWR)'}</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                  <span>Stale-While-Revalidate</span>
                </span>
              </div>

              <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900/90 border border-cyan-500/30 rounded-xl space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{language === 'ar' ? 'حالة اتصال الشبكة:' : 'Network Status:'}</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {isOnline ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'متصل بالإنترنت' : 'Online'}</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'أوفلاين (المناطق النائية)' : 'Offline (Remote Area)'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{language === 'ar' ? 'الموارد المحفوظة محلياً:' : 'Cached Resources:'}</span>
                  <span className="font-mono text-slate-200 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                    {cachedResourcesCount > 0 ? `${cachedResourcesCount} ${language === 'ar' ? 'ملف جاهز أوفلاين' : 'files cached'}` : (language === 'ar' ? 'جاهز ومخزن' : 'Ready')}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  {language === 'ar'
                    ? '⚡ استراتيجية Stale-While-Revalidate تضمن فتح التطبيق فورياً (0 ثانية) في المناطق النائية والقرى بدون انتظار شبكة، مع تحديث الموارد في الخلفية تلقائياً فور توفر تغطية.'
                    : '⚡ Stale-While-Revalidate serves cached assets instantly (0ms) in remote areas without internet delay, and quietly revalidates in the background when connectivity returns.'}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    setIsWarmingCache(true);
                    await refreshOfflineCache();
                    setIsWarmingCache(false);
                    setCacheWarmedSuccess(true);
                    setTimeout(() => setCacheWarmedSuccess(false), 3000);
                  }}
                  disabled={isWarmingCache}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-500/50 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isWarmingCache ? 'animate-spin' : ''}`} />
                  <span>
                    {cacheWarmedSuccess
                      ? (language === 'ar' ? 'تم تحديث وتثبيت كافة الموارد في الذاكرة بنجاح! ✅' : 'All resources primed in cache! ✅')
                      : isWarmingCache
                      ? (language === 'ar' ? 'جارٍ فحص وتخزين الموارد...' : 'Priming offline cache...')
                      : (language === 'ar' ? 'تحديث وتجهيز الذاكرة المؤقتة للعمل بدون إنترنت 💾' : 'Prime Cache for Remote Offline Use 💾')}
                  </span>
                </button>
              </div>
            </div>

            {/* Clear & Start Fresh Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">{t.clearAndFresh}:</span>
                <span className="text-[10px] text-slate-500">{t.clearWarning}</span>
              </div>

              {!showClearConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors text-xs"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>{t.clearAndFresh}</span>
                </button>
              ) : (
                <div className="p-3 bg-rose-950/80 border border-rose-700/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-200 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{t.confirmResetMsg}</span>
                  </div>
                  <p className="text-[11px] text-rose-300">
                    {t.clearWarning}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        clearAllData();
                        setShowClearConfirm(false);
                        setImportStatus(language === 'ar' ? 'تم تفريغ كافة البيانات والعمليات بنجاح. التطبيق جاهز للبدء من الصفر!' : 'All data cleared successfully!');
                        setTimeout(() => {
                          setImportStatus(null);
                          onClose();
                        }, 1600);
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      {t.confirm}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Offline Backup Export / Import */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">{t.backupAndRestore}:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={exportDataJSON}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg border border-slate-700 transition-colors font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>{t.exportBackup} (JSON)</span>
                </button>

                <label className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-lg border border-slate-700 transition-colors font-bold cursor-pointer">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{t.importBackup}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {importStatus && (
                <div className="p-2 bg-emerald-950/80 border border-emerald-700 rounded-lg text-emerald-300 text-center font-bold text-xs">
                  {importStatus}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950"
              >
                <Check className="w-4 h-4" />
                <span>{t.saveSettings}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
