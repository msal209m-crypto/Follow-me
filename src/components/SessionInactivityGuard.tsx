import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ShieldAlert, Clock, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { getInactivityTimeoutMinutes, clearAllSystemSessions, getActiveSessionRole } from '../services/rbacAuthService';

interface SessionInactivityGuardProps {
  isActiveSession: boolean;
  onAutoLogout: () => void;
  isRTL?: boolean;
}

export const SessionInactivityGuard: React.FC<SessionInactivityGuardProps> = ({
  isActiveSession,
  onAutoLogout,
  isRTL = true,
}) => {
  const [warningRemainingSeconds, setWarningRemainingSeconds] = useState<number | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningRemainingSeconds !== null) {
      setWarningRemainingSeconds(null);
    }
  }, [warningRemainingSeconds]);

  // Listen to user interaction events
  useEffect(() => {
    if (!isActiveSession) {
      setWarningRemainingSeconds(null);
      return;
    }

    // Skip inactivity check for developers
    const role = getActiveSessionRole();
    if (role === 'DEVELOPER') {
        return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleInteraction = () => {
      // If we are in the warning modal, let user explicitly click extend button,
      // but mouse movement doesn't instantly dismiss to prevent accidental moves
      if (warningRemainingSeconds === null) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleInteraction, { passive: true }));

    // Heartbeat check interval every 1 second
    timerRef.current = setInterval(() => {
      const timeoutMinutes = getInactivityTimeoutMinutes();
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const warningThresholdMs = Math.max(timeoutMs - 60 * 1000, 30 * 1000); // 60 seconds before expiration
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        // Perform auto logout
        clearInterval(timerRef.current);
        setWarningRemainingSeconds(null);
        setLockedNotice('تم قفل الجلسة تلقائياً لعدم النشاط لحماية بيانات حسابك.');
        clearAllSystemSessions();
        onAutoLogout();
      } else if (elapsed >= warningThresholdMs) {
        // Show countdown
        const remaining = Math.max(1, Math.ceil((timeoutMs - elapsed) / 1000));
        setWarningRemainingSeconds(remaining);
      } else {
        setWarningRemainingSeconds(null);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleInteraction));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActiveSession, onAutoLogout, warningRemainingSeconds]);

  // Clear locked notice after 7 seconds
  useEffect(() => {
    if (lockedNotice) {
      const t = setTimeout(() => setLockedNotice(null), 7000);
      return () => clearTimeout(t);
    }
  }, [lockedNotice]);

  return (
    <>
      {/* Auto-Locked Toast Notification */}
      {lockedNotice && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-900/95 border-2 border-rose-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce"
        >
          <ShieldAlert className="w-5 h-5 text-rose-300 shrink-0" />
          <span>{lockedNotice}</span>
        </div>
      )}

      {/* Warning Modal (last 60 seconds before auto-logout) */}
      {warningRemainingSeconds !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">تنبيه انتهاء الجلسة لعدم النشاط</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                لم يتم رصد أي نشاط منذ فترة. لحماية بياناتك سيتم تسجيل الخروج تلقائياً خلال:
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="py-2 px-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 inline-flex items-center gap-2">
              <span className="font-mono text-2xl font-black text-amber-300 tracking-wider">
                {warningRemainingSeconds}
              </span>
              <span className="text-xs text-amber-200">ثانية</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={resetActivity}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تمديد الجلسة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWarningRemainingSeconds(null);
                  clearAllSystemSessions();
                  onAutoLogout();
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
