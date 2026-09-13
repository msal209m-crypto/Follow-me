import React from 'react';
import { Download, Smartphone, Zap, WifiOff, X, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { usePWA } from '../context/PWAContext';
import { useApp } from '../context/AppContext';

export const PWAInstallModal: React.FC = () => {
  const {
    showInstallPromptModal,
    setShowInstallPromptModal,
    promptInstall,
    isInstalled,
    isIOS,
  } = usePWA();

  const { isRTL, language } = useApp();

  if (!showInstallPromptModal || isInstalled) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('flowapp_pwa_prompt_dismissed', 'true');
    setShowInstallPromptModal(false);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      // Keep open so iOS instructions stay visible
      return;
    }
    const success = await promptInstall();
    if (success) {
      setShowInstallPromptModal(false);
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-emerald-950/50 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
          title={language === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Banner */}
        <div className="p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 text-center relative pt-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 border border-emerald-400/40 text-white flex items-center justify-center mx-auto mb-3 shadow-xl shadow-emerald-950/80">
            <Smartphone className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ar' ? 'تطبيق مثبت فوري' : 'Installable PWA'}</span>
          </span>

          <h2 className="text-lg sm:text-xl font-black text-white">
            {language === 'ar' ? 'تثبيت تطبيق فلو اب على جهازك' : 'Install FlowApp on Your Device'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            {language === 'ar'
              ? 'احصل على تجربة كاشير فائقة السرعة مع إمكانية العمل بدون إنترنت'
              : 'Enjoy an ultra-fast cashier experience with full offline support'}
          </p>
        </div>

        {/* Features List */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-100">
                  {language === 'ar' ? 'يعمل بدون إنترنت (Offline)' : 'Full Offline Mode'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'ar' ? 'واصل البيع وتسجيل الفواتير حتى عند انقطاع الشبكة' : 'Continue sales even without internet'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-100">
                  {language === 'ar' ? 'سرعة فائقة وفتح فوري' : 'Instant Launch & Speed'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'ar' ? 'أي كاشير ومسح باركود مباشر بدون انتظار أو تحميل' : 'Direct barcode scanning and zero lag'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-100">
                  {language === 'ar' ? 'أيقونة على الشاشة الرئيسية' : 'Home Screen Icon'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'ar' ? 'يعمل كتطبيق كامل ومستقل لشاشة المبيعات' : 'Full standalone app interface without URL bar'}
                </div>
              </div>
            </div>
          </div>

          {/* iOS Safari Guided Instructions */}
          {isIOS ? (
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Share className="w-4 h-4" />
                <span>{language === 'ar' ? 'طريقة التثبيت على أجهزة iPhone و iPad:' : 'Installation on iPhone / iPad:'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                <li>
                  {language === 'ar' ? 'اضغط على زر المشاركة' : 'Tap the Share button'}{' '}
                  <span className="inline-block px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300">
                    <Share className="w-3 h-3 inline" /> Share
                  </span>{' '}
                  {language === 'ar' ? 'في أسفل متصفح Safari.' : 'in Safari toolbar.'}
                </li>
                <li>
                  {language === 'ar' ? 'مرر للأسفل واختر' : 'Scroll down and select'}{' '}
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    <PlusSquare className="w-3 h-3" /> {language === 'ar' ? 'إضافة إلى الصفحة الرئيسية' : 'Add to Home Screen'}
                  </span>
                </li>
                <li>
                  {language === 'ar' ? 'اضغط على (إضافة Add) بأعلى الشاشة.' : 'Tap (Add) in the top right.'}
                </li>
              </ol>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {!isIOS ? (
              <button
                type="button"
                id="pwa-confirm-install-btn"
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-950/60 transition-all cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'ar' ? 'تثبيت التطبيق الآن على هاتفك/جهازك' : 'Install App Now'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'ar' ? 'فهمت، سأضيفه للشاشة الرئيسية' : 'Got it, adding to home screen'}</span>
              </button>
            )}

            <button
              type="button"
              id="pwa-dismiss-install-btn"
              onClick={handleDismiss}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'المتابعة عبر المتصفح مؤقتاً' : 'Continue in browser'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
