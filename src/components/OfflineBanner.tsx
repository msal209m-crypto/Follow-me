import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-black p-3 text-center font-bold z-50 flex items-center justify-center gap-2 shadow-lg">
      <WifiOff size={20} />
      <span>الاتصال مقطوع، ويتم عرض البيانات المحفوظة حالياً</span>
    </div>
  );
};
