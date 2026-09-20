import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Transaction, StoreSettings } from '../types';
import { copyToClipboard } from './clipboardUtils';

export interface DailyReportSummaryData {
  periodType: 'DAY' | 'MONTH' | 'CUSTOM';
  selectedDate: string; // YYYY-MM-DD or YYYY-MM
  startDate?: string;
  endDate?: string;
  invoiceCount: number;
  totalSalesRevenue: number;
  totalCashSales: number;
  totalTransferSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  totalEstimatedCost: number;
  netProfit: number;
  totalItemsSold: number;
  cashiersList: {
    cashierName: string;
    invoiceCount: number;
    totalSales: number;
    cash: number;
    transfer: number;
    card: number;
    credit: number;
  }[];
  topItemsList: {
    name: string;
    barcode: string;
    quantity: number;
    revenue: number;
  }[];
  transactions: Transaction[];
}

/**
 * Format currency number nicely
 */
const fmtNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Export report to XLSX (Excel) workbook with multiple structured sheets
 */
export const exportReportToExcel = (data: DailyReportSummaryData, settings: StoreSettings, filenamePrefix = 'report') => {
  const wb = XLSX.utils.book_new();
  const currencySymbol = settings.currency || 'ر.س';

  // 1. Summary Sheet
  const summaryRows = [
    ['اسم المنشأة / المتجر', settings.storeName || 'المتجر'],
    ['نوع التقرير', data.periodType === 'MONTH' ? 'تقرير المبيعات الشهري' : 'تقرير المبيعات اليومي'],
    ['الفترة / التاريخ', data.selectedDate],
    ['تاريخ ووقت الاستخراج', new Date().toLocaleString('ar-SA')],
    ['العملة الأساسية', currencySymbol],
    [],
    ['--- ملخص المؤشرات المالية والتشغيلية ---', ''],
    ['إجمالي إيرادات المبيعات', data.totalSalesRevenue, currencySymbol],
    ['صافي الربح التقديري', data.netProfit, currencySymbol],
    ['تكلفة البضاعة المباعة التقديرية', data.totalEstimatedCost, currencySymbol],
    ['إجمالي عدد فواتير البيع', data.invoiceCount, 'فاتورة'],
    ['إجمالي عدد القطع المباعة', data.totalItemsSold, 'قطعة'],
    [],
    ['--- تفاصيل طرق الدفع والتحصيل ---', ''],
    ['مبيعات نقدية (كاش الخزينة)', data.totalCashSales, currencySymbol],
    ['مبيعات تحويل بنكي', data.totalTransferSales, currencySymbol],
    ['مبيعات شبكة / بطاقات', data.totalCardSales, currencySymbol],
    ['مبيعات آجل (ذمم مدينة)', data.totalCreditSales, currencySymbol],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'الملخص العام');

  // 2. Cashiers / Sales Reps Performance Sheet
  const cashierHeaders = ['اسم الموظف / الكاشير', 'عدد الفواتير', 'مبيعات كاش', 'مبيعات تحويل', 'مبيعات شبكة', 'مبيعات آجل', 'إجمالي المبيعات'];
  const cashierRows = data.cashiersList.map((c) => [
    c.cashierName,
    c.invoiceCount,
    c.cash,
    c.transfer,
    c.card,
    c.credit,
    c.totalSales,
  ]);
  const cashierWs = XLSX.utils.aoa_to_sheet([cashierHeaders, ...cashierRows]);
  XLSX.utils.book_append_sheet(wb, cashierWs, 'أداء الكاشيرات');

  // 3. Transactions / Invoices Detailed Sheet
  const txHeaders = [
    'رقم الفاتورة',
    'التاريخ والوقت',
    'العميل / الطرف',
    'اسم الكاشير',
    'طريقة الدفع',
    'نوع الفاتورة',
    'المبلغ الإجمالي',
    'المبلغ المدفوع',
    'المتبقي آجل',
    'ملاحظات',
  ];
  const txRows = data.transactions.map((tx) => [
    tx.invoiceNumber,
    new Date(tx.timestamp).toLocaleString('ar-SA'),
    tx.partyName || 'عميل نقدي عام',
    tx.cashierName,
    tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة',
    tx.type === 'CREDIT_SALE' ? 'آجل' : 'نقدي',
    tx.totalAmount,
    tx.paidAmount,
    tx.remainingDebt,
    tx.notes || '',
  ]);
  const txWs = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  XLSX.utils.book_append_sheet(wb, txWs, 'سجل الفواتير التفصيلي');

  // 4. Top Sold Items Sheet
  if (data.topItemsList.length > 0) {
    const itemHeaders = ['اسم الصنف', 'الباركود', 'الكمية المباعة', 'إجمالي المبيعات'];
    const itemRows = data.topItemsList.map((item) => [
      item.name,
      item.barcode || '-',
      item.quantity,
      item.revenue,
    ]);
    const itemWs = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
    XLSX.utils.book_append_sheet(wb, itemWs, 'الأصناف المباعة');
  }

  // Trigger Download
  const cleanDate = data.selectedDate.replace(/[^0-9a-zA-Z_-]/g, '_');
  const fullFilename = `${filenamePrefix}_${cleanDate}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
};

/**
 * Generate and trigger download or share of a beautifully styled PDF report
 */
export const exportReportToPDF = (data: DailyReportSummaryData, settings: StoreSettings, filenamePrefix = 'report') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySymbol = settings.currency || 'SAR';
  const isMonth = data.periodType === 'MONTH';
  const reportTitle = isMonth ? 'تقرير المبيعات والأرباح الشهري' : 'تقرير المبيعات والأرباح اليومي';

  // Background Header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Store Brand Name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(settings.storeName || 'FlowUp Store Management', 14, 15);

  // Subtitle / Report Type
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`${reportTitle} - Period: ${data.selectedDate}`, 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${new Date().toLocaleString('en-US')} | Total Invoices: ${data.invoiceCount}`, 14, 30);

  // Key KPI Cards (Overview Boxes)
  let y = 46;

  // Box 1: Total Sales
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL SALES', 18, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`${fmtNum(data.totalSalesRevenue)}`, 18, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(currencySymbol, 18, y + 19);

  // Box 2: Net Profit
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(61, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTIMATED PROFIT', 65, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`+${fmtNum(data.netProfit)}`, 65, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(currencySymbol, 65, y + 19);

  // Box 3: Cash Collected
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CASH IN TILL', 112, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fmtNum(data.totalCashSales)}`, 112, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(currencySymbol, 112, y + 19);

  // Box 4: Bank / Card / Credit
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(155, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BANK & CARD', 159, y + 6);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fmtNum(data.totalTransferSales + data.totalCardSales)}`, 159, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Credit: ${fmtNum(data.totalCreditSales)}`, 159, y + 19);

  y += 30;

  // Section 1: Staff / Cashier Sales Table
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Cashier & Staff Sales Breakdown', 14, y);
  y += 3;

  const cashierBody = data.cashiersList.map((c) => [
    c.cashierName || 'Staff',
    c.invoiceCount.toString(),
    fmtNum(c.cash),
    fmtNum(c.transfer),
    fmtNum(c.card),
    fmtNum(c.credit),
    `${fmtNum(c.totalSales)} ${currencySymbol}`,
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Cashier', 'Invoices', 'Cash', 'Transfer', 'Card/POS', 'Credit', 'Total Sales']],
    body: cashierBody.length > 0 ? cashierBody : [['No cashier sales recorded', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Section 2: Invoices Log Table (First 35 transactions to keep concise)
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Transactions & Invoices Log', 14, y);
  y += 3;

  const txBody = data.transactions.slice(0, 40).map((tx) => [
    tx.invoiceNumber,
    new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    tx.partyName || 'Walk-in Customer',
    tx.cashierName,
    tx.paymentMethod,
    tx.type === 'CREDIT_SALE' ? 'Credit' : 'Cash',
    `${fmtNum(tx.totalAmount)} ${currencySymbol}`,
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Invoice #', 'Time', 'Customer', 'Cashier', 'Method', 'Type', 'Amount']],
    body: txBody.length > 0 ? txBody : [['No transactions found', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  });

  // Footer note on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${settings.storeName || 'FlowUp'} - Page ${i} of ${pageCount} | Generated automatically`,
      14,
      288
    );
  }

  // Trigger download
  const cleanDate = data.selectedDate.replace(/[^0-9a-zA-Z_-]/g, '_');
  const fullFilename = `${filenamePrefix}_${cleanDate}.pdf`;
  doc.save(fullFilename);
};

/**
 * Native Web Share API to share the generated summary report text and file via WhatsApp / Telegram / Mail
 */
export const shareReportSummary = async (data: DailyReportSummaryData, settings: StoreSettings) => {
  const currencySymbol = settings.currency || 'ر.س';
  const isMonth = data.periodType === 'MONTH';
  const periodLabel = isMonth ? `شهر ${data.selectedDate}` : `يوم ${data.selectedDate}`;

  const shareText = `📊 *${settings.storeName || 'تقرير المبيعات'}*
🗓️ *الفترة:* ${periodLabel}
⏱️ *تاريخ الاستخراج:* ${new Date().toLocaleString('ar-SA')}

💰 *إجمالي المبيعات:* ${fmtNum(data.totalSalesRevenue)} ${currencySymbol}
✨ *صافي الربح التقديري:* +${fmtNum(data.netProfit)} ${currencySymbol}
🧾 *عدد الفواتير:* ${data.invoiceCount} فاتورة
📦 *القطع المباعة:* ${data.totalItemsSold} قطعة

💵 *المبيعات النقدية (كاش):* ${fmtNum(data.totalCashSales)} ${currencySymbol}
🏦 *تحويل بنكي:* ${fmtNum(data.totalTransferSales)} ${currencySymbol}
💳 *شبكة بطاقات:* ${fmtNum(data.totalCardSales)} ${currencySymbol}
⏳ *مبيعات آجل:* ${fmtNum(data.totalCreditSales)} ${currencySymbol}

👥 *أداء الموظفين والكاشيرات:*
${data.cashiersList.map((c) => `• ${c.cashierName}: ${fmtNum(c.totalSales)} ${currencySymbol} (${c.invoiceCount} فاتورة)`).join('\n') || 'لا توجد مبيعات'}

📌 تم الاستخراج بنجاح عبر نظام إدارة المبيعات والمخزون`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${settings.storeName || 'تقرير المبيعات'} - ${data.selectedDate}`,
        text: shareText,
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback to clipboard
        await copyToClipboard(shareText);
        return { success: true, method: 'clipboard' };
      }
      return { success: false, method: 'cancelled' };
    }
  } else {
    // Copy to clipboard
    await copyToClipboard(shareText);
    return { success: true, method: 'clipboard' };
  }
};
