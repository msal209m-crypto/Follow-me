import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
  Truck,
  Building2,
  Code2,
  Sliders,
  Crown,
  Sun,
  Moon,
  Megaphone,
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  RotateCcw,
  Upload,
  X
} from 'lucide-react';
import { StoreSettings } from '../types';
import {
  verifyDeveloperPin,
  getPlatformDeveloperSettings,
  isDeveloperRemembered,
  setDeveloperRemembered,
  getPlatformAds,
  PlatformAd
} from '../services/platformSettingsService';
import {
  setActiveSessionRole,
  registerMerchant,
  loginMerchant,
  registerDriver,
  loginDriver,
  saveActiveCustomer,
  getMerchants,
  getDrivers
} from '../services/rbacAuthService';
import { VillageBulletinView } from './VillageBulletinView';
import { DeveloperAuthModal } from './DeveloperAuthModal';
import { AdhanTopBarWidget } from './AdhanTopBarWidget';
import { OTPPasswordResetModal } from './OTPPasswordResetModal';

interface PortalLandingScreenProps {
  settings: StoreSettings;
  itemsCount: number;
  isRTL: boolean;
  isAuthenticated: boolean;
  onEnterStore: () => void;
  onEnterMerchant: () => void;
  onEnterDriver?: () => void;
  onEnterAdmin?: () => void;
  onOpenAuthModal: (role?: 'MERCHANT' | 'DRIVER' | 'CUSTOMER' | 'DEVELOPER') => void;
}

const FIXED_VILLAGES = [
  'قرية الفصور',
  'قرية الحقالي',
  'قرية الباركة',
  'قرية الانهوم',
  'قرية مشيجبه',
  'سوق حول جباري',
  'قرية المداد',
  'قرية الجامع',
  'قرية المسيلة',
  'قرية المكيل',
];

