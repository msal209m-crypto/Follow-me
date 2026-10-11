import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedToast(true);
      const timer = setTimeout(() => setShowReconnectedToast(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnectedToast) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white py-2 px-4 text-center text-xs font-bold z-[100] flex items-center justify-center gap-2 shadow-xl animate-in slide-in-from-top duration-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
        <span>تمت استعادة الاتصال بالإنترنت ومزامنة كافة العمليات السحابية بنجاح 🟢</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <aside
      aria-label="تنبيه انقطاع الاتصال"
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white py-2 px-3 text-center text-xs font-bold z-[100] flex items-center justify-center gap-2 shadow-xl border-b border-amber-400/50 animate-in slide-in-from-top duration-200"
    >
      <div className="w-2 h-2 rounded-full bg-amber-200 animate-ping shrink-0" />
      <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
      <span>وضع الأوفلاين نشط ⚡: يمكنك مواصلة البيع والشراء والعمل دون إنترنت، وستُرفع البيانات تلقائياً فور عودة الشبكة.</span>
    </aside>
  );
};
