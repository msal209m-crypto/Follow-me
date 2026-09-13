import React, { useMemo } from 'react';
import {
  X,
  History,
  TrendingUp,
  Truck,
  ShoppingCart,
  Calendar,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  DollarSign,
  User,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { Item, Transaction, StoreSettings } from '../types';
import {
  ItemMovementSummary,
  getItemTimeline,
  formatRelativeDateTime,
} from '../utils/itemActivity';

interface ItemMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  summary: ItemMovementSummary | null;
  transactions: Transaction[];
  settings: StoreSettings;
  language: 'ar' | 'en';
  onQuickOrder?: (item: Item) => void;
}

export const ItemMovementModal: React.FC<ItemMovementModalProps> = ({
  isOpen,
  onClose,
  item,
  summary,
  transactions,
  settings,
  language,
  onQuickOrder,
}) => {
  if (!isOpen || !item) return null;

  const isArabic = language === 'ar';
  const timeline = useMemo(() => getItemTimeline(item.id, transactions, item), [item, transactions]);

  const lastSaleFormatted = summary?.lastSale
    ? formatRelativeDateTime(summary.lastSale.date, language)
    : null;

  const lastPurchaseFormatted = summary?.lastPurchase
    ? formatRelativeDateTime(summary.lastPurchase.date, language)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white tracking-tight">{item.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                  {item.barcode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic ? 'سجل تتبع الحركات وتواريخ البيع والشراء' : 'Item Movement History & Activity Tracking'}
                {item.category && ` • ${item.category}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isArabic ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Quick Metrics & Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Last Sale Date */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{isArabic ? 'آخر حركة بيع' : 'Last Sale'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              {summary?.lastSale ? (
                <div>
                  <div className="text-base font-black text-emerald-300">
                    {lastSaleFormatted?.relative}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {isArabic ? 'التاريخ:' : 'Date:'} {lastSaleFormatted?.full}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {summary.lastSale.quantity} {item.unit || (isArabic ? 'حبة' : 'pc')} • {summary.lastSale.unitPrice} {settings.currency}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-slate-400">
                    {isArabic ? 'لا توجد مبيعات بعد' : 'No sales yet'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isArabic ? 'لم تسجل أي فاتورة بيع' : 'No sales invoices yet'}
                  </div>
                </div>
              )}
            </div>

            {/* Last Purchase / Supply Date */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{isArabic ? 'آخر حركة شراء / توريد' : 'Last Purchase'}</span>
                <Truck className="w-4 h-4 text-cyan-400" />
              </div>
              {summary?.lastPurchase ? (
                <div>
                  <div className="text-base font-black text-cyan-300">
                    {lastPurchaseFormatted?.relative}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {summary.lastPurchase.isInitialStock
                      ? (isArabic ? 'رصيد افتتاحي: ' : 'Initial Stock: ')
                      : (isArabic ? 'التاريخ: ' : 'Date: ')}
                    {lastPurchaseFormatted?.full}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={summary.lastPurchase.supplierName}>
                    {summary.lastPurchase.supplierName}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-slate-400">
                    {isArabic ? 'لا توجد فواتير توريد' : 'No purchase records'}
                  </div>
                </div>
              )}
            </div>

            {/* Current Stock & Turnover Status */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{isArabic ? 'الرصيد وحالة الدوران' : 'Stock & Velocity'}</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-base font-black text-white font-mono">
                  {item.quantity}{' '}
                  <span className="text-xs font-sans text-slate-400">{item.unit || (isArabic ? 'حبة' : 'pc')}</span>
                </div>
                <div className="mt-1">
                  {summary?.turnoverStatus === 'OUT_OF_STOCK' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-md">
                      🚫 {isArabic ? 'نفد المخزون' : 'Out of Stock'}
                    </span>
                  )}
                  {summary?.turnoverStatus === 'AWAITING_SUPPLY' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-md">
                      🚚 {isArabic ? `بانتظار شحنة (${summary.pendingOrderQuantity})` : `Pending Delivery (${summary.pendingOrderQuantity})`}
                    </span>
                  )}
                  {summary?.turnoverStatus === 'RECENT_SALE' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-md">
                      ⚡ {isArabic ? 'حركة بيع سريعة (أقل من أسبوع)' : 'Fast Moving (Recent Sale)'}
                    </span>
                  )}
                  {summary?.turnoverStatus === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-300 bg-teal-950/80 border border-teal-800 px-2 py-0.5 rounded-md">
                      ✅ {isArabic ? 'حركة نشطة طبيعية' : 'Active Movement'}
                    </span>
                  )}
                  {summary?.turnoverStatus === 'STAGNANT' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-300 bg-orange-950/80 border border-orange-800 px-2 py-0.5 rounded-md">
                      ⏳ {isArabic ? `صنف راكد (${summary.stagnantDays} يوم بدون بيع)` : `Stagnant (${summary.stagnantDays}d no sale)`}
                    </span>
                  )}
                  {summary?.turnoverStatus === 'NEW_ITEM' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded-md">
                      ✨ {isArabic ? 'صنف جديد مسجل حديثاً' : 'New Item'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total Sales Units */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{isArabic ? 'إجمالي المبيعات' : 'Total Sold Units'}</span>
                <ShoppingCart className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-base font-black text-purple-300 font-mono">
                {summary?.totalSoldQuantity || 0}{' '}
                <span className="text-xs font-sans text-slate-400">{item.unit || (isArabic ? 'حبة' : 'pc')}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isArabic ? 'حد التنبيه عند النقص:' : 'Min Stock Alert:'} <strong className="text-slate-200">{item.minStockAlert || 5}</strong>
              </div>
            </div>
          </div>

          {/* Timeline / Activity History Header */}
          <div className="flex items-center justify-between pt-2">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>{isArabic ? 'سجل حركات الصنف الكامل (الأحدث أولاً)' : 'Complete Movement Log (Newest First)'}</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {timeline.length} {isArabic ? 'حركة مسجلة' : 'records'}
            </span>
          </div>

          {/* Timeline Table */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold sticky top-0 z-10 text-[11px]">
                    <th className="p-2.5 text-right">{isArabic ? 'العملية / الحركة' : 'Operation'}</th>
                    <th className="p-2.5 text-right">{isArabic ? 'التاريخ والوقت' : 'Date & Time'}</th>
                    <th className="p-2.5 text-right">{isArabic ? 'رقم الفاتورة' : 'Invoice #'}</th>
                    <th className="p-2.5 text-right">{isArabic ? 'الطرف / العميل / المورد' : 'Party'}</th>
                    <th className="p-2.5 text-center">{isArabic ? 'الكمية' : 'Qty'}</th>
                    <th className="p-2.5 text-center">{isArabic ? 'السعر' : 'Price'}</th>
                    <th className="p-2.5 text-center">{isArabic ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {timeline.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        {isArabic ? 'لا توجد حركات مسجلة لهذا الصنف حتى الآن' : 'No recorded movements for this item yet'}
                      </td>
                    </tr>
                  ) : (
                    timeline.map((entry) => {
                      const isSale = entry.type === 'SALE' || entry.type === 'CREDIT_SALE';
                      const isInitial = entry.type === 'INITIAL_STOCK';
                      const entryDate = formatRelativeDateTime(entry.date, language);

                      return (
                        <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Operation type */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              {isSale ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/70 px-2 py-0.5 rounded">
                                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                  <span>{isArabic ? (entry.type === 'SALE' ? 'بيع نقدي' : 'بيع آجل') : entry.type}</span>
                                </span>
                              ) : isInitial ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                  <Package className="w-3 h-3 text-slate-400" />
                                  <span>{isArabic ? 'رصيد افتتاحي' : 'Initial Record'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/70 px-2 py-0.5 rounded">
                                  <ArrowDownLeft className="w-3 h-3 text-cyan-400" />
                                  <span>
                                    {entry.isPendingReceipt
                                      ? (isArabic ? 'طلب معلق' : 'Pending Order')
                                      : (isArabic ? 'توريد بضاعة' : 'Stock In')}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="p-2.5 font-mono text-[11px] text-slate-300">
                            <div>{entryDate.full}</div>
                            <div className="text-[10px] text-slate-500">{entryDate.timeStr}</div>
                          </td>

                          {/* Invoice # */}
                          <td className="p-2.5 font-mono text-[11px] text-slate-300 font-bold">
                            {entry.invoiceNumber}
                          </td>

                          {/* Party */}
                          <td className="p-2.5 text-slate-300 truncate max-w-[140px]" title={entry.partyName}>
                            {entry.partyName}
                          </td>

                          {/* Quantity */}
                          <td className="p-2.5 text-center font-mono font-bold">
                            <span
                              className={
                                isSale
                                  ? 'text-emerald-400'
                                  : isInitial
                                  ? 'text-slate-300'
                                  : 'text-cyan-400'
                              }
                            >
                              {isSale ? '-' : '+'}{entry.quantity}
                            </span>
                          </td>

                          {/* Unit price */}
                          <td className="p-2.5 text-center font-mono text-slate-300">
                            {entry.unitPrice.toFixed(2)}
                          </td>

                          {/* Total */}
                          <td className="p-2.5 text-center font-mono font-bold text-white">
                            {entry.total.toFixed(2)} {settings.currency}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isArabic
              ? 'تتيح هذه النافذة التحقق الفوري من سرعة دوران الصنف ومعدلات السحب وتاريخ التوريد.'
              : 'Real-time item velocity check, sales turnover, and supply delivery tracking.'}
          </div>

          <div className="flex items-center gap-2">
            {onQuickOrder && (
              <button
                type="button"
                onClick={() => {
                  onQuickOrder(item);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{isArabic ? 'طلب وتوريد الصنف الآن' : 'Order Stock Now'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
