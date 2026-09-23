import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Phone,
  MessageCircle,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  MapPin,
  User,
  Store,
  Truck,
  ShieldCheck,
  ChevronDown,
  Clock,
  ExternalLink,
  Info
} from 'lucide-react';
import { OWNER_CONTACT } from '../config/ownerContact';
import { UserRole } from '../types';
import { getDriverProfile } from '../services/deliveryService';
import {
  getActiveCustomer,
  getActiveSessionRole,
  addDeveloperNotification
} from '../services/rbacAuthService';
import { useApp } from '../context/AppContext';

interface SmartDeveloperContactWidgetProps {
  portalMode?: 'store' | 'merchant' | 'driver' | 'admin' | 'landing';
}

export const SmartDeveloperContactWidget: React.FC<SmartDeveloperContactWidgetProps> = ({
  portalMode = 'store'
}) => {
  const { settings, isDarkMode = true } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'CALL' | 'MESSAGE'>('WHATSAPP');
  
  // Custom message state for in-app or WhatsApp
  const [userCustomNote, setUserCustomNote] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);
  
  // Visitor manual fields (if not logged in)
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');

  // Active Role & Identity Detection
  const [activeRole, setActiveRole] = useState<UserRole | 'VISITOR'>('VISITOR');
  const [identityInfo, setIdentityInfo] = useState<{
    name: string;
    phone: string;
    detail: string;
    roleLabel: string;
    roleIcon: any;
    roleBadgeColor: string;
  }>({
    name: '',
    phone: '',
    detail: '',
    roleLabel: 'زائر للمنصة',
    roleIcon: User,
    roleBadgeColor: 'bg-slate-700 text-slate-300'
  });

  // Re-detect identity whenever widget opens or portalMode changes
  useEffect(() => {
    const role = getActiveSessionRole();
    const customer = getActiveCustomer();
    const driver = getDriverProfile();

    if (role === 'DEVELOPER') {
      setActiveRole('DEVELOPER');
      return;
    }

    if (portalMode === 'driver' || role === 'DRIVER') {
      setActiveRole('DRIVER');
      setIdentityInfo({
        name: driver?.name || 'مندوب التوصيل',
        phone: driver?.phone || '',
        detail: driver?.zone ? `منطقة التوصيل: ${driver.zone}` : (driver?.vehicleType ? `مركبة: ${driver.vehicleType}` : 'مندوب معتمد'),
        roleLabel: 'مندوب توصيل 🛵',
        roleIcon: Truck,
        roleBadgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      });
    } else if (portalMode === 'merchant' || role === 'MERCHANT') {
      setActiveRole('MERCHANT');
      const storeTitle = settings.storeName || 'متجر بالمنصة';
      const merchantPhone = settings.phone || '';
      setIdentityInfo({
        name: settings.storeName || 'التاجر الكريم',
        phone: merchantPhone,
        detail: settings.address ? `حي: ${settings.address}` : 'تاجر معتمد',
        roleLabel: 'تاجر وصاحب متجر 🏪',
        roleIcon: Store,
        roleBadgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      });
    } else if (customer && customer.name) {
      setActiveRole('CUSTOMER');
      setIdentityInfo({
        name: customer.name,
        phone: customer.phone,
        detail: customer.village ? `قرية: ${customer.village}` : (customer.nationalId ? `هوية: ${customer.nationalId}` : 'عميل مسجل'),
        roleLabel: 'عميل المنصة 👤',
        roleIcon: User,
        roleBadgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
      });
    } else {
      setActiveRole('VISITOR');
      setIdentityInfo({
        name: visitorName.trim() || 'زائر للمنصة',
        phone: visitorPhone.trim(),
        detail: portalMode === 'store' ? 'يتصفح متجر القرية' : 'زائر المنصة العامة',
        roleLabel: 'زائر / عميل جديد 🌐',
        roleIcon: User,
        roleBadgeColor: 'bg-slate-800 text-slate-300 border border-slate-700'
      });
    }
  }, [portalMode, isOpen, visitorName, visitorPhone, settings]);

  // If the user currently logged in is the DEVELOPER, hide the widget to avoid clutter
  if (activeRole === 'DEVELOPER') {
    return null;
  }

  // Pre-craft contextual WhatsApp message
  const generateContextualWhatsAppUrl = () => {
    let greeting = `السلام عليكم ورحمة الله أخي المطور الكريم (${OWNER_CONTACT.name})،\n`;
    
    if (activeRole === 'CUSTOMER') {
      greeting += `👤 *أنا العميل:* ${identityInfo.name}\n`;
      if (identityInfo.phone) greeting += `📞 *رقم الجوال:* ${identityInfo.phone}\n`;
      if (identityInfo.detail) greeting += `📍 *${identityInfo.detail}*\n`;
      greeting += `💬 *الموضوع:* استفسار / طلب دعم خاص بخدمات متجر القرية.`;
    } else if (activeRole === 'MERCHANT') {
      greeting += `🏪 *أنا التاجر:* ${identityInfo.name}\n`;
      if (identityInfo.phone) greeting += `📞 *رقم الجوال:* ${identityInfo.phone}\n`;
      if (identityInfo.detail) greeting += `📍 *الموقع:* ${identityInfo.detail}\n`;
      greeting += `💬 *الموضوع:* استفسار بخصوص اشتراك المتجر / الترقية أو الدعم الفني.`;
    } else if (activeRole === 'DRIVER') {
      greeting += `🛵 *أنا مندوب التوصيل:* ${identityInfo.name}\n`;
      if (identityInfo.phone) greeting += `📞 *رقم الجوال:* ${identityInfo.phone}\n`;
      if (identityInfo.detail) greeting += `📍 *${identityInfo.detail}*\n`;
      greeting += `💬 *الموضوع:* استفسار بخصوص استلام الطلبات والتوصيل بالمنصة.`;
    } else {
      const vName = visitorName.trim() || 'زائر للمنصة';
      const vPhone = visitorPhone.trim();
      greeting += `🌐 *أنا:* ${vName}\n`;
      if (vPhone) greeting += `📞 *رقم الجوال:* ${vPhone}\n`;
      greeting += `💬 *الموضوع:* أود الاستفسار عن منصة قريتي الرقمية وكيفية الاستفادة منها.`;
    }

    if (userCustomNote.trim()) {
      greeting += `\n\n📝 *رسالتي بالتفصيل:*\n"${userCustomNote.trim()}"`;
    }

    return `https://wa.me/${OWNER_CONTACT.phoneInternational}?text=${encodeURIComponent(greeting)}`;
  };

  // Submit in-app support message directly to Developer Portal notifications
  const handleSendInAppMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCustomNote.trim()) return;

    setIsSendingMessage(true);

    const sender = identityInfo.name || visitorName.trim() || 'مستخدم للمنصة';
    const phone = identityInfo.phone || visitorPhone.trim() || 'لم يتم تحديده';
    const roleName = identityInfo.roleLabel;

    addDeveloperNotification({
      type: 'TECH_SUPPORT',
      title: `📩 رسالة مباشرة للمطور من: ${sender} (${roleName})`,
      message: `${userCustomNote.trim()}\n\n[بيانات المتواصل: ${sender} | جوال: ${phone} | ${identityInfo.detail}]`,
      senderName: sender,
      senderPhone: phone
    });

    setTimeout(() => {
      setIsSendingMessage(false);
      setMessageSentSuccess(true);
      setUserCustomNote('');
      setTimeout(() => {
        setMessageSentSuccess(false);
        setIsOpen(false);
      }, 3500);
    }, 400);
  };

  const RoleIcon = identityInfo.roleIcon;

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="تواصل مع المطور"
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-cyan-900/30 hover:shadow-cyan-900/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-400/30 backdrop-blur-md"
        >
          {/* Live Developer Online Status Ping */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>

          <Headphones className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          
          <span className="hidden sm:inline font-black tracking-wide">
            تواصل مع المطور
          </span>
          <span className="sm:hidden font-black">
            المطور
          </span>

          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold hidden md:inline">
            دعم فني
          </span>
        </button>
      </div>

      {/* Main Support Popup Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              isDarkMode ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 shadow-md">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      مكتب الدعم ومطور المنصة
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>متاح الآن</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تواصل مباشر وسريع لخدمة العملاء، التجار، وسائقي التوصيل
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Context Recognition Banner */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                    <RoleIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        {identityInfo.name || 'مستخدم المنصة'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${identityInfo.roleBadgeColor}`}>
                        {identityInfo.roleLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {identityInfo.phone ? `رقم الجوال: ${identityInfo.phone} • ` : ''}
                      {identityInfo.detail}
                    </span>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <span className="text-[9px] text-slate-500 block">رقم المطور</span>
                  <span className="text-xs font-mono font-black text-cyan-400">
                    {OWNER_CONTACT.phoneLocal}
                  </span>
                </div>
              </div>

              {/* If Visitor with no name or phone, offer fields to fill optionally */}
              {activeRole === 'VISITOR' && !identityInfo.phone && (
                <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                  <span className="text-[11px] text-slate-400 font-bold block">
                    بياناتك (اختيارية لتسهيل الرد عليك):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="اسمك الكريم"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="tel"
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhone(e.target.value)}
                      placeholder="رقم جوالك (05xxxx)"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Tabs Switcher: WhatsApp | Call | Message */}
              <div className="flex bg-slate-950/70 p-1 rounded-2xl border border-slate-800 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('WHATSAPP')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'WHATSAPP'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  <span>محادثة واتساب 💬</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('CALL')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'CALL'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-4 h-4 text-blue-300" />
                  <span>اتصال هاتفي 📞</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('MESSAGE')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'MESSAGE'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Send className="w-4 h-4 text-cyan-300" />
                  <span>رسالة داخلية 📝</span>
                </button>
              </div>

              {/* TAB 1: WHATSAPP */}
              {activeTab === 'WHATSAPP' && (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>رسالة واتساب مجهزة ومخصصة تلقائياً</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      عند الضغط على الزر، سيتم فتح تطبيق واتساب مباشرة برسالة تتضمن صفتك (
                      <span className="text-white font-bold">{identityInfo.roleLabel}</span>)
                      وبياناتك، لسرعة خدمتك دون الحاجة لكتابة بياناتك من جديد.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">
                      هل تود إضافة استفسار أو ملاحظة محددة مسبقاً؟ (اختياري)
                    </label>
                    <textarea
                      value={userCustomNote}
                      onChange={(e) => setUserCustomNote(e.target.value)}
                      placeholder="اكتب هنا ما تود الاستفسار عنه وسنقوم بتضمينه في رسالة الواتساب..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <a
                    href={generateContextualWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>فتح محادثة واتساب مع المطور الآن</span>
                    <ExternalLink className="w-4 h-4 opacity-75" />
                  </a>

                  <p className="text-[10px] text-center text-slate-500">
                    رقم واتساب المطور الرسمي: {OWNER_CONTACT.phoneDisplay}
                  </p>
                </div>
              )}

              {/* TAB 2: DIRECT CALL */}
              {activeTab === 'CALL' && (
                <div className="space-y-4 text-center py-2">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 mx-auto flex items-center justify-center">
                    <Phone className="w-8 h-8 animate-bounce" />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white">اتصال هاتفي مباشر مع المطور</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      يمكنك الاتصال هاتفياً في أي وقت للاستفسار عن المنصة أو الدعم الفني الطارئ.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 inline-block">
                    <span className="text-[10px] text-slate-500 block">رقم الاتصال المباشر</span>
                    <strong className="text-xl font-mono font-black text-blue-400 tracking-wider">
                      {OWNER_CONTACT.phoneLocal}
                    </strong>
                  </div>

                  <div>
                    <a
                      href={`tel:${OWNER_CONTACT.phoneLocal}`}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950/40 cursor-pointer"
                    >
                      <Phone className="w-5 h-5" />
                      <span>اتصال الآن ({OWNER_CONTACT.phoneLocal})</span>
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 3: IN-APP DIRECT MESSAGE */}
              {activeTab === 'MESSAGE' && (
                <div className="space-y-3.5">
                  {messageSentSuccess ? (
                    <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-2 animate-fadeIn">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                      <h4 className="text-sm font-black text-white">تم إرسال رسالتك للمطور بنجاح! ✅</h4>
                      <p className="text-xs text-slate-300">
                        وصلت رسالتك مباشرة إلى لوحة تحكم وبوابة المطور الرقمية، وسيتم التواصل معك بأقرب وقت.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendInAppMessage} className="space-y-3">
                      <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                        <span className="text-xs text-cyan-300 font-bold block">
                          تصل رسالتك فوراً إلى «بوابة المطور الرقمية» 🔔
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          تظهر رسالتك كإشعار فوري للمطور مع اسمك ورقمك وصفتك للرد عليك.
                        </p>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-bold mb-1 block">
                          نص رسالتك أو استفسارك للمطور *
                        </label>
                        <textarea
                          required
                          value={userCustomNote}
                          onChange={(e) => setUserCustomNote(e.target.value)}
                          placeholder="اكتب رسالتك أو مشكلتك أو استفسارك هنا بكل تفصيل..."
                          rows={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingMessage || !userCustomNote.trim()}
                        className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/40 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSendingMessage ? 'جارٍ الإرسال...' : 'إرسال الرسالة إلى المطور الآن'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 px-5">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>دعم مباشر معتمد من مالك ومطور المنصة</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