export const PortalLandingScreen: React.FC<PortalLandingScreenProps> = ({
  settings,
  itemsCount,
  isRTL,
  isAuthenticated,
  onEnterStore,
  onEnterMerchant,
  onEnterDriver,
  onEnterAdmin,
  onOpenAuthModal,
}) => {
  const devSettings = getPlatformDeveloperSettings();
  const heroImg = devSettings.heroImageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200';
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(() => isDeveloperRemembered() || localStorage.getItem('qaryati_is_developer') === 'true');
  const [showBulletinModal, setShowBulletinModal] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetRole, setResetRole] = useState<'MERCHANT' | 'DRIVER' | 'DEVELOPER'>('MERCHANT');

  // Unified Auth form states
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regVillage, setRegVillage] = useState(FIXED_VILLAGES[0]);
  const [regRole, setRegRole] = useState<'CUSTOMER' | 'MERCHANT' | 'DRIVER'>('CUSTOMER');
  const [regStoreName, setRegStoreName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSelfie, setRegSelfie] = useState<string | null>(null);

  // Camera Live Selfie State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Feedback States
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Secret 5-tap on logo trigger
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [secretTapTimer, setSecretTapTimer] = useState<any>(null);

  const handleLogoSecretTap = () => {
    setSecretTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setDeveloperRemembered(true);
        setActiveSessionRole('DEVELOPER');
        setIsDeveloper(true);
        onEnterAdmin?.();
        return 0;
      }
      return next;
    });

    if (secretTapTimer) clearTimeout(secretTapTimer);
    const timer = setTimeout(() => setSecretTapCount(0), 2000);
    setSecretTapTimer(timer);
  };

  const handleDeveloperPortalClick = () => {
    if (isDeveloperRemembered()) {
      setActiveSessionRole('DEVELOPER');
      setIsDeveloper(true);
      onEnterAdmin?.();
    } else {
      setShowAdminPinModal(true);
    }
  };

  // Live Camera Activation & Control
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Webcam access error:', err);
      setCameraError('تعذر فتح الكاميرا التلقائية (قد تكون محجوبة أو غير مدعومة في البيئة الحالية). يرجى التقاط الصورة أو رفعها يدوياً.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setRegSelfie(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle Drag & Drop / Manual Photo Upload as Fallback
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegSelfie(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    // Input Validation
    if (!regName.trim()) {
      setAuthError('يرجى إدخال الاسم الكامل ثنائياً على الأقل.');
      return;
    }
    if (!regPhone.trim() || regPhone.trim().length < 9) {
      setAuthError('يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx).');
      return;
    }
    if (!regNationalId.trim() || regNationalId.trim().length < 9) {
      setAuthError('يرجى إدخال رقم الهوية الوطنية / بطاقة الأحوال المدنية (الهوية الإلزامية).');
      return;
    }
    if (regRole !== 'CUSTOMER' && !regPassword.trim()) {
      setAuthError('يرجى تعيين كلمة مرور لحماية حسابك.');
      return;
    }
    if ((regRole === 'MERCHANT' || regRole === 'DRIVER') && !regSelfie) {
      setAuthError('يُشترط التقاط أو رفع صورة سيلفي شخصية حية (Selfie) للتحقق الأمني من الهوية.');
      return;
    }
    if (regRole === 'MERCHANT' && !regStoreName.trim()) {
      setAuthError('يرجى كتابة اسم المتجر الخاص بك.');
      return;
    }

    setAuthLoading(true);

    setTimeout(() => {
      try {
        if (regRole === 'CUSTOMER') {
          // Register lightweight customer session
          saveActiveCustomer({
            name: regName.trim(),
            phone: regPhone.trim(),
            nationalId: regNationalId.trim(),
            village: regVillage,
            housePhoto: regSelfie || undefined,
            passwordHash: regPassword || undefined
          });
          setAuthSuccess('تم تسجيل دخولك كعميل بنجاح! جاري التوجيه إلى المتجر...');
          setTimeout(() => {
            setAuthLoading(false);
            onEnterStore();
          }, 1000);

        } else if (regRole === 'MERCHANT') {
          // Register Merchant Account
          const res = registerMerchant({
            name: regName.trim(),
            phone: regPhone.trim(),
            nationalId: regNationalId.trim(),
            password: regPassword,
            storeName: regStoreName.trim(),
            village: regVillage,
            photo: regSelfie || undefined
          });

          if (res.success) {
            setAuthSuccess('تم تسجيل متجرك بنجاح! جاري الانتقال إلى لوحة التاجر...');
            setTimeout(() => {
              setAuthLoading(false);
              onEnterMerchant();
            }, 1000);
          } else {
            setAuthError(res.message);
            setAuthLoading(false);
          }

        } else if (regRole === 'DRIVER') {
          // Register Driver Account
          const res = registerDriver({
            name: regName.trim(),
            phone: regPhone.trim(),
            nationalId: regNationalId.trim(),
            password: regPassword,
            photo: regSelfie || undefined,
            vehicleType: 'MOTORCYCLE',
            zone: regVillage
          });

          if (res.success) {
            setAuthSuccess('تم تسجيل حسابك كمناديب بنجاح! جاري الانتقال لبوابة السائق...');
            setTimeout(() => {
              setAuthLoading(false);
              onEnterDriver?.();
            }, 1000);
          } else {
            setAuthError(res.message);
            setAuthLoading(false);
          }
        }
      } catch (err: any) {
        setAuthError(err?.message || 'حدث خطأ غير متوقع أثناء التسجيل.');
        setAuthLoading(false);
      }
    }, 600);
  };

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier) {
      setAuthError('يرجى إدخال رقم الجوال، الهوية الوطنية أو البريد الإلكتروني.');
      return;
    }
    if (!password) {
      setAuthError('يرجى إدخال كلمة المرور.');
      return;
    }

    setAuthLoading(true);

    setTimeout(() => {
      try {
        // 1. Check if matching merchant
        const merchants = getMerchants();
        const foundMerchant = merchants.find(
          (m) => m.phone === identifier || m.nationalId === identifier
        );

        if (foundMerchant) {
          const res = loginMerchant(identifier, password);
          if (res.success) {
            setAuthSuccess(`مرحباً بك يا ${foundMerchant.name}! جاري التوجيه للوحة التاجر...`);
            setTimeout(() => {
              setAuthLoading(false);
              onEnterMerchant();
            }, 1000);
            return;
          } else {
            setAuthError(res.message);
            setAuthLoading(false);
            return;
          }
        }

        // 2. Check if matching driver
        const drivers = getDrivers();
        const foundDriver = drivers.find((d) => d.phone === identifier || d.nationalId === identifier);

        if (foundDriver) {
          const res = loginDriver(identifier, password);
          if (res.success) {
            setAuthSuccess(`مرحباً بك يا ${foundDriver.name}! جاري فتح بوابة السائق...`);
            setTimeout(() => {
              setAuthLoading(false);
              onEnterDriver?.();
            }, 1000);
            return;
          } else {
            setAuthError(res.message);
            setAuthLoading(false);
            return;
          }
        }

        // 3. Fallback to lightweight customer instant login
        // If password is not set or arbitrary, we can log them in instantly as a customer to offer supreme zero-friction access
        saveActiveCustomer({
          name: identifier,
          phone: identifier,
          village: FIXED_VILLAGES[0]
        });
        setAuthSuccess('تم التعرف على حسابك كزائر/عميل بنجاح! جاري فتح المتجر...');
        setTimeout(() => {
          setAuthLoading(false);
          onEnterStore();
        }, 1000);

      } catch (err: any) {
        setAuthError(err?.message || 'فشل تسجيل الدخول، يرجى التأكد من البيانات والمحاولة مجدداً.');
        setAuthLoading(false);
      }
    }, 600);
  };

  // Trigger quick anonymous store entry for simple navigation
  const handleQuickGuestEntry = () => {
    saveActiveCustomer({
      name: 'زائر القرية',
      phone: '0500000000',
      village: FIXED_VILLAGES[0]
    });
    onEnterStore();
  };

  // Close camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans relative overflow-hidden transition-colors duration-300`}
    >
      {/* Background Ambience Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <header className={`p-4 sm:p-6 flex items-center justify-between max-w-6xl mx-auto w-full border-b ${isDarkMode ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-white/80'} backdrop-blur-md sticky top-0 z-20`}>
        <div className="flex items-center gap-2.5">
          <div
            onClick={handleLogoSecretTap}
            title="شعار المنصة (5 نقرات متتالية لفتح لوحة المطور)"
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-950/30 cursor-pointer active:scale-90 transition-transform"
          >
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`font-extrabold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {settings.storeName || 'تطبيق قريتي'}
            </h1>
            <p
              onClick={handleDeveloperPortalClick}
              className="text-xs text-emerald-500 font-medium cursor-pointer hover:underline"
              title="انقر لتسجيل دخول المطور"
            >
              المنظومة الرقمية الموحدة {isDeveloper ? '(المطور نشط)' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'}`}
            title={isDarkMode ? 'التحول إلى الوضع النهاري' : 'التحول إلى الوضع الليلي'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Center Welcome & Portal Selection Cards */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-5xl mx-auto w-full my-auto z-10">
        
        {/* Developer Configured Hero Banner & Announcements */}
        <div className="w-full max-w-4xl mb-6 space-y-3">
          {devSettings.developerAnnouncement && (
            <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/40 rounded-2xl p-3 px-4 flex items-center gap-3 text-xs text-amber-200 shadow-md">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="flex-1 font-bold">
                <span className="text-amber-400 ms-1 font-black">إعلان المطور:</span> {devSettings.developerAnnouncement}
              </div>
            </div>
          )}

          {heroImg && (
            <div className="relative w-full h-40 sm:h-52 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
              <img
                src={heroImg}
                alt="Hero Cover"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                <div className="px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{devSettings.platformName || 'منصة قريتي الموحدة'}</span>
                </div>
                <div className="text-[10px] text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-700">
                  إدارة المطور: {devSettings.developerOwnerName || 'المطور'}
                </div>
              </div>
            </div>
          )}

          {/* Adhan & Prayer Times Village Bar */}
          <AdhanTopBarWidget isDarkMode={isDarkMode} isRTL={isRTL} compact={false} className="w-full py-2.5 px-4" />
        </div>

        {/* Intro with Developer Managed Ad Banners */}
        <div className="text-center max-w-2xl mb-6 w-full px-4">
          {/* Dynamic Developer-Managed Promoted Banners for Rain Villages */}
          {(() => {
            const activeAds = getPlatformAds().filter((a) => a.isActive);
            if (activeAds.length === 0) return null;
            return (
              <div className="mb-4 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 p-4 shadow-lg text-right relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                    <Sparkles className="w-3 h-3" />
                    <span>إعلان ترويجي مدفوع (قرى المطر)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">برعاية إدارية</span>
                </div>
                {activeAds.map((ad, idx) => (
                  <div key={ad.id || idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-black">{ad.badge}</span>
                      <h3 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{ad.title}</h3>
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{ad.subtitle}</p>
                    {ad.discountCode && (
                      <div className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono mt-1">
                        رمز الخصم: {ad.discountCode}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          <h2 className={`text-2xl sm:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight leading-tight`}>
            مرحباً بكم في منصة {settings.storeName || 'قريتي'}
          </h2>
          <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} mt-2 max-w-md mx-auto`}>
            بوابة رقمية آمنة تخدم أهالي ومتاجر القرية. سجل حسابك الآن في ثوانٍ وتوجه مباشرة لواجهتك المخصصة.
          </p>
        </div>

        {/* --- UNIFIED LOGIN & REGISTRATION CARD --- */}
        <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => {
                setAuthTab('login');
                setAuthError('');
                setAuthSuccess('');
              }}
              className={`flex-1 py-4 text-center text-sm font-black transition-all border-b-2 ${authTab === 'login' ? 'border-emerald-500 text-emerald-500 bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              تسجيل الدخول للحسابات 🔐
            </button>
            <button
              onClick={() => {
                setAuthTab('register');
                setAuthError('');
                setAuthSuccess('');
              }}
              className={`flex-1 py-4 text-center text-sm font-black transition-all border-b-2 ${authTab === 'register' ? 'border-emerald-500 text-emerald-500 bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              إنشاء حساب جديد 📝
            </button>
          </div>

          <div className="p-6">
            {/* Feedback notifications */}
            {authError && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                <span className="font-semibold">{authSuccess}</span>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {authTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">رقم الجوال أو رقم بطاقة الأحوال الشخصية / الهوية:</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="أدخل رقم الجوال أو الهوية..."
                      className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                    />
                    <Phone className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">كلمة المرور:</label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الخاصة بك..."
                      className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-slate-300"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password recovery triggers */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResetRole('MERCHANT');
                      setShowResetModal(true);
                    }}
                    className="text-emerald-500 hover:underline font-bold"
                  >
                    نسيت كلمة مرور التاجر؟
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetRole('DRIVER');
                      setShowResetModal(true);
                    }}
                    className="text-amber-500 hover:underline font-bold"
                  >
                    نسيت كلمة مرور السائق؟
                  </button>
                </div>

                <div className="pt-3 space-y-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-md shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>تسجيل الدخول الآمن</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickGuestEntry}
                    className="w-full py-3 rounded-xl border border-slate-800 hover:bg-slate-850/50 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-teal-500" />
                    <span>تصفح كزائر / عميل سريع (بدون كلمة مرور) 🛒</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER FORM */}
            {authTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* 1. Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">الاسم الكامل:</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="أدخل اسمك الثنائي الكامل..."
                      className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                    />
                    <User className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
                  </div>
                </div>

                {/* 2. Phone & National ID Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">رقم الجوال:</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0500000000"
                        className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                      />
                      <Phone className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">بطاقة الأحوال / الهوية الوطنية:</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={regNationalId}
                        onChange={(e) => setRegNationalId(e.target.value)}
                        placeholder="أدخل 10 أرقام الهوية..."
                        className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                      />
                      <Smartphone className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
                    </div>
                  </div>
                </div>

                {/* 3. Optional Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">البريد الإلكتروني (اختياري):</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
                  </div>
                </div>

                {/* 4. Dropdown for active villages */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">منطقتك أو قريتك بالمنصة:</label>
                  <div className="relative">
                    <select
                      value={regVillage}
                      onChange={(e) => setRegVillage(e.target.value)}
                      className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 focus:border-emerald-500'}`}
                    >
                      {FIXED_VILLAGES.map((v) => (
                        <option key={v} value={v}>
                          📍 {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">صفتك / نوع الحساب بالمنصة:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRegRole('CUSTOMER')}
                      className={`py-3 px-2 rounded-2xl text-center flex flex-col items-center justify-center gap-1 border transition-all ${regRole === 'CUSTOMER' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900'}`}
                    >
                      <ShoppingBag className="w-5 h-5 mb-0.5 text-teal-400" />
                      <span className="text-xs">عميل 🛒</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('MERCHANT')}
                      className={`py-3 px-2 rounded-2xl text-center flex flex-col items-center justify-center gap-1 border transition-all ${regRole === 'MERCHANT' ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900'}`}
                    >
                      <Building2 className="w-5 h-5 mb-0.5 text-blue-400" />
                      <span className="text-xs">تاجر 🏪</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('DRIVER')}
                      className={`py-3 px-2 rounded-2xl text-center flex flex-col items-center justify-center gap-1 border transition-all ${regRole === 'DRIVER' ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900'}`}
                    >
                      <Truck className="w-5 h-5 mb-0.5 text-amber-400" />
                      <span className="text-xs">سائق 🚚</span>
                    </button>
                  </div>
                </div>

                {/* 6. Store Name (Only if MERCHANT) */}
                {regRole === 'MERCHANT' && (
                  <div className="animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم المتجر الخاص بك:</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={regStoreName}
                        onChange={(e) => setRegStoreName(e.target.value)}
                        placeholder="مثال: بقالة البركة الذكية..."
                        className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                      />
                      <Store className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 left-3" />
                    </div>
                  </div>
                )}

                {/* 7. Password for merchants & drivers */}
                {regRole !== 'CUSTOMER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">كلمة مرور الحساب:</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="تعيين كلمة مرور لحماية حسابك..."
                        className={`w-full text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-950 placeholder-slate-400 focus:border-emerald-500'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-slate-300"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 8. Live Selfie Capture Interface (REQUIRED for Merchants & Drivers) */}
                {(regRole === 'MERCHANT' || regRole === 'DRIVER') && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-850 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>التقاط صورة سيلفي حية للتحقق 🤳</span>
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">إلزامي</span>
                    </div>

                    {/* Camera Preview Box */}
                    {isCameraActive && (
                      <div className="relative w-full max-w-xs h-48 rounded-2xl overflow-hidden border border-emerald-500/40 mx-auto bg-black">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        {/* Circle face guide mask */}
                        <div className="absolute inset-0 border-[24px] border-black/60 rounded-full pointer-events-none" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                          <button
                            type="button"
                            onClick={captureSelfie}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 shadow-md flex items-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>التقاط 📸</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-750"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 leading-relaxed">
                        {cameraError}
                      </div>
                    )}

                    {/* Selfie Preview Display */}
                    {regSelfie ? (
                      <div className="text-center space-y-2">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 mx-auto shadow-lg">
                          <img src={regSelfie} alt="Live Selfie Preview" className="w-full h-full object-cover scale-x-[-1]" />
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400">تم حفظ السيلفي للتحقق وبثها في لوحة المطور بنجاح ✅</p>
                        <button
                          type="button"
                          onClick={() => {
                            setRegSelfie(null);
                            startCamera();
                          }}
                          className="text-xs text-rose-400 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إعادة التقاط السيلفي 🔄</span>
                        </button>
                      </div>
                    ) : (
                      !isCameraActive && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-emerald-400" />
                            <span>افتح الكاميرا للسيلفي 📸</span>
                          </button>

                          <label className="flex-1 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/40 text-slate-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>رفع الصورة يدوياً 📂</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-md shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                    <span>إنشاء الحساب ودخول البوابة فوراً 🚀</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

        {/* Floating Bulletin Board Option below Card */}
        <div className="w-full max-w-lg mt-6">
          <button
            onClick={() => setShowBulletinModal(true)}
            className={`w-full p-4 rounded-3xl border shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-between cursor-pointer ${isDarkMode ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900/90 border-emerald-500/30 hover:border-emerald-400' : 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200 hover:border-emerald-300 shadow-sm'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Megaphone className="w-5 h-5 animate-bounce" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-black">📢 لوحة إعلانات وأخبار القرية</h4>
                <p className="text-[10px] text-slate-400">تصفح التنبيهات، المناسبات، والإعلانات للجميع</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </div>
          </button>
        </div>

      </main>

      {/* Village Bulletin Board Modal */}
      {showBulletinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">لوحة إعلانات وأخبار القرية التفاعلية</h3>
                  <p className="text-xs text-slate-400">أخبار أهالي القرية، المناسبات، والخدمات العامة مباشرة</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulletinModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer border border-slate-700"
              >
                ✕
              </button>
            </div>
            <VillageBulletinView />
          </div>
        </div>
      )}

      {/* Developer Master Pin Authentication Modal */}
      <DeveloperAuthModal
        isOpen={showAdminPinModal}
        onClose={() => setShowAdminPinModal(false)}
        onSuccess={() => {
          setIsDeveloper(true);
          setActiveSessionRole('DEVELOPER');
          onEnterAdmin?.();
        }}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        defaultPhone="0502063584"
      />

      {/* Secure OTP Password Recovery Modal */}
      <OTPPasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        targetRole={resetRole}
        isRTL={isRTL}
      />
    </div>
  );
};
