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
  Share2,
  Lock,
  Edit3,
  Check,
  RefreshCw,
  Camera,
  ClipboardList,
  Eye,
  Save,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Item } from '../types';
import * as XLSX from 'xlsx';
import {
  exportInventoryAuditToPDF,
  shareInventoryAuditSummary,
} from '../utils/exportReportUtils';

export type InventoryPeriodFilter =
  | 'ALL'
  | 'CURRENT_MONTH'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS'
  | 'CURRENT_YEAR'
  | 'CUSTOM';

export type AuditWorkMode = 'SHEET_VIEW' | 'LIVE_COUNT' | 'VALUATION_REPORT';
export type SheetPrintType = 'FILLED' | 'BLANK_FIELD';

export const InventoryAuditReportView: React.FC = () => {
  const { items, settings, language, t, showNotification, activeMerchantId, updateItem } = useApp();
  const { userProfile, currentUser } = useAuth();

  // Active workspace mode: Printable A4 Sheet vs Live Physical Stocktaking vs Financial Valuation
  const [workMode, setWorkMode] = useState<AuditWorkMode>('SHEET_VIEW');
  // Printable sheet type: Filled with system numbers vs Blank boxes for manual pen counting on shelves
  const [sheetPrintType, setSheetPrintType] = useState<SheetPrintType>('FILLED');

  // Period filter state - Default MUST be ALL to include all items registered in the store
  const [periodFilter, setPeriodFilter] = useState<InventoryPeriodFilter>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stock status & category & search filters
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'costPrice' | 'salePrice' | 'totalCost'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Interactive Live Stocktake Count state: map of itemId -> string input (actual counted physical quantity)
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});
  const [countNotes, setCountNotes] = useState<Record<string, string>>({});
  const [isApplyingCounts, setIsApplyingCounts] = useState<boolean>(false);

  // Quick Inline Editing of Cost Price or Selling Price directly from inventory view
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<string>('');
  const [editSale, setEditSale] = useState<string>('');

  // Strict tenant security isolation: filter items matching active merchant / store only
  const merchantItems = useMemo(() => {
    const currentMerchantUid = currentUser?.uid || userProfile?.id || activeMerchantId;
    const currentStoreId = userProfile?.storeId;

    return items.filter((item) => {
      if (item.merchantId && currentMerchantUid && item.merchantId !== currentMerchantUid) {
        return false;
      }
      if (item.storeId && currentStoreId && item.storeId !== currentStoreId) {
        return false;
      }
      return true;
    });
  }, [items, userProfile, currentUser, activeMerchantId]);

  // Automated daily inventory audit flagged items (quantity reaching reorder threshold)
  const lowStockAuditItems = useMemo(() => {
    return merchantItems.filter((item) => {
      const qty = Number(item.quantity ?? 0);
      const minAlert = Number(item.minStockAlert ?? 5);
      return qty <= minAlert;
    });
  }, [merchantItems]);

  const handleQuickRestock = (itemId: string, itemName: string) => {
    const item = merchantItems.find((i) => i.id === itemId);
    const currentQty = Number(item?.quantity ?? 0);
    const newQty = currentQty + 10;
    updateItem(itemId, {
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    });
    showNotification(
      language === 'ar'
        ? `تم إعادة توريد الصنف (${itemName}) بنجاح وإضافة 10 وحدات جديدة ✓`
        : `Quick restocked ${itemName} (+10 units) successfully`,
      'success'
    );
  };

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
      // Time period filter: only filter if user explicitly selected a restricted date interval
      if (periodFilter !== 'ALL') {
        const itemDateStr = item.updatedAt || item.createdAt;
        if (itemDateStr) {
          const itemTime = new Date(itemDateStr).getTime();
          if (itemTime < startTimestamp || itemTime > endTimestamp) {
            return false;
          }
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
        const q = searchQuery.toLowerCase().trim();
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
        valA = Number(a.quantity ?? 0);
        valB = Number(b.quantity ?? 0);
      } else if (sortBy === 'costPrice') {
        valA = Number(a.costPrice ?? 0);
        valB = Number(b.costPrice ?? 0);
      } else if (sortBy === 'salePrice') {
        valA = Number(a.salePrice ?? a.price ?? 0);
        valB = Number(b.salePrice ?? b.price ?? 0);
      } else if (sortBy === 'totalCost') {
        valA = Number(a.quantity ?? 0) * Number(a.costPrice ?? 0);
        valB = Number(b.quantity ?? 0) * Number(b.costPrice ?? 0);
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
      const qty = Number(item.quantity ?? 0);
      const cost = Number(item.costPrice ?? 0);
      const sale = Number(item.salePrice ?? item.price ?? 0);

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

  // Counted vs System Discrepancy Summary for Live Stocktake Mode
  const stocktakeVarianceSummary = useMemo(() => {
    let countedItemsCount = 0;
    let matchCount = 0;
    let deficitCount = 0; // عجز
    let surplusCount = 0; // زيادة
    let totalQtyDiff = 0;
    let totalCostDiff = 0;

    filteredItems.forEach((item) => {
      const enteredStr = actualCounts[item.id];
      if (enteredStr !== undefined && enteredStr.trim() !== '') {
        countedItemsCount++;
        const actualQty = Number(enteredStr);
        const systemQty = Number(item.quantity ?? 0);
        const cost = Number(item.costPrice ?? 0);
        const diff = actualQty - systemQty;

        totalQtyDiff += diff;
        totalCostDiff += diff * cost;

        if (diff === 0) matchCount++;
        else if (diff < 0) deficitCount++;
        else surplusCount++;
      }
    });

    return {
      countedItemsCount,
      uncountedCount: filteredItems.length - countedItemsCount,
      matchCount,
      deficitCount,
      surplusCount,
      totalQtyDiff,
      totalCostDiff,
    };
  }, [filteredItems, actualCounts]);

  const currencySymbol = settings.currency || 'ر.س';
  const storeName = settings.storeName || userProfile?.storeName || 'متجر التاجر';
  const ownerName = userProfile?.displayName || userProfile?.name || settings.ownerName || 'التاجر المسؤول';
  const storePhone = settings.phone || userProfile?.phone || '-';
  const taxNumber = settings.taxNumber || '-';

  const periodLabelText = useMemo(() => {
    switch (periodFilter) {
      case 'CURRENT_MONTH':
        return language === 'ar' ? 'من بداية الشهر الحالي' : 'Current Month';
      case 'LAST_3_MONTHS':
        return language === 'ar' ? 'خلال آخر 3 أشهر' : 'Last 3 Months';
      case 'LAST_6_MONTHS':
        return language === 'ar' ? 'خلال آخر 6 أشهر' : 'Last 6 Months';
      case 'CURRENT_YEAR':
        return language === 'ar' ? 'من بداية العام الحالي' : 'Year to Date';
      case 'CUSTOM':
        return language === 'ar'
          ? `فترة مخصصة (من ${startDate || 'البداية'} إلى ${endDate})`
          : `Custom (${startDate || 'Start'} to ${endDate})`;
      case 'ALL':
      default:
        return language === 'ar' ? 'كافة أصناف المخزون المسجلة (الرصيد الفعلي للمتجر)' : 'All Inventory Items';
    }
  }, [periodFilter, startDate, endDate, language]);

  // Apply Live Stocktake Counts to Database and reconcile system stock
  const handleApplyStocktakeResults = () => {
    const keys = Object.keys(actualCounts).filter((k) => actualCounts[k] !== undefined && actualCounts[k].trim() !== '');
    if (keys.length === 0) {
      showNotification(
        language === 'ar'
          ? 'يرجى إدخال الكمية الفعلية لصنف واحد على الأقل قبل اعتماد الجرد'
          : 'Please enter actual counts for at least one item before applying',
        'warning'
      );
      return;
    }

    if (
      !window.confirm(
        language === 'ar'
          ? `تأكيد اعتماد نتيجة الجرد:\nسيتم تحديث أرصدة المخزن لعدد (${keys.length}) صنف لتطابق الكميات الفعلية المحصورة فوراً.\n\nهل أنت متأكد من الحفظ والاعتماد؟`
          : `Confirm stocktake reconciliation for ${keys.length} items?`
      )
    ) {
      return;
    }

    setIsApplyingCounts(true);
    let updatedCount = 0;

    try {
      keys.forEach((itemId) => {
        const val = actualCounts[itemId];
        const newQty = Math.max(0, Number(val));
        const note = countNotes[itemId] || '';
        updateItem(itemId, {
          quantity: newQty,
          notes: note ? `${note} (تم تحديث الجرد بتاريخ ${new Date().toLocaleDateString('ar-SA')})` : undefined,
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      });

      showNotification(
        language === 'ar'
          ? `✓ تم اعتماد نتيجة الجرد بنجاح وتحديث أرصدة (${updatedCount}) صنف في المخزون فورياً!`
          : `Successfully reconciled ${updatedCount} items in inventory!`,
        'success'
      );
    } catch (err) {
      console.error('Stocktake apply error:', err);
      showNotification(language === 'ar' ? 'حدث خطأ أثناء اعتماد نتيجة الجرد' : 'Failed to apply stocktake', 'error');
    } finally {
      setIsApplyingCounts(false);
    }
  };

  // Quick inline price saving
  const handleSaveItemPrices = (itemId: string) => {
    const c = parseFloat(editCost);
    const s = parseFloat(editSale);
    if (isNaN(c) || isNaN(s) || c < 0 || s < 0) {
      showNotification(language === 'ar' ? 'يرجى إدخال أسعار صحيحة' : 'Invalid prices entered', 'error');
      return;
    }
    updateItem(itemId, {
      costPrice: c,
      salePrice: s,
      price: s,
      updatedAt: new Date().toISOString(),
    });
    setEditingItemId(null);
    showNotification(language === 'ar' ? 'تم تحديث سعر التكلفة والبيع بنجاح ✓' : 'Prices updated successfully', 'success');
  };

  // Handlers for export
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    try {
      const pdfItems = filteredItems.map((item, idx) => {
        const qty = Number(item.quantity ?? 0);
        const cost = Number(item.costPrice ?? 0);
        const sale = Number(item.salePrice ?? item.price ?? 0);
        const totalCost = qty * cost;
        const totalSale = qty * sale;
        const status = qty <= 0 ? 'نفد المخزون' : qty <= (item.minStockAlert || 5) ? 'منخفض' : 'متوفر';
        return {
          index: idx + 1,
          barcode: item.barcode || '-',
          name: item.name,
          category: item.category || 'عام',
          quantity: qty,
          unit: item.unit || 'حبة',
          costPrice: cost,
          salePrice: sale,
          totalCost: totalCost,
          totalSale: totalSale,
          status,
        };
      });

      exportInventoryAuditToPDF(
        {
          storeName,
          ownerName,
          phone: storePhone,
          taxNumber,
          currency: currencySymbol,
          periodLabel: periodLabelText,
          generatedDate: new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US'),
          totalItemTypes: auditSummary.totalItemTypes,
          totalUnitsCount: auditSummary.totalUnitsCount,
          totalCostValuation: auditSummary.totalCostValuation,
          totalSaleValuation: auditSummary.totalSaleValuation,
          expectedProfit: auditSummary.expectedProfit,
          profitMargin: auditSummary.profitMargin,
          language,
          items: pdfItems,
        },
        'inventory_audit_report',
        language
      );

      showNotification(
        language === 'ar'
          ? `تم تصدير ملف PDF بنجاح لمتجر "${storeName}" بأرقام التكلفة والبيع كاملة ✓`
          : 'Inventory audit PDF exported successfully',
        'success'
      );
    } catch (err) {
      console.error('PDF Export Error:', err);
      showNotification(language === 'ar' ? 'حدث خطأ أثناء تصدير ملف PDF' : 'Failed to generate PDF', 'error');
    }
  };

  const handleShare = async () => {
    try {
      const res = await shareInventoryAuditSummary(
        {
          storeName,
          ownerName,
          currency: currencySymbol,
          periodLabel: periodLabelText,
          generatedDate: new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US'),
          totalItemTypes: auditSummary.totalItemTypes,
          totalUnitsCount: auditSummary.totalUnitsCount,
          totalCostValuation: auditSummary.totalCostValuation,
          totalSaleValuation: auditSummary.totalSaleValuation,
          expectedProfit: auditSummary.expectedProfit,
          profitMargin: auditSummary.profitMargin,
          language,
          items: [],
        },
        language
      );

      if (res.success) {
        showNotification(
          res.method === 'clipboard'
            ? (language === 'ar' ? 'تم نسخ ملخص تقرير الجرد للحافظة بنجاح' : 'Copied report summary to clipboard')
            : (language === 'ar' ? 'تمت مشاركة تقرير الجرد بنجاح' : 'Shared successfully'),
          'success'
        );
      }
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const handleExportExcel = () => {
    try {
      const rows = filteredItems.map((item, idx) => {
        const qty = Number(item.quantity ?? 0);
        const cost = Number(item.costPrice ?? 0);
        const sale = Number(item.salePrice ?? item.price ?? 0);
        const totalCost = qty * cost;
        const totalSale = qty * sale;
        const profit = totalSale - totalCost;
        const actualCount = actualCounts[item.id] !== undefined ? Number(actualCounts[item.id]) : '';
        const variance = actualCounts[item.id] !== undefined ? Number(actualCounts[item.id]) - qty : '';

        return {
          'م': idx + 1,
          'الباركود': item.barcode || '-',
          'اسم الصنف': item.name,
          'القسم': item.category || 'عام',
          'الوحدة': item.unit || 'حبة',
          'سعر التكلفة (ر.س)': cost,
          'سعر البيع (ر.س)': sale,
          'الكمية المتوفرة بالنظام': qty,
          'الكمية الفعلية بالجرد': actualCount,
          'الفارق (عجز / زيادة)': variance,
          'إجمالي قيمة التكلفة': totalCost,
          'إجمالي القيمة البيعية': totalSale,
          'الربح المتوقع': profit,
          'حالة المخزون': qty <= 0 ? 'نفد المخزون' : qty <= (item.minStockAlert || 5) ? 'منخفض' : 'متوفر',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'كشف جرد المخزون');
      XLSX.writeFile(wb, `inventory_audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification(language === 'ar' ? 'تم تصدير كشف جرد المخزون إلى Excel بنجاح' : 'Inventory Excel exported successfully', 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      showNotification(language === 'ar' ? 'فشل تصدير ملف Excel' : 'Failed to export Excel', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* ==========================================================================
         TOP SCREEN CONTROLS & WORK MODE SWITCHER (Hidden During Print)
         ========================================================================== */}
      <div className="no-print space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl shadow-sm">
                <ClipboardList className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>{language === 'ar' ? 'كشف وورقة جرد المخزون الرسمية' : 'Official Stocktaking & Inventory Audit'}</span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-mono font-bold">
                    A4 معتمد 🇸🇦
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ar'
                    ? 'طباعة ورقة الجرد الميدانية، مطابقة الكميات المتبقية وسعر التكلفة وسعر البيع، مع العد الفعلي واعتماد الفوارق فورياً'
                    : 'Print official physical inventory sheets with cost, sale price, remaining quantities, and live reconciliation'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Print A4, Export PDF, Excel, Share */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-emerald-950/50 hover:scale-[1.02] active:scale-95"
              title="طباعة ورقة الجرد المجهزة للطباعة على ورق A4 أو الحفظ كـ PDF"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'ar' ? 'طباعة ورقة الجرد (A4)' : 'Print Sheet (A4)'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-rose-900/30 hover:scale-[1.02] active:scale-95"
              title="تصدير ملف PDF احترافي معتمد بكافة الأرقام"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-sm hover:scale-[1.02] active:scale-95"
              title="تصدير إكسل Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-600/50 font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer text-xs shadow-sm hover:scale-[1.02] active:scale-95"
              title="مشاركة ملخص الجرد عبر واتساب"
            >
              <Share2 className="w-4 h-4 text-teal-400" />
              <span>{language === 'ar' ? 'مشاركة' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Work Mode Switcher Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setWorkMode('SHEET_VIEW')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              workMode === 'SHEET_VIEW'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? '📄 ورقة كشف الجرد (معاينة وطباعة A4)' : 'Printable A4 Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkMode('LIVE_COUNT')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              workMode === 'LIVE_COUNT'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{language === 'ar' ? '⚡ الجرد الميداني المباشر (إدخال العد والاعتماد)' : 'Live Stocktake Count'}</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkMode('VALUATION_REPORT')}
            className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              workMode === 'VALUATION_REPORT'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{language === 'ar' ? '📊 التقييم المالي والأرباح المتوقعة' : 'Financial Valuation'}</span>
          </button>
        </div>

        {/* Security & Isolation Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {language === 'ar'
                ? `عزل أمني تام: يتم جرد وعرض بيانات المتجر "${storeName}" الخاصة بالمالك "${ownerName}" حصراً.`
                : `Strict Tenant Isolation: Scoped exclusively to store "${storeName}" owned by "${ownerName}".`}
            </span>
          </div>
          <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30 text-[11px] shrink-0 font-bold">
            {merchantItems.length} {language === 'ar' ? 'صنف مسجل بالمتجر' : 'total items'}
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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

            {/* Sheet Type Toggle when in SHEET_VIEW */}
            {workMode === 'SHEET_VIEW' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {language === 'ar' ? 'نمط ورقة الجرد المطبوعة' : 'Sheet Print Style'}
                </label>
                <select
                  value={sheetPrintType}
                  onChange={(e) => setSheetPrintType(e.target.value as SheetPrintType)}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="FILLED">{language === 'ar' ? '📋 ورقة معبأة (بالأرقام والتكلفة وسعر البيع)' : 'Filled (with numbers & prices)'}</option>
                  <option value="BLANK_FIELD">{language === 'ar' ? '✍️ استمارة كشف ميداني (خانات فارغة للعد بالقلم)' : 'Field Count Sheet (blank boxes)'}</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {language === 'ar' ? 'ترتيب الأصناف' : 'Sort Items'}
                </label>
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e) => {
                    const [f, o] = e.target.value.split('_');
                    setSortBy(f as any);
                    setSortOrder(o as any);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="name_asc">{language === 'ar' ? 'الاسم (أ - ي)' : 'Name (A - Z)'}</option>
                  <option value="quantity_asc">{language === 'ar' ? 'الكمية (الأقل أولاً)' : 'Quantity (Low to High)'}</option>
                  <option value="quantity_desc">{language === 'ar' ? 'الكمية (الأعلى أولاً)' : 'Quantity (High to Low)'}</option>
                  <option value="costPrice_desc">{language === 'ar' ? 'سعر التكلفة (الأعلى أولاً)' : 'Cost (High to Low)'}</option>
                  <option value="salePrice_desc">{language === 'ar' ? 'سعر البيع (الأعلى أولاً)' : 'Price (High to Low)'}</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================================================
         MODE 2: INTERACTIVE LIVE STOCKTAKE & RECONCILIATION
         ========================================================================== */}
      {workMode === 'LIVE_COUNT' && (
        <div className="no-print space-y-4">
          {/* Live stocktaking instructions & stats bar */}
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-white text-base">
                    {language === 'ar' ? 'الجرد الميداني الرقمي المباشر' : 'Live Interactive Stocktake'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {language === 'ar'
                      ? 'أدخل الكمية الفعلية المحصورة يدوياً في خانة "العد الفعلي"، وسيقوم النظام فوراً بحساب العجز أو الزيادة وفارق التكلفة بالريال.'
                      : 'Enter physical counts. System dynamically calculates shortages, surpluses, and financial cost variance.'}
                  </p>
                </div>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApplyStocktakeResults}
                disabled={isApplyingCounts || stocktakeVarianceSummary.countedItemsCount === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer whitespace-nowrap ${
                  stocktakeVarianceSummary.countedItemsCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {language === 'ar'
                    ? `اعتماد نتيجة الجرد وتحديث المخزن (${stocktakeVarianceSummary.countedItemsCount}) صنف`
                    : `Apply & Reconcile (${stocktakeVarianceSummary.countedItemsCount}) Items`}
                </span>
              </button>
            </div>

            {/* Quick Live Variance Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-amber-500/20">
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-slate-400">الأصناف التي تم جردها</div>
                <div className="text-base font-black text-white font-mono mt-0.5">
                  {stocktakeVarianceSummary.countedItemsCount} / {filteredItems.length}
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-emerald-400 font-bold">مطابقة تامة (لا يوجد عجز)</div>
                <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                  {stocktakeVarianceSummary.matchCount} صنف
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-rose-400 font-bold">عجز في المخزون (نقص)</div>
                <div className="text-base font-black text-rose-400 font-mono mt-0.5">
                  {stocktakeVarianceSummary.deficitCount} صنف
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-amber-300 font-bold">فارق التكلفة المالي الإجمالي</div>
                <div className={`text-base font-black font-mono mt-0.5 ${stocktakeVarianceSummary.totalCostDiff < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {stocktakeVarianceSummary.totalCostDiff > 0 ? '+' : ''}
                  {stocktakeVarianceSummary.totalCostDiff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                </div>
              </div>
            </div>
          </div>

          {/* Live Editable Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                    <th className="p-3 font-bold">#</th>
                    <th className="p-3 font-bold">الباركود</th>
                    <th className="p-3 font-bold">اسم الصنف</th>
                    <th className="p-3 font-bold text-center">سعر التكلفة</th>
                    <th className="p-3 font-bold text-center">سعر البيع</th>
                    <th className="p-3 font-bold text-center">الكمية بالنظام</th>
                    <th className="p-3 font-bold text-center bg-amber-500/10 text-amber-300">العد الفعلي للجرد ✍️</th>
                    <th className="p-3 font-bold text-center">الفارق بالكمية</th>
                    <th className="p-3 font-bold text-center">الفارق المالي</th>
                    <th className="p-3 font-bold text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredItems.map((item, idx) => {
                    const qty = Number(item.quantity ?? 0);
                    const cost = Number(item.costPrice ?? 0);
                    const sale = Number(item.salePrice ?? item.price ?? 0);
                    const enteredCount = actualCounts[item.id];
                    const hasCount = enteredCount !== undefined && enteredCount.trim() !== '';
                    const actualQty = hasCount ? Number(enteredCount) : null;
                    const diff = actualQty !== null ? actualQty - qty : null;
                    const financialDiff = diff !== null ? diff * cost : null;

                    return (
                      <tr key={item.id} className="hover:bg-slate-950/60 transition-colors">
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-mono text-slate-400">{item.barcode || '-'}</td>
                        <td className="p-3">
                          <div className="font-black text-white">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.category || 'عام'} • {item.unit || 'حبة'}</div>
                        </td>
                        
                        {/* Cost Price */}
                        <td className="p-3 font-mono text-center font-bold text-amber-300">
                          {cost.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
                        </td>

                        {/* Sale Price */}
                        <td className="p-3 font-mono text-center font-bold text-teal-300">
                          {sale.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
                        </td>

                        {/* Current System Quantity */}
                        <td className="p-3 text-center">
                          <span className="font-mono text-sm font-black text-white px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800">
                            {qty} {item.unit || 'حبة'}
                          </span>
                        </td>

                        {/* Actual Physical Count Input */}
                        <td className="p-3 text-center bg-amber-500/5">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder={qty.toString()}
                            value={actualCounts[item.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActualCounts((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            className={`w-28 text-center font-mono font-black text-sm py-1.5 px-2 rounded-xl border focus:outline-none transition-all ${
                              hasCount
                                ? diff === 0
                                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                                  : diff! < 0
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                                  : 'bg-blue-950/80 border-blue-500 text-blue-300'
                                : 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                            }`}
                          />
                        </td>

                        {/* Quantity Difference */}
                        <td className="p-3 text-center font-mono font-bold">
                          {diff === null ? (
                            <span className="text-slate-600">-</span>
                          ) : diff === 0 ? (
                            <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 text-xs">
                              متطابق ✓ (0)
                            </span>
                          ) : diff < 0 ? (
                            <span className="text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/30 text-xs">
                              عجز {diff}
                            </span>
                          ) : (
                            <span className="text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-500/30 text-xs">
                              زيادة +{diff}
                            </span>
                          )}
                        </td>

                        {/* Financial Difference */}
                        <td className="p-3 text-center font-mono font-bold">
                          {financialDiff === null ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            <span className={financialDiff < 0 ? 'text-rose-400' : financialDiff > 0 ? 'text-blue-400' : 'text-emerald-400'}>
                              {financialDiff > 0 ? '+' : ''}
                              {financialDiff.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencySymbol}
                            </span>
                          )}
                        </td>

                        {/* Quick Match / Reset Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setActualCounts((prev) => ({ ...prev, [item.id]: qty.toString() }))}
                              className="px-2 py-1 bg-slate-800 hover:bg-emerald-900/60 text-slate-300 hover:text-emerald-300 rounded-lg text-[10px] font-bold border border-slate-700 transition-all cursor-pointer"
                              title="تسجيل أن الكمية الفعلية مطابقة لرصيد النظام"
                            >
                              مطابق
                            </button>
                            <button
                              type="button"
                              onClick={() => setActualCounts((prev) => ({ ...prev, [item.id]: '0' }))}
                              className="px-2 py-1 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-lg text-[10px] font-bold border border-slate-700 transition-all cursor-pointer"
                              title="تسجيل أن الصنف نافد تماماً (0)"
                            >
                              صفر
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         OFFICIAL A4 PRINTABLE INVENTORY AUDIT SHEET CARD
         (Visible on Screen in SHEET_VIEW & Automatically Isolated During window.print())
         ========================================================================== */}
      {(workMode === 'SHEET_VIEW' || workMode === 'VALUATION_REPORT') && (
        <div className="print-sheet bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 print:bg-white print:text-slate-900 print:border-none print:shadow-none print:p-0">
          
          {/* Official Document Header (Visible on Screen & Crisp High-Contrast on Print) */}
          <div className="pb-6 border-b-2 border-slate-800 print:border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3.5 py-1 rounded-full text-xs font-black border border-emerald-500/30 print:bg-slate-100 print:text-slate-900 print:border-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 print:text-slate-900" />
                <span>
                  {sheetPrintType === 'BLANK_FIELD'
                    ? (language === 'ar' ? 'استمارة كشف الجرد الميداني (رسمي معتمد)' : 'Official Physical Stocktake Form')
                    : (language === 'ar' ? 'تقرير ووثيقة جرد المخزون العام (رسمي معتمد)' : 'Official Inventory Stock Audit & Valuation')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white print:text-slate-950 tracking-tight">
                {storeName}
              </h1>
              <div className="text-xs text-slate-300 print:text-slate-800 flex flex-wrap items-center gap-3 justify-center md:justify-start font-medium">
                <span><strong>{language === 'ar' ? 'التاجر المسؤول:' : 'Owner:'}</strong> {ownerName}</span>
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

            <div className="text-center md:text-left bg-slate-950 print:bg-slate-50 p-4 rounded-2xl border border-slate-800 print:border-slate-300 min-w-[220px]">
              <div className="text-xs font-bold text-slate-400 print:text-slate-600">
                {language === 'ar' ? 'رقم وثيقة الجرد:' : 'Audit Doc No:'}
              </div>
              <div className="text-sm font-black text-emerald-400 print:text-slate-900 font-mono mt-0.5">
                AUD-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-{filteredItems.length}
              </div>
              <div className="text-xs text-slate-300 print:text-slate-700 mt-1 font-mono">
                {language === 'ar' ? 'تاريخ وساعة الجرد:' : 'Date:'} {new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </div>
              <div className="text-[11px] text-slate-400 print:text-slate-600 mt-0.5">
                {language === 'ar' ? 'نطاق الأصناف:' : 'Scope:'} {periodLabelText}
              </div>
            </div>
          </div>

          {/* Key Summary KPI Cards - Visible in Filled Sheet & Valuation Mode */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 print:grid-cols-4">
            {/* Box 1: Unique Items */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-300">
              <div className="text-xs text-slate-400 print:text-slate-700 font-bold mb-1">
                {language === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white print:text-slate-950 font-mono">
                {auditSummary.totalItemTypes} <span className="text-xs font-normal text-slate-400 print:text-slate-600">صنف</span>
              </div>
            </div>

            {/* Box 2: Total Quantity in Stock */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-300">
              <div className="text-xs text-slate-400 print:text-slate-700 font-bold mb-1">
                {language === 'ar' ? 'إجمالي الكميات المتوفرة' : 'Remaining Quantity'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 print:text-slate-950 font-mono">
                {auditSummary.totalUnitsCount.toLocaleString()} <span className="text-xs font-normal text-slate-400 print:text-slate-600">قطعة</span>
              </div>
            </div>

            {/* Box 3: Total Cost Price Valuation */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-300">
              <div className="text-xs text-slate-400 print:text-slate-700 font-bold mb-1">
                {language === 'ar' ? 'رأس مال المخزون (التكلفة)' : 'Total Cost Value'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 print:text-slate-950 font-mono">
                {auditSummary.totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-normal text-slate-400 print:text-slate-600">{currencySymbol}</span>
              </div>
            </div>

            {/* Box 4: Total Selling Price Valuation */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-slate-50 print:border-slate-300">
              <div className="text-xs text-slate-400 print:text-slate-700 font-bold mb-1">
                {language === 'ar' ? 'القيمة البيعية الإجمالية' : 'Total Sales Value'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-teal-400 print:text-slate-950 font-mono">
                {auditSummary.totalSaleValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-normal text-slate-400 print:text-slate-600">{currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* Expected Profit Banner (Visible in Valuation & Filled Mode) */}
          {workMode === 'VALUATION_REPORT' && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400 print:text-emerald-700" />
                <span className="text-xs font-bold text-emerald-300 print:text-slate-900">
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
          )}

          {/* High-Fidelity Official Inventory Table (With Cost, Sale Price, and Remaining Quantity) */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs print:text-[11px]">
              <thead>
                <tr className="bg-slate-950 text-slate-200 border-b-2 border-slate-800 print:bg-slate-100 print:text-slate-950 print:border-slate-400">
                  <th className="p-2.5 font-black text-center w-10">#</th>
                  <th className="p-2.5 font-black w-24">الباركود</th>
                  <th className="p-2.5 font-black">اسم الصنف</th>
                  <th className="p-2.5 font-black w-20">القسم</th>
                  <th className="p-2.5 font-black text-center w-24">سعر التكلفة</th>
                  <th className="p-2.5 font-black text-center w-24">سعر البيع</th>
                  <th className="p-2.5 font-black text-center w-24">الكمية بالنظام</th>
                  
                  {sheetPrintType === 'BLANK_FIELD' ? (
                    <>
                      <th className="p-2.5 font-black text-center w-28 bg-slate-900 print:bg-slate-200 text-amber-300 print:text-slate-900">
                        العد الفعلي ✍️
                      </th>
                      <th className="p-2.5 font-black text-center w-24">الفارق</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2.5 font-black text-center w-28">إجمالي التكلفة</th>
                      <th className="p-2.5 font-black text-center w-28">إجمالي البيع</th>
                    </>
                  )}
                  <th className="p-2.5 font-black text-center w-20">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400 print:text-slate-600 font-bold">
                      {language === 'ar' ? 'لا توجد أصناف مسجلة في هذا المتجر حتى الآن' : 'No items registered in this store yet'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const qty = Number(item.quantity ?? 0);
                    const cost = Number(item.costPrice ?? 0);
                    const sale = Number(item.salePrice ?? item.price ?? 0);
                    const totalCost = qty * cost;
                    const totalSale = qty * sale;
                    const isOut = qty <= 0;
                    const isLow = qty > 0 && qty <= (item.minStockAlert || 5);

                    return (
                      <tr key={item.id} className="hover:bg-slate-950/40 print:hover:bg-transparent">
                        <td className="p-2.5 font-mono text-center text-slate-400 print:text-slate-800 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-slate-800 font-semibold">
                          {item.barcode || '-'}
                        </td>
                        <td className="p-2.5 font-black text-white print:text-slate-950">
                          {item.name}
                        </td>
                        <td className="p-2.5 text-slate-400 print:text-slate-700">
                          {item.category || 'عام'}
                        </td>

                        {/* COST PRICE - Explicit legible numbers */}
                        <td className="p-2.5 font-mono text-center font-bold text-amber-300 print:text-slate-950 whitespace-nowrap">
                          {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                        </td>

                        {/* SELLING PRICE - Explicit legible numbers */}
                        <td className="p-2.5 font-mono text-center font-bold text-teal-300 print:text-slate-950 whitespace-nowrap">
                          {sale.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                        </td>

                        {/* REMAINING SYSTEM QUANTITY - Large legible bold number */}
                        <td className="p-2.5 font-mono text-center font-black text-emerald-400 print:text-slate-950">
                          <span className="px-2 py-0.5 bg-emerald-950/60 print:bg-transparent rounded border border-emerald-500/30 print:border-none font-mono text-sm">
                            {qty}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400 print:text-slate-600 font-sans">{item.unit || 'حبة'}</span>
                        </td>

                        {/* Blank Field Columns for manual pen counting on shelves */}
                        {sheetPrintType === 'BLANK_FIELD' ? (
                          <>
                            <td className="p-2 text-center bg-slate-950/60 print:bg-white">
                              {/* Open Box for physical pen entry */}
                              <div className="h-7 w-20 mx-auto border-2 border-dashed border-slate-600 print:border-slate-800 rounded bg-slate-900/40 print:bg-white flex items-center justify-center font-mono text-xs text-slate-500">
                                [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="h-7 w-16 mx-auto border border-dashed border-slate-700 print:border-slate-400 rounded flex items-center justify-center font-mono text-[10px] text-slate-500">
                                [ &nbsp;&nbsp;&nbsp; ]
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Total Cost Column */}
                            <td className="p-2.5 font-mono text-center font-bold text-amber-300 print:text-slate-900 whitespace-nowrap">
                              {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                            </td>

                            {/* Total Sale Column */}
                            <td className="p-2.5 font-mono text-center font-bold text-teal-300 print:text-slate-900 whitespace-nowrap">
                              {totalSale.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                            </td>
                          </>
                        )}

                        {/* Status Column */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 print:border-slate-400 print:text-slate-900 print:bg-slate-200">
                              نفد
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 print:border-slate-400 print:text-slate-900 print:bg-slate-200">
                              منخفض
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 print:border-slate-400 print:text-slate-900 print:bg-slate-200">
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

          {/* Official Sign-off & Stamp Approvals Footer (Visible on Print & Screen) */}
          <div className="pt-8 mt-8 border-t-2 border-slate-800 print:border-slate-400 grid grid-cols-2 gap-8 text-center text-xs text-slate-300 print:text-slate-900">
            <div className="space-y-6">
              <div className="font-bold text-white print:text-slate-900">
                {language === 'ar' ? 'توقيع مسؤول الجرد والمستودع' : 'Warehouse Auditor Signature'}
              </div>
              <div className="border-b-2 border-dashed border-slate-700 print:border-slate-900 w-48 mx-auto pb-4"></div>
              <div className="text-[11px] text-slate-400 print:text-slate-700">التاريخ: ____ / ____ / 2026م</div>
            </div>
            
            <div className="space-y-6">
              <div className="font-bold text-white print:text-slate-900">
                {language === 'ar' ? `اعتماد وختم صاحب المتجر (${ownerName})` : `Store Owner Official Approval (${ownerName})`}
              </div>
              <div className="border-b-2 border-dashed border-slate-700 print:border-slate-900 w-48 mx-auto pb-4"></div>
              <div className="text-[11px] text-slate-400 print:text-slate-700">الختم الرسمي والاعتماد</div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
