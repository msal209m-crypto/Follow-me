import React, { useState } from 'react';
import { Coins, X, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { POPULAR_CURRENCIES } from '../data/currencies';
import { doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeSetDoc } from '../lib/firestoreUtils';

interface ExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExchangeRateModal: React.FC<ExchangeRateModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, showNotification, language, currentUser, userProfile } = useApp();

  const [exchangeRate, setExchangeRate] = useState<string>(
    settings.exchangeRate != null ? settings.exchangeRate.toString() : '1.0'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    settings.multiCurrency?.baseCurrencyCode || settings.currency || 'SAR'
  );
  const [secondaryCurrency, setSecondaryCurrency] = useState<string>(
    settings.multiCurrency?.secondaryCurrencyCode || 'USD'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(exchangeRate) || 1.0;
    setIsSubmitting(true);

    try {
      const updatedMultiCurrency = {
        baseCurrencyCode: selectedCurrency,
        secondaryCurrencyCode: secondaryCurrency,
        showDualCurrency: true,
        rates: {
          ...(settings.multiCurrency?.rates || {}),
          [secondaryCurrency]: rateNum,
        },
      };

      // 1. Update local app settings
      updateSettings({
        exchangeRate: rateNum,
        currency: selectedCurrency,
        multiCurrency: updatedMultiCurrency,
      });

      // 2. Sync to Firestore (Store document & user config) so customers see it instantly
      const merchantId = currentUser?.uid || userProfile?.id;
      if (merchantId) {
        try {
          const storeRef = doc(db, 'stores', merchantId);
          await safeSetDoc(
            storeRef,
            {
              exchangeRate: rateNum,
              currency: selectedCurrency,
              multiCurrency: updatedMultiCurrency,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          const settingsRef = doc(db, 'users', merchantId, 'settings', 'store_config');
          await safeSetDoc(
            settingsRef,
            {
              exchangeRate: rateNum,
              currency: selectedCurrency,
              multiCurrency: updatedMultiCurrency,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Firestore exchange rate sync notice:', err);
        }
      }

      showNotification(
        language === 'ar'
          ? 'تم تحديث ونشر سعر الصرف لحظياً في السحابة بنجاح! 💱'
          : 'Exchange rate updated and published instantly to cloud! 💱',
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Error saving exchange rate:', err);
      showNotification(
        language === 'ar' ? 'حدث خطأ أثناء حفظ سعر الصرف' : 'Error saving exchange rate',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {language === 'ar' ? 'إدارة وسعر الصرف اللحظي 💱' : 'Live Exchange Rate Manager'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'ar'
                  ? 'تحديث أسعار العملات لمزامنتها مع العملاء لحظياً'
                  : 'Sync live currency rates with customers instantly'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Base Currency Selection */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'العملة الأساسية للمتجر:' : 'Store Base Currency:'}
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.name}) - {c.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary / Target Currency Selection */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'العملة المقابلة (للعرض والتحويل):' : 'Secondary / Target Currency:'}
            </label>
            <select
              value={secondaryCurrency}
              onChange={(e) => setSecondaryCurrency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {POPULAR_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.name}) - {c.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Current Exchange Rate Input */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
              <span>{language === 'ar' ? `سعر الصرف (1 ${selectedCurrency} = كم ${secondaryCurrency}؟):` : `Exchange Rate (1 ${selectedCurrency} = ? ${secondaryCurrency}):`}</span>
              <span className="text-[10px] text-amber-400 font-mono">محدث سحابياً</span>
            </label>
            <div className="relative">
              <TrendingUp className="w-4 h-4 text-amber-400 absolute right-3 top-3" />
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2.5 pr-9 text-amber-300 font-mono font-extrabold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'ar'
                ? '💡 سيتم تطبيق هذا السعر فورا في فواتير الكاشير وعرض الأسعار للعملاء في المتجر.'
                : '💡 This rate will apply instantly on POS invoices and customer storefront displays.'}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold transition-colors cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{language === 'ar' ? 'حفظ ونشر مباشر ⚡' : 'Save & Publish ⚡'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
