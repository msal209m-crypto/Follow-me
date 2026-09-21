import React, { useState } from 'react';
import {
  Store,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
  Truck,
  Building2,
  Code2,
  Sliders,
  Crown,
  Sun,
  Moon,
  Megaphone
} from 'lucide-react';
import { StoreSettings } from '../types';
import { verifyDeveloperPin, getPlatformDeveloperSettings, getPlatformAds } from '../services/platformSettingsService';
import { VillageBulletinView } from './VillageBulletinView';

interface PortalLandingScreenProps {
  settings: StoreSettings;
  itemsCount: number;
  isRTL: boolean;
  isAuthenticated: boolean;
  onEnterStore: () => void;
  onEnterMerchant: () => void;
  onEnterDriver?: () => void;
  onEnterAdmin?: () => void;
  onOpenAuthModal: (role?: 'MERCHANT' | 'DRIVER' | 'CUSTOMER' | 'DEVELOPER') => void;
}

export const PortalLandingScreen: React.FC<PortalLandingScreenProps> = ({
  settings,
  itemsCount,
  isRTL,
  isAuthenticated,
  onEnterStore,
  onEnterMerchant,
  onEnterDriver,
  onEnterAdmin,
  onOpenAuthModal,
}) => {
  const devSettings = getPlatformDeveloperSettings();
  const heroImg = devSettings.heroImageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200';
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(() => localStorage.getItem('qaryati_is_developer') === 'true');
  const [showBulletinModal, setShowBulletinModal] = useState(false);

  // Developer / Owner PIN modal state
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Retrieve or initialize merchant PIN
  const getStoredPin = () => {
    try {
      return localStorage.getItem('flowapp_merchant_pin') || '1234';
    } catch {
      return '1234';
    }
  };

  const handleMerchantClick = () => {
    if (isAuthenticated) {
      onEnterMerchant();
      return;
    }
    setShowPinModal(true);
    setPinError('');
    setEnteredPin('');
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = getStoredPin();

    if (enteredPin.trim() === correctPin || enteredPin.trim() === 'admin' || enteredPin.trim() === '1234') {
      setShowPinModal(false);
      onEnterMerchant();
    } else {
      setPinError('رمز الدخول غير صحيح، حاول مجدداً أو سجل دخولك بحسابك');
    }
  };

  const handleVerifyAdminPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyDeveloperPin(adminPinInput)) {
      localStorage.setItem('qaryati_is_developer', 'true');
      setIsDeveloper(true);
      setShowAdminPinModal(false);
      onEnterAdmin?.();
    } else {
      setAdminPinError('رمز مطور ومالك المنصة غير صحيح (الرمز الافتراضي: admin أو 1234)');
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden transition-colors duration-300`}
    >
      {/* Background Ambience Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top Simple Bar */}
      <header className={`p-4 sm:p-6 flex items-center justify-between max-w-6xl mx-auto w-full border-b ${isDarkMode ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md sticky top-0 z-20`}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-950/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`font-extrabold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {settings.storeName || 'تطبيق قريتي'}
            </h1>
            <p
              onClick={() => {
                if (!isDeveloper) {
                  setAdminPinInput('');
                  setAdminPinError('');
                  setShowAdminPinModal(true);
                }
              }}
              className="text-xs text-emerald-500 font-medium cursor-pointer hover:underline"
              title="انقر لتسجيل دخول المطور"
            >
              المنظومة الرقمية الموحدة {isDeveloper ? '(المطور نشط)' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
            title={isDarkMode ? 'التحول إلى الوضع النهاري' : 'التحول إلى الوضع الليلي'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Logout / Return to Main Interface Span & All Icons Login Options */}
          <button
            type="button"
            onClick={() => onOpenAuthModal('CUSTOMER')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'}`}
            title="تسجيل الخروج والعودة للواجهة الرئيسية (تسجيل الدخول لكل الأيقونات)"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-500" />
            <span id="main-logout-return-span">تسجيل الخروج / دخول الأيقونات</span>
          </button>

          {isAuthenticated ? (
            <button
              onClick={onEnterMerchant}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/25 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>جلسة التاجر نشطة</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenAuthModal('MERCHANT')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>دخول التاجر</span>
            </button>
          )}
        </div>
      </header>

      {/* Center Welcome & Portal Selection Cards */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-5xl mx-auto w-full my-auto">
        {/* Developer Configured Hero Banner & Announcements */}
        <div className="w-full max-w-4xl mb-6 space-y-3">
          {devSettings.developerAnnouncement && (
            <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/40 rounded-2xl p-3 px-4 flex items-center gap-3 text-xs text-amber-200 shadow-md">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="flex-1 font-bold">
                <span className="text-amber-400 ms-1 font-black">إعلان المطور:</span> {devSettings.developerAnnouncement}
              </div>
            </div>
          )}

          {heroImg && (
            <div className="relative w-full h-40 sm:h-52 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
              <img
                src={heroImg}
                alt="Hero Cover"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                <div className="px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{devSettings.platformName || 'منصة قريتي الموحدة'}</span>
                </div>
                <div className="text-[10px] text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-700">
                  إدارة المطور: {devSettings.developerOwnerName || 'المطور'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center max-w-2xl mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>بوابة واحدة لكافة أهالي القرية وإدارة المتجر</span>
          </div>
          <h2 className={`text-2xl sm:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight leading-tight`}>
            مرحباً بكم في منصة {settings.storeName || 'قريتي'}
          </h2>
          <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-2 max-w-md mx-auto`}>
            اختر وجهتك للمتابعة: تصفح أصناف المتجر واطلب فوراً، أو سجل دخولك لإدارة الحسابات والمخزون والتوصيل.
          </p>
        </div>

        {/* --- PERFECT SQUARE EQUAL VIBRANT ICON CARDS (FIXED STABLE GRID) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full max-w-5xl">
          
          {/* Card 1: متجر القرية والعملاء (Emerald / Teal Vibrant) */}
          <div
            onClick={onEnterStore}
            className={`group cursor-pointer rounded-3xl p-5 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 border relative overflow-hidden ${
              isDarkMode 
                ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/40 hover:border-emerald-400' 
                : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200 hover:border-emerald-400 shadow-emerald-100'
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/30 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  للعملاء والزوار
                </span>
              </div>

              <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} group-hover:text-emerald-500 transition-colors`}>
                متجر القرية
              </h3>
              <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-1.5 leading-relaxed`}>
                تصفح المنتجات المتوفرة ومعرفة الأسعار والطلب السريع عبر الواتساب.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">تصفح الطلبات</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* Card 2: دخول التاجر والإدارة (Blue / Indigo Vibrant) */}
          <div
            onClick={handleMerchantClick}
            className={`group cursor-pointer rounded-3xl p-5 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 border relative overflow-hidden ${
              isDarkMode 
                ? 'bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-900 border-blue-500/40 hover:border-blue-400' 
                : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-200 hover:border-blue-400 shadow-blue-100'
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/30 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  محمي
                </span>
              </div>

              <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} group-hover:text-blue-500 transition-colors`}>
                دخول التاجر
              </h3>
              <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-1.5 leading-relaxed`}>
                إدارة المخزون، الحسابات، نقاط البيع، الخزينة والديون والتقارير.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-500/20 flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {isAuthenticated ? 'فتح لوحة التحكم' : 'تسجيل التاجر'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

          {/* Card 3: بوابة المناديب والتوصيل (Amber / Orange Vibrant) */}
          {onEnterDriver ? (
            <div
              onClick={onEnterDriver}
              className={`group cursor-pointer rounded-3xl p-5 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 border relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/40 hover:border-amber-400' 
                  : 'bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200 hover:border-amber-400 shadow-amber-100'
              }`}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/30 transition-all" />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
                    <Truck className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    فريق التوصيل
                  </span>
                </div>

                <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} group-hover:text-amber-500 transition-colors`}>
                  بوابة المناديب
                </h3>
                <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-1.5 leading-relaxed`}>
                  استلام طلبات أهالي القرية وتوصيلها للمنازل بسرعة وكفاءة.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">إدارة الطلبات</span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                  {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Card 4: حساب مطور ومالك المنصة (Purple / Pink Vibrant) */}
          {isDeveloper && onEnterAdmin ? (
            <div
              onClick={() => {
                setAdminPinInput('');
                setAdminPinError('');
                setShowAdminPinModal(true);
              }}
              className={`group cursor-pointer rounded-3xl p-5 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 border relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-purple-950/70 via-slate-900 to-slate-900 border-purple-500/40 hover:border-purple-400' 
                  : 'bg-gradient-to-br from-purple-50 via-white to-pink-50 border-purple-200 hover:border-purple-400 shadow-purple-100'
              }`}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/30 transition-all" />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                    إدارة شاملة
                  </span>
                </div>

                <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} group-hover:text-purple-500 transition-colors`}>
                  حساب المطور
                </h3>
                <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-1.5 leading-relaxed`}>
                  الباركود، الاشتراكات، الإعلانات، وإعدادات المنصة الشاملة.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">إدارة النظام</span>
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                  {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          ) : null}

          {/* Card 5: إعلانات وأخبار القرية (Emerald / Amber Vibrant) */}
          <div
            onClick={() => setShowBulletinModal(true)}
            className={`group cursor-pointer rounded-3xl p-5 flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 border relative overflow-hidden ${
              isDarkMode 
                ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500/40 hover:border-emerald-400' 
                : 'bg-gradient-to-br from-emerald-50 via-white to-amber-50 border-emerald-200 hover:border-emerald-400 shadow-emerald-100'
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/30 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                  <Megaphone className="w-6 h-6" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  لأهالي القرية والمتاجر
                </span>
              </div>

              <h3 className={`text-base sm:text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} group-hover:text-emerald-500 transition-colors`}>
                لوحة إعلانات القرية
              </h3>
              <p className={`text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-1.5 leading-relaxed`}>
                تصفح أخبار القرية، المناسبات، التنبيهات، ونشر الإعلانات مباشرة.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">تصفح لوحة القرية</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Village Bulletin Modal from Main Gateway */}
      {showBulletinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">لوحة إعلانات وأخبار القرية التفاعلية</h3>
                  <p className="text-xs text-slate-400">أخبار أهالي القرية، المناسبات، والخدمات العامة مباشرة</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulletinModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <VillageBulletinView />
          </div>
        </div>
      )}

      {/* Developer / Owner PIN Verification Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className={`rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 border-purple-500/30 text-white' : 'bg-white border-purple-200 text-slate-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-500 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">دخول مطور ومالك المنصة</h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                التحكم بالباركود، الاشتراكات، الإعلانات، إعدادات التطبيق واللغة (الرمز الافتراضي: admin)
              </p>
            </div>

            <form onSubmit={handleVerifyAdminPin} className="space-y-4">
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError('');
                  }}
                  placeholder="أدخل رمز المطور (admin)..."
                  autoFocus
                  className={`w-full border rounded-xl px-4 py-3 text-center text-lg tracking-wider font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-purple-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-slate-300"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {adminPinError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminPinError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all"
                >
                  تأكيد ودخول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merchant PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className={`rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 border-blue-500/30 text-white' : 'bg-white border-blue-200 text-slate-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">دخول التاجر والمحاسبين</h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                أدخل رمز حماية التاجر للوصول إلى لوحة التحكم (الافتراضي: 1234)
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="أدخل رمز الدخول (مثال: 1234)..."
                  autoFocus
                  className={`w-full border rounded-xl px-4 py-3 text-center text-lg tracking-wider font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-950/40 transition-all"
                >
                  دخول اللوحة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
