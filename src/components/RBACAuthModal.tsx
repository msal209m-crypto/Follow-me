import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Phone,
  Store,
  User,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  X,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Truck,
  Code2,
  ShoppingBag,
  IdCard,
  Camera,
  MapPin,
} from 'lucide-react';
import {
  loginMerchant,
  registerMerchant,
  loginDriver,
  registerDriver,
  saveCustomerSession,
  verifyDeveloperAccess,
} from '../services/rbacAuthService';
import { OTPPasswordResetModal } from './OTPPasswordResetModal';
import { useAuth } from '../context/AuthContext';

export type RBACRoleTab = 'MERCHANT' | 'DRIVER' | 'CUSTOMER' | 'DEVELOPER';

export interface RBACAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseToStore?: () => void;
  initialRole?: RBACRoleTab;
  onSuccess?: (role: RBACRoleTab, user?: any) => void;
  onRoleLoginSuccess?: (role: RBACRoleTab, user?: any) => void;
  isRTL?: boolean;
}

export const RBACAuthModal: React.FC<RBACAuthModalProps> = ({
  isOpen,
  onClose,
  onCloseToStore,
  initialRole = 'MERCHANT',
  onSuccess,
  onRoleLoginSuccess,
  isRTL = true,
}) => {
  const { isCloudConnected } = useAuth();
  const [activeTab, setActiveTab] = useState<RBACRoleTab>(initialRole);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const handleModalClose = () => {
    if (typeof onCloseToStore === 'function') {
      onCloseToStore();
    } else {
      onClose();
    }
  };

  // Merchant Fields
  const [merchantName, setMerchantName] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantNationalId, setMerchantNationalId] = useState('');
  const [merchantPassword, setMerchantPassword] = useState('');
  const [merchantStoreName, setMerchantStoreName] = useState('');
  const [merchantVillage, setMerchantVillage] = useState('قرية السعادة');

  // Driver Fields
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverVehicle, setDriverVehicle] = useState<'MOTORCYCLE' | 'CAR' | 'BICYCLE'>('MOTORCYCLE');
  const [driverPhoto, setDriverPhoto] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

  // Customer Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVillage, setCustomerVillage] = useState('قرية السعادة');

  // Developer Fields
  const [devPin, setDevPin] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Modal
  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [otpTargetRole, setOtpTargetRole] = useState<'MERCHANT' | 'DRIVER' | 'DEVELOPER'>('MERCHANT');
  const [otpPhone, setOtpPhone] = useState('');

  if (!isOpen) return null;

  const resetFormFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTabChange = (tab: RBACRoleTab) => {
    setActiveTab(tab);
    resetFormFeedback();
  };

  const handleSuccess = (role: RBACRoleTab, user?: any) => {
    if (typeof onRoleLoginSuccess === 'function') {
      try {
        onRoleLoginSuccess(role, user);
      } catch (err) {
        console.error('Error in onRoleLoginSuccess:', err);
      }
    }
    if (typeof onSuccess === 'function') {
      try {
        onSuccess(role, user);
      } catch (err) {
        console.error('Error in onSuccess:', err);
      }
    }
  };

  // Merchant Submit
  const handleMerchantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();
    setLoading(true);

    setTimeout(() => {
      if (mode === 'LOGIN') {
        const res = loginMerchant(merchantPhone, merchantPassword);
        setLoading(false);
        if (res.success) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            onClose();
            handleSuccess('MERCHANT', res.merchant || { storeName: merchantStoreName, village: merchantVillage });
          }, 300);
        } else {
          setErrorMessage(res.message);
        }
      } else {
        const res = registerMerchant({
          name: merchantName,
          phone: merchantPhone,
          nationalId: merchantNationalId,
          password: merchantPassword,
          storeName: merchantStoreName,
          village: merchantVillage,
        });
        setLoading(false);
        if (res.success) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            onClose();
            handleSuccess('MERCHANT', res.merchant || { storeName: merchantStoreName, village: merchantVillage });
          }, 300);
        } else {
          setErrorMessage(res.message);
        }
      }
    }, 350);
  };

  // Driver Submit
  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();
    setLoading(true);

    setTimeout(() => {
      if (mode === 'LOGIN') {
        const res = loginDriver(driverPhone, driverPassword);
        setLoading(false);
        if (res.success) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            onClose();
            handleSuccess('DRIVER', res.driver);
          }, 300);
        } else {
          setErrorMessage(res.message);
        }
      } else {
        const res = registerDriver({
          name: driverName,
          phone: driverPhone,
          password: driverPassword,
          photo: driverPhoto,
          vehicleType: driverVehicle,
          zone: 'منطقة التوصيل السريع',
        });
        setLoading(false);
        if (res.success) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            onClose();
            handleSuccess('DRIVER', res.driver);
          }, 300);
        } else {
          setErrorMessage(res.message);
        }
      }
    }, 350);
  };

  // Customer Submit
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();

    if (!customerName.trim()) {
      setErrorMessage('يرجى إدخال اسمك الكريم للمتابعة');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('يرجى إدخال رقم الجوال لتأكيد طلبك وتسهيل التوصيل');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      saveCustomerSession({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        village: customerVillage.trim() || 'القرية',
        savedAt: new Date().toISOString(),
      });
      setLoading(false);
      onClose();
      handleSuccess('CUSTOMER', {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        village: customerVillage.trim(),
      });
    }, 200);
  };

  // Developer Submit
  const handleDeveloperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();

    if (!devPin.trim()) {
      setErrorMessage('يرجى إدخال رمز المطور أو كلمة المرور');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const ok = verifyDeveloperAccess(devPin);
      setLoading(false);
      if (ok) {
        setSuccessMessage('تم التحقق من صلاحيات المطور والمالك بنجاح');
        setTimeout(() => {
          onClose();
          handleSuccess('DEVELOPER');
        }, 300);
      } else {
        setErrorMessage('رمز الحماية للمطور غير صحيح! (الرمز الافتراضي: admin أو 1234)');
      }
    }, 300);
  };

  const handleOpenOTP = (role: 'MERCHANT' | 'DRIVER' | 'DEVELOPER', defaultPhoneValue: string) => {
    setOtpTargetRole(role);
    setOtpPhone(defaultPhoneValue);
    setIsOTPModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 relative my-auto"
        >
          {/* Close Button - Direct Return to Core App (Village Store & Customer Interface) */}
          <button
            type="button"
            onClick={handleModalClose}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} z-10 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700 shadow-md group flex items-center gap-1.5`}
            title="إغلاق والانتقال إلى واجهة المتجر والعملاء الأساسية"
            aria-label="إغلاق والانتقال إلى المتجر الرئيسي"
          >
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors hidden sm:inline">
              واجهة المتجر والعملاء
            </span>
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>نظام الأمان والصلاحيات الموحد (RBAC)</span>
            </div>
            <h2 className="text-xl font-black text-white">تسجيل الدخول وإدارة الصلاحيات</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              اختر دورك للوصول المباشر إلى المنظومة وحماية بياناتك
            </p>
          </div>

          {/* 4 Role Tabs */}
          <div className="px-4 pt-3 pb-2 grid grid-cols-4 gap-1.5 bg-slate-950/60 border-b border-slate-800">
            {/* Merchant Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('MERCHANT')}
              className={`p-2 rounded-2xl flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                activeTab === 'MERCHANT'
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'
              }`}
            >
              <Store className="w-4 h-4" />
              <span className="text-[11px] font-bold">التاجر</span>
            </button>

            {/* Driver Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('DRIVER')}
              className={`p-2 rounded-2xl flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                activeTab === 'DRIVER'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span className="text-[11px] font-bold">السائق</span>
            </button>

            {/* Customer Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('CUSTOMER')}
              className={`p-2 rounded-2xl flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                activeTab === 'CUSTOMER'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-[11px] font-bold">العميل</span>
            </button>

            {/* Developer Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('DEVELOPER')}
              className={`p-2 rounded-2xl flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                activeTab === 'DEVELOPER'
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-transparent'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span className="text-[11px] font-bold">المطور</span>
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-600/70 text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 1: MERCHANT (التاجر) */}
            {/* ========================================================= */}
            {activeTab === 'MERCHANT' && (
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('LOGIN');
                      resetFormFeedback();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      mode === 'LOGIN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تسجيل دخول التاجر
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('REGISTER');
                      resetFormFeedback();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      mode === 'REGISTER' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تسجيل تاجر جديد
                  </button>
                </div>

                <form onSubmit={handleMerchantSubmit} className="space-y-3">
                  {mode === 'REGISTER' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">اسم التاجر</label>
                        <div className="relative">
                          <User className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                          <input
                            type="text"
                            required
                            value={merchantName}
                            onChange={(e) => setMerchantName(e.target.value)}
                            placeholder="مثال: صالح الأحمدي"
                            className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                            } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          رقم بطاقة الأحوال المدنية (الهوية)
                        </label>
                        <div className="relative">
                          <IdCard className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                          <input
                            type="text"
                            required
                            maxLength={10}
                            value={merchantNationalId}
                            onChange={(e) => setMerchantNationalId(e.target.value)}
                            placeholder="10xxxxxxxx (10 أرقام)"
                            className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                            } py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">اسم المتجر / البقالة</label>
                        <div className="relative">
                          <Store className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                          <input
                            type="text"
                            required
                            value={merchantStoreName}
                            onChange={(e) => setMerchantStoreName(e.target.value)}
                            placeholder="مثال: تموينات الريف المركزية"
                            className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                            } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {mode === 'LOGIN' ? 'رقم الجوال أو رقم بطاقة الأحوال' : 'رقم الجوال للتاجر'}
                    </label>
                    <div className="relative">
                      <Phone className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="text"
                        required
                        value={merchantPhone}
                        onChange={(e) => setMerchantPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">كلمة المرور</label>
                      {mode === 'LOGIN' && (
                        <button
                          type="button"
                          onClick={() => handleOpenOTP('MERCHANT', merchantPhone)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                        >
                          نسيت كلمة المرور؟ (رمز OTP)
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="password"
                        required
                        value={merchantPassword}
                        onChange={(e) => setMerchantPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-emerald-500`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading
                      ? 'جارٍ التحقق...'
                      : mode === 'LOGIN'
                      ? 'دخول لوحة تحكم المتجر'
                      : 'تأكيد تسجيل حساب التاجر'}
                  </button>
                </form>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-bold">صلاحيات التاجر:</span> الوصول الحصري لكافة
                  حسابات متجره، المنتجات، المبيعات، الفواتير، الديون والمخزون.
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: DRIVER (السائق / المندوب) */}
            {/* ========================================================= */}
            {activeTab === 'DRIVER' && (
              <div className="space-y-4">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('LOGIN');
                      resetFormFeedback();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      mode === 'LOGIN' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    دخول السائق
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('REGISTER');
                      resetFormFeedback();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      mode === 'REGISTER' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تسجيل سائق جديد
                  </button>
                </div>

                <form onSubmit={handleDriverSubmit} className="space-y-3">
                  {mode === 'REGISTER' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">اسم السائق / المندوب</label>
                        <div className="relative">
                          <User className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                          <input
                            type="text"
                            required
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="مثال: عبد الله السبيعي"
                            className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                            } py-2 text-xs text-white focus:outline-none focus:border-amber-500`}
                          />
                        </div>
                      </div>

                      {/* Photo / Avatar Selection */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          الصورة الشخصية للسائق
                        </label>
                        <div className="flex items-center gap-3">
                          <img
                            src={driverPhoto}
                            alt="Driver Preview"
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/60 shadow-md"
                          />
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={driverPhoto}
                              onChange={(e) => setDriverPhoto(e.target.value)}
                              placeholder="رابط الصورة أو استخدام الرمز الافتراضي"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500"
                            />
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Camera className="w-3 h-3 text-amber-400" />
                              <span>تظهر صورتك للعميل والمتاجر عند استلام وتوصيل الطلبات</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Type */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">وسيلة التوصيل</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'MOTORCYCLE', label: 'دباب / نارية' },
                            { id: 'CAR', label: 'سيارة' },
                            { id: 'BICYCLE', label: 'دراجة' },
                          ].map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setDriverVehicle(v.id as any)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                driverVehicle === v.id
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">رقم جوال السائق</label>
                    <div className="relative">
                      <Phone className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="tel"
                        required
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">كلمة المرور</label>
                      {mode === 'LOGIN' && (
                        <button
                          type="button"
                          onClick={() => handleOpenOTP('DRIVER', driverPhone)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                        >
                          نسيت كلمة المرور؟ (رمز OTP)
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="password"
                        required
                        value={driverPassword}
                        onChange={(e) => setDriverPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-amber-500`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-950 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? 'جارٍ المعالجة...' : mode === 'LOGIN' ? 'دخول بوابة المندوب والتوصيل' : 'تسجيل السائق والانطلاق'}
                  </button>
                </form>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-amber-400 font-bold">صلاحيات السائق:</span> استلام الطلبات الجاهزة،
                  معرفة عناوين أهالي القرية والتواصل معهم، وتسليم الشحنات واحتساب عمولات التوصيل.
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: CUSTOMER (العميل) */}
            {/* ========================================================= */}
            {activeTab === 'CUSTOMER' && (
              <div className="space-y-4">
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl text-xs text-cyan-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    تسجيل دخول سريع ومبسط لأهالي القرية دون الحاجة لكلمات مرور معقدة! فقط اسمك ورقم جوالك
                    لتصفح البقائل وإرسال الطلبات مباشرة.
                  </p>
                </div>

                <form onSubmit={handleCustomerSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم العميل الكريم</label>
                    <div className="relative">
                      <User className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="مثال: أبو عبد الله أو أم خالد"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-cyan-500`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">رقم الجوال والواتساب</label>
                    <div className="relative">
                      <Phone className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">القرية أو الحي السكني</label>
                    <div className="relative">
                      <MapPin className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <select
                        value={customerVillage}
                        onChange={(e) => setCustomerVillage(e.target.value)}
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-cyan-500`}
                      >
                        <option value="قرية السعادة">قرية السعادة (الشارع العام)</option>
                        <option value="الحي الشرقي">الحي الشرقي (بجوار المسجد)</option>
                        <option value="ميدان القرية الشمالي">ميدان القرية الشمالي</option>
                        <option value="قرية الروابي">قرية الروابي والحي الغربي</option>
                        <option value="القرية">منطقة أخرى بالقرية</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-cyan-950 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    تصفح البقائل والطلب فوراً
                  </button>
                </form>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: DEVELOPER (المطور / المصمم) */}
            {/* ========================================================= */}
            {activeTab === 'DEVELOPER' && (
              <div className="space-y-4">
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-2xl text-xs text-purple-200 flex items-start gap-2.5">
                  <Code2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>صلاحيات المطور والمصمم:</strong> تحكم شامل بكافة أقسام التطبيق، الباركود،
                    التراخيص، الإعلانات، وتوجيه الأنظمة مع تجاوز الصلاحيات للصيانة والتطوير.
                  </p>
                </div>

                <form onSubmit={handleDeveloperSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      رمز حماية المطور والمالك (Developer PIN / Password)
                    </label>
                    <div className="relative">
                      <Lock className={`w-4 h-4 text-slate-500 absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <input
                        type="password"
                        required
                        autoFocus
                        value={devPin}
                        onChange={(e) => setDevPin(e.target.value)}
                        placeholder="الرمز الافتراضي: admin أو 1234"
                        className={`w-full bg-slate-950 border border-slate-800 rounded-xl ${
                          isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        } py-2 text-xs text-white focus:outline-none focus:border-purple-500 text-center font-mono tracking-widest`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-purple-950 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? 'جارٍ التحقق...' : 'دخول لوحة تحكم المطور الشاملة'}
                  </button>
                </form>

                <div className="text-center">
                  <span className="text-[10px] text-slate-500">
                    الرمز المعتمد مسجل في إعدادات المنصة ويمكن تغييره من لوحة المطور.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integrated OTP Password Reset Modal */}
      <OTPPasswordResetModal
        isOpen={isOTPModalOpen}
        onClose={() => setIsOTPModalOpen(false)}
        defaultPhone={otpPhone}
        targetRole={otpTargetRole}
        isRTL={isRTL}
        onSuccess={() => {
          setIsOTPModalOpen(false);
          setSuccessMessage('تم تعيين كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن');
        }}
      />
    </>
  );
};
