import React, { useState, useEffect } from 'react';
import {
  Code2,
  Lock,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Cpu
} from 'lucide-react';
import {
  verifyDeveloperCredentials,
  getPlatformDeveloperSettings,
  isDeveloperRemembered,
  setDeveloperRemembered,
} from '../services/platformSettingsService';
import { setActiveSessionRole } from '../services/rbacAuthService';

export interface DeveloperAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isDarkMode?: boolean;
  isRTL?: boolean;
  defaultPhone?: string;
}

export const DeveloperAuthModal: React.FC<DeveloperAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isDarkMode = true,
  isRTL = true,
  defaultPhone = '',
}) => {
  const [phone, setPhone] = useState(defaultPhone);
  const [secretKey, setSecretKey] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'phone' | 'key' | 'both' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const developerSettings = getPlatformDeveloperSettings();
  const authorizedSamplePhone = developerSettings.supportPhone || '0502063584';

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setErrorField(null);
      setSuccessMessage(null);
      setLoading(false);
      // Pre-fill phone if empty or if previously remembered
      if (!phone) {
        const savedPhone = localStorage.getItem('qaryati_dev_last_phone');
        if (savedPhone) {
          setPhone(savedPhone);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setErrorField(null);
    setSuccessMessage(null);

    const cleanPhone = phone.trim();
    const cleanKey = secretKey.trim();

    if (!cleanPhone && !cleanKey) {
      setErrorField('both');
      setErrorMessage('يرجى إدخال رقم الجوال ومفتاح المطور السري للمتابعة.');
      return;
    }

    if (!cleanPhone) {
      setErrorField('phone');
      setErrorMessage('يرجى إدخال رقم الجوال المصرح به للمطور (مثال: 0502063584).');
      return;
    }

    if (!cleanKey) {
      setErrorField('key');
      setErrorMessage('يرجى إدخال كلمة المرور أو مفتاح المطور السري (admin).');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const verification = verifyDeveloperCredentials(cleanPhone, cleanKey);

      if (verification.success) {
        // Handle Remember Me
        if (rememberMe) {
          setDeveloperRemembered(true);
          try {
            localStorage.setItem('qaryati_dev_last_phone', cleanPhone);
          } catch {}
        } else {
          setDeveloperRemembered(false);
        }

        // Set developer role in global RBAC session
        setActiveSessionRole('DEVELOPER');
        try {
          localStorage.setItem('qaryati_is_developer', 'true');
        } catch {}

        setSuccessMessage('تم التحقق بنجاح! جاري تحويلك إلى لوحة تحكم المطور...');
        setLoading(false);

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setLoading(false);
        setErrorField(verification.errorField || 'both');
        setErrorMessage(verification.message);
      }
    }, 350);
  };

  const handleQuickFill = () => {
    setPhone('0502063584');
    setSecretKey('admin');
    setErrorMessage(null);
    setErrorField(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative border overflow-hidden transition-all transform ${
          isDarkMode
            ? 'bg-slate-900 border-purple-500/40 text-white shadow-purple-950/50'
            : 'bg-white border-purple-300 text-slate-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              وصول محمي ومشفر
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Identity Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-purple-500/30">
            <Code2 className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-black tracking-tight">
            حماية وتسجيل دخول المطور
          </h3>
          <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            لوحة الإدارة العليا، اشتراكات التجار، مولد الباركود وضبط المنظومة
          </p>

          {/* Developer Identity Card Badge */}
          <div className="mt-3.5 p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] text-slate-300">المالك المعتمد:</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="font-bold text-white">0502063584</span>
              <span className="text-purple-400/60">•</span>
              <span className="text-purple-300">Msal209m@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* FIELD 1: Mobile Phone Number */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-400" />
                  رقم جوال المطور المعتمد
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (مثال: 0502063584)
                </span>
              </div>
            </label>

            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errorField === 'phone' || errorField === 'both') {
                    setErrorField(null);
                    setErrorMessage(null);
                  }
                }}
                placeholder="أدخل رقم الجوال المعتمد (0502063584)..."
                autoFocus
                dir="ltr"
                className={`w-full rounded-xl px-4 py-3 text-sm font-mono tracking-wider transition-all focus:outline-none focus:ring-2 ${
                  errorField === 'phone' || errorField === 'both'
                    ? 'border-rose-500 ring-rose-500/30 bg-rose-500/5'
                    : isDarkMode
                    ? 'bg-slate-950/80 border-slate-700 text-white placeholder-slate-600 focus:border-purple-500 focus:ring-purple-500/30'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/30'
                } border`}
              />
              <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center pointer-events-none text-slate-500">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* FIELD 2: Developer Password / Secret Key */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  كلمة المرور أو مفتاح المطور السري
                </span>
                <span className="text-[10px] text-purple-400/90 font-mono">
                  الافتراضي: admin
                </span>
              </div>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  if (errorField === 'key' || errorField === 'both') {
                    setErrorField(null);
                    setErrorMessage(null);
                  }
                }}
                placeholder="أدخل مفتاح المطور السري (admin)..."
                dir="ltr"
                className={`w-full rounded-xl px-4 py-3 text-sm font-mono tracking-wider transition-all focus:outline-none focus:ring-2 ${
                  errorField === 'key' || errorField === 'both'
                    ? 'border-rose-500 ring-rose-500/30 bg-rose-500/5'
                    : isDarkMode
                    ? 'bg-slate-950/80 border-slate-700 text-white placeholder-slate-600 focus:border-purple-500 focus:ring-purple-500/30'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/30'
                } border`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 left-3 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                title={showPassword ? 'إخفاء الرمز' : 'إظهار الرمز'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Credential Test Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              تعبئة سريعة للاختبار (0502063584 + admin)
            </button>
            <button
              type="button"
              onClick={() => {
                setPhone('0502063584');
                setSecretKey('1234');
                setErrorMessage(null);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-300 font-mono underline"
            >
              (1234)
            </button>
          </div>

          {/* Remember Me Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500/40 border-slate-700 bg-slate-950 cursor-pointer"
              />
              <span className={`${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}>
                تذكرني في هذا الجهاز (حفظ الجلسة والدخول المباشر لاحقاً)
              </span>
            </label>
          </div>

          {/* Error Feedback Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Feedback Banner */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="font-bold">{successMessage}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>التحقق والدخول إلى النظام</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
