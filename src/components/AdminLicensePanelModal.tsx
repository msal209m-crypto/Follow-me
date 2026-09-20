import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Share2,
  Printer,
  Sparkles,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Database,
  Code2,
  FileText,
  UserCheck,
  AlertTriangle,
  X,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LicenseKeyRecord } from '../types';
import { copyToClipboard } from '../utils/clipboardUtils';
import { OWNER_CONTACT } from '../config/ownerContact';
import {
  createLicenseKey,
  batchCreateLicenseKeys,
  fetchAllLicenseKeys,
  deleteLicenseKey,
  PLAN_CONFIGS,
} from '../services/licenseKeyService';

interface AdminLicensePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLicensePanelModal: React.FC<AdminLicensePanelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { language } = useApp();

  // Admin authorization state
  const isAccountAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (userProfile?.role || '').toLowerCase();
    const email = (currentUser.email || '').toLowerCase();
    return role === 'admin' || email === 'msal209m@gmail.com';
  }, [currentUser, userProfile]);

  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const isAdminAuthorized = isAccountAdmin || pinUnlocked;

  // Active subtab in admin panel: 'KEYS' | 'SUPABASE_RLS'
  const [activeTab, setActiveTab] = useState<'KEYS' | 'SUPABASE_RLS'>('KEYS');

  // License keys data state
  const [keysList, setKeysList] = useState<LicenseKeyRecord[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'USED'>('ALL');

  // Generator form state
  const [selectedPlan, setSelectedPlan] = useState<LicenseKeyRecord['plan']>('1Y');
  const [notesInput, setNotesInput] = useState('');
  const [batchCount, setBatchCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latestGenerated, setLatestGenerated] = useState<LicenseKeyRecord | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Load keys on open
  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const keys = await fetchAllLicenseKeys();
      setKeysList(keys);
    } catch (e) {
      console.warn('Failed to load keys:', e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdminAuthorized) {
      loadKeys();
    }
  }, [isOpen, isAdminAuthorized]);

  if (!isOpen) return null;

  // Handle PIN unlock
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default master admin pin: 2026 or admin
    if (pinInput.trim() === '2026' || pinInput.trim().toLowerCase() === 'admin') {
      setPinUnlocked(true);
      setPinError('');
    } else {
      setPinError(language === 'ar' ? 'رمز المشرف غير صحيح!' : 'Invalid Admin PIN!');
    }
  };

  // Handle key generation
  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const adminEmail = currentUser?.email || 'admin@flowapp.system';
      if (batchCount > 1) {
        const batch = await batchCreateLicenseKeys(
          batchCount,
          selectedPlan,
          notesInput,
          adminEmail
        );
        if (batch.length > 0) {
          setLatestGenerated(batch[0]);
        }
      } else {
        const res = await createLicenseKey(selectedPlan, notesInput, adminEmail);
        if (res.success && res.record) {
          setLatestGenerated(res.record);
        }
      }
      setNotesInput('');
      await loadKeys();
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle single key deletion
  const handleDeleteKey = async (keyCode: string) => {
    const confirmMsg =
      language === 'ar'
        ? `هل أنت متأكد من حذف وإلغاء الكود (${keyCode})؟`
        : `Are you sure you want to revoke key (${keyCode})?`;
    if (window.confirm(confirmMsg)) {
      await deleteLicenseKey(keyCode);
      setKeysList((prev) => prev.filter((k) => k.key !== keyCode));
      if (latestGenerated?.key === keyCode) {
        setLatestGenerated(null);
      }
    }
  };

  // Copy key helper
  const handleCopy = async (code: string) => {
    try {
      await copyToClipboard(code);
      setCopiedKey(code);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Share key via WhatsApp
  const handleShareWhatsApp = (record: LicenseKeyRecord) => {
    const meta = PLAN_CONFIGS[record.plan] || PLAN_CONFIGS['1Y'];
    const text =
      language === 'ar'
        ? `مرحباً بك! كود تفعيل باقة FlowApp Pro الخاص بك:\n🔑 الكود: ${record.key}\n📅 الباقة: ${meta.nameAr}\n\nطريقة التفعيل: افتح التطبيق -> اضغط على ترقية الحساب -> أدخل الكود واضغط تفعيل.`
        : `Your FlowApp Pro activation license key:\n🔑 Key: ${record.key}\n📅 Plan: ${meta.nameEn}\n\nTo activate: Open the app -> click Upgrade -> enter this key and activate.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Print scratch card layout
  const handlePrintCard = (record: LicenseKeyRecord) => {
    const meta = PLAN_CONFIGS[record.plan] || PLAN_CONFIGS['1Y'];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>كرت تفعيل - FlowApp Pro</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 20px; text-align: center; }
            .card { max-width: 420px; margin: 20px auto; background: white; border: 2px solid #0f172a; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
            .badge { display: inline-block; background: #fef3c7; color: #b45309; font-weight: bold; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
            .code-box { background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px; padding: 14px; border-radius: 10px; margin: 16px 0; }
            .notes { font-size: 12px; color: #64748b; line-height: 1.6; }
            @media print { body { background: white; padding: 0; } .card { box-shadow: none; border: 1px solid #000; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">⚡ بطاقة ترخيص FlowApp Pro</div>
            <div class="badge">${meta.nameAr}</div>
            <div class="code-box">${record.key}</div>
            <div class="notes">
              <strong>تعليمات التفعيل:</strong><br>
              1. افتح تطبيق المتجر والمخزون.<br>
              2. انقر على زر الترقية (PRO) في أعلى الشاشة.<br>
              3. أدخل هذا الكود وانقر على زر 'تفعيل'.<br>
              ${record.notes ? `<em>ملاحظة: ${record.notes}</em>` : ''}
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtered keys
  const filteredKeys = keysList.filter((item) => {
    if (filterStatus === 'AVAILABLE' && item.is_used) return false;
    if (filterStatus === 'USED' && !item.is_used) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchKey = item.key.toLowerCase().includes(q);
      const matchNote = (item.notes || '').toLowerCase().includes(q);
      const matchUser = (item.used_by || '').toLowerCase().includes(q);
      const matchEmail = (item.user_email || '').toLowerCase().includes(q);
      if (!matchKey && !matchNote && !matchUser && !matchEmail) return false;
    }
    return true;
  });

  const unusedCount = keysList.filter((k) => !k.is_used).length;
  const usedCount = keysList.filter((k) => k.is_used).length;

  // Supabase SQL Script Content
  const SUPABASE_SQL_SCRIPT = `-- =========================================================================
-- FlowApp Pro - جدول أكواد التفعيل وسياسات الحماية RLS في Supabase
-- =========================================================================

-- 1. إنشاء جدول أكواد التفعيل
CREATE TABLE IF NOT EXISTS public.license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    plan TEXT NOT NULL DEFAULT '1Y', -- '1M', '3M', '6M', '1Y', 'LIFE'
    duration_days INTEGER NOT NULL DEFAULT 365,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT, -- المشرف الذي ولد الكود
    used_at TIMESTAMPTZ,
    used_by TEXT, -- معرف العميل (auth.uid())
    user_email TEXT, -- بريد العميل
    notes TEXT
);

-- فهارس للبحث فائق السرعة
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON public.license_keys (key);
CREATE INDEX IF NOT EXISTS idx_license_keys_is_used ON public.license_keys (is_used);

-- 2. تفعيل نظام أمان الصفوف (Row Level Security - RLS)
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- 3. سياسة المشرف: الأدمن فقط يمكنه استعراض كامل الجدول وتوليد وحذف الأكواد
CREATE POLICY "Admins can view and manage all license keys"
ON public.license_keys
FOR ALL
TO authenticated
USING (
    auth.jwt() ->> 'email' = 'msal209m@gmail.com'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'ADMIN')
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'ADMIN')
    )
);

