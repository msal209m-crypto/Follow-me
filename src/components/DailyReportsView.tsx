import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  User,
  DollarSign,
  Building2,
  CreditCard,
  Printer,
  TrendingUp,
  Package,
  Layers,
  ArrowUpRight,
  Sparkles,
  Download,
  FileText,
  Share2,
  CheckCircle2,
  CalendarDays,
  Coins,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';
import {
  exportReportToExcel,
  exportReportToPDF,
  shareReportSummary,
  DailyReportSummaryData,
} from '../utils/exportReportUtils';
import { UserActivityLogPanel } from './UserActivityLogPanel';

export const DailyReportsView: React.FC = () => {
  const { transactions, cashiers, settings, language, t, showNotification } = useApp();

  // Period modes: DAY or MONTH
  const [periodType, setPeriodType] = useState<'DAY' | 'MONTH'>('DAY');

  // Selected Date (default to today YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');
  const [reportMode, setReportMode] = useState<'ALL_SALES' | 'PER_PERSON' | 'AUDIT_LOG'>('ALL_SALES');

  // Filter transactions by date / month and cashier
  const periodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Must be a sale transaction for sales report (SALE or CREDIT_SALE)
      const isSale = tx.type === 'SALE' || tx.type === 'CREDIT_SALE';
      if (!isSale) return false;

      const txDate = tx.timestamp.split('T')[0];

      // Date match based on period
      let matchesPeriod = true;
      if (periodType === 'DAY') {
        matchesPeriod = !selectedDate || txDate === selectedDate;
      } else {
        matchesPeriod = !selectedMonth || txDate.startsWith(selectedMonth);
      }

      // Cashier match
      const matchesCashier =
        selectedCashier === 'ALL' || tx.cashierName === selectedCashier;

      return matchesPeriod && matchesCashier;
    });
  }, [transactions, periodType, selectedDate, selectedMonth, selectedCashier]);

  // Aggregate Metrics for the selected period
  const reportSummary: DailyReportSummaryData = useMemo(() => {
    let totalSalesRevenue = 0;
    let totalCashSales = 0;
    let totalTransferSales = 0;
    let totalCardSales = 0;
    let totalCreditSales = 0;
    let totalEstimatedCost = 0;
    let totalItemsSold = 0;

    const cashierMap: Record<
      string,
      {
        cashierName: string;
        invoiceCount: number;
        totalSales: number;
        cash: number;
        transfer: number;
        card: number;
        credit: number;
      }
    > = {};

    const itemSalesMap: Record<
      string,
      { name: string; barcode: string; quantity: number; revenue: number }
    > = {};

    periodTransactions.forEach((tx) => {
      totalSalesRevenue += tx.totalAmount;

      // Cashier breakdown
      if (!cashierMap[tx.cashierName]) {
        cashierMap[tx.cashierName] = {
          cashierName: tx.cashierName,
          invoiceCount: 0,
          totalSales: 0,
          cash: 0,
          transfer: 0,
          card: 0,
          credit: 0,
        };
      }
      cashierMap[tx.cashierName].invoiceCount++;
      cashierMap[tx.cashierName].totalSales += tx.totalAmount;

      // Payment method breakdown
      if (tx.type === 'CREDIT_SALE') {
        totalCreditSales += tx.remainingDebt;
        cashierMap[tx.cashierName].credit += tx.remainingDebt;

        // If partial cash/transfer was paid
        if (tx.paidAmount > 0) {
          if (tx.paymentMethod === 'CASH') {
            totalCashSales += tx.paidAmount;
            cashierMap[tx.cashierName].cash += tx.paidAmount;
          } else if (tx.paymentMethod === 'TRANSFER') {
            totalTransferSales += tx.paidAmount;
            cashierMap[tx.cashierName].transfer += tx.paidAmount;
          } else if (tx.paymentMethod === 'CARD') {
            totalCardSales += tx.paidAmount;
            cashierMap[tx.cashierName].card += tx.paidAmount;
          }
        }
      } else {
        // Full cash/transfer/card sales
        if (tx.paymentMethod === 'CASH') {
          totalCashSales += tx.totalAmount;
          cashierMap[tx.cashierName].cash += tx.totalAmount;
        } else if (tx.paymentMethod === 'TRANSFER') {
          totalTransferSales += tx.totalAmount;
          cashierMap[tx.cashierName].transfer += tx.totalAmount;
        } else if (tx.paymentMethod === 'CARD') {
          totalCardSales += tx.totalAmount;
          cashierMap[tx.cashierName].card += tx.totalAmount;
        }
      }

      // Calculate cost & top items
      tx.items.forEach((item) => {
        totalItemsSold += item.quantity;
        totalEstimatedCost += item.quantity * item.costPrice;

        if (!itemSalesMap[item.itemId]) {
          itemSalesMap[item.itemId] = {
            name: item.name,
            barcode: item.barcode,
            quantity: 0,
            revenue: 0,
          };
        }
        itemSalesMap[item.itemId].quantity += item.quantity;
        itemSalesMap[item.itemId].revenue += item.total;
      });
    });

    const netProfit = Math.max(0, totalSalesRevenue - totalEstimatedCost);

    return {
      periodType,
      selectedDate: periodType === 'DAY' ? selectedDate : selectedMonth,
      invoiceCount: periodTransactions.length,
      totalSalesRevenue,
      totalCashSales,
      totalTransferSales,
      totalCardSales,
      totalCreditSales,
      totalEstimatedCost,
      netProfit,
      totalItemsSold,
      cashiersList: Object.values(cashierMap),
      topItemsList: Object.values(itemSalesMap).sort((a, b) => b.revenue - a.revenue),
      transactions: periodTransactions,
    };
  }, [periodTransactions, periodType, selectedDate, selectedMonth]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportExcel = () => {
    try {
      const prefix = periodType === 'MONTH' ? 'monthly_sales_report' : 'daily_sales_report';
      exportReportToExcel(reportSummary, settings, prefix);
      showNotification(language === 'ar' ? 'تم تصدير ملف Excel بنجاح!' : 'Excel report exported successfully!', 'success');
    } catch (err) {
      console.error('Export Excel failed:', err);
      showNotification(language === 'ar' ? 'فشل تصدير ملف Excel' : 'Failed to export Excel', 'error');
    }
  };

  const handleExportPdf = () => {
    try {
      const prefix = periodType === 'MONTH' ? 'monthly_sales_report' : 'daily_sales_report';
      exportReportToPDF(reportSummary, settings, prefix);
      showNotification(language === 'ar' ? 'تم تصدير تقرير PDF بنجاح!' : 'PDF report exported successfully!', 'success');
    } catch (err) {
      console.error('Export PDF failed:', err);
      showNotification(language === 'ar' ? 'فشل تصدير ملف PDF' : 'Failed to export PDF', 'error');
    }
  };

  const handleShareReport = async () => {
    try {
      const res = await shareReportSummary(reportSummary, settings);
      if (res.success) {
        if (res.method === 'clipboard') {
          showNotification(t.shareReportCopied, 'success');
        } else {
          showNotification(language === 'ar' ? 'تم فتح نافذة المشاركة!' : 'Share dialog opened!', 'success');
        }
      }
    } catch (err) {
      console.error('Share failed:', err);
      showNotification(language === 'ar' ? 'فشلت المشاركة' : 'Sharing failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              reportMode === 'AUDIT_LOG'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {reportMode === 'AUDIT_LOG' ? (
                <Activity className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {reportMode === 'AUDIT_LOG'
                  ? (language === 'ar' ? 'سجل عمليات المستخدم (Audit Log)' : 'User Activity & Audit Log')
                  : t.dailyReportsTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {reportMode === 'AUDIT_LOG'
                  ? (language === 'ar'
                      ? 'تتبع فوري ومفصل لعمليات البيع، تعديل وحذف الأصناف، وحركات الديون بالتاريخ والوقت والمستخدم المسؤول'
                      : 'Audit log of sales, inventory updates, and cashier activity with user, date, and timestamp')
                  : t.dailyReportsSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Export to Excel, PDF, Share, Print (For Sales Reports) */}
        {reportMode !== 'AUDIT_LOG' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export to Excel */}
            <button
              id="btn-export-excel-report"
              onClick={handleExportExcel}
              title={t.exportExcelBtn}
              className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
              <span className="sm:hidden">XLSX</span>
            </button>

            {/* Export to PDF */}
            <button
              id="btn-export-pdf-report"
              onClick={handleExportPdf}
              title={t.exportPdfBtn}
              className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/50 font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Share via Apps */}
            <button
              id="btn-share-report"
              onClick={handleShareReport}
              title={t.shareReportBtn}
              className="flex items-center gap-1.5 bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-600/50 font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer text-xs shadow-sm"
            >
              <Share2 className="w-4 h-4 text-teal-400" />
              <span>{t.shareReportBtn}</span>
            </button>

            {/* Print Button */}
            <button
              id="btn-print-daily-report"
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printDailyReport}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Date Selector Bar */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Top Switcher: Daily vs Monthly & All vs Per Person vs Audit Log */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Period Selector (Daily vs Monthly) */}
          {reportMode !== 'AUDIT_LOG' ? (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full lg:w-auto">
              <button
                onClick={() => setPeriodType('DAY')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  periodType === 'DAY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t.dailyReportTab}</span>
              </button>
              <button
                onClick={() => setPeriodType('MONTH')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  periodType === 'MONTH'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{t.monthlyReportTab}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold bg-amber-950/40 border border-amber-500/30 px-3.5 py-2 rounded-xl w-full lg:w-auto">
              <Activity className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{language === 'ar' ? 'سجل العمليات والرقابة التفصيلية' : 'Audit Trail & Operations Feed'}</span>
            </div>
          )}

          {/* Report Breakdown Sub-Tabs (All Sales vs Per Person vs Audit Log) */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full lg:w-auto overflow-x-auto">
            <button
              id="btn-report-all-sales"
              onClick={() => setReportMode('ALL_SALES')}
              className={`flex-1 lg:flex-none px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                reportMode === 'ALL_SALES'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? '📊 تقرير المبيعات العام' : '📊 Overall Sales'}
            </button>
            <button
              id="btn-report-per-person"
              onClick={() => setReportMode('PER_PERSON')}
              className={`flex-1 lg:flex-none px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                reportMode === 'PER_PERSON'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.perPersonReportTab}
            </button>
            <button
              id="btn-report-audit-log"
              onClick={() => setReportMode('AUDIT_LOG')}
              className={`flex-1 lg:flex-none px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                reportMode === 'AUDIT_LOG'
                  ? 'bg-amber-600 text-white shadow-sm border border-amber-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'ar' ? '🛡️ سجل العمليات (Audit Log)' : '🛡️ Audit Log'}</span>
            </button>
          </div>
        </div>

        {/* Date / Month & Cashier Filters (Only for Sales Reports) */}
        {reportMode !== 'AUDIT_LOG' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              {periodType === 'DAY' ? (
                <>
                  {/* Date Picker */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                    <Calendar className="w-4 h-4 text-emerald-400 ml-2" />
                    <span className="text-slate-400 ml-2">{t.selectReportDate}:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Quick Today Button */}
                  <button
                    onClick={() => setSelectedDate(todayStr)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl border border-slate-700 cursor-pointer"
                  >
                    {language === 'ar' ? 'اليوم' : 'Today'}
                  </button>
                </>
              ) : (
                <>
                  {/* Month Picker */}
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                    <CalendarDays className="w-4 h-4 text-teal-400 ml-2" />
                    <span className="text-slate-400 ml-2">{t.selectMonthLabel}</span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Quick Current Month Button */}
                  <button
                    onClick={() => setSelectedMonth(currentMonthStr)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl border border-slate-700 cursor-pointer"
                  >
                    {language === 'ar' ? 'الشهر الحالي' : 'Current Month'}
                  </button>
                </>
              )}

              {/* Cashier Selector */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                <User className="w-4 h-4 text-teal-400 ml-2" />
                <select
                  value={selectedCashier}
                  onChange={(e) => setSelectedCashier(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">
                    {t.allCashiers}
                  </option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.name} className="bg-slate-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Export Shortcuts */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden sm:inline font-mono">
                {reportSummary.invoiceCount} {language === 'ar' ? 'فاتورة' : 'Invoices'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Either Audit Log or Printable Report Card */}
      {reportMode === 'AUDIT_LOG' ? (
        <UserActivityLogPanel />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
        {/* Printable Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-slate-800 text-center sm:text-right gap-2">
          <div>
            <h3 className="text-xl font-black text-white">
              {settings.storeName || (language === 'ar' ? 'تقرير فلو اب' : 'FlowUp Report')}
            </h3>
            <div className="text-xs text-slate-400 mt-1">
              {periodType === 'MONTH' ? t.monthSummaryTitle : t.daySummaryTitle}:{' '}
              <strong className="text-emerald-400 font-mono text-sm">
                {periodType === 'DAY'
                  ? selectedDate ? new Date(selectedDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US') : ''
                  : selectedMonth}
              </strong>{' '}
              ({periodType === 'DAY' ? selectedDate : selectedMonth})
            </div>
          </div>

          <div className="text-xs text-slate-400 text-left">
            <div>
              {language === 'ar' ? 'تم استخراج التقرير:' : 'Generated at:'}{' '}
              <span className="font-mono text-slate-200">
                {new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </span>
            </div>
            <div className="text-emerald-400 font-bold mt-0.5">
              {language === 'ar' ? 'عدد فواتير البيع:' : 'Total Invoices:'} {reportSummary.invoiceCount}{' '}
              {language === 'ar' ? 'فاتورة' : 'Invoices'}
            </div>
          </div>
        </div>

        {/* Primary Metrics Grid (كاش / تحويل / شبكة / آجل) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Sales Revenue */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-between">
              <span>{language === 'ar' ? 'إجمالي المبيعات الكلية' : 'Total Sales Revenue'}</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {(reportSummary?.totalSalesRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {language === 'ar' ? 'إجمالي القطع المباعة:' : 'Items Sold:'}{' '}
              <span className="font-bold text-slate-200">{reportSummary?.totalItemsSold ?? 0}</span>
            </div>
          </div>

          {/* Cash Sales (كاش) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-between">
              <span>{language === 'ar' ? 'مبيعات نقدية (كاش)' : 'Cash in Till'}</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {(reportSummary?.totalCashSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {language === 'ar' ? 'المقبوض نقداً في الخزينة' : 'Physical Cash Collected'}
            </div>
          </div>

          {/* Bank Transfer Sales (تحويل) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-between">
              <span>{language === 'ar' ? 'مبيعات تحويل بنكي' : 'Bank Transfers'}</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
              {(reportSummary?.totalTransferSales ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {language === 'ar' ? 'حوالات الحساب البنكي' : 'Bank Wire Receipts'}
            </div>
          </div>

          {/* Card & Credit Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-between">
              <span>{language === 'ar' ? 'شبكة بطاقات + آجل' : 'POS Cards + Credit'}</span>
              <CreditCard className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-teal-400 font-mono">
              {((reportSummary?.totalCardSales ?? 0) + (reportSummary?.totalCreditSales ?? 0)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}{' '}
              <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between font-mono">
              <span>
                {language === 'ar' ? 'شبكة:' : 'Card:'} {(reportSummary?.totalCardSales ?? 0).toFixed(2)}
              </span>
              <span>
                {language === 'ar' ? 'آجل:' : 'Credit:'} {(reportSummary?.totalCreditSales ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Estimated Profit Banner */}
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-white">
                {language === 'ar' ? 'هامش الربح التقديري للفترة' : 'Estimated Period Profit Margin'}
              </div>
              <div className="text-emerald-400/80 text-[11px]">
                {language === 'ar'
                  ? 'محسوب على أساس: سعر البيع - سعر التكلفة للأصناف المباعة خلال الفترة'
                  : 'Calculated based on: Sale Price - Cost Price of items sold'}
              </div>
            </div>
          </div>

          <div className="text-left font-mono">
            <span className="text-xs text-slate-400 ml-2">
              {language === 'ar' ? 'صافي الربح التقديري:' : 'Estimated Net Profit:'}
            </span>
            <span className="text-xl font-black text-emerald-400">
              +{((reportSummary?.netProfit ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs text-slate-300 font-sans">{settings.currency}</span>
            </span>
          </div>
        </div>

        {/* View 1: Per Person Report Table (التقرير اليومي لكل شخص) */}
        {reportMode === 'PER_PERSON' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <User className="w-4 h-4 text-teal-400" />
                <span>{t.perPersonReportTab}</span>
              </h4>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">{language === 'ar' ? 'اسم الموظف / الشخص' : 'Staff / Cashier Name'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'عدد الفواتير' : 'Invoices'}</th>
                    <th className="p-3 text-center text-emerald-400">{language === 'ar' ? 'مبيعات كاش' : 'Cash'}</th>
                    <th className="p-3 text-center text-blue-400">{language === 'ar' ? 'مبيعات تحويل' : 'Transfer'}</th>
                    <th className="p-3 text-center text-teal-400">{language === 'ar' ? 'مبيعات شبكة' : 'Card'}</th>
                    <th className="p-3 text-center text-amber-400">{language === 'ar' ? 'مبيعات آجل' : 'Credit'}</th>
                    <th className="p-3 text-center font-bold text-white">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {reportSummary.cashiersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 text-xs">
                        {language === 'ar' ? 'لا توجد مبيعات مسجلة لأي موظف في هذه الفترة' : 'No cashier sales recorded'}
                      </td>
                    </tr>
                  ) : (
                    reportSummary.cashiersList.map((cashier) => (
                      <tr key={cashier.cashierName} className="hover:bg-slate-800/40 font-mono">
                        <td className="p-3 font-bold text-white font-sans">{cashier.cashierName}</td>
                        <td className="p-3 text-center">{cashier.invoiceCount}</td>
                        <td className="p-3 text-center text-emerald-400">{cashier.cash.toFixed(2)}</td>
                        <td className="p-3 text-center text-blue-400">{cashier.transfer.toFixed(2)}</td>
                        <td className="p-3 text-center text-teal-400">{cashier.card.toFixed(2)}</td>
                        <td className="p-3 text-center text-amber-400">{cashier.credit.toFixed(2)}</td>
                        <td className="p-3 text-center font-black text-emerald-400 text-sm">
                          {cashier.totalSales.toFixed(2)} {settings.currency}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* View 2: All Sales Report & Invoices for the period */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? 'فواتير وحركات المبيعات التفصيلية' : 'Transactions & Invoices Log'}</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {periodTransactions.length} {language === 'ar' ? 'فاتورة' : 'Invoices'}
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/90 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">{language === 'ar' ? 'الوقت / التاريخ' : 'Time/Date'}</th>
                    <th className="p-3">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                    <th className="p-3">{language === 'ar' ? 'العميل / الطرف' : 'Customer'}</th>
                    <th className="p-3">{language === 'ar' ? 'البائع / الكاشير' : 'Cashier'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'نوع البيع' : 'Type'}</th>
                    <th className="p-3 text-center font-bold text-white">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {periodTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {language === 'ar' ? 'لا توجد مبيعات في الفترة المحددة' : 'No sales found for selected period'}
                      </td>
                    </tr>
                  ) : (
                    periodTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 font-mono">
                          {periodType === 'MONTH'
                            ? new Date(tx.timestamp).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(tx.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                        </td>
                        <td className="p-3 font-mono font-bold text-white">{tx.invoiceNumber}</td>
                        <td className="p-3 font-bold text-slate-200">{tx.partyName || (language === 'ar' ? 'عميل نقدي' : 'Cash Customer')}</td>
                        <td className="p-3 text-slate-300">{tx.cashierName}</td>
                        <td className="p-3 text-center">
                          <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                            {tx.paymentMethod === 'CASH'
                              ? language === 'ar' ? 'كاش' : 'Cash'
                              : tx.paymentMethod === 'TRANSFER'
                              ? language === 'ar' ? 'تحويل' : 'Wire'
                              : language === 'ar' ? 'شبكة' : 'Card'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              tx.type === 'CREDIT_SALE'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {tx.type === 'CREDIT_SALE'
                              ? language === 'ar' ? 'آجل' : 'Credit'
                              : language === 'ar' ? 'نقدي' : 'Cash'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-black text-emerald-400 text-sm">
                          {tx.totalAmount.toFixed(2)} {settings.currency}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Top Selling Items */}
            {reportSummary.topItemsList.length > 0 && (
              <div className="pt-2">
                <div className="font-bold text-xs text-slate-300 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'ar' ? 'الأصناف الأكثر مبيعاً في الفترة:' : 'Top Selling Items:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {reportSummary.topItemsList.slice(0, 6).map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {language === 'ar' ? 'الكمية المباعة:' : 'Qty Sold:'}{' '}
                          <strong className="text-slate-200">{item.quantity}</strong>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-400 text-xs shrink-0">
                        {item.revenue.toFixed(2)} {settings.currency}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
};
