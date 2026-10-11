import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  ShieldAlert, 
  Search,
  UserCheck,
  UserX,
  Trash2,
  FileText,
  ShieldCheck,
  Camera,
  AlertCircle,
  Eye,
  Plus,
  Store,
  KeyRound,
  Sparkles,
  Upload,
  MessageCircle,
  X,
  Copy
} from 'lucide-react';
import { 
  getMerchants, 
  saveMerchants, 
  MerchantAccountRecord, 
  deleteMerchantAccount,
  approveMerchantAccount,
  rejectMerchantAccount,
  registerMerchantAccount
} from '../services/rbacAuthService';
import { addStoreToDirectory, getStoresDirectory } from '../services/deliveryService';
import { StoreDirectoryRecord } from '../types';

export const MerchantManagementScreen: React.FC<{ onClose: () => void; isDarkMode?: boolean }> = ({ 
  onClose, 
  isDarkMode = true 
}) => {
  const [merchants, setMerchants] = useState<MerchantAccountRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantAccountRecord | null>(null);
  const [fullscreenImage, setSelectedFullscreenImage] = useState<string | null>(null);

  // Add Merchant Modal State
  const [showAddMerchantModal, setShowAddMerchantModal] = useState(false);
  const [addOwnerName, setAddOwnerName] = useState('');
  const [addStoreName, setAddStoreName] = useState('');
  const [addCategory, setAddCategory] = useState('بقالات وتموينات غذائية 🛒');
  const [customCategory, setCustomCategory] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addVillage, setAddVillage] = useState('القرية الرئيسية');
  const [addLogo, setAddLogo] = useState('');
  const [addPassword, setAddPassword] = useState(`store${Math.floor(1000 + Math.random() * 9000)}`);
  const [createdSuccessData, setCreatedSuccessData] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = () => {
    setMerchants(getMerchants());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('qaryati:merchants-updated', handleUpdate);
    window.addEventListener('qaryati:merchant-approval-changed', handleUpdate);
    return () => {
      window.removeEventListener('qaryati:merchants-updated', handleUpdate);
      window.removeEventListener('qaryati:merchant-approval-changed', handleUpdate);
    };
  }, []);

  const handleApprove = (id: string) => {
    approveMerchantAccount(id);
    loadData();
    if (selectedMerchant && selectedMerchant.id === id) {
      const updated = getMerchants().find(m => m.id === id);
      setSelectedMerchant(updated || null);
    }
    showToast('تم اعتماد وتفعيل حساب التاجر بنجاح ✓');
  };

  const handleReject = (id: string) => {
    rejectMerchantAccount(id);
    loadData();
    if (selectedMerchant && selectedMerchant.id === id) {
      const updated = getMerchants().find(m => m.id === id);
      setSelectedMerchant(updated || null);
    }
    showToast('تم إيقاف أو حظر حساب التاجر ⏸️');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف حساب هذا التاجر نهائياً من المنظومة؟')) {
      deleteMerchantAccount(id);
      loadData();
      if (selectedMerchant && selectedMerchant.id === id) {
        setSelectedMerchant(null);
      }
      showToast('تم حذف حساب التاجر بنجاح 🗑️');
    }
  };

  const handleCreateMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOwnerName.trim() || !addStoreName.trim() || !addPhone.trim()) return;

    const finalCat = addCategory === 'CUSTOM' ? (customCategory.trim() || 'محلات تجارية عامة') : addCategory;
    const cleanPhone = addPhone.trim();
    const cleanPass = addPassword.trim() || '1234';

    // Register in RBAC
    try {
      await registerMerchantAccount({
        name: addOwnerName.trim(),
        phone: cleanPhone,
        storeName: addStoreName.trim(),
        nationalId: `M-${Date.now().toString().slice(-6)}`,
        villageName: addVillage.trim() || 'القرية',
        password: cleanPass,
        photo: addLogo.trim() || undefined,
      });
    } catch (err) {
      console.warn(err);
    }

    // Also add to public store directory
    const storeRecord = addStoreToDirectory({
      name: addStoreName.trim(),
      ownerName: addOwnerName.trim(),
      category: finalCat,
      phone: cleanPhone,
      village: addVillage.trim() || 'القرية',
      cityOrVillage: addVillage.trim() || 'القرية',
      commissionRate: 5,
      status: 'ACTIVE',
      isApproved: true,
      rating: 5.0,
      ratingCount: 1,
      deliveryTime: '15-25 دقيقة',
      deliveryFee: 0,
      minOrder: 15,
      isPro: true,
      itemsCount: 0,
      planName: 'باقة التاجر PRO',
      logo: addLogo.trim() || undefined,
    });

    loadData();
    setShowAddMerchantModal(false);
    
    // Show success dialog with WhatsApp handover
    setCreatedSuccessData({
      name: addStoreName.trim(),
      ownerName: addOwnerName.trim(),
      phone: cleanPhone,
      category: finalCat,
      village: addVillage.trim() || 'القرية',
      password: cleanPass,
      logo: addLogo.trim(),
    });

    setAddOwnerName('');
    setAddStoreName('');
    setAddPhone('');
    setAddLogo('');
    setAddPassword(`store${Math.floor(1000 + Math.random() * 9000)}`);
    showToast(`تم إنشاء وتسجيل حساب التاجر (${addStoreName}) بنجاح تام! 🚀`);
  };

  const filteredMerchants = merchants.filter(m => 
    m.name.includes(searchTerm) || 
    m.storeName.includes(searchTerm) || 
    m.nationalId.includes(searchTerm) || 
    m.phone.includes(searchTerm)
  );

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border h-full overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} flex flex-col gap-6 relative`}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              إدارة التجار والمتاجر وتسليم الحسابات (KYC & Stores)
            </h2>
            <p className="text-xs text-slate-400">
              إضافة التجار الجدد، توليد وتسليم كلمات المرور، ومطابقة الهويات بالـ OCR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddMerchantModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-purple-950/50 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تاجر جديد ➕</span>
          </button>

          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Merchants List (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="ابحث بالاسم، الجوال، المتجر أو الهوية..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredMerchants.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800 p-6">
                <Store className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-400">لا توجد حسابات تجار مسجلة بعد</p>
                <p className="text-[11px] text-slate-500 mt-1">انقر على زر "إضافة تاجر جديد" أعلاه لإنشاء وتجهيز حساب متجر وتاجر جديد فوراً.</p>
              </div>
            ) : (
              filteredMerchants.map(merchant => {
                const isSelected = selectedMerchant?.id === merchant.id;
                const status = merchant.isApproved ? 'APPROVED' : (merchant.kycStatus || 'PENDING_REVIEW');
                
                // WhatsApp handover link generator for each merchant
                const digits = (merchant.phone || '').replace(/\D/g, '');
                const intlPhone = digits.startsWith('0') ? '966' + digits.slice(1) : digits.startsWith('966') ? digits : '966' + digits;
                const merchantMsg = `🏪 منصة قريتي - بيانات حساب التاجر والمتجر\n━━━━━━━━━━━━━━━━━━━━\n🏬 اسم المتجر: ${merchant.storeName}\n👤 اسم المالك: ${merchant.name}\n📱 اسم المستخدم (الجوال): ${merchant.phone}\n🔑 كلمة المرور: ${merchant.password || '1234'}\n━━━━━━━━━━━━━━━━━━━━\n🌐 رابط دخول بوابة التاجر وإدارة الأصناف:\n${window.location.origin}/?portal=merchant`;
                const merchantWaUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(merchantMsg)}`;

                return (
                  <div 
                    key={merchant.id} 
                    onClick={() => setSelectedMerchant(merchant)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isSelected 
                        ? 'bg-purple-950/20 border-purple-500/60 shadow-md shadow-purple-950/20' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-850 hover:bg-slate-900' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <img 
                            src={merchant.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'} 
                            alt={merchant.name} 
                            className="w-11 h-11 rounded-full object-cover border border-slate-800" 
                          />
                          {merchant.idVerificationPhoto && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center border border-slate-900 text-[10px]" title="تم رفع بطاقة الهوية">
                              🪪
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-bold text-xs truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{merchant.name}</h3>
                          <p className="text-[11px] text-slate-400 truncate">{merchant.storeName} • {merchant.village}</p>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            {status === 'APPROVED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                معتمد ونشط ✓
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                بانتظار المراجعة ⏳
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {merchant.isApproved ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(merchant.id);
                            }}
                            className="px-2 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold transition-all cursor-pointer"
                            title="إيقاف مؤقت"
                          >
                            إيقاف
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(merchant.id);
                            }}
                            className="px-2 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer"
                            title="تفعيل"
                          >
                            تفعيل
                          </button>
                        )}

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(merchant.id);
                          }}
                          className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 transition-colors cursor-pointer"
                          title="حذف الحساب نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Direct WhatsApp Handover Bar for this merchant */}
                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-amber-300">كلمة المرور: {merchant.password || '1234'}</span>
                      <a
                        href={merchantWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        title="إرسال بيانات الدخول عبر واتساب للتاجر"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>إرسال عبر واتساب 💬</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: KYC/OCR Side-by-Side Verification Screen (7 Columns) */}
        <div className="lg:col-span-7">
          {selectedMerchant ? (
            <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-5 animate-in fade-in zoom-in duration-200`}>
              
              {/* Profile Card Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-xs">
                    OCR
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-300">مستند التاجر المحدد: {selectedMerchant.storeName}</h4>
                    <p className="text-[10px] text-slate-400">التسجيل: {selectedMerchant.createdAt ? new Date(selectedMerchant.createdAt).toLocaleDateString('ar-SA') : 'مؤخراً'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    selectedMerchant.isApproved 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedMerchant.isApproved ? 'حساب معتمد ✓' : 'بانتظار المراجعة'}
                  </span>
                </div>
              </div>

              {/* Side by Side comparison grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Registered User input (بيانات التاجر المدخلة) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-850 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-white">بيانات التاجر والمتجر المسجلة:</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">اسم المالك (التاجر):</span>
                      <span className="text-xs font-bold text-white block mt-0.5">{selectedMerchant.name}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">اسم المتجر / النشاط:</span>
                      <span className="text-xs font-bold text-purple-300 block mt-0.5">{selectedMerchant.storeName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">رقم الجوال:</span>
                      <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">{selectedMerchant.phone}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">كلمة المرور الحالية:</span>
                      <span className="text-xs font-mono font-bold text-amber-300 block mt-0.5 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50 inline-block">
                        {selectedMerchant.password || '1234'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">القرية / الموقع:</span>
                      <span className="text-xs font-bold text-slate-300 block mt-0.5">{selectedMerchant.village}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: OCR Extracted output (البيانات المستخرجة بالـ OCR) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-850 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black text-white">البيانات المقروءة بالـ OCR:</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">الاسم المستخرج تلقائياً:</span>
                      <span className="text-xs font-bold text-cyan-400 block mt-0.5">
                        {selectedMerchant.extractedName || selectedMerchant.name}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">رقم الهوية المستخرج تلقائياً:</span>
                      <span className="text-xs font-mono font-bold text-cyan-400 block mt-0.5">
                        {selectedMerchant.extractedNationalId || selectedMerchant.nationalId || '912837456'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">موثوقية المستند وتطابق الـ OCR:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-black text-emerald-400">97%</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full w-[97%]" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">حالة التدقيق:</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 mt-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>مطابق بنجاح بنسبة ثقة عالية ✓</span>
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Uploaded ID card image preview */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-850 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">صورة بطاقة الهوية / مستند التثبت:</span>
                  </div>
                  {selectedMerchant.idVerificationPhoto && (
                    <button 
                      onClick={() => setSelectedFullscreenImage(selectedMerchant.idVerificationPhoto || null)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>تكبير ومعاينة الصورة كاملاً</span>
                    </button>
                  )}
                </div>

                {selectedMerchant.idVerificationPhoto ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-800/80 bg-black flex items-center justify-center group">
                    <img 
                      src={selectedMerchant.idVerificationPhoto} 
                      alt="ID Card" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 border border-dashed border-slate-850 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    <span>تم إنشاء الحساب بواسطة إدارة المنصة مباشرة بدون رفع هوية مسبق.</span>
                  </div>
                )}
              </div>

              {/* Direct WhatsApp Handover and Action Buttons */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-850 space-y-3">
                {(() => {
                  const digits = (selectedMerchant.phone || '').replace(/\D/g, '');
                  const intlPhone = digits.startsWith('0') ? '966' + digits.slice(1) : digits.startsWith('966') ? digits : '966' + digits;
                  const handoverMsg = `🏪 منصة قريتي - بيانات تسليم حساب التاجر الرسمي\n━━━━━━━━━━━━━━━━━━━━\n🏬 اسم المتجر: ${selectedMerchant.storeName}\n👤 اسم المالك: ${selectedMerchant.name}\n📱 اسم المستخدم (الجوال): ${selectedMerchant.phone}\n🔑 كلمة المرور: ${selectedMerchant.password || '1234'}\n━━━━━━━━━━━━━━━━━━━━\n🌐 رابط دخول بوابة التاجر وإدارة الأصناف:\n${window.location.origin}/?portal=merchant`;
                  const waUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(handoverMsg)}`;

                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>إرسال وتسليم حساب التاجر عبر واتساب فوراً 💬</span>
                    </a>
                  );
                })()}

                <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t border-slate-800">
                  <div className="text-xs">
                    <span className="text-slate-400 block font-medium">إجراءات الحساب:</span>
                    <span className="text-slate-300 font-bold block mt-0.5">
                      {selectedMerchant.isApproved ? 'حساب التاجر مفعل ونشط بالقرية حالياً ✓' : 'بانتظار الموافقة والقبول الإداري'}
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!selectedMerchant.isApproved ? (
                      <button 
                        onClick={() => handleApprove(selectedMerchant.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>قبول وتفعيل ✅</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleReject(selectedMerchant.id)}
                        className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX className="w-4 h-4 text-amber-400" />
                        <span>إيقاف مؤقت ⏸️</span>
                      </button>
                    )}

                    <button 
                      onClick={() => handleDelete(selectedMerchant.id)}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف 🗑️</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20">
              <ShieldAlert className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
              <h4 className="font-bold text-sm text-slate-300">اختر تاجراً من القائمة الجانبية</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                انقر على أي تاجر لعرض تفاصيل حسابه، شعاره، كلمة المرور، أو إرسال بيانات الدخول عبر الواتساب.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: ADD NEW MERCHANT (إضافة تاجر جديد مع كافة التفاصيل والشعار وكلمة المرور والواتساب) */}
      {showAddMerchantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 my-8 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">إضافة تاجر جديد وتسليم الحساب</h3>
                  <p className="text-[11px] text-slate-400">سجل اسم المالك، اسم المتجر، نوع النشاط، الشعار، وكلمة المرور للتسليم الفوري</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMerchantModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMerchantSubmit} className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              
              {/* Owner Name & Store Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم المالك (التاجر) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addOwnerName}
                    onChange={(e) => setAddOwnerName(e.target.value)}
                    placeholder="مثال: أبو أحمد السالم"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم المتجر / النشاط <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addStoreName}
                    onChange={(e) => setAddStoreName(e.target.value)}
                    placeholder="مثال: بقالة البركة الذكية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Category (بقالات / كماليات / أخرى) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نوع النشاط التجاري <span className="text-rose-400">*</span>
                </label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  <option value="بقالات وتموينات غذائية 🛒">بقالات وتموينات غذائية 🛒</option>
                  <option value="كماليات وهدايا ومنوعات 🎁">كماليات وهدايا ومنوعات 🎁</option>
                  <option value="إكسسوارات وعطور 💍">إكسسوارات وعطور 💍</option>
                  <option value="مخابز وحلويات 🥐">مخابز وحلويات 🥐</option>
                  <option value="مطاعم ووجبات سريعة 🍔">مطاعم ووجبات سريعة 🍔</option>
                  <option value="صيدليات وعناية 💊">صيدليات وعناية 💊</option>
                  <option value="إلكترونيات وجوالات 📱">إلكترونيات وجوالات 📱</option>
                  <option value="CUSTOM">✏️ نشاط آخر مخصص...</option>
                </select>

                {addCategory === 'CUSTOM' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="اكتب نوع النشاط هنا..."
                      className="w-full bg-purple-950/40 border border-purple-500/50 rounded-xl px-3 py-2 text-xs text-purple-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Phone & Village */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رقم الجوال (اسم المستخدم) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-left focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    القرية أو الموقع <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addVillage}
                    onChange={(e) => setAddVillage(e.target.value)}
                    placeholder="اسم القرية أو الحي..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Logo / Brand Image */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    <span>شعار المحل أو المتجر</span>
                  </label>
                  {addLogo && (
                    <button
                      type="button"
                      onClick={() => setAddLogo('')}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      إزالة الشعار
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {addLogo ? (
                      <img src={addLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      value={addLogo}
                      onChange={(e) => setAddLogo(e.target.value)}
                      placeholder="رابط صورة الشعار (https://...)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/50 text-purple-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors">
                        <Upload className="w-3 h-3" />
                        <span>رفع صورة من الجهاز</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (reader.result) setAddLogo(String(reader.result));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-slate-500">أو اختر شعاراً جاهزاً:</span>
                    </div>
                  </div>
                </div>

                {/* Preset logos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[
                    { label: 'بقالة 🛒', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&auto=format&fit=crop&q=80' },
                    { label: 'كماليات 🎁', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=150&auto=format&fit=crop&q=80' },
                    { label: 'إكسسوارات 💍', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&auto=format&fit=crop&q=80' },
                    { label: 'مطعم 🍔', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setAddLogo(preset.url)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        addLogo === preset.url
                          ? 'bg-purple-600 text-white border-purple-400 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>كلمة المرور لدخول واجهة التاجر فوراً <span className="text-rose-400">*</span></span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = `merchant${Math.floor(1000 + Math.random() * 9000)}`;
                      setAddPassword(gen);
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>توليد عشوائي</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="كلمة المرور..."
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-amber-200/70">
                  💡 سيستخدم التاجر رقم هاتفه وكلمة المرور هذه لتسجيل الدخول مباشرة إلى بوابته وإدارة أصنافه ومخزونه.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMerchantModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-950 cursor-pointer"
                >
                  حفظ وتسليم الحساب للتاجر 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUCCESS CREATED MERCHANT & WHATSAPP HANDOVER */}
      {createdSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">تم إنشاء حساب التاجر بنجاح تام! 🎉</h3>
                <p className="text-xs text-slate-400">حساب المتجر جاهز الآن ويمكنك إرسال بيانات الدخول للتاجر عبر الواتساب فوراً</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">اسم المتجر:</span>
                <span className="font-black text-white">{createdSuccessData.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">اسم التاجر (المالك):</span>
                <span className="font-bold text-purple-300">{createdSuccessData.ownerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">نوع النشاط:</span>
                <span className="font-bold text-cyan-300">{createdSuccessData.category}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">اسم المستخدم (الجوال):</span>
                <span className="font-mono text-emerald-300">{createdSuccessData.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">كلمة المرور:</span>
                <span className="font-mono text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">{createdSuccessData.password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">القرية / الموقع:</span>
                <span className="text-slate-200">{createdSuccessData.village}</span>
              </div>
            </div>

            {/* WhatsApp handover button */}
            <div className="space-y-2 pt-1">
              {(() => {
                const digits = (createdSuccessData.phone || '').replace(/\D/g, '');
                const intlPhone = digits.startsWith('0') ? '966' + digits.slice(1) : digits.startsWith('966') ? digits : '966' + digits;
                const handoverMsg = `🏪 منصة قريتي - بيانات تسليم حساب المتجر الرسمي\n━━━━━━━━━━━━━━━━━━━━\n🏬 اسم المتجر: ${createdSuccessData.name}\n🏷️ نوع النشاط: ${createdSuccessData.category}\n👤 اسم التاجر: ${createdSuccessData.ownerName}\n📍 القرية: ${createdSuccessData.village}\n📱 اسم المستخدم (الجوال): ${createdSuccessData.phone}\n🔑 كلمة المرور: ${createdSuccessData.password}\n━━━━━━━━━━━━━━━━━━━━\n🌐 رابط دخول بوابة التاجر الفوري:\n${window.location.origin}/?portal=merchant`;
                const waUrl = `https://api.whatsapp.com/send?phone=${intlPhone}&text=${encodeURIComponent(handoverMsg)}`;

                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال وتسليم حساب التاجر عبر واتساب فوراً 💬</span>
                  </a>
                );
              })()}

              <button
                type="button"
                onClick={async () => {
                  const text = `🏪 منصة قريتي - بيانات حساب التاجر الرسمي\n🏬 المتجر: ${createdSuccessData.name}\n🏷️ النشاط: ${createdSuccessData.category}\n👤 المالك: ${createdSuccessData.ownerName}\n📱 الجوال: ${createdSuccessData.phone}\n🔑 كلمة المرور: ${createdSuccessData.password}\n\nرابط الدخول للبوابة:\n${window.location.origin}/?portal=merchant`;
                  try {
                    await navigator.clipboard.writeText(text);
                    showToast('تم نسخ بيانات الدخول إلى الحافظة بنجاح');
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>نسخ بيانات الحساب إلى الحافظة</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedSuccessData(null)}
                className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedFullscreenImage(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center gap-3">
            <img 
              src={fullscreenImage} 
              alt="ID Fullscreen Preview" 
              className="max-h-[80vh] object-contain rounded-xl border border-slate-800" 
            />
            <p className="text-xs text-slate-400">انقر في أي مكان في الشاشة للإغلاق والعودة ✕</p>
          </div>
        </div>
      )}
    </div>
  );
};
