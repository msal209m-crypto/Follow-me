import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  RotateCw,
  MessageSquareCode,
  Copy,
} from 'lucide-react';
import { requestPasswordResetOTP, verifyOTP, resetPasswordWithOTP } from '../services/rbacAuthService';

interface OTPPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  targetRole?: 'MERCHANT' | 'DRIVER' | 'DEVELOPER';
  onSuccess?: () => void;
  isRTL?: boolean;
}

export const OTPPasswordResetModal: React.FC<OTPPasswordResetModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  targetRole = 'MERCHANT',
  onSuccess,
  isRTL = true,
}) => {
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('PHONE');
  const [phone, setPhone] = useState(defaultPhone);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeCodeBanner, setActiveCodeBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPhone(defaultPhone);
      setStep('PHONE');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setActiveCodeBanner(null);
    }
  }, [isOpen, defaultPhone]);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendOTP = () => {
    setErrorMessage(null);
    if (!phone.trim()) {
      setErrorMessage('يرجى إدخال رقم الجوال المسجل أولاً');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const role: 'MERCHANT' | 'DRIVER' | 'DEVELOPER' =
        targetRole === 'DEVELOPER' ? 'DEVELOPER' : targetRole === 'DRIVER' ? 'DRIVER' : 'MERCHANT';
      const res = requestPasswordResetOTP(phone, role);
      setLoading(false);
      if (res.success) {
        setStep('OTP');
        setResendCooldown(60);
        if (res.otpCode) {
          setActiveCodeBanner(res.otpCode);
        }
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  const handleVerifyOTP = () => {
    setErrorMessage(null);
    if (!otpCode.trim()) {
      setErrorMessage('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = verifyOTP(phone, otpCode);
      setLoading(false);
      if (res.success) {
        setStep('NEW_PASSWORD');
      } else {
        setErrorMessage(res.message);
      }
    }, 300);
  };

  const handleResetPassword = () => {
    setErrorMessage(null);
    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف أو أرقام');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = resetPasswordWithOTP(phone, otpCode, newPassword);
      setLoading(false);
      if (res.success) {
        setStep('SUCCESS');
      } else {
        setErrorMessage(res.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-10 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-b border-slate-800 text-center">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-950/50">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white">استعادة كلمة المرور عبر رمز (OTP)</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {step === 'PHONE' && 'أدخل رقم جوالك المسجل ليصلك رمز التحقق المباشر.'}
            {step === 'OTP' && 'أدخل رمز التحقق المكون من 6 أرقام المرسل إلى هاتفك.'}
            {step === 'NEW_PASSWORD' && 'أدخل كلمة المرور الجديدة لحسابك وقم بتأكيدها.'}
            {step === 'SUCCESS' && 'تم استعادة الحساب وتحديث كلمة المرور بنجاح!'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Real simulated SMS OTP Banner for seamless testing and demonstration */}
          {activeCodeBanner && step === 'OTP' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 text-xs space-y-1.5 shadow-lg">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <MessageSquareCode className="w-4 h-4 text-emerald-400" />
                  <span>إشعار رسالة نصية (SMS OTP):</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode(activeCodeBanner);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>تعبئة تلقائية</span>
                </button>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                رمز التحقق المؤقت الخاص بحسابك في فلو اب هو:{' '}
                <strong className="font-mono text-base text-emerald-300 font-black tracking-wider bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  {activeCodeBanner}
                </strong>
              </p>
            </div>
          )}

          {/* STEP 1: PHONE */}
          {step === 'PHONE' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رقم الجوال المسجل للحساب
                </label>
                <div className="relative">
                  <Phone className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="tel"
                    required
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    } py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-950 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>جارٍ إرسال الرمز...</span>
                ) : (
                  <>
                    <span>إرسال رمز التحقق (OTP)</span>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: OTP INPUT */}
          {step === 'OTP' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رمز التحقق المرسل لرقم {phone}
                </label>
                <div className="relative">
                  <KeyRound className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    } py-2.5 text-sm tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono font-bold`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  تغيير رقم الجوال
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleSendOTP}
                  className="text-amber-400 hover:text-amber-300 disabled:text-slate-600 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <RotateCw className={`w-3 h-3 ${resendCooldown > 0 ? '' : 'animate-spin'}`} />
                  <span>{resendCooldown > 0 ? `إعادة الإرسال بعد ${resendCooldown} ث` : 'إعادة إرسال الرمز'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={loading || otpCode.length < 4}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-950 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'جارٍ التحقق...' : 'تأكيد الرمز والمتابعة'}
              </button>
            </div>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'NEW_PASSWORD' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور قوية"
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور"
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
              </button>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-white">تم تغيير كلمة المرور بنجاح!</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                تم تحديث بيانات حسابك بأمان، يمكنك الآن تسجيل الدخول مباشرة بكلمة المرور الجديدة.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-950 mt-2"
              >
                تسجيل الدخول الآن
              </button>
            </div>
          )}

          {/* Security Guarantee */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>نظام الحماية المشفر يضمن حماية حسابك من الاختراق والوصول غير المصرح.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
