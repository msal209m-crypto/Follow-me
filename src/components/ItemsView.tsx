import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Camera,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  DollarSign,
  Layers,
  History,
  Truck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Crown,
  Store,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSubscription, FREE_ITEM_LIMIT } from '../context/SubscriptionContext';
import { Item } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ItemMovementModal } from './ItemMovementModal';
import { ConfirmationModal } from './ConfirmationModal';
import {
  computeAllItemMovements,
  ItemMovementSummary,
  formatRelativeDateTime,
} from '../utils/itemActivity';

type SortableField = keyof Item | 'lastSale' | 'lastPurchase';

interface ItemsViewProps {
  onOpenAddItem: () => void;
  onOpenOrderGoods?: (itemId?: string, type?: 'CASH' | 'CREDIT') => void;
  onEditItem: (item: Item) => void;
  onPrintStickersForItem: (itemId: string) => void;
}

export const ItemsView: React.FC<ItemsViewProps> = ({
  onOpenAddItem,
  onOpenOrderGoods,
  onEditItem,
  onPrintStickersForItem,
}) => {
  const {
    items,
    transactions,
    deleteItem,
    resetToSampleData,
    settings,
    inventoryStats,
    getPendingOrderQtyForItem,
    t,
    isRTL,
    language,
  } = useApp();
  const { isPro, setShowSubscriptionModal } = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'STAGNANT' | 'RECENT_SALE' | 'AWAITING_SUPPLY'>('ALL');
  const [sortField, setSortField] = useState<SortableField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [selectedItemForTracking, setSelectedItemForTracking] = useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // Compute all items activity tracking (last sale, last purchase, turnover status)
  const itemMovementsMap = useMemo(() => {
    return computeAllItemMovements(items, transactions, getPendingOrderQtyForItem);
  }, [items, transactions, getPendingOrderQtyForItem]);

  // Movement counts for filter badges
  const movementCounts = useMemo(() => {
    let stagnant = 0;
    let recentSale = 0;
    let awaitingSupply = 0;

    itemMovementsMap.forEach((summary) => {
      if (summary.turnoverStatus === 'STAGNANT') stagnant++;
      if (summary.turnoverStatus === 'RECENT_SALE') recentSale++;
      if (summary.turnoverStatus === 'AWAITING_SUPPLY') awaitingSupply++;
    });

    return { stagnant, recentSale, awaitingSupply };
  }, [itemMovementsMap]);

  // Calculate actual sales revenue & realized profit from completed sales
  const salesSummary = useMemo(() => {
    let totalSalesRevenue = 0;
    let totalSalesCost = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'SALE' || tx.type === 'CREDIT_SALE') {
        totalSalesRevenue += Number(tx.totalAmount ?? (tx as any).finalTotal) || 0;
        tx.items?.forEach((it) => {
          const qty = Number(it.quantity) || 0;
          const cost = Number(it.costPrice) || 0;
          totalSalesCost += qty * cost;
        });
      }
    });

    const realizedProfit = Math.max(0, totalSalesRevenue - totalSalesCost);
    return {
      totalSalesRevenue: isNaN(totalSalesRevenue) ? 0 : totalSalesRevenue,
      realizedProfit: isNaN(realizedProfit) ? 0 : realizedProfit,
    };
  }, [transactions]);

  // Expected inventory values & profit margins
  const totalCostVal = Number(inventoryStats.totalCostValue) || 0;
  const totalSaleVal = Number(inventoryStats.totalSaleValue) || 0;
  const expectedProfit = Math.max(0, totalSaleVal - totalCostVal);
  const profitMarginPercent =
    totalCostVal > 0 && !isNaN(expectedProfit)
      ? ((expectedProfit / totalCostVal) * 100).toFixed(1)
      : '0.0';

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          String(item?.name ?? '').toLowerCase().includes(query) ||
          String(item?.barcode ?? '').toLowerCase().includes(query) ||
          String(item?.sku ?? '').toLowerCase().includes(query) ||
          (item.category && String(item.category).toLowerCase().includes(query));

        const matchesCategory =
          selectedCategory === 'ALL' || item.category === selectedCategory;

        const matchesStock =
          !filterLowStockOnly || item.quantity <= (item.minStockAlert || 5);

        const summary = itemMovementsMap.get(item.id);
        const matchesMovement =
          movementFilter === 'ALL' ||
          (movementFilter === 'STAGNANT' && summary?.turnoverStatus === 'STAGNANT') ||
          (movementFilter === 'RECENT_SALE' && summary?.turnoverStatus === 'RECENT_SALE') ||
          (movementFilter === 'AWAITING_SUPPLY' && summary?.turnoverStatus === 'AWAITING_SUPPLY');

        return matchesSearch && matchesCategory && matchesStock && matchesMovement;
      })
      .sort((a, b) => {
        if (sortField === 'lastSale') {
          const timeA = itemMovementsMap.get(a.id)?.lastSale?.timestamp || 0;
          const timeB = itemMovementsMap.get(b.id)?.lastSale?.timestamp || 0;
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }

        if (sortField === 'lastPurchase') {
          const timeA = itemMovementsMap.get(a.id)?.lastPurchase?.timestamp || 0;
          const timeB = itemMovementsMap.get(b.id)?.lastPurchase?.timestamp || 0;
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }

        let valA = a[sortField as keyof Item];
        let valB = b[sortField as keyof Item];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB, 'ar')
            : valB.localeCompare(valA, 'ar');
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
      });
  }, [
    items,
    searchQuery,
    selectedCategory,
    filterLowStockOnly,
    movementFilter,
    sortField,
    sortOrder,
    itemMovementsMap,
  ]);

  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'lastSale' || field === 'lastPurchase' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Store & Village Identity Banner */}
      <div className="bg-slate-900/95 border border-purple-500/30 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 flex-wrap shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-white">{settings.storeName || 'المتجر'}</span>
              {settings.address && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>القرية: {settings.address}</span>
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                حساب التاجر المحمي لإضافة الأصناف 🔐
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              يمكنك هنا إضافة وتعديل أصناف المتجر، تحديد الأسعار والباركود وتتبع حركات البضاعة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddItem}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة صنف جديد</span>
        </button>
      </div>

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-base shadow-inner">
            <Package className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{t.inventoryTitle}</h2>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300 mt-0.5">
              <span>
                {t.totalRegisteredItems}: <strong className="text-emerald-400 font-bold">{items.length}</strong> {t.itemUnit}
              </span>
              {!isPro ? (
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/50 cursor-pointer transition-colors shadow-sm"
                  title={language === 'ar' ? 'الباقة المجانية: الحد 75 صنفاً. اضغط للترقية' : 'Free Tier: 75 items limit. Click to upgrade'}
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>{items.length} / {FREE_ITEM_LIMIT} {language === 'ar' ? 'صنف (مجاني)' : 'Items (Free)'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-pointer hover:bg-amber-500/30 transition-colors"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>PRO 👑 {language === 'ar' ? 'أصناف غير محدودة' : 'Unlimited'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Camera Barcode Scanner Button */}
          <button
            id="btn-scan-barcode-camera-items"
            onClick={() => setShowCameraScanner(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl shadow-md shadow-emerald-950/60 transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
            title={t.scanBarcodeCamera}
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="text-white font-bold">{t.scanBarcodeCamera}</span>
          </button>

          {/* Add Item Button */}
          <button
            id="btn-add-item-primary"
            onClick={onOpenAddItem}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold px-4 py-2.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer text-xs sm:text-sm active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span className="text-white font-bold">{t.addNewItem}</span>
          </button>
        </div>
      </div>

      {/* Free Plan Limit Notice Banner */}
      {!isPro && items.length >= FREE_ITEM_LIMIT && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3 text-center sm:text-start">
            <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-300">
                {language === 'ar' ? 'بلغت الحد الأقصى للباقة المجانية (75 صنفاً)' : 'Free Tier Limit Reached (75 Items)'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'ar'
                  ? 'لإضافة أصناف جديدة، قم بتفعيل كود ترخيص نقدي (أوفلاين) أو الترقية إلى باقة المحترف الآن.'
                  : 'Upgrade to Pro or enter an offline license code to add unlimited items.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSubscriptionModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer active:scale-95 shrink-0"
          >
            {language === 'ar' ? 'فتح الباقة وإدخال الكود 👑' : 'Unlock Pro & Enter Key 👑'}
          </button>
        </div>
      )}

      {/* Business & Inventory Summary Cards (Income, Profit, Stock Capital, Remaining Low Stock) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Income / Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>{t.totalIncome}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-white font-mono tracking-tight">
              {(salesSummary?.totalSalesRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-sans text-emerald-400 font-bold">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{t.totalSalesRevenue}</span>
            </div>
          </div>
        </div>

        {/* Realized & Expected Profit */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>{t.netProfit}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-teal-300 font-mono tracking-tight">
              +{(salesSummary?.realizedProfit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-sans text-teal-400 font-bold">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {t.stockMargin}: <strong className="text-teal-300 font-mono">+{(expectedProfit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong> ({profitMarginPercent}%)
            </div>
          </div>
        </div>

        {/* Total Cost / Stock Capital */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>{t.stockCapital}</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-cyan-300 font-mono tracking-tight">
              {(inventoryStats?.totalCostValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-sans text-cyan-400 font-bold">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{t.totalStockUnits}:</span>
              <span className="font-bold text-slate-200 font-mono">{inventoryStats.totalStockUnits} {t.itemUnit}</span>
            </div>
          </div>
        </div>

        {/* Low Stock Items (نواقص المخزون) */}
        <div
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`border rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between cursor-pointer transition-all ${
            inventoryStats.lowStockCount > 0
              ? 'bg-amber-950/30 border-amber-500/50 hover:bg-amber-950/40'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
          title={t.showLowStock}
        >
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span className={inventoryStats.lowStockCount > 0 ? 'text-amber-200' : 'text-slate-300'}>
              {t.lowStockItems}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                inventoryStats.lowStockCount > 0
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div
                className={`text-lg sm:text-2xl font-black font-mono tracking-tight ${
                  inventoryStats.lowStockCount > 0 ? 'text-amber-300' : 'text-white'
                }`}
              >
                {inventoryStats.lowStockCount}{' '}
                <span className="text-xs font-sans text-slate-300">{t.itemUnit}</span>
              </div>
              <span className="text-[11px] text-amber-400 underline font-medium">
                {filterLowStockOnly ? t.clearFilter : t.showLowStock}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {inventoryStats.lowStockCount > 0
                ? t.needReorder
                : t.allStockSufficient}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        {/* Search input with Camera button */}
        <div className="relative flex-1 flex items-center">
          <Search className={`w-4 h-4 text-slate-300 absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-3`} />
          <input
            id="input-search-items"
            type="text"
            placeholder={t.searchItemsPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-slate-950 border border-slate-700 rounded-lg ${
              isRTL ? 'pr-10 pl-20' : 'pl-10 pr-20'
            } py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium`}
          />
          <div className={`absolute ${isRTL ? 'left-2' : 'right-2'} flex items-center gap-1`}>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                {t.clear}
              </button>
            )}
            <button
              type="button"
              id="btn-inline-camera-scan-items"
              onClick={() => setShowCameraScanner(true)}
              className="p-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer transition-colors"
              title={t.scanBarcodeCamera}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category, Movement filter & Low stock filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Movement Status Filter */}
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-teal-400 hidden sm:block" />
            <select
              id="select-movement-filter"
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2.5 text-xs sm:text-sm text-slate-100 font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">{t.filterAllMovements}</option>
              <option value="STAGNANT">⏳ {t.filterStagnant} ({movementCounts.stagnant})</option>
              <option value="RECENT_SALE">⚡ {t.filterRecentSales} ({movementCounts.recentSale})</option>
              <option value="AWAITING_SUPPLY">🚚 {t.filterAwaitingSupply} ({movementCounts.awaitingSupply})</option>
            </select>
          </div>

          <Filter className="w-4 h-4 text-slate-300 hidden sm:block" />
          <select
            id="select-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-100 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">{t.allCategories} ({items.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
              filterLowStockOnly
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.lowStockFilter}</span>
          </button>
        </div>
      </div>

      {/* Items Table with high-contrast text and comfortable colors */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse text-xs sm:text-sm`}>
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-700/80 text-slate-200 font-bold text-xs uppercase tracking-wider">
                <th className="p-3.5 text-center w-12 text-slate-300">#</th>
                <th
                  onClick={() => handleSort('barcode')}
                  className="p-3.5 cursor-pointer hover:text-emerald-300 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.tableBarcode}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="p-3.5 cursor-pointer hover:text-emerald-300 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.tableNameCategory}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="p-3.5 text-center cursor-pointer hover:text-emerald-300 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{t.tableStockQty}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                {/* Item Status & Movement Activity Tracking */}
                <th className="p-3.5 min-w-[210px] text-right">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-teal-300">
                      <Activity className="w-4 h-4" />
                      <span>{t.itemActivityTracking}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('lastSale')}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-0.5 ${
                          sortField === 'lastSale'
                            ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title={t.sortByLastSale}
                      >
                        <span>{t.lastSaleLabel}</span>
                        {sortField === 'lastSale' && <ArrowUpDown className="w-2.5 h-2.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSort('lastPurchase')}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-0.5 ${
                          sortField === 'lastPurchase'
                            ? 'bg-cyan-500/30 text-cyan-200 border-cyan-500'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title={t.sortByLastPurchase}
                      >
                        <span>{t.lastPurchaseLabel}</span>
                        {sortField === 'lastPurchase' && <ArrowUpDown className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('costPrice')}
                  className="p-3.5 text-center cursor-pointer hover:text-emerald-300 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{t.tableCostPrice}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('salePrice')}
                  className="p-3.5 text-center cursor-pointer hover:text-emerald-300 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{t.tableSalePrice}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </th>
                <th className="p-3.5 text-center">{t.tableTotalValue}</th>
                <th className="p-3.5 text-center w-28">{t.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-300" />
                    <p className="font-bold text-slate-200 text-sm">{t.noItemsMatch}</p>
                    <p className="text-xs mt-1 text-slate-400">{t.noItemsMatchSub}</p>
                    {items.length === 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                        <button
                          type="button"
                          id="btn-empty-add-item"
                          onClick={onOpenAddItem}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{language === 'ar' ? 'إضافة أول صنف للمخزون' : 'Add First Item'}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const qty = Number(item.quantity) || 0;
                  const cost = Number(item.costPrice) || 0;
                  const sale = Number(item.salePrice) || 0;
                  const isLowStock = qty <= (Number(item.minStockAlert) || 5);
                  const totalCostForQty = qty * cost;
                  const totalSaleForQty = qty * sale;
                  const summary = itemMovementsMap.get(item.id);
                  const lastSaleDate = summary?.lastSale
                    ? formatRelativeDateTime(summary.lastSale.date, language)
                    : null;
                  const lastPurchaseDate = summary?.lastPurchase
                    ? formatRelativeDateTime(summary.lastPurchase.date, language)
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors group hover:bg-slate-800/60 text-slate-100"
                    >
                      {/* Index */}
                      <td className="p-3.5 text-center text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Barcode */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <Barcode className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-mono font-bold text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                            {item.barcode}
                          </span>
                        </div>
                      </td>

                      {/* Item Name & Category with Product Image */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60'}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-700 shrink-0"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                            }}
                          />
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                              {item.name}
                            </div>
                            {item.category && (
                              <div className="text-xs text-slate-300 mt-0.5 font-medium">
                                {item.category} • {t.unitLabel}: {item.unit || (language === 'ar' ? 'حبة' : 'Piece')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-lg text-xs font-mono border ${
                            item.quantity === 0
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isLowStock
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                              : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
                          }`}
                        >
                          {item.quantity} {item.unit || (language === 'ar' ? 'حبة' : 'pc')}
                          {isLowStock && (
                            <span title={t.lowStockWarning} className="text-amber-300">
                              ⚠️
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Item Status & Movement Activity Tracking */}
                      <td className="p-3.5">
                        <div className="space-y-1.5 min-w-[210px]">
                          {/* Status Badge & History Button */}
                          <div className="flex items-center justify-between gap-1">
                            {summary?.turnoverStatus === 'OUT_OF_STOCK' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                                🚫 {t.outOfStock}
                              </span>
                            )}
                            {summary?.turnoverStatus === 'AWAITING_SUPPLY' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
                                🚚 {t.awaitingSupply} ({summary.pendingOrderQuantity})
                              </span>
                            )}
                            {summary?.turnoverStatus === 'RECENT_SALE' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                                ⚡ {t.fastMoving}
                              </span>
                            )}
                            {summary?.turnoverStatus === 'ACTIVE' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-300 bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded">
                                ✅ {t.activeMoving}
                              </span>
                            )}
                            {summary?.turnoverStatus === 'STAGNANT' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-300 bg-orange-950/80 border border-orange-800/80 px-2 py-0.5 rounded">
                                ⏳ {t.stagnantItem} ({summary.stagnantDays} {language === 'ar' ? 'يوم' : 'd'})
                              </span>
                            )}
                            {summary?.turnoverStatus === 'NEW_ITEM' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded">
                                ✨ {t.newItem}
                              </span>
                            )}

                            {/* Quick Details Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => setSelectedItemForTracking(item)}
                              className="text-[10px] text-teal-400 hover:text-teal-200 bg-teal-950/50 hover:bg-teal-900 border border-teal-700/60 rounded px-1.5 py-0.5 flex items-center gap-1 transition-colors cursor-pointer font-bold shrink-0"
                              title={t.viewMovementHistory}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{language === 'ar' ? 'السجل' : 'Log'}</span>
                            </button>
                          </div>

                          {/* Last Movement Dates Card */}
                          <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-2 space-y-1 text-[11px]">
                            {/* Last Sale */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 flex items-center gap-1 text-[10px] shrink-0">
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                                <span>{t.lastSaleLabel}:</span>
                              </span>
                              {summary?.lastSale ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedItemForTracking(item)}
                                  className="font-mono text-emerald-300 font-bold hover:underline cursor-pointer text-left truncate max-w-[130px]"
                                  title={`${isRTL ? 'فاتورة:' : 'Invoice:'} ${summary.lastSale.invoiceNumber} • ${isRTL ? 'الكمية:' : 'Qty:'} ${summary.lastSale.quantity} • ${lastSaleDate?.full}`}
                                >
                                  {lastSaleDate?.relative}
                                </button>
                              ) : (
                                <span className="text-slate-500 text-[10px] italic">
                                  {t.noSalesYet}
                                </span>
                              )}
                            </div>

                            {/* Last Purchase */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 flex items-center gap-1 text-[10px] shrink-0">
                                <Truck className="w-3 h-3 text-cyan-400" />
                                <span>{t.lastPurchaseLabel}:</span>
                              </span>
                              {summary?.lastPurchase ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedItemForTracking(item)}
                                  className="font-mono text-cyan-300 font-bold hover:underline cursor-pointer text-left truncate max-w-[130px]"
                                  title={`${summary.lastPurchase.supplierName} • ${lastPurchaseDate?.full}`}
                                >
                                  {summary.lastPurchase.isInitialStock
                                    ? (language === 'ar' ? 'رصيد افتتاحي' : 'Initial Stock')
                                    : lastPurchaseDate?.relative}
                                </button>
                              ) : (
                                <span className="text-slate-500 text-[10px] italic">
                                  {t.noPurchasesYet}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="p-3.5 text-center font-mono font-medium text-slate-200">
                        {item.costPrice.toFixed(2)}{' '}
                        <span className="text-[11px] text-slate-400">{settings.currency}</span>
                      </td>

                      {/* Sale Price */}
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-400 text-sm">
                        {item.salePrice.toFixed(2)}{' '}
                        <span className="text-[11px] text-emerald-300">{settings.currency}</span>
                      </td>

                      {/* Total Value of Quantity (إجمالي سعر الكمية) */}
                      <td className="p-3.5 text-center">
                        <div className="font-mono font-black text-white text-sm">
                          {totalSaleForQty.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                          <span className="text-xs text-slate-300 font-sans">{settings.currency}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                          {t.costPrefix} {totalCostForQty.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Item Movement History Tracking Button */}
                          <button
                            id={`btn-track-item-${item.id}`}
                            onClick={() => setSelectedItemForTracking(item)}
                            title={t.viewMovementHistory}
                            className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 transition-colors cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Print Sticker Button */}
                          <button
                            id={`btn-print-sticker-${item.id}`}
                            onClick={() => onPrintStickersForItem(item.id)}
                            title={t.printBarcodeSticker}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors cursor-pointer"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            id={`btn-edit-item-${item.id}`}
                            onClick={() => onEditItem(item)}
                            title={t.editItem}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            id={`btn-delete-item-${item.id}`}
                            onClick={() => setItemToDelete(item)}
                            title={t.deleteItem}
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 font-medium">
          <span>
            {t.showing} <strong className="text-white font-bold">{filteredItems.length}</strong> {t.ofTotal}{' '}
            <strong className="text-white font-bold">{items.length}</strong> {t.itemUnit}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{t.autoStockRecalculated}</span>
          </span>
        </div>
      </div>

      {/* Item Movement & Activity Tracking Modal */}
      {selectedItemForTracking && (
        <ItemMovementModal
          isOpen={Boolean(selectedItemForTracking)}
          onClose={() => setSelectedItemForTracking(null)}
          item={selectedItemForTracking}
          summary={itemMovementsMap.get(selectedItemForTracking.id) || null}
          transactions={transactions}
          settings={settings}
          language={language}
          onQuickOrder={onOpenOrderGoods ? (it) => onOpenOrderGoods(it.id, 'CASH') : undefined}
        />
      )}

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <BarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          items={items}
          currency={settings.currency}
          mode="LOOKUP"
          title={t.scanBarcodeCamera}
          onItemScanned={(item, rawBarcode) => {
            setSearchQuery(item ? item.barcode : rawBarcode);
          }}
        />
      )}

      {/* Confirmation Modal for Safe Item Deletion */}
      {itemToDelete && (
        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={() => {
            deleteItem(itemToDelete.id);
            setItemToDelete(null);
          }}
          title={language === 'ar' ? 'تأكيد حذف الصنف من المخزون' : 'Confirm Delete Item'}
          message={
            language === 'ar'
              ? `هل أنت متأكد من رغبتك في حذف الصنف (${itemToDelete.name}) نهائياً من قاعدة البيانات؟ سيتم إزالة كافة أسعاره وبياناته من القوائم.`
              : `Are you sure you want to permanently delete (${itemToDelete.name}) from inventory database?`
          }
          confirmText={language === 'ar' ? 'نعم، حذف الصنف نهائياً' : 'Yes, Delete Item'}
          cancelText={language === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
          type="danger"
          itemDetails={[
            {
              label: language === 'ar' ? 'اسم الصنف' : 'Item Name',
              value: itemToDelete.name,
              isHighlight: true,
            },
            {
              label: language === 'ar' ? 'الباركود' : 'Barcode',
              value: itemToDelete.barcode,
              isMono: true,
            },
            {
              label: language === 'ar' ? 'الرصيد الحالي' : 'Current Stock',
              value: `${itemToDelete.quantity} ${itemToDelete.unit || (language === 'ar' ? 'حبة' : 'pc')}`,
              isMono: true,
              isHighlight: itemToDelete.quantity <= (itemToDelete.minStockAlert || 5),
            },
            {
              label: language === 'ar' ? 'سعر البيع' : 'Sale Price',
              value: `${itemToDelete.salePrice.toFixed(2)} ${settings.currency}`,
              isMono: true,
            },
            {
              label: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
              value: `${itemToDelete.costPrice.toFixed(2)} ${settings.currency}`,
              isMono: true,
            },
            {
              label: language === 'ar' ? 'التصنيف' : 'Category',
              value: itemToDelete.category || (language === 'ar' ? 'عام' : 'General'),
            },
          ]}
        />
      )}
    </div>
  );
};
