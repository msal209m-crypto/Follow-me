import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  Percent,
  Coins,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Calculator,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Item, StoreSettings } from '../types';

interface BulkPriceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  settings: StoreSettings;
  onApplyUpdate: (updates: { id: string; salePrice: number; costPrice?: number }[]) => Promise<void> | void;
  showNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  language?: string;
  isRTL?: boolean;
}

type UpdateMethod = 'EXCHANGE_RATE' | 'PERCENTAGE' | 'FIXED_AMOUNT';
type TargetPriceType = 'SALE_ONLY' | 'SALE_AND_COST';
type RoundingMethod = 'NONE' | 'NEAREST_HALF' | 'NEAREST_INT' | 'NEAREST_FIVE';

export const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({
  isOpen,
  onClose,
  items,
  settings,
  onApplyUpdate,
  showNotification,
  language = 'ar',
  isRTL = true,
}) => {
  const isAr = language === 'ar';
  const currency = settings.currency || 'ر.س';
  const registeredRate = settings.exchangeRate && settings.exchangeRate > 0 ? settings.exchangeRate : 1.0;

  // Form State
  const [method, setMethod] = useState<UpdateMethod>('EXCHANGE_RATE');
  const [oldRate, setOldRate] = useState<number>(registeredRate);
  const [newRate, setNewRate] = useState<number>(registeredRate);
  const [percentage, setPercentage] = useState<number>(10);
  const [fixedAmount, setFixedAmount] = useState<number>(5);
  const [targetCategory, setTargetCategory] = useState<string>('ALL');
  const [targetPrice, setTargetPrice] = useState<TargetPriceType>('SALE_ONLY');
  const [rounding, setRounding] = useState<RoundingMethod>('NEAREST_HALF');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category?.trim()) set.add(it.category.trim());
    });
    return Array.from(set);
  }, [items]);

  // Sync initial exchange rates when settings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setOldRate(registeredRate);
      setNewRate(registeredRate);
    }
  }, [isOpen, registeredRate]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Rounding helper
  const applyRounding = (val: number, roundType: RoundingMethod): number => {
    if (val <= 0) return 0;
    switch (roundType) {
      case 'NEAREST_HALF':
        return Math.round(val * 2) / 2;
      case 'NEAREST_INT':
        return Math.round(val);
      case 'NEAREST_FIVE':
        return Math.round(val / 5) * 5;
      case 'NONE':
      default:
        return Math.round(val * 100) / 100;
    }
  };

  // Compute multiplier / delta
  const multiplier = useMemo(() => {
    if (method === 'EXCHANGE_RATE') {
      if (!oldRate || oldRate <= 0) return 1;
      return newRate / oldRate;
    }
    if (method === 'PERCENTAGE') {
      return 1 + (percentage / 100);
    }
    return 1;
  }, [method, oldRate, newRate, percentage]);

  // Compute calculated updates
  const calculations = useMemo(() => {
    const list: {
      item: Item;
      oldSale: number;
      newSale: number;
      oldCost: number;
      newCost: number;
      diffSale: number;
      pctChange: number;
    }[] = [];

    const targetItems = items.filter((it) => {
      if (targetCategory === 'ALL') return true;
      return (it.category || '').trim() === targetCategory.trim();
    });

    for (const it of targetItems) {
      const curSale = Number(it.salePrice) || 0;
      const curCost = Number(it.costPrice) || 0;
      let calculatedSale = curSale;
      let calculatedCost = curCost;

      if (method === 'EXCHANGE_RATE' || method === 'PERCENTAGE') {
        calculatedSale = applyRounding(curSale * multiplier, rounding);
        if (targetPrice === 'SALE_AND_COST') {
          calculatedCost = applyRounding(curCost * multiplier, rounding);
        }
      } else if (method === 'FIXED_AMOUNT') {
        calculatedSale = applyRounding(Math.max(0, curSale + fixedAmount), rounding);
        if (targetPrice === 'SALE_AND_COST') {
          calculatedCost = applyRounding(Math.max(0, curCost + fixedAmount), rounding);
        }
      }

      const diffSale = calculatedSale - curSale;
      const pct = curSale > 0 ? (diffSale / curSale) * 100 : 0;

      list.push({
        item: it,
        oldSale: curSale,
        newSale: calculatedSale,
        oldCost: curCost,
        newCost: calculatedCost,
        diffSale,
        pctChange: pct,
      });
    }

    return list;
  }, [items, targetCategory, method, multiplier, fixedAmount, targetPrice, rounding]);

  // Filtered preview items
  const previewItems = useMemo(() => {
    if (!previewSearch.trim()) return calculations;
    const q = previewSearch.trim().toLowerCase();
    return calculations.filter(
      (c) =>
        c.item.name.toLowerCase().includes(q) ||
        (c.item.barcode && c.item.barcode.includes(q))
    );
  }, [calculations, previewSearch]);

  const handleApply = async () => {
    if (calculations.length === 0) {
      showNotification(isAr ? 'لا توجد أصناف مطابقة لتحديث أسعارها' : 'No items to update', 'warning');
      return;
    }

    const confirmMsg = isAr
      ? `هل أنت متأكد من تطبيق التحديث على أسعار (${calculations.length}) صنف؟ سيتم حفظ الأسعار الجديدة في النظام فوراً.`
      : `Apply new prices to ${calculations.length} items now?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsApplying(true);
      const updates = calculations.map((c) => ({
        id: c.item.id,
        salePrice: c.newSale,
        costPrice: targetPrice === 'SALE_AND_COST' ? c.newCost : undefined,
      }));

      await onApplyUpdate(updates);
      showNotification(
        isAr
          ? `✓ تم بنجاح تحديث أسعار (${calculations.length}) صنف بناءً على المعطيات الجديدة!`
          : `✓ Successfully updated prices for ${calculations.length} items!`,
        'success'
      );
      onClose();
    } catch (err) {
      console.error('Failed to batch update prices:', err);
      showNotification(isAr ? 'حدث خطأ أثناء تحديث الأسعار' : 'Error updating prices', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-teal-500/20 to-emerald-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isAr ? 'معالج التحديث الذكي لأسعار المخزون' : 'Smart Bulk Price Updater'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isAr ? 'سعر الصرف والنسب' : 'Exchange & Margins'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'عدّل أسعار البيع والتكلفة لجميع الأصناف بضغطة زر واحدة مع معاينة دقيقة ومطابقة آمنة'
                  : 'Adjust retail and cost prices across items with live preview and safety controls'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Method Selector Tabs */}
          <div>
            <label className="font-bold text-slate-300 block mb-1.5">
              {isAr ? 'طريقة احتساب وتحديث الأسعار:' : 'Calculation Method:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('EXCHANGE_RATE')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  method === 'EXCHANGE_RATE'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-sm font-bold ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">{isAr ? 'بناءً على سعر الصرف' : 'By Exchange Rate'}</div>
                  <div className="text-[10px] text-slate-400">{isAr ? 'مقارنة الصرف القديم بالجديد' : 'Ratio of new vs old rate'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('PERCENTAGE')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  method === 'PERCENTAGE'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-sm font-bold ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Percent className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">{isAr ? 'نسبة مئوية (+ / - %)' : 'Percentage (+ / - %)'}</div>
                  <div className="text-[10px] text-slate-400">{isAr ? 'زيادة أو تخفيض بنسبة محددة' : 'Increase/decrease by %'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('FIXED_AMOUNT')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  method === 'FIXED_AMOUNT'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-sm font-bold ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">{isAr ? 'مبلغ ثابت مقطوع' : 'Fixed Amount (+ / -)'}</div>
                  <div className="text-[10px] text-slate-400">{isAr ? `إضافة أو خصم قيمة معينة (${currency})` : `Flat amount change`}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Parameters Controls */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            {method === 'EXCHANGE_RATE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    {isAr ? 'سعر الصرف السابق المسجل:' : 'Previous Rate:'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={oldRate}
                    onChange={(e) => setOldRate(Math.max(0.001, parseFloat(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {isAr ? `المسجل بالنظام: ${registeredRate}` : `Stored in settings: ${registeredRate}`}
                  </span>
                </div>
                <div>
                  <label className="text-amber-300 font-bold block mb-1">
                    {isAr ? 'سعر الصرف الجديد المطلوب اعتماده:' : 'New Exchange Rate to Apply:'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(Math.max(0.001, parseFloat(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-amber-500/80 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none ring-1 ring-amber-500/30"
                  />
                  <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                    {multiplier >= 1
                      ? isAr
                        ? `زيادة بنسبة +${((multiplier - 1) * 100).toFixed(1)}%`
                        : `+${((multiplier - 1) * 100).toFixed(1)}% increase`
                      : isAr
                      ? `انخفاض بنسبة ${((multiplier - 1) * 100).toFixed(1)}%`
                      : `${((multiplier - 1) * 100).toFixed(1)}% decrease`}
                  </span>
                </div>
              </div>
            )}

            {method === 'PERCENTAGE' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">
                    {isAr ? 'نسبة الزيادة أو الخصم (%):' : 'Percentage (+ / - %):'}
                  </label>
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {percentage > 0 ? `+${percentage}%` : `${percentage}%`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.5"
                    value={percentage}
                    onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                    className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {[5, 10, 15, 20, 25, -5, -10].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPercentage(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          percentage === p
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {p > 0 ? `+${p}%` : `${p}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {method === 'FIXED_AMOUNT' && (
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAr ? `قيمة المبلغ المضاف / المخصوم (${currency}):` : `Amount to add / subtract (${currency}):`}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.5"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(parseFloat(e.target.value) || 0)}
                    className="w-40 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {[1, 5, 10, 20, 50, -5, -10].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFixedAmount(amt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          fixedAmount === amt
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {amt > 0 ? `+${amt}` : amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Scope & Rounding Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
              {/* Category Scope */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAr ? 'نطاق التطبيق (التصنيف):' : 'Category Scope:'}
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{isAr ? 'جميع الأصناف (كامل المخزون)' : 'All Inventory'}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Type */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAr ? 'الأسعار المستهدفة:' : 'Prices to Update:'}
                </label>
                <select
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value as TargetPriceType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none cursor-pointer font-bold"
                >
                  <option value="SALE_ONLY">{isAr ? 'سعر البيع فقط (الموصى به)' : 'Sale Price Only'}</option>
                  <option value="SALE_AND_COST">{isAr ? 'سعر البيع وسعر التكلفة معاً' : 'Sale & Cost Prices'}</option>
                </select>
              </div>

              {/* Rounding Method */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isAr ? 'تقريب الكسور بعد الحساب:' : 'Rounding Rule:'}
                </label>
                <select
                  value={rounding}
                  onChange={(e) => setRounding(e.target.value as RoundingMethod)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none cursor-pointer"
                >
                  <option value="NEAREST_HALF">{isAr ? 'لأقرب نصف ريال (0.50)' : 'Nearest 0.50'}</option>
                  <option value="NEAREST_INT">{isAr ? 'لأقرب عدد صحيح (1.00)' : 'Nearest Integer'}</option>
                  <option value="NEAREST_FIVE">{isAr ? 'لأقرب 5 وحدات (5.00)' : 'Nearest 5'}</option>
                  <option value="NONE">{isAr ? 'بدون تقريب (هللات دقيقة)' : 'Exact (2 decimals)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">
                  {isAr ? 'معاينة مباشرة للتغييرات:' : 'Live Change Preview:'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {calculations.length} {isAr ? 'صنف سيتأثر' : 'items affected'}
                </span>
              </div>
              <input
                type="text"
                placeholder={isAr ? 'بحث سريع بالاسم في المعاينة...' : 'Filter preview...'}
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:border-amber-500 focus:outline-none w-48"
              />
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 max-h-56 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">{isAr ? 'الصنف' : 'Item'}</th>
                    <th className="py-2 px-3">{isAr ? 'التصنيف' : 'Category'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'سعر البيع الحالي' : 'Current Price'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'سعر البيع الجديد' : 'New Price'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'الفارق' : 'Diff'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {previewItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        {isAr ? 'لا توجد أصناف تطابق هذا الاختيار' : 'No items match filter'}
                      </td>
                    </tr>
                  ) : (
                    previewItems.slice(0, 50).map((row) => (
                      <tr key={row.item.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-3 font-sans font-bold text-slate-200 truncate max-w-[180px]">
                          {row.item.name}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                          {row.item.category || '-'}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-300">
                          {row.oldSale.toFixed(2)} {currency}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-400">
                          {row.newSale.toFixed(2)} {currency}
                        </td>
                        <td className="py-2 px-3 text-center text-[11px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              row.diffSale > 0
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : row.diffSale < 0
                                ? 'bg-rose-500/15 text-rose-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {row.diffSale > 0 ? `+${row.diffSale.toFixed(2)}` : row.diffSale.toFixed(2)}
                            {row.pctChange !== 0 && ` (${row.pctChange > 0 ? '+' : ''}${row.pctChange.toFixed(0)}%)`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {previewItems.length > 50 && (
                <div className="py-1.5 text-center text-[11px] text-slate-500 bg-slate-900/60 border-t border-slate-800">
                  {isAr ? `... ويوجد ${previewItems.length - 50} صنف إضافي بالجدول` : `... and ${previewItems.length - 50} more items`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isAr
                ? 'سيتم اعتماد الأسعار الجديدة تلقائياً وحفظها سحابياً ومحلياً.'
                : 'Prices will be updated locally and synced to cloud.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isApplying}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer text-xs disabled:opacity-50"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isApplying || calculations.length === 0}
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black transition-all cursor-pointer text-xs shadow-lg shadow-emerald-950/60 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isApplying ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isAr ? 'جاري تطبيق الأسعار...' : 'Applying...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isAr
                      ? `اعتماد وتطبيق الأسعار (${calculations.length} صنف)`
                      : `Apply Prices (${calculations.length} items)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
