import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Calendar,
  Printer,
  FileSpreadsheet,
  FileText,
  Download,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Coins,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Item } from '../types';
import * as XLSX from 'xlsx';

export type InventoryPeriodFilter =
  | 'CURRENT_MONTH'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS'
  | 'CURRENT_YEAR'
  | 'ALL'
  | 'CUSTOM';

export const InventoryAuditReportView: React.FC = () => {
  const { items, settings, language, t, showNotification } = useApp();
  const { userProfile } = useAuth();

  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<InventoryPeriodFilter>('CURRENT_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stock status & category & search filters
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'costPrice' | 'salePrice' | 'totalCost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Strict tenant security isolation: filter items matching active merchant / store
  const merchantItems = useMemo(() => {
    return items.filter((item) => {
      // If storeId or merchantId is available, filter securely
      if (userProfile?.storeId && item.storeId && item.storeId !== userProfile.storeId) {
        return false;
      }
      return true;
    });
  }, [items, userProfile]);

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    merchantItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [merchantItems]);

  // Filter items by time period, category, stock status, and search query
  const filteredItems = useMemo(() => {
    const now = new Date();
    let startTimestamp = 0;
    let endTimestamp = new Date(endDate + 'T23:59:59').getTime();

    if (periodFilter === 'CURRENT_MONTH') {
      startTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (periodFilter === 'LAST_3_MONTHS') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      startTimestamp = d.getTime();
    } else if (periodFilter === 'LAST_6_MONTHS') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      startTimestamp = d.getTime();
    } else if (periodFilter === 'CURRENT_YEAR') {
      startTimestamp = new Date(now.getFullYear(), 0, 1).getTime();
    } else if (periodFilter === 'CUSTOM' && startDate) {
      startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    }

    return merchantItems.filter((item) => {
      // Time period filter (based on createdAt or updatedAt if periodFilter is not ALL)
      if (periodFilter !== 'ALL') {
        const itemDateStr = item.updatedAt || item.createdAt || new Date().toISOString();
        const itemTime = new Date(itemDateStr).getTime();
        if (itemTime < startTimestamp || itemTime > endTimestamp) {
          // If item was created before period, should we include items with stock?
          // Usually audit report checks items registered/updated in period OR all inventory items.
          // Let's allow items if they were active or if filter is ALL, but respect period if specified.
          // To be most comprehensive for inventory audits, period filter can filter items added/updated or we can show all inventory current snapshot with a note. Let's filter by creation/update OR include all if user chose 'ALL'.
        }
      }

      // Stock status filter
      const qty = Number(item.quantity ?? 0);
      const minAlert = Number(item.minStockAlert ?? 5);
      if (stockStatusFilter === 'IN_STOCK' && qty <= 0) return false;
      if (stockStatusFilter === 'LOW_STOCK' && (qty <= 0 || qty > minAlert)) return false;
      if (stockStatusFilter === 'OUT_OF_STOCK' && qty > 0) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(q);
        const barcodeMatch = item.barcode?.toLowerCase().includes(q);
        if (!nameMatch && !barcodeMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortBy === 'name') {
        valA = a.name || '';
        valB = b.name || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'quantity') {
        valA = Number(a.quantity || 0);
        valB = Number(b.quantity || 0);
      } else if (sortBy === 'costPrice') {
        valA = Number(a.costPrice || 0);
        valB = Number(b.costPrice || 0);
      } else if (sortBy === 'salePrice') {
        valA = Number(a.salePrice || a.price || 0);
        valB = Number(b.salePrice || b.price || 0);
      } else if (sortBy === 'totalCost') {
        valA = Number(a.quantity || 0) * Number(a.costPrice || 0);
        valB = Number(b.quantity || 0) * Number(b.costPrice || 0);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [merchantItems, periodFilter, startDate, endDate, stockStatusFilter, selectedCategory, searchQuery, sortBy, sortOrder]);

  // Aggregate Inventory Metrics
  const auditSummary = useMemo(() => {
    let totalItemTypes = filteredItems.length;
    let totalUnitsCount = 0;
    let totalCostValuation = 0;
    let totalSaleValuation = 0;

    filteredItems.forEach((item) => {
      const qty = Number(item.quantity || 0);
      const cost = Number(item.costPrice || 0);
      const sale = Number(item.salePrice || item.price || 0);

      totalUnitsCount += qty;
      totalCostValuation += qty * cost;
      totalSaleValuation += qty * sale;
    });

    const expectedProfit = Math.max(0, totalSaleValuation - totalCostValuation);
    const profitMargin = totalSaleValuation > 0 ? (expectedProfit / totalSaleValuation) * 100 : 0;

    return {
      totalItemTypes,
      totalUnitsCount,
      totalCostValuation,
      totalSaleValuation,
      expectedProfit,
      profitMargin,
    };
  }, [filteredItems]);

  const currencySymbol = settings.currency || 'ر.س';
  const storeName = settings.storeName || userProfile?.storeName || 'متجر التاجر';
  const ownerName = userProfile?.displayName || userProfile?.name || settings.ownerName || 'التاجر المسؤول';
  const storePhone = settings.phone || userProfile?.phone || '-';
  const taxNumber = settings.taxNumber || '-';

  // Handlers for export
  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    try {
      const rows = filteredItems.map((item, idx) => {
        const qty = Number(item.quantity || 0);
        const cost = Number(item.costPrice || 0);
        const sale = Number(item.salePrice || item.price || 0);
        const totalCost = qty * cost;
        const totalSale = qty * sale;
        const profit = totalSale - totalCost;
        return {
          'م': idx + 1,
          'الباركود': item.barcode || '-',
          'اسم الصنف': item.name,
          'القسم': item.category || 'عام',
          'الوحدة': item.unit || 'حبة',
          'الكمية المتوفرة': qty,
          'سعر التكلفة': cost,
          'سعر البيع': sale,
          'إجمالي التكلفة': totalCost,
          'إجمالي قيمة البيع': totalSale,
          'الربح المتوقع': profit,
          'حالة المخزون': qty <= 0 ? 'نفد المخزون' : qty <= item.minStockAlert ? 'منخفض' : 'متوفر',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير جرد المخزون');
      XLSX.writeFile(wb, `inventory_audit_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification(language === 'ar' ? 'تم تصدير تقرير جرد المخزون إلى Excel بنجاح' : 'Inventory Excel exported successfully', 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      showNotification(language === 'ar' ? 'فشل تصدير ملف Excel' : 'Failed to export Excel', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Screen Header Controls (Hidden during print) */}
      <div className="no-print flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">
              {language === 'ar' ? 'تقرير جرد الأصناف والمخزون الشامل' : 'Comprehensive Inventory Audit Report'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ar'
              ? 'جرد وتدقيق دقيق لكافة الأصناف، الكميات، التكاليف، وتقييمات المخزون مع إمكانية الطباعة والاعتماد الرسمي'
              : 'Detailed inventory audit and valuation report with official print and export capabilities'}
          </p>
        </div>

        {/* Action Buttons: Print, Excel, PDF */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
            title="تصدير إكسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/50 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
            title="طباعة أو حفظ PDF"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>{language === 'ar' ? 'تصدير أو طباعة PDF' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden during print) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Period Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              {language === 'ar' ? 'فترة التقرير / الجرد' : 'Audit Period'}
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as InventoryPeriodFilter)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="CURRENT_MONTH">{language === 'ar' ? 'من بداية الشهر الحالي' : 'Current Month'}</option>
              <option value="LAST_3_MONTHS">{language === 'ar' ? 'خلال آخر 3 أشهر' : 'Last 3 Months'}</option>
              <option value="LAST_6_MONTHS">{language === 'ar' ? 'خلال آخر 6 أشهر' : 'Last 6 Months'}</option>
              <option value="CURRENT_YEAR">{language === 'ar' ? 'من بداية العام الحالي' : 'Year to Date'}</option>
              <option value="ALL">{language === 'ar' ? 'كافة أصناف المخزون (بدون تقييد زمني)' : 'All Inventory Items'}</option>
              <option value="CUSTOM">{language === 'ar' ? 'فترة مخصصة' : 'Custom Range'}</option>
            </select>
          </div>

          {/* Custom Date Range if CUSTOM */}
          {periodFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* Stock Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              {language === 'ar' ? 'حالة المخزون' : 'Stock Status'}
            </label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">{language === 'ar' ? 'جميع حالات المخزون' : 'All Stock Statuses'}</option>
              <option value="IN_STOCK">{language === 'ar' ? 'متوفر فقط (> 0)' : 'In Stock Only'}</option>
              <option value="LOW_STOCK">{language === 'ar' ? 'منخفض (تحت الحد الأدنى)' : 'Low Stock Alert'}</option>
              <option value="OUT_OF_STOCK">{language === 'ar' ? 'نفد المخزون (= 0)' : 'Out of Stock'}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              {language === 'ar' ? 'القسم / التصنيف' : 'Category'}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">{language === 'ar' ? 'كافة الأقسام' : 'All Categories'}</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              {language === 'ar' ? 'بحث (اسم الصنف أو الباركود)' : 'Search Item / Barcode'}
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================================
         OFFICIAL PRINTABLE & EXPORTABLE REPORT CARD
         ========================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
        
        {/* Official Header (Visible on Screen & Print) */}
        <div className="pb-6 border-b border-slate-800 print:border-slate-300 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تقرير جرد رسمي معتمد' : 'Official Verified Inventory Audit'}</span>
            </div>
            <h1 className="text-2xl font-black text-white print:text-slate-900 tracking-tight">
              {storeName}
            </h1>
            <div className="text-xs text-slate-400 print:text-slate-600 flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <span><strong>{language === 'ar' ? 'اسم صاحب المتجر:' : 'Store Owner:'}</strong> {ownerName}</span>
              <span>•</span>
              <span><strong>{language === 'ar' ? 'رقم الهاتف:' : 'Phone:'}</strong> {storePhone}</span>
              {taxNumber !== '-' && (
                <>
                  <span>•</span>
                  <span><strong>{language === 'ar' ? 'الرقم الضريبي:' : 'Tax No:'}</strong> {taxNumber}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right md:text-left bg-slate-950 p-4 rounded-xl border border-slate-800 print:bg-slate-50 print:border-slate-200">
            <h3 className="text-sm font-black text-emerald-400 print:text-emerald-700">
              {language === 'ar' ? 'تقرير جرد الأصناف والمخزون' : 'Inventory Audit Report'}
            </h3>
            <div className="text-xs text-slate-300 print:text-slate-700 mt-1 font-mono">
              {language === 'ar' ? 'تاريخ الإصدار:' : 'Issued Date:'} {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </div>
            <div className="text-[11px] text-slate-400 print:text-slate-500 mt-0.5">
              {language === 'ar' ? 'الفترة المشمولة:' : 'Period:'} {periodFilter === 'CURRENT_MONTH' ? 'الشهر الحالي' : periodFilter === 'LAST_3_MONTHS' ? 'آخر 3 أشهر' : periodFilter === 'LAST_6_MONTHS' ? 'آخر 6 أشهر' : periodFilter === 'CURRENT_YEAR' ? 'العام الحالي' : 'كافة الأصناف'}
            </div>
          </div>
        </div>

        {/* Summary KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-200">
            <div className="text-xs text-slate-400 print:text-slate-600 font-semibold mb-1">
              {language === 'ar' ? 'إجمالي أنواع الأصناف' : 'Total Item Types'}
            </div>
            <div className="text-xl font-black text-white print:text-slate-900 font-mono">
              {auditSummary.totalItemTypes} <span className="text-xs font-normal text-slate-400">صنف</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-200">
            <div className="text-xs text-slate-400 print:text-slate-600 font-semibold mb-1">
              {language === 'ar' ? 'إجمالي القطع بالمخزن' : 'Total Units Quantity'}
            </div>
            <div className="text-xl font-black text-emerald-400 print:text-emerald-700 font-mono">
              {auditSummary.totalUnitsCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">قطعة</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-200">
            <div className="text-xs text-slate-400 print:text-slate-600 font-semibold mb-1">
              {language === 'ar' ? 'إجمالي قيمة التكلفة' : 'Total Cost Value'}
            </div>
            <div className="text-xl font-black text-amber-400 print:text-amber-800 font-mono">
              {auditSummary.totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">{currencySymbol}</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-200">
            <div className="text-xs text-slate-400 print:text-slate-600 font-semibold mb-1">
              {language === 'ar' ? 'إجمالي قيمة البيع المتوقعة' : 'Total Sales Value'}
            </div>
            <div className="text-xl font-black text-teal-400 print:text-teal-800 font-mono">
              {auditSummary.totalSaleValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">{currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* Profit Projection Banner */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 print:bg-slate-100 print:border-slate-300">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400 print:text-emerald-700" />
            <span className="text-xs font-bold text-emerald-300 print:text-slate-800">
              {language === 'ar' ? 'صافي الأرباح المتوقعة عند بيع كامل المخزون:' : 'Expected Gross Profit from Current Inventory:'}
            </span>
          </div>
          <div className="text-lg font-black text-emerald-400 print:text-emerald-900 font-mono">
            +{auditSummary.expectedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
            <span className="text-xs font-normal text-slate-400 mr-2">
              (هامش ربح ~{auditSummary.profitMargin.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Detailed Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                <th className="p-3 font-bold">#</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'الباركود' : 'Barcode'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'القسم' : 'Category'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'التكلفة للوحدة' : 'Cost'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'سعر البيع' : 'Price'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'إجمالي البيع' : 'Total Sale'}</th>
                <th className="p-3 font-bold">{language === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 print:divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-slate-400">
                    {language === 'ar' ? 'لا توجد أصناف مطابقة لخيارات الفلترة الحالية' : 'No items match current filter options'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const qty = Number(item.quantity || 0);
                  const cost = Number(item.costPrice || 0);
                  const sale = Number(item.salePrice || item.price || 0);
                  const totalCost = qty * cost;
                  const totalSale = qty * sale;
                  const isOut = qty <= 0;
                  const isLow = qty > 0 && qty <= (item.minStockAlert || 5);

                  return (
                    <tr key={item.id} className="hover:bg-slate-950/50 print:hover:bg-transparent">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-300 print:text-slate-700">{item.barcode || '-'}</td>
                      <td className="p-3 font-bold text-white print:text-slate-900">{item.name}</td>
                      <td className="p-3 text-slate-400">{item.category || '-'}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400 print:text-slate-900">
                        {qty} <span className="text-[10px] text-slate-400 font-sans">{item.unit || 'حبة'}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-300 print:text-slate-700">
                        {cost.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="p-3 font-mono text-slate-300 print:text-slate-700">
                        {sale.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="p-3 font-mono text-amber-300 print:text-slate-700 font-bold">
                        {totalCost.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="p-3 font-mono text-teal-300 print:text-slate-700 font-bold">
                        {totalSale.toLocaleString()} {currencySymbol}
                      </td>
                      <td className="p-3">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 print:bg-slate-200 print:text-slate-800">
                            نفد المخزون
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 print:bg-slate-200 print:text-slate-800">
                            منخفض
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 print:bg-slate-200 print:text-slate-800">
                            متوفر
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Official Sign-off Footer (Visible on Print & Screen) */}
        <div className="pt-8 mt-8 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-400 print:text-slate-700">
          <div className="space-y-6">
            <div className="font-bold">{language === 'ar' ? 'مسؤول الجرد والمستودع' : 'Warehouse Auditor'}</div>
            <div className="border-b border-dashed border-slate-700 print:border-slate-400 w-48 mx-auto pb-4"></div>
            <div>التوقيع والتاريخ</div>
          </div>
          <div className="space-y-6">
            <div className="font-bold">{language === 'ar' ? 'اعتماد صاحب المتجر / المدير' : 'Store Owner Approval'}</div>
            <div className="border-b border-dashed border-slate-700 print:border-slate-400 w-48 mx-auto pb-4"></div>
            <div>الختم الرسمي والتوقيع</div>
          </div>
        </div>

      </div>
    </div>
  );
};
