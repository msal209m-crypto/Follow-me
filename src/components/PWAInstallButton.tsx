import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 hover:bg-emerald-500 transition-all cursor-pointer"
      >
        <span className="text-lg">📱</span>
        تثبيت التطبيق
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer"
        >
          <span>تثبيت على iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl border border-slate-700">
              <h3 className="text-lg font-black text-white">تثبيت على iPhone / iPad</h3>
              <p className="mt-3 text-sm text-slate-300">
                1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط أدوات Safari.<br />
                2. اسحب للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
