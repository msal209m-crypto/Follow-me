import React from 'react';
import { ShieldCheck, X, FileText, Lock, Eye, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className={`max-w-2xl w-full rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-6 text-right relative max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black">سياسة الخصوصية وشروط الاستخدام</h2>
            <p className="text-xs text-emerald-400 font-medium">منصة قريتي الرقمية الموحدة (Qaryati App)</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>1. حماية البيانات والخصوصية</span>
            </h3>
            <p>
              نحن في تطبيق "قريتي" نلتزم بحماية خصوصية بيانات المستخدمين (التجار، السائقين، والعملاء). يتم جمع بيانات أساسية فقط (مثل رقم الجوال، الاسم، والقرية/الموقع) بغرض إتمام عمليات التسوق والتوصيل وتوثيق الهوية (KYC) وحماية حقوق الأطراف.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>2. استخدام الكاميرا والموقع الجغرافي</span>
            </h3>
            <p>
              • <strong>الكاميرا:</strong> تُستخدم حصرياً بناءً على طلب المستخدم لالتقاط صورة الهوية الوطنية أو صورة شخصية لتوثيق الحساب (KYC) ومنع الحسابات الوهمية.<br />
              • <strong>الموقع الجغرافي:</strong> يُستخدم لتحديد القرية أو الحي لتسهيل عملية توصيل الطلبات من قِبل مناديب التوصيل بدقة عالية.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>3. شروط الاستخدام وحساب المراجعة</span>
            </h3>
            <p>
              يُمنع استخدام المنصة لأي أغراض مخالفة للنظام العام. يتوفر للتطبيق حساب مخصص لفريق مراجعة المتاجر (جوجل بلاي) بغرض الفحص والتدقيق الأمني والوظيفي وفقاً لسياسات المتاجر الرسمية.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold pt-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>جميع الحقوق محفوظة لمنصة قريتي © {new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            فهمت وموافق ✓
          </button>
        </div>
      </div>
    </div>
  );
};
