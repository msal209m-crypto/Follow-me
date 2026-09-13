import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastNotification: React.FC = () => {
  const { notification, dismissNotification, isRTL } = useApp();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const startTime = Date.now();
    const duration = 4500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification]);

  if (!notification) return null;

  const { message, type } = notification;

  const getStyle = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/80',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          barColor: 'bg-emerald-400',
          title: isRTL ? 'نجاح' : 'Success',
        };
      case 'error':
        return {
          bg: 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/80',
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          barColor: 'bg-rose-400',
          title: isRTL ? 'خطأ أو تنبيه' : 'Attention',
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/80',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          barColor: 'bg-amber-400',
          title: isRTL ? 'تنبيه' : 'Warning',
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-900/95 border-teal-500 text-teal-100 shadow-slate-950/80',
          icon: <Info className="w-5 h-5 text-teal-400 shrink-0" />,
          barColor: 'bg-teal-400',
          title: isRTL ? 'إشعار' : 'Notice',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      id="global-toast-notification"
      role="alert"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto"
    >
      <div
        className={`relative overflow-hidden flex items-center justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl transition-all ${style.bg}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {style.icon}
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold leading-relaxed break-words">
              {message}
            </p>
          </div>
        </div>

        {/* Dismiss / Hide alert button */}
        <button
          id="btn-dismiss-toast"
          type="button"
          onClick={dismissNotification}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/90 hover:text-white transition-all cursor-pointer shrink-0 border border-white/15"
          title={isRTL ? 'إخفاء هذا التنبيه فوراً' : 'Dismiss this alert immediately'}
        >
          <span className="text-[11px] font-bold">{isRTL ? 'إخفاء' : 'Dismiss'}</span>
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Progress bar indicating auto-hide time */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div
            className={`h-full transition-all duration-75 ${style.barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
