import React, { useState, useEffect } from 'react';
import { Rocket, RefreshCw, X, Sparkles } from 'lucide-react';
import { usePWA } from '../context/PWAContext';
import { useApp } from '../context/AppContext';

export const AppUpdateBanner: React.FC = () => {
  const { updateAvailable, newVersionInfo, applyUpdate } = usePWA();
  const { isRTL, language } = useApp();
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('flowapp_update_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // When a truly new version arrives, allow banner to show if not already dismissed in session
  useEffect(() => {
    if (updateAvailable) {
      try {
        const dismissed = sessionStorage.getItem('flowapp_update_banner_dismissed') === 'true';
        if (!dismissed) {
          setIsDismissed(false);
        }
      } catch {}
    }
  }, [updateAvailable, newVersionInfo]);

  if (!updateAvailable || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('flowapp_update_banner_dismissed', 'true');
    } catch {}
  };

  const handleApply = async () => {
    setIsUpdating(true);
    await applyUpdate();
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="no-print fixed top-0 inset-x-0 z-[9999] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl px-3 sm:px-6 py-2.5 sm:py-3 animate-in slide-in-from-top duration-300 border-b-2 border-emerald-300/60"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Update description */}
        <div className="flex items-center gap-2.5 text-center sm:text-right min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-sm animate-bounce">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 font-black text-xs sm:text-sm">
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs">
                {language === 'ar' ? 'تحديث فوري' : 'Live Update'}
              </span>
              <span>
                {language === 'ar'
                  ? `تتوفر تحديثات جديدة للبيانات أو النظام (${newVersionInfo?.version || 'إصدار جديد'})`
                  : `New data or system update ready (${newVersionInfo?.version || 'New'})`}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100 truncate mt-0.5">
              {newVersionInfo?.description ||
                (language === 'ar'
                  ? 'تم تحديث المتاجر والإعلانات في السحابة - اضغط لإعادة التحميل وتطبيق التغييرات فوراً'
                  : 'Cloud stores and ads updated - click to reload and apply changes')}
            </p>
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="apply-app-update-btn"
            disabled={isUpdating}
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 sm:py-2 bg-white hover:bg-slate-100 text-emerald-950 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer active:scale-95 ring-2 ring-white/60 hover:ring-amber-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? (language === 'ar' ? 'جاري التحديث...' : 'Reloading...') : (language === 'ar' ? 'إعادة تحميل وتطبيق الآن ⚡' : 'Reload & Apply ⚡')}</span>
          </button>

          <button
            type="button"
            id="dismiss-app-update-btn"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl bg-black/20 hover:bg-black/35 text-white/90 hover:text-white transition-colors cursor-pointer border border-white/20"
            title={language === 'ar' ? 'إخفاء هذا التنبيه' : 'Dismiss alert'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
