import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, Check, ShieldAlert } from 'lucide-react';

export interface ConfirmationDetailItem {
  label: string;
  value: React.ReactNode;
  isMono?: boolean;
  isHighlight?: boolean;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  itemDetails?: ConfirmationDetailItem[];
  checkboxOption?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
  };
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'نعم، تأكيد الحذف',
  cancelText = 'إلغاء الأمر',
  type = 'danger',
  isLoading = false,
  itemDetails,
  checkboxOption,
}) => {
  // Listen for Escape key to close safely
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDanger
              ? 'bg-rose-950/40 border-rose-900/40'
              : 'bg-amber-950/40 border-amber-900/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isDanger
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-5 h-5 text-rose-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-white">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                إجراء حساس • يرجى مراجعة البيانات بعناية قبل المتابعة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Main Message */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs sm:text-sm text-slate-200 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span>{message}</span>
              <p className="text-[11px] text-rose-400/90 font-medium mt-1">
                تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه تلقائياً بعد التنفيذ.
              </p>
            </div>
          </div>

          {/* Item Details Summary Card (if provided) */}
          {itemDetails && itemDetails.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 pb-1.5 border-b border-slate-800/80 flex items-center justify-between">
                <span>تفاصيل السجل المطلوب حذفه:</span>
                <span className="text-[10px] text-slate-500 font-mono">ID / Reference</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {itemDetails.map((detail, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 ${
                      detail.isHighlight ? 'border-amber-500/30 bg-amber-950/10' : ''
                    }`}
                  >
                    <span className="text-slate-400 text-[11px]">{detail.label}:</span>
                    <span
                      className={`font-bold ${
                        detail.isHighlight
                          ? 'text-amber-300'
                          : 'text-white'
                      } ${detail.isMono ? 'font-mono' : ''}`}
                    >
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Checkbox (e.g., restore inventory stock) */}
          {checkboxOption && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={checkboxOption.checked}
                onChange={(e) => checkboxOption.onChange(e.target.checked)}
                className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500/30 bg-slate-900 border-slate-700 w-4 h-4 cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-200">{checkboxOption.label}</div>
                {checkboxOption.description && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {checkboxOption.description}
                  </div>
                )}
              </div>
            </label>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/80 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/60 border border-rose-500/50'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/60 border border-amber-500/50'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري الحذف...</span>
              </span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
