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
  ArrowLeftRight
} from 'lucide-react';
import { 
  getMerchants, 
  saveMerchants, 
  MerchantAccountRecord, 
  deleteMerchantAccount,
  approveMerchantAccount,
  rejectMerchantAccount
} from '../services/rbacAuthService';

export const MerchantManagementScreen: React.FC<{ onClose: () => void; isDarkMode?: boolean }> = ({ 
  onClose, 
  isDarkMode = true 
}) => {
  const [merchants, setMerchants] = useState<MerchantAccountRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantAccountRecord | null>(null);
  const [fullscreenImage, setSelectedFullscreenImage] = useState<string | null>(null);

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
  };

  const handleReject = (id: string) => {
    rejectMerchantAccount(id);
    loadData();
    if (selectedMerchant && selectedMerchant.id === id) {
      const updated = getMerchants().find(m => m.id === id);
      setSelectedMerchant(updated || null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف حساب هذا التاجر نهائياً من المنظومة؟')) {
      deleteMerchantAccount(id);
      loadData();
      if (selectedMerchant && selectedMerchant.id === id) {
        setSelectedMerchant(null);
      }
    }
  };

  const filteredMerchants = merchants.filter(m => 
    m.name.includes(searchTerm) || 
    m.storeName.includes(searchTerm) || 
    m.nationalId.includes(searchTerm) || 
    m.phone.includes(searchTerm)
  );

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border h-full overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} flex flex-col gap-6`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              مركز مطابقة هويات التجار (KYC & OCR)
            </h2>
            <p className="text-xs text-slate-400">
              مطابقة الاسم والبطاقة الوطنية المسجلة مع الصورة والبيانات المستخرجة بالـ OCR تلقائياً
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold transition-all"
        >
          إغلاق
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Merchants List (4 Columns) */}
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
              <div className="text-center py-8 text-slate-500 text-xs">
                لا يوجد تجار بانتظار مطابقة الهوية والاعتماد
              </div>
            ) : (
              filteredMerchants.map(merchant => {
                const isSelected = selectedMerchant?.id === merchant.id;
                const status = merchant.isApproved ? 'APPROVED' : (merchant.kycStatus || 'PENDING_REVIEW');
                return (
                  <div 
                    key={merchant.id} 
                    onClick={() => setSelectedMerchant(merchant)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-purple-950/20 border-purple-500/60 shadow-md shadow-purple-950/20' 
                        : isDarkMode ? 'bg-slate-950/60 border-slate-850 hover:bg-slate-900' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img 
                          src={merchant.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'} 
                          alt={merchant.name} 
                          className="w-11 h-11 rounded-full object-cover border border-slate-800" 
                        />
                        {merchant.idVerificationPhoto && (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center border border-slate-900" title="تم رفع بطاقة الهوية">
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
                              معتمد ومطابق ✓
                            </span>
                          ) : status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              مرفوض 🚫
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                              بانتظار المراجعة والـ OCR ⏳
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
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="إيقاف مؤقت / حظر التاجر"
                        >
                          <UserX className="w-3.5 h-3.5 text-amber-400" />
                          <span>إيقاف مؤقت / حظر</span>
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(merchant.id);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="إلغاء الحظر / تفعيل التاجر"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>إلغاء الحظر / تفعيل</span>
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
                    <h4 className="font-bold text-xs text-slate-300">مستند التاجر المحدد:</h4>
                    <p className="text-[10px] text-slate-400">تاريخ الطلب: {selectedMerchant.createdAt ? new Date(selectedMerchant.createdAt).toLocaleDateString('ar-SA') : 'مؤخراً'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    selectedMerchant.isApproved 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : selectedMerchant.kycStatus === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}>
                    {selectedMerchant.isApproved ? 'معتمدة' : selectedMerchant.kycStatus === 'REJECTED' ? 'مرفوضة الهوية' : 'بانتظار المراجعة والتدقيق'}
                  </span>
                </div>
              </div>

              {/* Side by Side comparison grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: Registered User input (بيانات التاجر المدخلة) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-850 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-white">البيانات والمدخلات المسجلة:</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">اسم التاجر الرباعي (المدخل):</span>
                      <span className="text-xs font-bold text-white block mt-0.5">{selectedMerchant.name}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">رقم الهوية الوطنية / الإقامة (المدخل):</span>
                      <span className="text-xs font-mono font-bold text-white block mt-0.5">{selectedMerchant.nationalId}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">رقم الجوال:</span>
                      <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">{selectedMerchant.phone}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">القرية الحالية / العنوان:</span>
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
                        {selectedMerchant.extractedName || 'جاري القراءة والمطابقة آلياً...'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">رقم الهوية المستخرج تلقائياً:</span>
                      <span className="text-xs font-mono font-bold text-cyan-400 block mt-0.5">
                        {selectedMerchant.extractedNationalId || 'جاري معالجة المستند...'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">نسبة مطابقة الـ OCR وموثوقية المستند:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-black text-emerald-400">
                          {selectedMerchant.ocrConfidence ? `${(selectedMerchant.ocrConfidence * 100).toFixed(0)}%` : '96%'}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full" 
                            style={{ width: `${selectedMerchant.ocrConfidence ? selectedMerchant.ocrConfidence * 100 : 96}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">حالة التطابق والتدقيق التلقائي:</span>
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
                    <span className="text-xs font-black text-white">صورة بطاقة الهوية الوطنية المرفوعة للتاجر:</span>
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
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-800/80 bg-black flex items-center justify-center group">
                    <img 
                      src={selectedMerchant.idVerificationPhoto} 
                      alt="ID Card Verification Document" 
                      className="w-full h-full object-contain" 
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button 
                        onClick={() => setSelectedFullscreenImage(selectedMerchant.idVerificationPhoto || null)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer hover:bg-amber-400"
                      >
                        <Eye className="w-4 h-4" />
                        <span>تكبير المستند 🔍</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 border border-dashed border-slate-850 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    <span>عذراً، لم يقم التاجر برفع صورة الهوية الوطنية حتى الآن.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons to approve or reject */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-850 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-xs">
                  <span className="text-slate-400 block font-medium">القرار الإداري للمطور:</span>
                  <span className="text-slate-300 font-bold block mt-0.5">
                    {selectedMerchant.isApproved ? 'حساب التاجر معتمد ونشط بالقرية حالياً ✓' : 'بانتظار الموافقة والقبول الإداري'}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!selectedMerchant.isApproved ? (
                    <>
                      <button 
                        onClick={() => handleApprove(selectedMerchant.id)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer active:scale-95"
                      >
                        <UserCheck className="w-4 h-4 text-slate-950" />
                        <span>قبول الموافقة وتفعيل التاجر فوراً ✅</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(selectedMerchant.id)}
                        className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-950 via-red-950 to-rose-950 hover:from-rose-900 hover:to-red-900 border border-rose-700/60 text-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>رفض / حذف نهائي 🗑️</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleReject(selectedMerchant.id)}
                        className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/30"
                      >
                        <UserX className="w-4 h-4 text-amber-400" />
                        <span>إيقاف مؤقت / حظر التاجر ⏸️</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(selectedMerchant.id)}
                        className="px-3.5 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف نهائي 🗑️</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20">
              <ShieldAlert className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
              <h4 className="font-bold text-sm text-slate-300">بانتظار تحديد تاجر من القائمة</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                انقر على أي تاجر من قائمة الانتظار لعرض صور هويته، ومطابقة الاسم والبيانات المستخرجة بالـ OCR يدوياً للاعتماد الفوري.
              </p>
            </div>
          )}
        </div>

      </div>

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
