import React, { useState } from 'react';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  Key,
  CreditCard,
  PhoneCall,
  MessageCircle,
  Clock,
  Sparkles,
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Cloud,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useApp } from '../context/AppContext';
import { LICENSE_PLANS, LicensePlanCode } from '../utils/licenseEngine';
import { OWNER_CONTACT } from '../config/ownerContact';

export const SubscriptionModal: React.FC = () => {
  const {
    subscription,
    isPro,
    showSubscriptionModal,
    setShowSubscriptionModal,
    activateLicenseKey,
    activateOnlinePayment,
  } = useSubscription();

  const { isRTL, language, settings, items } = useApp();

  const [activeTab, setActiveTab] = useState<'PLANS' | 'OFFLINE_KEY' | 'ONLINE_PAY'>('PLANS');
  const [selectedPlanCode, setSelectedPlanCode] = useState<LicensePlanCode>('1Y');
  
  // Offline Key State
  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Online Pay State
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');

  if (!showSubscriptionModal) return null;

  const handleVerifyKey = async () => {
    setKeyError('');
    setKeySuccess('');
    if (!inputKey.trim()) {
      setKeyError(language === 'ar' ? 'يرجى كتابة أو لصق كود التفعيل' : 'Please enter license key');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await activateLicenseKey(inputKey);
      if (result.success) {
        setKeySuccess(result.message);
        setInputKey('');
      } else {
        setKeyError(result.message);
      }
    } catch (err: any) {
      setKeyError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء فحص كود التفعيل' : 'Error verifying license key'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOnlinePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);
    setPaySuccess('');

    setTimeout(async () => {
      const res = await activateOnlinePayment(selectedPlanCode, {
        payerName: cardHolder,
        cardNumber,
      });
      setIsPaying(false);
      if (res.success) {
        setPaySuccess(res.message);
      }
    }, 1200);
  };

  const openWhatsAppContact = (customPlanCode?: LicensePlanCode) => {
    const code = customPlanCode || selectedPlanCode;
    const plan = LICENSE_PLANS.find((p) => p.code === code);
    const planName = language === 'ar' ? (plan?.nameAr || code) : (plan?.nameEn || code);
    const price = plan ? `${plan.priceSAR} ${settings.currency || 'ر.س'}` : undefined;

    const url = OWNER_CONTACT.getWhatsAppUrl({
      storeName: settings.storeName,
      planName,
      price,
    });
    window.open(url, '_blank');
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl max-w-md sm:max-w-lg lg:max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-amber-950/60 relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setShowSubscriptionModal(false)}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-amber-950/80 via-slate-900 to-emerald-950/60 border-b border-slate-800 text-center relative shrink-0">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mb-2 shadow-lg shadow-amber-900/50">
            <Crown className="w-8 h-8" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {isPro ? '💎 باقة المحترف مفعلة' : 'ترقية المتجر والخدمات'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            {language === 'ar' ? 'اشتراك باقة التاجر المحترف (FlowApp Pro)' : 'FlowApp Pro Subscription'}
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
            {language === 'ar'
              ? 'حل شامل ومصمم لخدمة المتاجر المتصلة والمناطق النائية بدون إنترنت عبر كروت التفعيل المشفرة والدفع النقدي والرقمي'
              : 'Designed for both connected stores and remote offline areas with activation keys & cards'}
          </p>

          {/* Current Pro Status Badge */}
          {isPro && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {subscription.expiresAt
                  ? `اشتراكك ساري - متبقي ${subscription.daysRemaining} يوماً`
                  : 'اشتراك مدى الحياة مفعل بنجاح 👑'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-3 pt-2 gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('PLANS')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'PLANS'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-x border-amber-500/60 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الباقات والمميزات' : 'Plans & Features'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OFFLINE_KEY')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'OFFLINE_KEY'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-x border-amber-500/60 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? '🔑 كود تفعيل نقدي (بدون إنترنت)' : 'Offline License Key'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ONLINE_PAY')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ONLINE_PAY'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-x border-amber-500/60 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? '💳 دفع إلكتروني مباشر' : 'Online Payment'}</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: PLANS & COMPARISON */}
          {activeTab === 'PLANS' && (
            <div className="space-y-4">
              {/* Feature Comparison Matrix */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  {language === 'ar' ? 'مقارنة الخطة المجانية مع باقة المحترف (Pro):' : 'Free vs Pro Comparison:'}
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-200 font-semibold">{language === 'ar' ? 'عدد الأصناف في المخزون' : 'Inventory Items'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{language === 'ar' ? '75 صنفاً فقط' : '75 Items max'}</span>
                      <span className="font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                        {language === 'ar' ? 'غير محدود ∞' : 'Unlimited ∞'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-200 font-semibold">{language === 'ar' ? 'المزامنة والنسخ السحابي التلقائي' : 'Cloud Backup & Sync'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{language === 'ar' ? 'يدوي ومحلي' : 'Manual local'}</span>
                      <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                        {language === 'ar' ? 'مزامنة فورية + مؤجلة' : 'Auto Cloud Sync'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-200 font-semibold">{language === 'ar' ? 'حماية الصندوق وصلاحيات الكاشير' : 'Cashier Roles & Lock'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{language === 'ar' ? 'غير مفعل' : 'Disabled'}</span>
                      <span className="font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/40">
                        {language === 'ar' ? 'منع التلاعب والأرباح' : 'Locked & Safe'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-200 font-semibold">{language === 'ar' ? 'تصدير واستيراد Excel لنقل البيانات بدون نت' : 'Excel Migration Offline'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{language === 'ar' ? 'أساسي' : 'Basic'}</span>
                      <span className="font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                        {language === 'ar' ? 'كامل مع سجل الحركات' : 'Full Pro Export'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-200 font-semibold">{language === 'ar' ? 'تخصيص الفاتورة بشعار المتجر وإزالة العلامة' : 'Custom Receipts & QR'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{language === 'ar' ? 'افتراضي' : 'Default'}</span>
                      <span className="font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
                        {language === 'ar' ? 'شعار وهوية متكاملة' : 'Custom Branding'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-300">
                  {language === 'ar' ? 'اختر مدة الباقة المناسبة لمتجرك:' : 'Select Subscription Duration:'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LICENSE_PLANS.map((plan) => {
                    const isSelected = selectedPlanCode === plan.code;
                    return (
                      <div
                        key={plan.code}
                        onClick={() => setSelectedPlanCode(plan.code)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-950/50'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {plan.popular && (
                          <span className="absolute -top-2.5 left-4 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black shadow">
                            {language === 'ar' ? 'الأكثر طلباً وتوفيراً ⭐' : 'Best Value ⭐'}
                          </span>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-white">{language === 'ar' ? plan.nameAr : plan.nameEn}</span>
                            <span className="text-sm font-black text-amber-400">
                              {plan.priceSAR} {settings.currency || 'ر.س'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {plan.code === 'LIFE'
                              ? (language === 'ar' ? 'دفع لمرة واحدة وامتلاك دائم للتطبيق' : 'One-time payment, permanent access')
                              : (language === 'ar' ? `صلاحية كاملة لمدة ${plan.durationDays} يوماً` : `Full access for ${plan.durationDays} days`)}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>{language === 'ar' ? 'تفعيل فوري' : 'Instant Activation'}</span>
                          </span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'}`}>
                            {isSelected && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WhatsApp Direct Owner Purchase Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-2 border-emerald-500/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-emerald-950/50">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-white">
                        {language === 'ar' ? 'طلب كود التفعيل من المالك مباشرة' : 'Order Key Directly from Owner'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/50">
                        {language === 'ar' ? 'واتساب رسمي' : 'Official WhatsApp'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {language === 'ar' ? 'تحويل بنكي فوري وتسليم الكود عبر الواتساب:' : 'Instant transfer & receive code on WhatsApp:'}{' '}
                      <span dir="ltr" className="font-mono text-emerald-300 font-bold tracking-wider">
                        {OWNER_CONTACT.phoneDisplay}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openWhatsAppContact()}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-950 transition-all cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                  <span>{language === 'ar' ? 'مراسلة المالك عبر الواتساب 💬' : 'Chat with Owner on WhatsApp 💬'}</span>
                </button>
              </div>

              {/* Action Buttons for Plan Tab */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('OFFLINE_KEY')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-98"
                >
                  <Key className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تفعيل بواسطة كرت أو كود التفعيل' : 'Activate via License Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ONLINE_PAY')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-bold text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'ar' ? 'الدفع الإلكتروني المباشر' : 'Pay Online with Card'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: OFFLINE LICENSE KEY (FOR REMOTE AREAS & CASH) */}
          {activeTab === 'OFFLINE_KEY' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/50 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                  <Key className="w-4 h-4" />
                  <span>{language === 'ar' ? 'نظام التفعيل الفوري للمناطق النائية (بدون إنترنت)' : 'Offline License Key Activation'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {language === 'ar'
                    ? 'إذا اشتريت كرت التفعيل نقداً من مندوبنا أو عبر أقرب نقطة بيع، اكتب كود التفعيل أدناه واضغط "تفعيل". سيتم التحقق وتفعيل الخطة الاحترافية فوراً حتى لو كان جهازك غير متصل بالإنترنت!'
                    : 'Enter the activation key from your scratch card or local agent. Verification happens 100% offline.'}
                </p>
              </div>

              {/* Key Input Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'أدخل كود التفعيل المكوّن من كرت الترخيص:' : 'Enter License Key:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => {
                      setInputKey(e.target.value.toUpperCase());
                      setKeyError('');
                      setKeySuccess('');
                    }}
                    placeholder="مثال: FLOW-PRO-1Y-K9X2B7Q4-XXXX"
                    className="w-full font-mono text-center tracking-widest text-sm sm:text-base py-3 px-4 bg-slate-950 border-2 border-amber-500/60 rounded-xl text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  {language === 'ar' ? 'الصيغة المعتمدة: FLOW-PRO-(المدة)-(الرمز)-(التحقق)' : 'Format: FLOW-PRO-(PLAN)-(CODE)-(CHECKSUM)'}
                </p>
              </div>

              {/* Error or Success Alert */}
              {keyError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{keyError}</span>
                </div>
              )}

              {keySuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{keySuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleVerifyKey}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-950/50 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  <span>{isVerifying ? (language === 'ar' ? 'جارٍ فحص الكود المشفر...' : 'Verifying Key...') : (language === 'ar' ? 'تفعيل كود الترخيص الآن ⚡' : 'Activate License Now ⚡')}</span>
                </button>

                {/* WhatsApp Help / Purchase for Remote Areas */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="text-right sm:text-start w-full sm:w-auto">
                    <span className="text-xs font-bold text-white block">
                      {language === 'ar' ? 'طلب كود تفعيل فوري عبر الواتساب:' : 'Order License Key via WhatsApp:'}
                    </span>
                    <span dir="ltr" className="text-xs font-mono font-bold text-emerald-300">
                      {OWNER_CONTACT.phoneDisplay}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openWhatsAppContact()}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                    <span>{language === 'ar' ? 'مراسلة المالك الرسمي' : 'Chat with Owner'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE CARD PAYMENT */}
          {activeTab === 'ONLINE_PAY' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">{language === 'ar' ? 'الباقة المحددة:' : 'Selected Plan:'}</span>
                  <span className="text-sm font-black text-white">
                    {LICENSE_PLANS.find((p) => p.code === selectedPlanCode)?.nameAr}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">{language === 'ar' ? 'المبلغ المستحق:' : 'Total Amount:'}</span>
                  <span className="text-base font-black text-amber-400">
                    {LICENSE_PLANS.find((p) => p.code === selectedPlanCode)?.priceSAR} {settings.currency || 'ر.س'}
                  </span>
                </div>
              </div>

              {paySuccess ? (
                <div className="p-5 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-white">{language === 'ar' ? 'تم الدفع وتفعيل الباقة بنجاح!' : 'Payment & Activation Successful!'}</h4>
                  <p className="text-xs text-emerald-200">{paySuccess}</p>
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionModal(false)}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    {language === 'ar' ? 'إغلاق ومتابعة العمل' : 'Close and Continue'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleOnlinePaySubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {language === 'ar' ? 'الاسم كما هو مدون على البطاقة' : 'Cardholder Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="محمد سالم"
                      className="w-full text-xs py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {language === 'ar' ? 'رقم البطاقة (مدى / فيزا / ماستركارد)' : 'Card Number (Mada / Visa / MC)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="w-full font-mono text-xs py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full font-mono text-xs py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-center focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {language === 'ar' ? 'رمز الأمان (CVV)' : 'CVV'}
                      </label>
                      <input
                        type="password"
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full font-mono text-xs py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-center focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPaying}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50 mt-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isPaying ? (language === 'ar' ? 'جارٍ معالجة الدفع الآمن...' : 'Processing Payment...') : (language === 'ar' ? 'إتمام الدفع وتفعيل الباقة فوراً 💳' : 'Complete Payment & Activate 💳')}</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => openWhatsAppContact()}
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>
                        {language === 'ar'
                          ? `تفضّل الدفع عبر التحويل البنكي المباشر؟ تواصل مع المالك (${OWNER_CONTACT.phoneDisplay})`
                          : `Prefer direct bank transfer? Contact Owner (${OWNER_CONTACT.phoneDisplay})`}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{language === 'ar' ? 'أمان بنكي مشفر 100%' : '100% Secure & Encrypted'}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSubscriptionModal(false)}
            className="py-1 px-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
