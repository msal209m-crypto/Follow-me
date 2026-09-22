import React, { useState, useEffect } from 'react';
import { Moon, Clock, Heart } from 'lucide-react';
import { isStoreClosedForPrayer, getAdhanSettings } from '../services/adhanService';

export interface StorePrayerClosedBannerProps {
  isRTL?: boolean;
}

export const StorePrayerClosedBanner: React.FC<StorePrayerClosedBannerProps> = ({ isRTL = true }) => {
  const [closedInfo, setClosedInfo] = useState(() => isStoreClosedForPrayer(getAdhanSettings()));

  useEffect(() => {
    const check = () => {
      setClosedInfo(isStoreClosedForPrayer(getAdhanSettings()));
    };
    check();
    const timer = setInterval(check, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!closedInfo.isClosed) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-500/50 shadow-lg text-white animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="font-extrabold text-sm text-emerald-400">
            المتجر في استراحة لأداء {closedInfo.prayerName || 'الصلاة'} 🕌
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            تقبل الله منا ومنكم صالح الأعمال. سيعاود المتجر استقبال وتجهيز طلبات أهل القرية بعد قليل بإذن الله (متبقي قرابة {closedInfo.minutesRemaining} دقيقة).
          </p>
        </div>
      </div>
    </div>
  );
};
