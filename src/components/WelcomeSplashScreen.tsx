import React from 'react';
import { Store, ArrowRight, ArrowLeft, ShieldCheck, UserCheck, LogIn } from 'lucide-react';
import { StoreSettings } from '../types';
import { getPlatformDeveloperSettings } from '../services/platformSettingsService';
import { CoffeeTreeLogo } from './CoffeeTreeLogo';

interface WelcomeSplashScreenProps {
  settings: StoreSettings;
  isRTL: boolean;
  onEnterPortal: () => void;
}

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({
  settings,
  isRTL,
  onEnterPortal,
}) => {
  const devSettings = getPlatformDeveloperSettings();
  const platformName = devSettings.platformName || 'منصة قريتي الرقمية';
  const subtitle = devSettings.welcomeSubtitle || 'المنصة الرقمية الموحدة للقرى والمتاجر - تصفح، اطلب، وادخل لحسابك بكل سهولة وأمان';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white"
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Main Container with Ample Whitespace */}
      <div className="max-w-xl w-full bg-slate-900/80 border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-2xl text-center space-y-8">
        
        {/* App Logo / Coffee Tree Emblem */}
        <div className="mx-auto flex justify-center">
          <CoffeeTreeLogo size={72} />
        </div>

        {/* Introduction Title & Subtitle with Generous Spacing */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            مرحباً بك في {platformName}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Focused Login / Account Creation Action */}
        <div className="pt-2 flex flex-col gap-3.5">
          <button
            type="button"
            onClick={onEnterPortal}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 transition-all cursor-pointer group active:scale-98"
          >
            <LogIn className="w-5 h-5" />
            <span>تسجيل الدخول أو إنشاء حساب</span>
            {isRTL ? (
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>

        {/* Footer Trust Note */}
        <div className="pt-6 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>منظومة رقمية آمنة وموثقة بالكامل © {new Date().getFullYear()}</span>
        </div>

      </div>
    </div>
  );
};