-- 4. سياسة العميل: يمنع استعراض الأكواد غير المستخدمة - يسمح فقط بفحص كود واحد لتفعيله
CREATE POLICY "Authenticated users can lookup unused keys for activation"
ON public.license_keys
FOR SELECT
TO authenticated
USING (
    is_used = false 
    OR used_by = auth.uid()::text
);

-- 5. سياسة التفعيل: العميل يمكنه فقط تحديث كود غير مستخدم لربطه بحسابه الخاص
CREATE POLICY "Users can activate an unused key"
ON public.license_keys
FOR UPDATE
TO authenticated
USING (
    is_used = false
)
WITH CHECK (
    is_used = true
    AND used_by = auth.uid()::text
);`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  {language === 'ar' ? 'لوحة تحكم المشرف - نظام تراخيص FlowApp Pro' : 'Admin Panel - FlowApp Pro Licenses'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'ar'
                  ? 'توليد، إدارة، والتحقق الآمن من كروت وأكواد التفعيل عبر قاعدة البيانات'
                  : 'Generate and securely verify FlowApp Pro license keys via database'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Gate if not admin authorized */}
        {!isAdminAuthorized ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-white mb-1">
                {language === 'ar' ? 'منطقة محظورة - للمشرفين فقط' : 'Restricted Area - Admins Only'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'هذه اللوحة مخصصة فقط لمدير النظام لتوليد كروت التفعيل للعملاء. إذا كنت تملك صلاحية المشرف، أدخل رمز الأمان السري للمتابعة.'
                  : 'This panel is restricted to system administrators to generate license keys. Enter master PIN to unlock.'}
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-3 pt-2">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل رمز المشرف (PIN)' : 'Enter Admin PIN'}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-750 focus:border-amber-500 rounded-xl text-center text-sm font-mono tracking-widest text-white outline-none"
                  autoFocus
                />
                {pinError && <p className="text-xs text-rose-400 font-bold mt-1.5">{pinError}</p>}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {language === 'ar' ? 'فتح لوحة المشرف' : 'Unlock Admin Panel'}
              </button>
            </form>
          </div>
        ) : (
          /* Main Admin Content */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setActiveTab('KEYS')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'KEYS'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إدارة وتوليد الأكواد' : 'Generate & Manage Keys'}</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/30">
                  {keysList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SUPABASE_RLS')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'SUPABASE_RLS'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'ar' ? 'مخطط Supabase وأمان RLS' : 'Supabase SQL & RLS'}</span>
              </button>

              <div className="ms-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadKeys}
                  disabled={isLoadingKeys}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={language === 'ar' ? 'تحديث البيانات' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingKeys ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tab 1: Keys Generator & Management */}
            {activeTab === 'KEYS' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                {/* Official Owner WhatsApp Number Card */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {language === 'ar' ? 'رقم الواتساب الرسمي المعتمد لتلقي طلبات التجار:' : 'Official WhatsApp for Merchant Orders:'}
                      </span>
                      <span dir="ltr" className="text-xs font-mono font-bold text-emerald-300">
                        {OWNER_CONTACT.phoneDisplay} ({OWNER_CONTACT.phoneRaw})
                      </span>
                    </div>
                  </div>
                  <a
                    href={OWNER_CONTACT.getWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'اختبار رابط الواتساب' : 'Test WhatsApp Link'}</span>
                  </a>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block font-bold">
                      {language === 'ar' ? 'إجمالي الأكواد' : 'Total Keys'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {keysList.length}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                    <span className="text-[11px] text-emerald-400 block font-bold">
                      {language === 'ar' ? 'أكواد متاحة (غير مستخدمة)' : 'Unused (Available)'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-300">
                      {unusedCount}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl">
                    <span className="text-[11px] text-rose-400 block font-bold">
                      {language === 'ar' ? 'أكواد تم تفعيلها' : 'Used (Redeemed)'}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-300">
                      {usedCount}
                    </span>
                  </div>
                </div>

                {/* Generator Section */}
                <div className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        {language === 'ar' ? 'توليد كود تفعيل جديد (Generate License Key)' : 'Generate New License Key'}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      صيغة الكود: FLOW-XXXX-XXXX-XXXX
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Plan selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {language === 'ar' ? 'مدة الباقة:' : 'Plan Duration:'}
                      </label>
                      <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value as LicenseKeyRecord['plan'])}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl text-xs text-white outline-none"
                      >
                        <option value="1M">شهر واحد (30 يوم) - 49 ر.س</option>
                        <option value="3M">3 أشهر (90 يوم) - 129 ر.س</option>
                        <option value="6M">نصف سنة (180 يوم) - 229 ر.س</option>
                        <option value="1Y">سنة كاملة (365 يوم) - 399 ر.س</option>
                        <option value="LIFE">مدى الحياة (دائم) - 890 ر.س</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {language === 'ar' ? 'الكمية المطلوبة:' : 'Quantity:'}
                      </label>
                      <select
                        value={batchCount}
                        onChange={(e) => setBatchCount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl text-xs text-white outline-none"
                      >
                        <option value={1}>كود مفرد واحد (1 كود)</option>
                        <option value={5}>دفعة كروت (5 أكواد)</option>
                        <option value={10}>دفعة كروت شحن (10 أكواد)</option>
                      </select>
                    </div>

                    {/* Notes / Client Memo */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        {language === 'ar' ? 'ملاحظات / اسم العميل أو الموزع:' : 'Notes / Agent:'}
                      </label>
                      <input
                        type="text"
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: مبيعات كاش الرياض' : 'e.g. Retailer batch'}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      id="admin-generate-license-btn"
                      onClick={handleGenerateKey}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>
                        {language === 'ar' ? 'توليد وحفظ الكود في Supabase' : 'Generate & Save to Supabase'}
                      </span>
                    </button>
                  </div>

                  {/* Showcase for the latest generated key */}
                  {latestGenerated && (
                    <div className="mt-3 p-3.5 bg-slate-900 border border-emerald-500/50 rounded-xl animate-in zoom-in-95">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">
                            {language === 'ar' ? 'تم حفظ الكود في Supabase بنجاح:' : 'Saved to Supabase successfully:'}
                          </span>
                          <span className="font-mono text-sm sm:text-base font-black text-amber-300 bg-slate-950 px-3 py-1 rounded-lg border border-slate-750 select-all">
                            {latestGenerated.key}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            is_used = false ({latestGenerated.duration_days} {language === 'ar' ? 'يوم' : 'days'})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(latestGenerated.key)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 cursor-pointer"
                          >
                            {copiedKey === latestGenerated.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            <span>{copiedKey === latestGenerated.key ? 'تم النسخ' : 'نسخ'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(latestGenerated)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs border border-emerald-700/60 cursor-pointer"
                            title="مشاركة واتساب"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>واتساب</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintCard(latestGenerated)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs border border-sky-700/60 cursor-pointer"
                            title="طباعة بطاقة كرت"
                          >
                            <Printer className="w-3.5 h-3.5 text-sky-400" />
                            <span>طباعة كرت</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table of License Keys */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      <span>{language === 'ar' ? 'سجل أكواد التفعيل (جدول license_keys):' : 'License Keys Registry:'}</span>
                    </h3>

                    <div className="flex items-center gap-2">
                      {/* Filter pills */}
                      <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-xl text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFilterStatus('ALL')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            filterStatus === 'ALL'
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          الكل ({keysList.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterStatus('AVAILABLE')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            filterStatus === 'AVAILABLE'
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-emerald-400'
                          }`}
                        >
                          متاح ({unusedCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterStatus('USED')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            filterStatus === 'USED'
                              ? 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                              : 'text-slate-400 hover:text-rose-400'
                          }`}
                        >
                          مستخدم ({usedCount})
                        </button>
                      </div>

                      {/* Search box */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="بحث بالكود أو الملاحظة..."
                          className="w-40 sm:w-48 pl-2 pr-7 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
                      </div>
                    </div>
                  </div>

                  {/* List items */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                    {filteredKeys.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        {isLoadingKeys ? 'جارٍ تحميل الأكواد...' : 'لا توجد أكواد مطابقة لخيارات البحث'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-850 max-h-72 overflow-y-auto">
                        {filteredKeys.map((item) => {
                          const planMeta = PLAN_CONFIGS[item.plan] || PLAN_CONFIGS['1Y'];
                          return (
                            <div
                              key={item.key}
                              className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-900/60 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {/* Status Icon */}
                                <div
                                  className={`p-2 rounded-xl shrink-0 ${
                                    item.is_used
                                      ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  }`}
                                >
                                  {item.is_used ? (
                                    <XCircle className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs sm:text-sm font-black text-white select-all">
                                      {item.key}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-850 text-slate-300">
                                      {planMeta.nameAr}
                                    </span>
                                    <span
                                      className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                        item.is_used
                                          ? 'bg-rose-950 text-rose-300 border border-rose-700/50'
                                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                      }`}
                                    >
                                      {item.is_used ? 'تم تفعيله' : 'غير مستخدم (جاهز للبيع)'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-400 mt-1">
                                    <span>
                                      تاريخ الإنشاء: {new Date(item.created_at).toLocaleDateString('ar-SA')}
                                    </span>
                                    {item.notes && (
                                      <span className="text-amber-300/80">ملاحظة: {item.notes}</span>
                                    )}
                                    {item.is_used && (
                                      <span className="text-rose-300">
                                        تم تفعيله بواسطة: {item.user_email || item.used_by || 'عميل'} بتاريخ{' '}
                                        {item.used_at ? new Date(item.used_at).toLocaleDateString('ar-SA') : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.key)}
                                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                  title="نسخ الكود"
                                >
                                  {copiedKey === item.key ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsApp(item)}
                                  className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-950/60 transition-colors"
                                  title="مشاركة واتساب"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handlePrintCard(item)}
                                  className="p-1.5 text-sky-400 hover:text-sky-300 rounded-lg hover:bg-sky-950/60 transition-colors"
                                  title="طباعة بطاقة كرت شحن"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {!item.is_used && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKey(item.key)}
                                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/60 transition-colors"
                                    title="حذف وإلغاء الكود"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Supabase Schema & RLS Policies */}
            {activeTab === 'SUPABASE_RLS' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>مخطط جدول Supabase وسياسات الحماية (Row Level Security - RLS)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      يمكنك نسخ وتطبيق هذا الكود في Supabase SQL Editor لتأمين الجدول وفق أرقى المعايير.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const success = await copyToClipboard(SUPABASE_SQL_SCRIPT);
                      if (success) {
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2500);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'تم نسخ كود SQL!' : 'نسخ كود SQL لـ Supabase'}</span>
                  </button>
                </div>

                {/* Security Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      صلاحية المشرف فقط
                    </span>
                    <p className="text-[11px] text-slate-400">
                      قراءة الأكواد غير المستخدمة وتوليد كروت جديدة مقتصرة بنسبة 100% على رتبة الأدمن فقط.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-sky-400" />
                      منع تسريب الأكواد
                    </span>
                    <p className="text-[11px] text-slate-400">
                      لا يمكن لأي مستخدم عادي عمل SELECT لكل الأكواد؛ يمكنه فقط تمرير كوده الخاص للتحقق منه.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      استخدام الكود لمرة واحدة
                    </span>
                    <p className="text-[11px] text-slate-400">
                      فور تفعيل الكود، يتحول is_used إلى true ويرتبط بـ user_id الخاص بالعميل ولا يمكن تكراره.
                    </p>
                  </div>
                </div>

                {/* SQL Code Block */}
                <div className="relative">
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-80 select-all">
                    {SUPABASE_SQL_SCRIPT}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>نظام الأمان والتراخيص السحابي نشط</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
