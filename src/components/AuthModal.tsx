import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Store,
  User,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Cloud,
  Zap,
  X,
  KeyRound,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseToStore?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onCloseToStore,
}) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();
  const { t, isRTL, language } = useApp();

  const handleModalClose = () => {
    if (typeof onCloseToStore === 'function') {
      onCloseToStore();
    } else {
      onClose();
    }
  };

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'FORGOT_PASSWORD') {
        if (!email.trim()) {
          setErrorMessage(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني أولاً.' : 'Please enter your email.');
          setLoading(false);
          return;
        }
        await sendPasswordReset(email.trim());
        setSuccessMessage(
          language === 'ar'
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح! يرجى مراجعة صندوق الوارد (أو مجلد الرسائل غير المرغوبة Spam) والنقر على الرابط لتحديد كلمة سر جديدة.'
            : 'Password reset link sent to your email! Please check your inbox (or spam) and click the link to set a new password.'
        );
        setLoading(false);
        return;
      }

      if (mode === 'LOGIN') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(
          email.trim(),
          password,
          displayName.trim(),
          storeName.trim() || 'متجري الذكي'
        );
      }
      onClose();
    } catch (err: any) {
      console.warn('Auth error handled:', err?.code || err?.message);
      const code = err?.code || '';
      let msg = err?.message || t.error;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
      } else if (code === 'auth/user-not-found') {
        msg = language === 'ar' ? 'لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني.' : 'No account found with this email.';
      } else if (code === 'auth/email-already-in-use') {
        msg = language === 'ar' ? 'هذا البريد الإلكتروني مسجل مسبقاً.' : 'This email is already registered.';
      } else if (code === 'auth/weak-password') {
        msg = language === 'ar' ? 'كلمة المرور ضعيفة (يجب ألا تقل عن 6 أحرف/أرقام).' : 'Password is too weak (min 6 characters).';
      } else if (code === 'auth/invalid-email') {
        msg = language === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة.' : 'Invalid email format.';
      } else if (code === 'auth/too-many-requests') {
        msg = language === 'ar' ? 'تم حظر الطلبات مؤقتاً لكثرة المحاولات، يرجى المحاولة بعد قليل.' : 'Too many attempts. Please try again later.';
      } else if (code === 'auth/operation-not-allowed') {
        msg = language === 'ar' ? 'تم الدخول بالوضع الآمن المعزول للمتجر.' : 'Switched to isolated secure merchant mode.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily closed the popup, do nothing
        return;
      }
      console.warn('Google sign in note:', err);
      setErrorMessage(
        language === 'ar'
          ? 'تعذر إتمام الدخول عبر Google. يمكنك استخدام البريد وكلمة المرور مباشرة.'
          : 'Could not complete Google sign-in. You can use email & password directly.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 relative"
      >
        {/* Close Modal Button - Return directly to Main Store */}
        <button
          type="button"
          onClick={handleModalClose}
          className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} z-10 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60 shadow-md group flex items-center gap-1.5`}
          title={language === 'ar' ? 'إغلاق والانتقال إلى واجهة المتجر والعملاء' : 'Close and go to store'}
          aria-label={language === 'ar' ? 'إغلاق والانتقال إلى واجهة المتجر' : 'Close and navigate to store'}
        >
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors hidden sm:inline">
            {language === 'ar' ? 'المتجر الأساسي' : 'Store'}
          </span>
          <X className="w-4 h-4" />
        </button>

        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-cyan-950/80 border-b border-slate-800 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-950">
            {mode === 'FORGOT_PASSWORD' ? (
              <KeyRound className="w-6 h-6 text-amber-400" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {mode === 'FORGOT_PASSWORD'
              ? (language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password')
              : mode === 'SIGNUP'
              ? (language === 'ar' ? 'إنشاء حساب تاجر جديد' : 'Create Merchant Account')
              : t.loginTitle}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
            {mode === 'FORGOT_PASSWORD'
              ? (language === 'ar'
                  ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً فورياً لإعادة تعيين كلمة المرور بأمان.'
                  : 'Enter your registered email and we will send you a secure link to reset your password.')
              : mode === 'SIGNUP'
              ? (language === 'ar'
                  ? 'سجل متجرك الآن للتمتع بالمزامنة السحابية والحفظ التلقائي.'
                  : 'Register your store for cloud sync and instant automated backup.')
              : t.loginSubtitle}
          </p>
        </div>

        {/* Form Container */}
        <div className="p-5 sm:p-6 space-y-4">
          {mode !== 'FORGOT_PASSWORD' && (
            <>
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-xs sm:text-sm">{t.loginWithGoogle}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[11px] text-slate-500 uppercase font-medium">
                  {language === 'ar' ? 'أو بالبريد الإلكتروني' : 'Or with email'}
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>
            </>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-600/70 text-emerald-200 text-xs flex items-start gap-2.5 shadow-md">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-300">{language === 'ar' ? 'تم إرسال التعليمات!' : 'Instructions Sent!'}</p>
                <p className="leading-relaxed text-emerald-100">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'SIGNUP' && (
              <>
                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">
                    {t.displayNamePlaceholder}
                  </label>
                  <div className="relative">
                    <User className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: محمد العمري' : 'e.g. John Doe'}
                      className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                        isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1 font-medium">
                    {t.storeNamePlaceholder}
                  </label>
                  <div className="relative">
                    <Store className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: متجر النور للمواد الغذائية' : 'e.g. Acme Supermarket'}
                      className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                        isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                    isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                  } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                />
              </div>
            </div>

            {mode !== 'FORGOT_PASSWORD' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-300 font-medium">
                    {language === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode('FORGOT_PASSWORD');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                    >
                      {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading
                ? (language === 'ar' ? 'جارٍ المعالجة والإرسال...' : 'Processing...')
                : mode === 'FORGOT_PASSWORD'
                ? (language === 'ar' ? 'إرسال رابط استعادة كلمة المرور' : 'Send Password Reset Link')
                : mode === 'LOGIN'
                ? t.signInBtn
                : t.signUpBtn}
            </button>
          </form>

          {/* Toggle Links */}
          <div className="pt-2 text-center space-y-1.5">
            {mode === 'FORGOT_PASSWORD' ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode('LOGIN');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
              >
                {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
              >
                {mode === 'LOGIN' ? t.dontHaveAccount : t.alreadyHaveAccount}
              </button>
            )}
          </div>

          {/* Security Note */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.accountSecurityNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
