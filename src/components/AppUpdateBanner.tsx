import React, { useState } from 'react';
import { Rocket, RefreshCw, X } from 'lucide-react';
import { usePWA } from '../context/PWAContext';
import { useApp } from '../context/AppContext';

export const AppUpdateBanner: React.FC = () => {
  const { updateAvailable, newVersionInfo, applyUpdate } = usePWA();
  const { isRTL, language } = useApp();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('flowapp_update_banner_dismissed') === 'true';
  });

  if (!updateAvailable || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('flowapp_update_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="no-print sticky top-0 z-50 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xl px-3 sm:px-6 py-2.5 sm:py-3 animate-in slide-in-from-top-3 duration-300 border-b border-emerald-350"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Update description */}
        <div className="flex items-center gap-2.5 text-center sm:text-right min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-sm animate-bounce">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 font-black text-xs sm:text-sm">
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                {language === 'ar' ? 'تحديث متاح' : 'Update Available'}
              </span>
              <span>
                {language === 'ar'
                  ? `يتوفر إصدار أحدث لتطبيق فلو اب (${newVersionInfo?.version || 'إصدار جديد'})`
                  : `A new version of FlowApp is ready (${newVersionInfo?.version || 'New'})`}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100 truncate">
              {newVersionInfo?.description ||
                (language === 'ar'
                  ? 'تم تحسين ماسح الباركود، التثبيت التلقائي والمزامنة السحابية'
                  : 'Barcode scanner, instant installation, and sync improvements ready')}
            </p>
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="apply-app-update-btn"
            onClick={applyUpdate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-white hover:bg-slate-100 text-emerald-900 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 ring-2 ring-white/50"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 animate-spin" />
            <span>{language === 'ar' ? 'تحديث الآن ⚡' : 'Update Now ⚡'}</span>
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
