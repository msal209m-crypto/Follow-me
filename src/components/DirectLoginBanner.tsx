import React from 'react';
import { ShieldCheck, LogIn, Cloud, AlertCircle, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const DirectLoginBanner: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { isRTL, language, cloudSyncStatus, syncToCloudNow } = useApp();

  // If user is not logged in: show prominent Direct Login Banner
  if (!currentUser) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="no-print mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300"
      >
        <div className="flex items-center gap-3 text-center sm:text-right min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <LogIn className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {language === 'ar' ? 'وضع غير مسجل (ضيف)' : 'Guest Mode (Unregistered)'}
              </span>
              <h3 className="font-black text-xs sm:text-sm text-white">
                {language === 'ar' ? 'سجّل دخولك الآن لحفظ بياناتك سحابياً' : 'Sign in to protect & sync your store data'}
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              {language === 'ar'
                ? 'لا تدع بياناتك مخفية أو معرّضة للضياع! انقر هنا لتسجيل الدخول الفوري ومزامنة كافة أجهزتك.'
                : 'Directly log in to enable instant real-time cloud backup and multi-device access.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="direct-login-banner-btn"
          onClick={onOpenAuthModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:from-emerald-600 active:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-950 transition-all cursor-pointer shrink-0 active:scale-95 ring-2 ring-emerald-400/40"
        >
          <LogIn className="w-4 h-4" />
          <span>{language === 'ar' ? 'تسجيل الدخول المباشر الآن' : 'Sign In Directly Now'}</span>
        </button>
      </div>
    );
  }

  // If user IS logged in: reassure them with visible, felt presence of their account
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="no-print mb-4 sm:mb-6 p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-black text-xs">
            {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-ping" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-white truncate">
              {userProfile?.displayName || currentUser.email?.split('@')[0] || 'المدير'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              {userProfile?.storeName || 'متجري الذكي'}
            </span>
            <span className="hidden xs:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{language === 'ar' ? 'متصل وحاضر' : 'Online & Active'}</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {currentUser.email || 'حساب التاجر المعتمد'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={syncToCloudNow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95"
          title={language === 'ar' ? 'مزامنة السحابة الآن' : 'Sync cloud now'}
        >
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xs:inline">{language === 'ar' ? 'مزامنة سحابية' : 'Cloud Sync'}</span>
        </button>

        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95"
          title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
};
