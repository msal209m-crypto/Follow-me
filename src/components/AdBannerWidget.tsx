import React, { useState, useEffect } from 'react';
import { Megaphone, ExternalLink, Sparkles, AlertCircle, Play } from 'lucide-react';
import { AdRecord } from '../types';
import { getAds } from '../services/adsService';

interface AdBannerWidgetProps {
  currentVillage?: string;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const AdBannerWidget: React.FC<AdBannerWidgetProps> = ({
  currentVillage = '',
  isDarkMode,
  isRTL
}) => {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadAndFilterAds = () => {
      const allAds = getAds();
      const activeAds = allAds.filter((ad) => {
        // Must be approved
        if (ad.status !== 'APPROVED') return false;
        
        // Filter by village if specified
        if (currentVillage && ad.village && ad.village !== 'ALL' && ad.village !== currentVillage) {
          return false;
        }

        // Must not be expired (if endDate is present)
        if (ad.endDate) {
          const today = new Date().toISOString().split('T')[0];
          if (ad.endDate < today) return false;
        }

        return true;
      });
      setAds(activeAds);
      setCurrentIndex(0);
    };

    loadAndFilterAds();
    window.addEventListener('qaryati:ads-updated', loadAndFilterAds);
    return () => {
      window.removeEventListener('qaryati:ads-updated', loadAndFilterAds);
    };
  }, [currentVillage]);

  // Rotator logic
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border transition-all duration-300 relative group ${isDarkMode ? 'bg-gradient-to-r from-emerald-950/20 via-slate-900/90 to-emerald-950/20 border-emerald-500/20 shadow-md' : 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-emerald-100 shadow-sm'}`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
        {/* Ad Image */}
        {currentAd.imageUrl && (
          <div className="w-full sm:w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-emerald-500/10">
            <img
              src={currentAd.imageUrl}
              alt={currentAd.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Ad Text Content */}
        <div className="flex-1 text-center sm:text-right min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider animate-pulse">
              <Megaphone className="w-3 h-3" />
              <span>إعلان ممول 📢</span>
            </span>
            <span className="text-[10px] text-slate-500 font-bold">
              مقدم من: <span className="text-emerald-500">{currentAd.storeName}</span>
            </span>
          </div>
          <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} truncate`}>
            {currentAd.title}
          </h4>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-1 mt-0.5`}>
            {currentAd.description}
          </p>
        </div>

        {/* Action Button */}
        <div className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2">
          {currentAd.linkUrl && (
            <a
              href={currentAd.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            >
              <span>زيارة المعلن</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {ads.length > 1 && (
            <div className="flex gap-1 ml-2">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-emerald-500 w-3' : 'bg-slate-700 hover:bg-slate-500'}`}
                  title={`الإعلان ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
