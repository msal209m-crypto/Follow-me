import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Package,
  AlertTriangle,
  CreditCard,
  BarChart3,
  FileText,
  Plus,
  Truck,
  Barcode,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  X,
  Printer,
  Search,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Clock,
  Layers,
  ArrowUpRight,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NavigationTab, Transaction, Item } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { DashboardLowStockAlert } from './DashboardLowStockAlert';

interface DashboardViewProps {
  onOpenAddItem: () => void;
  onOpenOrderGoods: (itemId?: string, type?: 'CASH' | 'CREDIT') => void;
  onPrintReceipt: (tx: Transaction) => void;
  onNavigate: (tab: NavigationTab) => void;
}

type TileDetailKey =
  | null
  | 'today_sales'
  | 'cash_liquidity'
  | 'inventory_capital'
  | 'low_stock'
  | 'debts_summary'
  | 'charts_analytics'
  | 'today_invoices';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddItem,
  onOpenOrderGoods,
  onPrintReceipt,
  onNavigate,
}) => {
  const {
    items,
    transactions,
    debts,
    deleteTransaction,
    settings,
    inventoryStats,
    financialSummary,
    currentCashier,
    cloudSyncStatus,
    syncToCloudNow,
    language,
    t,
    isRTL,
  } = useApp();

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Active detail modal for deep-diving into any tile
  const [activeModal, setActiveModal] = useState<TileDetailKey>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);

  // Search filter for invoices or low-stock modals
  const [modalSearch, setModalSearch] = useState('');

  // 1. Current Date & Today's Transactions
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.timestamp && tx.timestamp.startsWith(todayStr)
    );
  }, [transactions, todayStr]);

  const todaySalesTransactions = useMemo(() => {
    return todayTransactions.filter(
      (tx) => tx.type === 'SALE' || tx.type === 'CREDIT_SALE'
    );
  }, [todayTransactions]);

  const todaySalesTotal = useMemo(() => {
    return todaySalesTransactions.reduce((acc, tx) => acc + (tx.totalAmount || 0), 0);
  }, [todaySalesTransactions]);

  const todayProfit = useMemo(() => {
    return todaySalesTransactions.reduce((acc, tx) => {
      let profitForTx = 0;
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((it) => {
          const sale = (it.unitPrice || 0) * (it.quantity || 1);
          const cost = (it.costPrice || 0) * (it.quantity || 1);
          profitForTx += sale - cost;
        });
        if (tx.discount) profitForTx -= tx.discount;
      }
      return acc + profitForTx;
    }, 0);
  }, [todaySalesTransactions]);

  // 2. Debts Breakdown
  const debtsSummary = useMemo(() => {
    let customerDebt = 0;
    let supplierDebt = 0;
    let personalLoan = 0;
    let activeDebtorsCount = 0;

    debts.forEach((d) => {
      if (d.remainingDebt > 0) {
        activeDebtorsCount++;
        if (d.type === 'CUSTOMER') customerDebt += d.remainingDebt;
        else if (d.type === 'SUPPLIER') supplierDebt += d.remainingDebt;
        else if (d.type === 'PERSONAL_LOAN') personalLoan += d.remainingDebt;
      }
    });

    return {
      totalDebt: customerDebt + supplierDebt + personalLoan,
      customerDebt,
      supplierDebt,
      personalLoan,
      activeDebtorsCount,
    };
  }, [debts]);

  // 3. 7-Days Sales Trend
  const salesTrendData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'short',
      });

      const daySales = transactions.filter(
        (tx) =>
          (tx.type === 'SALE' || tx.type === 'CREDIT_SALE') &&
          tx.timestamp &&
          tx.timestamp.startsWith(dateStr)
      );

      const dayTotal = daySales.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
      const count = daySales.length;

      result.push({
        dateStr,
        dayName,
        total: Math.round(dayTotal),
        count,
      });
    }
    return result;
  }, [transactions, language]);

  // 4. Payment Methods Distribution for Today
  const paymentDistributionData = useMemo(() => {
    let cash = 0;
    let card = 0;
    let transfer = 0;

    todayTransactions.forEach((tx) => {
      const amt = tx.paidAmount !== undefined ? tx.paidAmount : tx.totalAmount;
      if (tx.paymentMethod === 'CASH') cash += amt;
      else if (tx.paymentMethod === 'CARD') card += amt;
      else if (tx.paymentMethod === 'TRANSFER') transfer += amt;
    });

    const data = [];
    if (cash > 0) {
      data.push({
        name: language === 'ar' ? 'نقدي (كاش)' : 'Cash',
        value: Number(cash.toFixed(2)),
        color: '#10b981',
      });
    }
    if (card > 0) {
      data.push({
        name: language === 'ar' ? 'شبكة / بطاقة' : 'Card POS',
        value: Number(card.toFixed(2)),
        color: '#06b6d4',
      });
    }
    if (transfer > 0) {
      data.push({
        name: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        value: Number(transfer.toFixed(2)),
        color: '#8b5cf6',
      });
    }

    return data;
  }, [todayTransactions, language]);

  // 5. Critical Stock Items
  const criticalItems = useMemo(() => {
    return items
      .filter((item) => item.quantity <= (item.minStockAlert || 5))
      .sort((a, b) => a.quantity - b.quantity);
  }, [items]);

  // Filtered in modal
  const filteredCriticalItems = useMemo(() => {
    if (!modalSearch.trim()) return criticalItems;
    const q = modalSearch.toLowerCase().trim();
    return criticalItems.filter(
      (it) =>
        (it.name && it.name.toLowerCase().includes(q)) ||
        (it.barcode && String(it.barcode).toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q))
    );
  }, [criticalItems, modalSearch]);

  // Filtered recent transactions in modal
  const filteredTodaySalesTransactions = useMemo(() => {
    if (!modalSearch.trim()) return todaySalesTransactions;
    const q = modalSearch.toLowerCase().trim();
    return todaySalesTransactions.filter(
      (tx) =>
        (tx.invoiceNumber && tx.invoiceNumber.toLowerCase().includes(q)) ||
        (tx.partyName && tx.partyName.toLowerCase().includes(q)) ||
        (tx.items && tx.items.some((i) => i.name.toLowerCase().includes(q)))
    );
  }, [todaySalesTransactions, modalSearch]);

  // Today Date Formatted
  const formattedTodayDate = useMemo(() => {
    return new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [language]);

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-4">
      {/* 1. TOP SLEEK APP CONSOLE HEADER (VERY COMPACT) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                {t.dashboardTitle || 'لوحة التحكم السريعة'}
              </h1>
              <span className="text-[10px] font-bold bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{language === 'ar' ? 'نظام حي' : 'Live OS'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {language === 'ar'
                ? 'اضغط على أي مربع للدخول السريع وعرض التفاصيل الفورية'
                : 'Click any tile to open instant details and actions'}
            </p>
          </div>
        </div>

        {/* Right Info: Date, Cashier & Sync */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300">{formattedTodayDate}</span>
            <span className="text-slate-600">•</span>
            <span>{currentCashier.name}</span>
          </div>

          <button
            onClick={syncToCloudNow}
            title={language === 'ar' ? 'مزامنة البيانات فوراً' : 'Sync Now'}
            className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 px-2.5 py-1 rounded-xl transition-colors cursor-pointer text-xs font-bold"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                cloudSyncStatus === 'syncing' ? 'animate-spin text-amber-400' : 'text-emerald-400'
              }`}
            />
            <span className="hidden xs:inline">
              {cloudSyncStatus === 'syncing'
                ? language === 'ar' ? 'جاري المزامنة' : 'Syncing...'
                : language === 'ar' ? 'مزامنة' : 'Sync'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. CRITICAL LOW STOCK ALERT & QUICK REORDER SECTION */}
      <DashboardLowStockAlert
        onOpenOrderGoods={onOpenOrderGoods}
        onNavigateToItems={() => onNavigate('items')}
      />

      {/* 3. THE COMPACT INTERACTIVE TILES & ICONS GRID (NO LONG SCROLL!) */}
      {/* Organized into 3 logical rows of responsive cards that fit cleanly on screen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* TILE 1: POS - POINT OF SALE (Hero Launch) */}
        <button
          type="button"
          onClick={() => onNavigate('transactions')}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm hover:shadow-emerald-500/10 min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <span>{language === 'ar' ? 'دخول فوري' : 'Open POS'}</span>
              <ArrowIcon className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
              {t.newSaleInvoice || 'نقطة البيع (POS)'}
            </div>
            <div className="text-[11px] font-mono text-emerald-400 font-extrabold mt-0.5">
              {todaySalesTransactions.length} {language === 'ar' ? 'فواتير اليوم' : 'sales today'}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              {language === 'ar' ? 'باركود وسلة وفاتورة فورية' : 'Barcode, cart & instant checkout'}
            </div>
          </div>
        </button>

        {/* TILE 2: TODAY'S SALES & PROFIT (Click to open details modal) */}
        <button
          type="button"
          onClick={() => {
            setModalSearch('');
            setActiveModal('today_sales');
          }}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {t.todaySales || 'مبيعات اليوم'}
            </div>
            <div className="text-sm sm:text-base font-black text-white font-mono tracking-tight mt-0.5">
              {todaySalesTotal.toLocaleString('en-US', { minimumFractionDigits: 1 })}{' '}
              <span className="text-[10px] text-emerald-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[10px] text-emerald-400/90 font-mono font-medium">
              +{todayProfit.toLocaleString('en-US', { minimumFractionDigits: 0 })} {settings.currency} {language === 'ar' ? 'ربح' : 'profit'}
            </div>
          </div>
        </button>

        {/* TILE 3: CASH REGISTER & LIQUIDITY (Click to open details modal) */}
        <button
          type="button"
          onClick={() => {
            setModalSearch('');
            setActiveModal('cash_liquidity');
          }}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {t.cashRegisterBalance || 'الخزينة والسيولة'}
            </div>
            <div className="text-sm sm:text-base font-black text-cyan-300 font-mono tracking-tight mt-0.5">
              {financialSummary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 1 })}{' '}
              <span className="text-[10px] text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              بنك: {financialSummary.bankTransferBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })} • شبكة: {financialSummary.cardBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
          </div>
        </button>

        {/* TILE 4: CRITICAL LOW STOCK (Click to open reorder modal) */}
        <button
          type="button"
          onClick={() => {
            setModalSearch('');
            setActiveModal('low_stock');
          }}
          className={`group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl border hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px] ${
            inventoryStats.lowStockCount > 0
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/50 hover:border-amber-400'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
              inventoryStats.lowStockCount > 0
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            {inventoryStats.lowStockCount > 0 ? (
              <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                {inventoryStats.lowStockCount} {language === 'ar' ? 'نواقص!' : 'low!'}
              </span>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {t.lowStockAlerts || 'نواقص المخزون'}
            </div>
            <div className={`text-sm sm:text-base font-black font-mono tracking-tight mt-0.5 ${
              inventoryStats.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {inventoryStats.lowStockCount > 0
                ? `${inventoryStats.lowStockCount} ${language === 'ar' ? 'أصناف بحاجة توريد' : 'items'}`
                : language === 'ar' ? 'المخزون ممتاز' : 'All Stock Good'}
            </div>
            <div className="text-[10px] text-slate-400">
              {inventoryStats.lowStockCount > 0
                ? language === 'ar' ? 'اضغط للتوريد المباشر' : 'Click to reorder'
                : language === 'ar' ? 'لا توجد أصناف تحت حد الأمان' : 'No critical shortages'}
            </div>
          </div>
        </button>

        {/* TILE 5: INVENTORY CAPITAL (Click to open inventory summary modal) */}
        <button
          type="button"
          onClick={() => {
            setModalSearch('');
            setActiveModal('inventory_capital');
          }}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {t.inventoryValueCost || 'رأس مال المخزون'}
            </div>
            <div className="text-sm sm:text-base font-black text-white font-mono tracking-tight mt-0.5">
              {inventoryStats.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}{' '}
              <span className="text-[10px] text-teal-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {inventoryStats.totalItemsCount} {language === 'ar' ? 'صنف' : 'items'} • {inventoryStats.totalStockUnits} {language === 'ar' ? 'وحدة متوفرة' : 'units'}
            </div>
          </div>
        </button>

        {/* TILE 6: OUTSTANDING DEBTS (Click to open debts modal) */}
        <button
          type="button"
          onClick={() => {
            setModalSearch('');
            setActiveModal('debts_summary');
          }}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {t.totalDebtsDue || 'سجل الديون'}
            </div>
            <div className="text-sm sm:text-base font-black text-rose-400 font-mono tracking-tight mt-0.5">
              {debtsSummary.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 1 })}{' '}
              <span className="text-[10px] text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              لنا: <span className="text-emerald-400 font-bold">{debtsSummary.customerDebt.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span> • علينا: <span className="text-rose-400 font-bold">{debtsSummary.supplierDebt.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            </div>
          </div>
        </button>

        {/* TILE 7: TODAY'S INVOICES LOG (Click to open invoices drawer) */}
        <button
          type="button"
          onClick={() => {
            setModalSearch('');
            setActiveModal('today_invoices');
          }}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full">
              {todaySalesTransactions.length} {language === 'ar' ? 'فاتورة' : 'invoices'}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {language === 'ar' ? 'فواتير اليوم وحركاتها' : "Today's Invoices"}
            </div>
            <div className="text-sm font-black text-white font-mono tracking-tight mt-0.5">
              {todaySalesTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}{' '}
              <span className="text-[10px] text-indigo-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'اضغط لعرض الفواتير وطباعتها' : 'View, search & reprint receipts'}
            </div>
          </div>
        </button>

        {/* TILE 8: CHARTS & ANALYTICS (Click to open 7-days area & pie charts) */}
        <button
          type="button"
          onClick={() => setActiveModal('charts_analytics')}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition-colors" />
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-300">
              {language === 'ar' ? 'الرسوم البيانية والتحليلات' : 'Charts & Analytics'}
            </div>
            <div className="text-sm font-black text-violet-300 font-mono tracking-tight mt-0.5">
              {salesTrendData.reduce((acc, d) => acc + d.total, 0).toLocaleString()}{' '}
              <span className="text-[10px] text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'منحنى 7 أيام وتوزيع طرق الدفع' : '7-day trend & payment split'}
            </div>
          </div>
        </button>

        {/* TILE 9: ADD NEW ITEM (Direct Action) */}
        <button
          type="button"
          onClick={onOpenAddItem}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-400/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold bg-slate-950 text-teal-300 border border-slate-800 px-2 py-0.5 rounded-full">
              {language === 'ar' ? 'صنف جديد' : 'New'}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
              {t.addNewItem || 'إضافة صنف جديد'}
            </div>
            <div className="text-[11px] text-teal-400 font-bold mt-0.5">
              +{language === 'ar' ? 'إدخال سريع للمخزن' : 'Quick inventory insert'}
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'باركود، أسعار الشراء والبيع' : 'Barcode, pricing & units'}
            </div>
          </div>
        </button>

        {/* TILE 10: REORDER GOODS / INWARD (Direct Action) */}
        <button
          type="button"
          onClick={() => onOpenOrderGoods(undefined, 'CASH')}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold bg-slate-950 text-amber-300 border border-slate-800 px-2 py-0.5 rounded-full">
              {language === 'ar' ? 'فاتورة شراء' : 'Inward'}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
              {t.reorderGoods || 'توريد واستلام بضاعة'}
            </div>
            <div className="text-[11px] text-amber-400 font-bold mt-0.5">
              {language === 'ar' ? 'شراء نقدي أو آجل' : 'Cash or credit purchase'}
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'زيادة أرصدة الرفوف والموردين' : 'Restock shelves & suppliers'}
            </div>
          </div>
        </button>

        {/* TILE 11: BARCODE STICKERS (Direct Tab Jump) */}
        <button
          type="button"
          onClick={() => onNavigate('stickers')}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
              <Barcode className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold bg-slate-950 text-cyan-300 border border-slate-800 px-2 py-0.5 rounded-full">
              {language === 'ar' ? 'طباعة ملصقات' : 'Labels'}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
              {t.navStickers || 'استيكرات الباركود'}
            </div>
            <div className="text-[11px] text-cyan-400 font-bold mt-0.5">
              {language === 'ar' ? 'توليد وطباعة الملصقات' : 'Print shelf & product tags'}
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'مقاسات قياسية ومباشرة' : 'A4, 38x25mm & custom sizes'}
            </div>
          </div>
        </button>

        {/* TILE 12: DAILY REPORTS & SHIFT CLOSING (Direct Tab Jump) */}
        <button
          type="button"
          onClick={() => onNavigate('daily_reports')}
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-400/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-right cursor-pointer shadow-sm min-h-[110px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-slate-950 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold bg-slate-950 text-indigo-300 border border-slate-800 px-2 py-0.5 rounded-full">
              {language === 'ar' ? 'إقفال الوردية' : 'Z-Report'}
            </span>
          </div>

          <div className="mt-2">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
              {t.navDailyReports || 'التقارير والإقفال اليومي'}
            </div>
            <div className="text-[11px] text-indigo-400 font-bold mt-0.5">
              {language === 'ar' ? 'كشوف الأرباح والحسابات' : 'Daily closing & ledger'}
            </div>
            <div className="text-[10px] text-slate-400">
              {language === 'ar' ? 'تصفية الصندوق والمبيعات' : 'Cash drawer reconciliation'}
            </div>
          </div>
        </button>
      </div>

      {/* 3. MODAL / SLIDE OVER POPUP FOR ANY TILE CLICKED */}
      {/* This allows viewing full details, charts, invoices, and reorder tables without leaving the dashboard or suffering from long vertical scrolling! */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                {activeModal === 'today_sales' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {t.todaySales || 'تفاصيل مبيعات اليوم وأرباحها'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {todaySalesTransactions.length} {language === 'ar' ? 'فاتورة بيع مسجلة لليوم' : 'sales transactions'}
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'cash_liquidity' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {t.cashRegisterBalance || 'تفاصيل الخزينة ومصادر السيولة'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar' ? 'رصيد النقدية والبنك والشبكة المسجل' : 'Cash in register, bank & POS'}
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'inventory_capital' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {t.inventoryValueCost || 'موجز رأس مال المخزون'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {inventoryStats.totalItemsCount} {language === 'ar' ? 'صنف مسجل بالنظام' : 'total items catalog'}
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'low_stock' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {t.lowStockAlerts || 'قائمة النواقص والطلب السريع'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {criticalItems.length} {language === 'ar' ? 'أصناف بلغت الحد الحرج' : 'shortage alerts'}
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'debts_summary' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {t.totalDebtsDue || 'كشف الديون والمستحقات'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {debtsSummary.activeDebtorsCount} {language === 'ar' ? 'سجل آجل نشط' : 'active credit records'}
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'today_invoices' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {language === 'ar' ? 'فواتير وحركات اليوم' : "Today's Invoices"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {todayTransactions.length} {language === 'ar' ? 'عملية مسجلة' : 'transactions today'}
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'charts_analytics' && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {language === 'ar' ? 'الرسوم البيانية وتحليلات الأداء' : 'Analytics & Sales Charts'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ar' ? 'منحنى آخر 7 أيام وتوزيع طرق الدفع' : '7-days performance curve & payment methods'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body with Scrollable Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* 1. TODAY SALES CONTENT */}
              {activeModal === 'today_sales' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-bold">{t.todaySales || 'إجمالي مبيعات اليوم'}</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {todaySalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-emerald-400">{settings.currency}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-bold">{language === 'ar' ? 'صافي الربح التقديري' : 'Estimated Net Profit'}</div>
                      <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                        +{todayProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-emerald-300">{settings.currency}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-bold">{language === 'ar' ? 'متوسط الفاتورة' : 'Average Ticket'}</div>
                      <div className="text-xl font-black text-cyan-300 font-mono mt-1">
                        {todaySalesTransactions.length > 0
                          ? (todaySalesTotal / todaySalesTransactions.length).toLocaleString('en-US', { minimumFractionDigits: 1 })
                          : '0.0'}{' '}
                        <span className="text-xs text-slate-400">{settings.currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* 7-Days Chart */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'ar' ? 'منحنى مبيعات آخر 7 أيام' : 'Sales Trend (Last 7 Days)'}</span>
                    </h4>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTrendData}>
                          <defs>
                            <linearGradient id="salesModalGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="dayName" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs">
                                    <p className="font-bold text-white">{data.dayName} ({data.dateStr})</p>
                                    <p className="text-emerald-400 font-mono font-bold">{data.total.toLocaleString()} {settings.currency}</p>
                                    <p className="text-slate-400">{data.count} عمليات</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#salesModalGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onNavigate('transactions');
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'فتح شاشة الكاشير وبيع جديد' : 'Open POS Checkout'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. CASH LIQUIDITY CONTENT */}
              {activeModal === 'cash_liquidity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30">
                      <div className="text-[11px] text-cyan-400 font-bold">{language === 'ar' ? 'الدرج النقدي (كاش)' : 'Cash in Register'}</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {financialSummary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-cyan-400">{settings.currency}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/30">
                      <div className="text-[11px] text-purple-400 font-bold">{language === 'ar' ? 'التحويلات البنكية' : 'Bank Transfers'}</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {financialSummary.bankTransferBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-purple-400">{settings.currency}</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                      <div className="text-[11px] text-emerald-400 font-bold">{language === 'ar' ? 'مدفوعات الشبكة (POS)' : 'Card POS Machine'}</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {financialSummary.cardBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-emerald-400">{settings.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">{language === 'ar' ? 'إجمالي السيولة المتاحة' : 'Total Available Liquidity'}:</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {(
                          financialSummary.cashBalance +
                          financialSummary.bankTransferBalance +
                          financialSummary.cardBalance
                        ).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        {settings.currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">{language === 'ar' ? 'المسؤول الحالي عن الصندوق' : 'Active Register Officer'}:</span>
                      <span className="font-bold text-slate-200">{currentCashier.name}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onNavigate('accounts');
                      }}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>{t.navAccounts || 'الانتقال لجدول الحسابات والأرصدة'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. INVENTORY CAPITAL CONTENT */}
              {activeModal === 'inventory_capital' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-teal-500/30">
                      <div className="text-[11px] text-teal-400 font-bold">{t.inventoryValueCost || 'رأس مال المخزون (سعر الشراء)'}</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {inventoryStats.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-teal-400">{settings.currency}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {language === 'ar' ? 'التكلفة الإجمالية للبضاعة الحالية' : 'Total purchase valuation'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                      <div className="text-[11px] text-emerald-400 font-bold">{t.inventoryValueSale || 'القيمة البيعية المتوقعة'}</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {inventoryStats.totalSaleValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-emerald-400">{settings.currency}</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                        ربح متوقع: +{(inventoryStats.totalSaleValue - inventoryStats.totalCostValue).toLocaleString('en-US', { minimumFractionDigits: 0 })} {settings.currency}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400">{language === 'ar' ? 'إجمالي الأصناف المسجلة' : 'Catalog Items'}: </span>
                      <strong className="text-white">{inventoryStats.totalItemsCount} صنف</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">{language === 'ar' ? 'إجمالي القطع بالرفوف' : 'Total In-Stock Units'}: </span>
                      <strong className="text-white">{inventoryStats.totalStockUnits} قطعة</strong>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onNavigate('items');
                      }}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{t.viewAllItems || 'عرض وإدارة كافة الأصناف'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. LOW STOCK CONTENT */}
              {activeModal === 'low_stock' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3" />
                      <input
                        type="text"
                        placeholder={language === 'ar' ? 'بحث عن صنف...' : 'Search item...'}
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-xs text-amber-400 font-bold whitespace-nowrap">
                      {filteredCriticalItems.length} {language === 'ar' ? 'صنف' : 'items'}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {filteredCriticalItems.length > 0 ? (
                      filteredCriticalItems.map((item) => {
                        const isOutOfStock = item.quantity <= 0;
                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                              isOutOfStock
                                ? 'bg-rose-950/20 border-rose-800/40'
                                : 'bg-amber-950/20 border-amber-800/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white truncate max-w-[180px]">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-900">
                                  {item.category || 'عام'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>الباركود: {item.barcode}</span>
                                <span>•</span>
                                <span>حد التنبيه: {item.minStockAlert || 5}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="text-right">
                                <div
                                  className={`text-xs font-black font-mono ${
                                    isOutOfStock ? 'text-rose-400' : 'text-amber-400'
                                  }`}
                                >
                                  {item.quantity} {item.unit || 'حبة'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {isOutOfStock ? 'منتهي تماماً' : 'قارب على النفاد'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveModal(null);
                                  onOpenOrderGoods(item.id, 'CASH');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Truck className="w-3 h-3" />
                                <span>توريد</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-xs text-slate-300 font-bold">
                          {language === 'ar' ? 'لا توجد نواقص مطابقة' : 'No low stock items found'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. DEBTS SUMMARY CONTENT */}
              {activeModal === 'debts_summary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                      <div className="text-[11px] text-emerald-400 font-bold">{language === 'ar' ? 'ديون العملاء (مستحقات لنا)' : 'Customer Debts (Receivables)'}</div>
                      <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                        {debtsSummary.customerDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-slate-300">{settings.currency}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {language === 'ar' ? 'أموال مستحقة لدى الزبائن بالآجل' : 'Money owed to us by clients'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30">
                      <div className="text-[11px] text-rose-400 font-bold">{language === 'ar' ? 'ديون الموردين (التزامات علينا)' : 'Supplier Debts (Payables)'}</div>
                      <div className="text-xl font-black text-rose-400 font-mono mt-1">
                        {debtsSummary.supplierDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-slate-300">{settings.currency}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {language === 'ar' ? 'مستحقات الشركات وموردي البضاعة' : 'Money owed by us to suppliers'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onNavigate('debts');
                      }}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{t.manageDebts || 'الانتقال لدفتر الديون والسداد'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. TODAY INVOICES CONTENT */}
              {activeModal === 'today_invoices' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3" />
                      <input
                        type="text"
                        placeholder={language === 'ar' ? 'بحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice # or party...'}
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <span className="text-xs text-indigo-400 font-bold whitespace-nowrap">
                      {filteredTodaySalesTransactions.length} {language === 'ar' ? 'فاتورة' : 'invoices'}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {filteredTodaySalesTransactions.length > 0 ? (
                      filteredTodaySalesTransactions.map((tx) => {
                        const txTime = new Date(tx.timestamp).toLocaleTimeString(
                          language === 'ar' ? 'ar-SA' : 'en-US',
                          { hour: '2-digit', minute: '2-digit' }
                        );
                        return (
                          <div
                            key={tx.id}
                            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">
                                  #{tx.invoiceNumber}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {tx.partyName || 'عميل نقدي'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{txTime}</span>
                                <span>•</span>
                                <span>{tx.items?.length || 0} صنف</span>
                                <span>•</span>
                                <span className="text-emerald-400">
                                  {tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'CARD' ? 'شبكة' : 'تحويل'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right font-mono font-bold text-xs text-white">
                                {tx.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                                <span className="text-[9px] text-slate-400">{settings.currency}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPrintReceipt(tx)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                                title="طباعة الإيصال"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                id={`btn-dash-delete-tx-${tx.id}`}
                                onClick={() => {
                                  setTxToDelete(tx);
                                  setRestoreStockOnDelete(true);
                                }}
                                className="p-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-800/40 transition-colors cursor-pointer"
                                title="حذف الحركة المالية"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-500">
                        {language === 'ar' ? 'لا توجد فواتير مسجلة اليوم حتى الآن' : 'No invoices recorded today'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 7. CHARTS & ANALYTICS CONTENT */}
              {activeModal === 'charts_analytics' && (
                <div className="space-y-4">
                  {/* Sales Curve */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                      <span>{language === 'ar' ? 'منحنى نمو المبيعات اليومية (آخر 7 أيام)' : '7-Day Revenue Curve'}</span>
                    </h4>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTrendData}>
                          <defs>
                            <linearGradient id="salesModalArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="dayName" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs">
                                    <p className="font-bold text-white">{data.dayName}</p>
                                    <p className="text-violet-400 font-mono font-bold">{data.total.toLocaleString()} {settings.currency}</p>
                                    <p className="text-slate-400">{data.count} فواتير</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} fill="url(#salesModalArea)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Payment Distribution */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'ar' ? 'توزيع طرق الدفع لليوم' : 'Today Payment Split'}</span>
                    </h4>

                    {paymentDistributionData.length > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="w-full sm:w-1/2 h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={paymentDistributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={55}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {paymentDistributionData.map((entry, index) => (
                                  <Cell key={`cell-mod-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: any) => [
                                  `${Number(value).toLocaleString()} ${settings.currency}`,
                                  '',
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="w-full sm:w-1/2 space-y-2">
                          {paymentDistributionData.map((p) => (
                            <div key={p.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800">
                              <span className="text-slate-300 font-medium">{p.name}</span>
                              <span className="font-mono font-bold text-white">{p.value.toLocaleString()} {settings.currency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-4">
                        {language === 'ar' ? 'لا توجد حركات بيع مسجلة لليوم حتى الآن' : 'No sales recorded today'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Safe Transaction Deletion from Dashboard */}
      {txToDelete && (
        <ConfirmationModal
          isOpen={!!txToDelete}
          onClose={() => setTxToDelete(null)}
          onConfirm={() => {
            deleteTransaction(txToDelete.id, restoreStockOnDelete);
            setTxToDelete(null);
          }}
          title={language === 'ar' ? 'تأكيد حذف الحركة المالية / الفاتورة' : 'Confirm Delete Transaction'}
          message={
            language === 'ar'
              ? `هل أنت متأكد من رغبتك في حذف الفاتورة رقم #${txToDelete.invoiceNumber} بقيمة (${txToDelete.totalAmount.toFixed(2)} ${settings.currency})؟`
              : `Are you sure you want to delete invoice #${txToDelete.invoiceNumber}?`
          }
          confirmText={language === 'ar' ? 'نعم، حذف الحركة المالية' : 'Yes, Delete Transaction'}
          cancelText={language === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
          type="danger"
          checkboxOption={{
            label: language === 'ar' ? 'استعادة كميات البضاعة إلى المخزون تلقائياً' : 'Auto-restore inventory stock',
            description:
              language === 'ar'
                ? 'إرجاع كميات الأصناف المباعة إلى المخزن، أو خصم المشتريات المستلمة.'
                : 'Reverses stock adjustments for items.',
            checked: restoreStockOnDelete,
            onChange: (checked) => setRestoreStockOnDelete(checked),
          }}
          itemDetails={[
            {
              label: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
              value: `#${txToDelete.invoiceNumber}`,
              isMono: true,
              isHighlight: true,
            },
            {
              label: language === 'ar' ? 'الطرف / العميل' : 'Party / Client',
              value: txToDelete.partyName,
            },
            {
              label: language === 'ar' ? 'إجمالي الفاتورة' : 'Total Amount',
              value: `${txToDelete.totalAmount.toFixed(2)} ${settings.currency}`,
              isMono: true,
              isHighlight: true,
            },
            {
              label: language === 'ar' ? 'طريقة السداد' : 'Payment Method',
              value:
                txToDelete.paymentMethod === 'CASH'
                  ? '💵 كاش'
                  : txToDelete.paymentMethod === 'TRANSFER'
                  ? '🏦 تحويل بنكي'
                  : '💳 شبكة / بطاقة',
            },
            {
              label: language === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
              value: new Date(txToDelete.timestamp).toLocaleString('ar-SA'),
            },
          ]}
        />
      )}
    </div>
  );
};
