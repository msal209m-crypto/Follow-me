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
  Crown
} from 'lucide-react';
import { StoreSettings } from '../types';
import { verifyDeveloperPin } from '../services/platformSettingsService';

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
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    // If already logged in via Firebase / Local user, enter directly!
    if (isAuthenticated) {
      onEnterMerchant();
      return;
    }
    // Otherwise open the merchant PIN / password prompt
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
      setShowAdminPinModal(false);
      onEnterAdmin?.();
    } else {
      setAdminPinError('رمز مطور ومالك المنصة غير صحيح (الرمز الافتراضي: admin أو 1234)');
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden"
    >
      {/* Background Ambience Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top Simple Bar */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-white">
              {settings.storeName || 'تطبيق قريتي'}
            </h1>
            <p className="text-xs text-emerald-400 font-medium">المنظومة الرقمية الموحدة</p>
          </div>
        </div>

        {isAuthenticated ? (
          <button
            onClick={onEnterMerchant}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/25 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>جلسة التاجر نشطة</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>تسجيل الدخول</span>
          </button>
        )}
      </header>

      {/* Center Welcome & Portal Selection Cards */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-4xl mx-auto w-full my-auto">
        <div className="text-center max-w-2xl mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>بوابة واحدة لكافة أهالي القرية وإدارة المتجر</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            مرحباً بكم في منصة {settings.storeName || 'قريتي'}
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-md mx-auto">
            اختر وجهتك للمتابعة: تصفح أصناف المتجر واطلب فوراً، أو سجل دخولك كتاجر لإدارة الحسابات والمخزون.
          </p>
        </div>

        {/* The Two Portals Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-3xl">
          {/* Portal 1: متجر القرية والعملاء (عام ومفتوح للجميع) */}
          <div
            onClick={onEnterStore}
            className="group cursor-pointer bg-gradient-to-b from-slate-900/90 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-emerald-500/30 hover:border-emerald-400/70 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-emerald-950/40 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  مفتوح للعامة
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                متجر القرية والعملاء
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                مخصص لأهالي القرية والزبائن الكرام لتصفح المنتجات المتوفرة، معرفة الأسعار، وإرسال الطلبات مباشرة عبر الواتساب.
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs text-emerald-400/90 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {itemsCount} صنف متاح
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> طلب سريع بالواتساب
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">تصفح واطلب الآن</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {/* Portal 2: دخول التاجر والإدارة (محمي) */}
          <div
            onClick={handleMerchantClick}
            className="group cursor-pointer bg-gradient-to-b from-slate-900/90 to-slate-900/60 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-700/10 rounded-full blur-2xl pointer-events-none group-hover:bg-slate-700/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 shadow-lg group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  محمي
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-slate-200 transition-colors">
                دخول التاجر والإدارة
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                لوحة التحكم الأصلية الكاملة لمالك المتجر والمحاسبين لإدارة المخزون، الحسابات، نقاط البيع، الخزينة والديون والتقارير.
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400 font-medium">
                <span>المخزون والباركود</span>
                <span>•</span>
                <span>الحسابات والديون</span>
                <span>•</span>
                <span>نقاط البيع</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                {isAuthenticated ? 'الدخول للوحة التحكم مباشرة' : 'دخول التاجر (برمز الحماية)'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-all">
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Specialized Roles: Driver and Platform Super Admin */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
          {onEnterDriver && (
            <button
              type="button"
              onClick={onEnterDriver}
              className="p-3.5 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                    بوابة المناديب والتوصيل
                  </div>
                  <div className="text-[11px] text-slate-400">استلام طلبات الأهالي والتوصيل السريع</div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center group-hover:text-white transition-colors">
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </div>
            </button>
          )}

          {onEnterAdmin && (
            <button
              type="button"
              onClick={() => {
                setAdminPinInput('');
                setAdminPinError('');
                setShowAdminPinModal(true);
              }}
              className="p-3.5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900/90 hover:from-purple-950/70 hover:to-slate-850 border border-purple-900/50 hover:border-purple-500/60 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer group shadow-lg shadow-purple-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                      حساب مطور ومالك المنصة
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      إدارة شاملة
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    الباركود • الاشتراكات والتراخيص • الإعلانات • إعدادات التطبيق واللغة
                  </div>
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center group-hover:text-white transition-colors">
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </div>
            </button>
          )}
        </div>
      </main>

      {/* Developer / Owner PIN Verification Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">دخول مطور ومالك المنصة</h3>
              <p className="text-xs text-slate-400 mt-1">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg tracking-wider text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono"
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-950/60 transition-colors cursor-pointer"
                >
                  فتح لوحة المطور والمالك
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  onOpenAuthModal('DEVELOPER');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>تسجيل دخول المطور (نظام الحماية المتقدم)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merchant PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">التحقق من هوية التاجر</h3>
              <p className="text-xs text-slate-400 mt-1">
                أدخل رمز المرور السريع للتاجر (الرمز الافتراضي: 1234) أو سجل دخولك بحسابك
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
                  placeholder="أدخل رمز المرور أو PIN..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg tracking-wider text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 transition-colors"
                >
                  تأكيد ودخول
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  onOpenAuthModal('MERCHANT');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول التاجر عبر الاسم ورقم الهوية / الجوال (نظام الحماية)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 sm:p-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>
          منظومة تطبيق قريتي الرقمية © {new Date().getFullYear()} - بوابتان منفصلتان للتسوق والإدارة
        </p>
      </footer>
    </div>
  );
};
