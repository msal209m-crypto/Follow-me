import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Truck,
  Package,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  RotateCcw,
  Clock,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Item } from '../types';
import {
  getDismissedAlertIds,
  dismissAlertId,
  restoreAlertId,
} from '../utils/alertUtils';

interface DashboardLowStockAlertProps {
  onOpenOrderGoods: (itemId?: string, type?: 'CASH' | 'CREDIT') => void;
  onNavigateToItems: () => void;
}

export const DashboardLowStockAlert: React.FC<DashboardLowStockAlertProps> = ({
  onOpenOrderGoods,
  onNavigateToItems,
}) => {
  const {
    items,
    inventoryStats,
    getPendingOrderQtyForItem,
    settings,
    language,
    t,
    isRTL,
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'OUT_OF_STOCK' | 'CRITICAL'>('ALL');
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedAlertIds());
  const [showDismissed, setShowDismissed] = useState(false);

  // Sync dismissed alerts if updated from top navbar or elsewhere
  useEffect(() => {
    const handleUpdate = () => {
      setDismissedIds(getDismissedAlertIds());
    };
    window.addEventListener('flowapp:alerts-updated', handleUpdate);
    return () => window.removeEventListener('flowapp:alerts-updated', handleUpdate);
  }, []);

  // Compute items that reached or dropped below their reorder threshold
  const criticalItems = useMemo(() => {
    return items
      .filter((item) => {
        const threshold =
          item.minStockAlert !== undefined && item.minStockAlert !== null
            ? item.minStockAlert
            : 5;
        return item.quantity <= threshold;
      })
      .sort((a, b) => {
        // Out of stock first, then lowest quantity
        if (a.quantity <= 0 && b.quantity > 0) return -1;
        if (b.quantity <= 0 && a.quantity > 0) return 1;
        return a.quantity - b.quantity;
      });
  }, [items]);

  // Separate active vs dismissed
  const activeCriticalItems = useMemo(() => {
    return criticalItems.filter((it) => !dismissedIds.includes(it.id));
  }, [criticalItems, dismissedIds]);

  const dismissedCriticalItems = useMemo(() => {
    return criticalItems.filter((it) => dismissedIds.includes(it.id));
  }, [criticalItems, dismissedIds]);

  // Displayed items based on filter and search
  const displayedItems = useMemo(() => {
    let list = showDismissed ? criticalItems : activeCriticalItems;

    if (filterMode === 'OUT_OF_STOCK') {
      list = list.filter((it) => it.quantity <= 0);
    } else if (filterMode === 'CRITICAL') {
      list = list.filter((it) => it.quantity > 0);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (it) =>
        (it.name && it.name.toLowerCase().includes(q)) ||
        (it.barcode && String(it.barcode).toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q))
    );
  }, [showDismissed, criticalItems, activeCriticalItems, filterMode, searchQuery]);

  const outOfStockCount = useMemo(() => {
    return activeCriticalItems.filter((it) => it.quantity <= 0).length;
  }, [activeCriticalItems]);

  const lowStockCount = activeCriticalItems.length;

  // If no items are at reorder threshold at all
  if (criticalItems.length === 0) {
    return (
      <div
        id="dashboard-stock-healthy-banner"
        dir={isRTL ? 'rtl' : 'ltr'}
        className="mb-3.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold text-slate-200">
              {language === 'ar'
                ? 'حالة المخزون ممتازة'
                : 'Stock Levels are Healthy'}
            </span>
            <span className="text-slate-400 text-[11px] block">
              {language === 'ar'
                ? 'جميع الأصناف المسجلة أعلى من حد الطلب الأدنى المحدد لها'
                : 'All items are currently stocked above their minimum reorder limits'}
            </span>
          </div>
        </div>

        <button
          type="button"
          id="btn-goto-items-from-healthy"
          onClick={onNavigateToItems}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          {t.viewAllItems || 'عرض المستودع'}
        </button>
      </div>
    );
  }

  return (
    <section
      id="dashboard-low-stock-alert-section"
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label="Low Stock Reorder Alert"
      className="mb-3.5 rounded-2xl border border-amber-500/60 bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-slate-900/95 shadow-xl shadow-amber-950/20 overflow-hidden transition-all duration-200"
    >
      {/* Alert Header Bar */}
      <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-500/30 bg-amber-950/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-sm shadow-amber-950">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>
                  {language === 'ar'
                    ? 'تنبيه: أصناف بلغت حد الطلب وقاربت على النفاذ'
                    : 'Alert: Low Stock Items Reached Reorder Threshold'}
                </span>
              </h2>

              {lowStockCount > 0 ? (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                  {lowStockCount} {language === 'ar' ? 'صنف يحتاج توريد' : 'items'}
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  {language === 'ar' ? 'تم إخفاء التنبيهات' : 'All snoozed'}
                </span>
              )}

              {outOfStockCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>
                    {outOfStockCount} {language === 'ar' ? 'رصيد صفر (نافد)' : 'Out of stock'}
                  </span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-amber-200/80 leading-tight truncate mt-0.5">
              {language === 'ar'
                ? 'وصلت هذه الأصناف لحد الأمان المحدد في بطاقتها، يرجى طلب بضاعة لتجنب نفاد المخزون'
                : 'These items are at or below their reorder points. Order goods to replenish inventory.'}
            </p>
          </div>
        </div>

        {/* Global Alert Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
          {/* Reorder All Goods Shortcut */}
          <button
            type="button"
            id="btn-reorder-all-goods-dashboard"
            onClick={() => onOpenOrderGoods(undefined, 'CASH')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-950/50 transition-all cursor-pointer active:scale-95 border border-amber-400/50"
            title={language === 'ar' ? 'فتح فاتورة توريد لكافة النواقص' : 'Reorder all low stock items'}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'طلب بضاعة للنواقص' : 'Reorder Low Stock'}</span>
          </button>

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            id="btn-toggle-low-stock-alert"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? (language === 'ar' ? 'طي القائمة' : 'Collapse') : (language === 'ar' ? 'عرض القائمة' : 'Expand')}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Alert Body */}
      {isExpanded && (
        <div className="p-3 sm:p-3.5 space-y-3">
          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                id="filter-all-low-stock"
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs cursor-pointer border ${
                  filterMode === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {language === 'ar' ? 'الكل' : 'All'} ({activeCriticalItems.length})
              </button>

              {outOfStockCount > 0 && (
                <button
                  type="button"
                  id="filter-out-of-stock"
                  onClick={() => setFilterMode('OUT_OF_STOCK')}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs cursor-pointer border flex items-center gap-1 ${
                    filterMode === 'OUT_OF_STOCK'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-950/70 text-rose-300 border-slate-800 hover:border-rose-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                  <span>{language === 'ar' ? 'نافد تماماً (0)' : 'Out of stock'}</span>
                  <span>({outOfStockCount})</span>
                </button>
              )}

              <button
                type="button"
                id="filter-critical-only"
                onClick={() => setFilterMode('CRITICAL')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs cursor-pointer border ${
                  filterMode === 'CRITICAL'
                    ? 'bg-amber-950 text-amber-200 border-amber-500 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {language === 'ar' ? 'تحت حد الطلب' : 'Under limit'}
              </button>

              {dismissedCriticalItems.length > 0 && (
                <button
                  type="button"
                  id="filter-toggle-dismissed"
                  onClick={() => setShowDismissed(!showDismissed)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs cursor-pointer border flex items-center gap-1 ${
                    showDismissed
                      ? 'bg-slate-800 text-teal-300 border-teal-500'
                      : 'bg-slate-950/70 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>
                    {language === 'ar'
                      ? `المخفية (${dismissedCriticalItems.length})`
                      : `Snoozed (${dismissedCriticalItems.length})`}
                  </span>
                </button>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 min-w-[170px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 right-2.5" />
              <input
                type="text"
                id="search-low-stock-input"
                placeholder={
                  language === 'ar'
                    ? 'بحث باسم الصنف أو الباركود...'
                    : 'Search item or barcode...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Items Grid */}
          {displayedItems.length === 0 ? (
            <div className="py-6 px-4 text-center rounded-xl bg-slate-950/40 border border-slate-800/60">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
              <p className="font-bold text-slate-300 text-xs">
                {language === 'ar'
                  ? 'لا توجد أصناف مطابقة للتصفية الحالية'
                  : 'No items match the current filter'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {displayedItems.map((item) => {
                const limit =
                  item.minStockAlert !== undefined && item.minStockAlert !== null
                    ? item.minStockAlert
                    : 5;
                const isOutOfStock = item.quantity <= 0;
                const deficit = Math.max(0, limit - item.quantity);
                const pendingQty = getPendingOrderQtyForItem(item.id);
                const isDismissed = dismissedIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    id={`stock-alert-card-${item.id}`}
                    className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                      isOutOfStock
                        ? 'bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-950 border-rose-800/60 shadow-md shadow-rose-950/20'
                        : 'bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border-amber-800/50 shadow-md shadow-amber-950/10'
                    }`}
                  >
                    {/* Top Row: Title, Category & Dismiss button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border ${
                              isOutOfStock
                                ? 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
                                : 'bg-amber-950 border-amber-700 text-amber-300'
                            }`}
                          >
                            {isOutOfStock
                              ? language === 'ar'
                                ? 'نافد تماماً'
                                : 'Out of Stock'
                              : language === 'ar'
                              ? 'وصل حد الطلب'
                              : 'Reorder Level'}
                          </span>

                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                            {item.category || (language === 'ar' ? 'عام' : 'General')}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-white text-xs sm:text-sm mt-1 truncate">
                          {item.name}
                        </h3>

                        {item.barcode && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            #{item.barcode}
                          </span>
                        )}
                      </div>

                      {/* Dismiss / Restore Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDismissed) {
                            restoreAlertId(item.id);
                          } else {
                            dismissAlertId(item.id);
                          }
                        }}
                        className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
                        title={
                          isDismissed
                            ? language === 'ar'
                              ? 'استعادة التنبيه'
                              : 'Restore alert'
                            : language === 'ar'
                            ? 'إخفاء هذا التنبيه'
                            : 'Snooze alert'
                        }
                      >
                        {isDismissed ? (
                          <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Middle Section: Stock Metrics & Progress Bar */}
                    <div className="space-y-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          {language === 'ar' ? 'الرصيد الحالي:' : 'Current:'}
                        </span>
                        <span
                          className={`font-black ${
                            isOutOfStock ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {item.quantity} {item.unit || (language === 'ar' ? 'حبة' : 'pcs')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{language === 'ar' ? 'حد الطلب المحدد:' : 'Reorder point:'}</span>
                        <span className="text-slate-300 font-bold">{limit}</span>
                      </div>

                      {deficit > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono font-bold">
                          <span>{language === 'ar' ? 'العجز المطلوب تعويضه:' : 'Deficit needed:'}</span>
                          <span>+{deficit}</span>
                        </div>
                      )}

                      {/* Stock Level Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOutOfStock
                              ? 'bg-rose-500 w-0'
                              : 'bg-amber-400'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(8, (item.quantity / (limit || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Pending Order Notice if any */}
                    {pendingQty > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-teal-300 font-bold bg-teal-950/60 border border-teal-800/60 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-teal-400 shrink-0" />
                        <span className="truncate">
                          {language === 'ar'
                            ? `يوجد طلب توريد معلق (${pendingQty} حبة)`
                            : `Pending order (${pendingQty} pcs)`}
                        </span>
                      </div>
                    )}

                    {/* Bottom Action: QUICK REORDER BUTTON (الزر السريع لطلب بضاعة) */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        id={`btn-quick-order-${item.id}`}
                        onClick={() => onOpenOrderGoods(item.id, 'CASH')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-95"
                        title={
                          language === 'ar'
                            ? `طلب بضاعة وتوريد فوري لصنف ${item.name}`
                            : `Quick reorder goods for ${item.name}`
                        }
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'طلب بضاعة سريع' : 'Quick Reorder'}</span>
                      </button>

                      {/* Secondary Credit Order Button */}
                      <button
                        type="button"
                        id={`btn-credit-order-${item.id}`}
                        onClick={() => onOpenOrderGoods(item.id, 'CREDIT')}
                        className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        title={language === 'ar' ? 'طلب بضاعة آجل (دين على المورد)' : 'Credit purchase'}
                      >
                        {language === 'ar' ? 'آجل' : 'Credit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Bar of Alert Section */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              id="btn-nav-to-items-from-alert"
              onClick={onNavigateToItems}
              className="text-slate-400 hover:text-white flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {language === 'ar'
                  ? 'عرض وتعديل حدود الطلب في صفحة الأصناف'
                  : 'Manage reorder thresholds in items catalog'}
              </span>
            </button>

            <button
              type="button"
              id="btn-reorder-all-footer"
              onClick={() => onOpenOrderGoods(undefined, 'CASH')}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>
                {language === 'ar'
                  ? 'إنشاء فاتورة توريد مجمعة لكافة النواقص'
                  : 'Batch inward supply invoice for all deficit items'}
              </span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
