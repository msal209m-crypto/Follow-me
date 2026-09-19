import React, { useState } from 'react';
import { Store, ArrowRight, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { StoreSettings } from '../types';
import { getPlatformDeveloperSettings } from '../services/platformSettingsService';

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
  const title = devSettings.welcomeTitle || 'البوابة الرسمية لمنظومة قريتي الرقمية';
  const subtitle = devSettings.welcomeSubtitle || 'منصة موحدة لإدارة متجر القرية، طلبات التوصيل، حسابات التجار، والخدمات الرقمية المتكاملة';
  const image = devSettings.welcomeImageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white"
    >
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-600/15 blur-[140px] rounded-full pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[250px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center space-y-6">
        
        {/* Top Developer Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mx-auto shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>شاشة الترحيب الرسمية (مخصص بواسطة المطور)</span>
        </div>

        {/* Hero Image / Logo Showcase */}
        {image && (
          <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
            <img
              src={image}
              alt="Welcome Splash"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-5">
              <div className="flex items-center gap-3 text-right">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-sm sm:text-base">
                    {settings.storeName || devSettings.platformName}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">{devSettings.developerOwnerName}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Text */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Enter Portal Official Button */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onEnterPortal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-3 transition-all cursor-pointer group"
          >
            <span>الدخول إلى البوابة الرسمية والأيقونات</span>
            {isRTL ? (
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            ) : (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-xs text-slate-500 pt-2 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>منظومة رقمية محمية ومؤمنة بالكامل © {new Date().getFullYear()}</span>
        </div>

      </div>
    </div>
  );
};
