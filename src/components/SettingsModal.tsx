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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePWA } from '../context/PWAContext';
import { useSubscription } from '../context/SubscriptionContext';
import { POPULAR_CURRENCIES } from '../data/currencies';
import { CloudBackupsManager } from './CloudBackupsManager';
import { MultiCurrencySettingsTab } from './MultiCurrencySettingsTab';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, initialTab = 'GENERAL' }) => {
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

  const { isPro, subscription, setShowSubscriptionModal } = useSubscription();

  const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'CURRENCY' | 'BACKUPS'>(initialTab);
  const [isWarmingCache, setIsWarmingCache] = useState(false);
  const [cacheWarmedSuccess, setCacheWarmedSuccess] = useState(false);

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
        <div className="grid grid-cols-3 p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('GENERAL')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
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
            onClick={() => setActiveSubTab('CURRENCY')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
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
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
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

            {/* App Installation & Real-Time Updates Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ar' ? 'تطبيق فلو اب والتحديثات (PWA)' : 'App Installation & Updates'}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                  {newVersionInfo?.version ? `v${newVersionInfo.version}` : 'v2.4.0'}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{language === 'ar' ? 'حالة التثبيت:' : 'Installation Status:'}</span>
                  <span className={`font-bold ${isInstalled ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {isInstalled
                      ? (language === 'ar' ? 'مثبت على هذا الجهاز ✅' : 'Installed ✅')
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

                <div className="flex gap-2 pt-1">
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={() => setShowInstallPromptModal(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={checkForUpdates}
                    disabled={checkingForUpdates}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${checkingForUpdates ? 'animate-spin' : ''}`} />
                    <span>{checkingForUpdates ? (language === 'ar' ? 'جارٍ الفحص...' : 'Checking...') : (language === 'ar' ? 'فحص التحديثات' : 'Check for Updates')}</span>
                  </button>
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
