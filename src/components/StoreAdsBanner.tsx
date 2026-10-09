import React, { useState, useEffect } from 'react';
import { Sparkles, Percent, Truck, Store, ArrowLeft, ArrowRight, Tag } from 'lucide-react';
import { getPlatformAds, PlatformAd } from '../services/platformSettingsService';

interface StoreAdsBannerProps {
  currentVillage: string;
  isDarkMode?: boolean;
  isRTL?: boolean;
  onStoreSelect?: (storeId: string) => void;
}

export const StoreAdsBanner: React.FC<StoreAdsBannerProps> = ({
  currentVillage,
  isDarkMode = true,
  isRTL = true,
  onStoreSelect,
}) => {
  const [ads, setAds] = useState<PlatformAd[]>(() => getPlatformAds().filter((a) => a.isActive));
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const handleAdsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setAds(customEvent.detail.filter((a: PlatformAd) => a.isActive));
      } else {
        setAds(getPlatformAds().filter((a) => a.isActive));
      }
    };

    window.addEventListener('qaryati:ads-updated', handleAdsUpdate as EventListener);
    window.addEventListener('storage', handleAdsUpdate as EventListener);
    return () => {
      window.removeEventListener('qaryati:ads-updated', handleAdsUpdate as EventListener);
      window.removeEventListener('storage', handleAdsUpdate as EventListener);
    };
  }, []);

  const slides = ads.length > 0 ? ads : [];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[activeSlide] || slides[0];
  if (!current) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 mt-3 mb-3">
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${
          (current as any).bgGradient || 'from-emerald-950 via-teal-900 to-slate-900'
        } border ${
          (current as any).borderColor || 'border-emerald-500/40'
        } p-4 sm:p-5 shadow-2xl text-right flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500`}
      >
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10 w-full sm:w-auto flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black ${(current as any).accentColor || 'bg-emerald-500 text-slate-950'} flex items-center gap-1.5 shadow-md`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{(current as any).badge || (current as any).title}</span>
            </span>
            {currentVillage && currentVillage !== 'ALL' && (
              <span className="text-[11px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                📍 عرض خاص لـ ({currentVillage})
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
            {(current as any).title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            {(current as any).subtitle || (current as any).description}
          </p>

          {(current as any).discountCode && (
            <div className="inline-flex items-center gap-1.5 bg-slate-900/90 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-mono font-bold mt-1">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>استخدم رمز الخصم: {(current as any).discountCode}</span>
            </div>
          )}
        </div>

        {/* Carousel Indicators & Actions */}
        <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeSlide === idx ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`الانتقال للإعلان ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg animate-pulse">
              <Store className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
