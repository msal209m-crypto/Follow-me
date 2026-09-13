import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Truck,
  Package,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Item } from '../types';
import {
  getDismissedAlertIds,
  dismissAlertId,
  restoreAlertId,
  dismissAllAlertIds,
  restoreAllAlertIds,
} from '../utils/alertUtils';

interface ReorderAlertsDropdownProps {
  onClose: () => void;
  onNavigateToOrderGoods: (item?: Item) => void;
  onNavigateToItems: (item?: Item) => void;
}

export const ReorderAlertsDropdown: React.FC<ReorderAlertsDropdownProps> = ({
  onClose,
  onNavigateToOrderGoods,
  onNavigateToItems,
}) => {
  const { inventoryStats, getPendingOrderQtyForItem, language, t, isRTL } = useApp();
  const { lowStockItems, lowStockCount, outOfStockCount } = inventoryStats;

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedAlertIds());
  const [showHiddenSection, setShowHiddenSection] = useState(false);

  // Sync state if external changes happen
  useEffect(() => {
    const handleUpdate = () => {
      setDismissedIds(getDismissedAlertIds());
    };
    window.addEventListener('flowapp:alerts-updated', handleUpdate);
    return () => window.removeEventListener('flowapp:alerts-updated', handleUpdate);
  }, []);

  const activeItems = lowStockItems.filter((item) => !dismissedIds.includes(item.id));
  const hiddenItems = lowStockItems.filter((item) => dismissedIds.includes(item.id));

  const handleDismissOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = dismissAlertId(id);
    setDismissedIds(updated);
  };

  const handleRestoreOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = restoreAlertId(id);
    setDismissedIds(updated);
  };

  const handleDismissAll = () => {
    const ids = activeItems.map((it) => it.id);
    const updated = dismissAllAlertIds(ids);
    setDismissedIds(updated);
  };

  const handleRestoreAll = () => {
    restoreAllAlertIds();
    setDismissedIds([]);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`fixed sm:absolute top-16 sm:top-full mt-2 inset-x-2 sm:inset-x-auto ${
        isRTL ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'
      } sm:w-[440px] max-w-[calc(100vw-1rem)] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/90 z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95`}
    >
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5 truncate">
              <span>{t.reorderAlertsTitle}</span>
              {activeItems.length > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {activeItems.length}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              {language === 'ar'
                ? 'تنبيهات فورية وإدارة إخفاء وإظهار النواقص'
                : 'Instant stock reorder & alert management'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeItems.length > 0 && (
            <button
              type="button"
              onClick={handleDismissAll}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
              title={language === 'ar' ? 'إخفاء كافة التنبيهات الحالية مؤقتاً' : 'Snooze all current alerts'}
            >
              <EyeOff className="w-3 h-3 text-slate-400" />
              <span>{language === 'ar' ? 'إخفاء الكل' : 'Hide All'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title={language === 'ar' ? 'إغلاق القائمة' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      {lowStockCount > 0 && (
        <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            {outOfStockCount > 0 && (
              <span className="flex items-center gap-1 text-rose-400 font-bold bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                {outOfStockCount} {t.outOfStock}
              </span>
            )}
            <span className="flex items-center gap-1 text-amber-300 font-bold bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-md">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {activeItems.length} {language === 'ar' ? 'نشط' : 'active'}
            </span>

            {hiddenItems.length > 0 && (
              <span className="flex items-center gap-1 text-slate-400 font-bold bg-slate-800/60 border border-slate-700/50 px-2 py-0.5 rounded-md">
                <EyeOff className="w-3 h-3 text-slate-400" />
                {hiddenItems.length} {language === 'ar' ? 'مخفي' : 'hidden'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onNavigateToOrderGoods();
              onClose();
            }}
            className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{t.reorderAllDeficitItems}</span>
            {isRTL ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Main Items Scrollable List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5 custom-scrollbar">
        {lowStockCount === 0 ? (
          <div className="py-8 px-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-bold text-slate-200 text-xs">{t.noReorderAlerts}</p>
            <p className="text-[10px] text-slate-400">
              {language === 'ar'
                ? 'كافة الأصناف المسجلة أعلى من حد الطلب الأدنى'
                : 'All items are stocked above their minimal reorder threshold'}
            </p>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="py-7 px-4 text-center space-y-2 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto" />
            <p className="font-bold text-slate-200 text-xs">
              {language === 'ar'
                ? 'تم إخفاء كافة التنبيهات الحالية مؤقتاً'
                : 'All current alerts are snoozed/hidden'}
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              {language === 'ar'
                ? 'لقد قمت بإخفاء تنبيهات النواقص، يمكنك استعادتها بأي وقت من الزر أدناه'
                : 'You have acknowledged and hidden all low stock alerts'}
            </p>
            <button
              type="button"
              onClick={handleRestoreAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إظهار كافة التنبيهات المخفية' : 'Restore All Alerts'}</span>
            </button>
          </div>
        ) : (
          activeItems.map((item) => {
            const minAlert = item.minStockAlert !== undefined ? item.minStockAlert : 5;
            const isZero = item.quantity <= 0;
            const deficit = Math.max(0, minAlert - item.quantity);
            const pendingQty = getPendingOrderQtyForItem(item.id);

            return (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-850 border border-slate-800/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border ${
                        isZero
                          ? 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
                          : 'bg-amber-950 border-amber-700 text-amber-300'
                      }`}
                    >
                      {isZero ? t.outOfStock : t.lowStockBadge}
                    </span>
                    <span className="font-extrabold text-white text-xs truncate max-w-[200px]">
                      {item.name}
                    </span>
                  </div>

                  {/* Stock metric details */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>
                      {t.currentStock}:{' '}
                      <strong className={isZero ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                        {item.quantity} {item.unit || (language === 'ar' ? 'حبة' : 'pcs')}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      {t.reorderPoint}: <strong className="text-slate-300">{minAlert}</strong>
                    </span>
                    {deficit > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-300">
                          {t.deficitQuantity}: <strong>+{deficit}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Pending supply order notice */}
                  {pendingQty > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md w-fit mt-0.5">
                      <Truck className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? `يوجد طلب معلق (${pendingQty} حبة) بانتظار الاستلام الفعلي`
                          : `Pending order (${pendingQty} pcs) awaiting delivery`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions: Reorder button & Dismiss/Hide button */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleDismissOne(item.id, e)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                    title={language === 'ar' ? 'إخفاء هذا التنبيه' : 'Hide this alert'}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToOrderGoods(item);
                      onClose();
                    }}
                    className={`flex items-center justify-center gap-1.5 font-bold py-1.5 px-2.5 rounded-lg shadow-sm transition-all cursor-pointer text-[11px] ${
                      pendingQty > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950'
                    }`}
                    title={pendingQty > 0 ? (language === 'ar' ? 'استلام الشحنة' : 'Receive Order') : t.quickReorder}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      {pendingQty > 0
                        ? language === 'ar'
                          ? 'استلام'
                          : 'Receive'
                        : t.quickReorder}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Collapsible Hidden Alerts Section */}
        {hiddenItems.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowHiddenSection(!showHiddenSection)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {language === 'ar'
                    ? `التنبيهات المخفية (${hiddenItems.length})`
                    : `Hidden Alerts (${hiddenItems.length})`}
                </span>
              </div>
              <span className="text-[10px] text-teal-400 hover:underline">
                {showHiddenSection
                  ? language === 'ar'
                    ? 'طي'
                    : 'Collapse'
                  : language === 'ar'
                  ? 'عرض واستعادة'
                  : 'View & Restore'}
              </span>
            </button>

            {showHiddenSection && (
              <div className="mt-1.5 space-y-1 pl-1 pr-1 animate-in fade-in">
                {hiddenItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-200 text-xs truncate block max-w-[200px]">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.currentStock}: {item.quantity} (حد التنبيه: {item.minStockAlert || 5})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleRestoreOne(item.id, e)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-teal-950 hover:border-teal-500/50 text-slate-300 hover:text-teal-300 rounded-md border border-slate-700 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                      title={language === 'ar' ? 'استعادة التنبيه' : 'Restore Alert'}
                    >
                      <Eye className="w-3 h-3" />
                      <span>{language === 'ar' ? 'استعادة' : 'Restore'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onNavigateToItems();
            onClose();
          }}
          className="text-slate-300 hover:text-white font-bold text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <Package className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.viewAllLowStock}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateToOrderGoods();
            onClose();
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md shadow-emerald-950 cursor-pointer transition-all"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>{t.navOrderGoods}</span>
        </button>
      </div>
    </div>
  );
};
