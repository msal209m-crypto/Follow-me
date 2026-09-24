import { Transaction, StoreSettings } from '../types';
import { copyToClipboard } from './clipboardUtils';

/**
 * Universal safe execution of autoTable supporting both prototype attachment and direct invocation
 */
function runAutoTable(doc: any, autoTableFn: any, options: any) {
  if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(options);
  } else if (typeof autoTableFn === 'function') {
    autoTableFn(doc, options);
  } else if (typeof (autoTableFn as any)?.default === 'function') {
    (autoTableFn as any).default(doc, options);
  } else {
    throw new Error('autoTable plugin could not be initialized');
  }
}

/**
 * Resolve whether the report should be in Arabic or English
 */
export function resolveReportLanguage(explicitLang?: 'ar' | 'en' | string, settings?: StoreSettings): 'ar' | 'en' {
  if (explicitLang === 'ar' || explicitLang === 'en') return explicitLang;
  if (settings?.language === 'ar' || settings?.language === 'en') return settings.language;
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('flowapp_v4_language') : null;
    if (stored === 'en') return 'en';
  } catch {}
  return 'ar';
}

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
 * Export report to XLSX (Excel) workbook with bilingual support (Arabic / English)
 */
export const exportReportToExcel = async (
  data: DailyReportSummaryData,
  settings: StoreSettings,
  filenamePrefix = 'report',
  customLanguage?: 'ar' | 'en'
) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const lang = resolveReportLanguage(customLanguage, settings);
  const isAr = lang === 'ar';
  const currencySymbol = settings.currency || (isAr ? 'ر.س' : 'SAR');

  // 1. Summary Sheet
  const summaryRows = isAr ? [
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
  ] : [
    ['Store / Business Name', settings.storeName || 'Store'],
    ['Report Type', data.periodType === 'MONTH' ? 'Monthly Sales Report' : 'Daily Sales Report'],
    ['Period / Date', data.selectedDate],
    ['Generated Date & Time', new Date().toLocaleString('en-US')],
    ['Base Currency', currencySymbol],
    [],
    ['--- Financial & Operational KPIs ---', ''],
    ['Total Sales Revenue', data.totalSalesRevenue, currencySymbol],
    ['Estimated Net Profit', data.netProfit, currencySymbol],
    ['Estimated Cost of Goods Sold (COGS)', data.totalEstimatedCost, currencySymbol],
    ['Total Invoices Count', data.invoiceCount, 'invoices'],
    ['Total Items Sold', data.totalItemsSold, 'units'],
    [],
    ['--- Payment Methods Breakdown ---', ''],
    ['Cash Sales (Till)', data.totalCashSales, currencySymbol],
    ['Bank Transfer', data.totalTransferSales, currencySymbol],
    ['Card / POS Payments', data.totalCardSales, currencySymbol],
    ['Credit / Receivables', data.totalCreditSales, currencySymbol],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, isAr ? 'الملخص العام' : 'Executive Summary');

  // 2. Cashiers / Sales Reps Performance Sheet
  const cashierHeaders = isAr
    ? ['اسم الموظف / الكاشير', 'عدد الفواتير', 'مبيعات كاش', 'مبيعات تحويل', 'مبيعات شبكة', 'مبيعات آجل', 'إجمالي المبيعات']
    : ['Cashier / Staff Name', 'Invoices Count', 'Cash Sales', 'Transfer Sales', 'Card / POS', 'Credit Sales', 'Total Sales'];

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
  XLSX.utils.book_append_sheet(wb, cashierWs, isAr ? 'أداء الكاشيرات' : 'Staff Performance');

  // 3. Transactions / Invoices Detailed Sheet
  const txHeaders = isAr ? [
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
  ] : [
    'Invoice Number',
    'Date & Time',
    'Customer / Party',
    'Cashier',
    'Payment Method',
    'Invoice Type',
    'Total Amount',
    'Paid Amount',
    'Remaining Debt',
    'Notes',
  ];

  const txRows = data.transactions.map((tx) => [
    tx.invoiceNumber,
    new Date(tx.timestamp).toLocaleString(isAr ? 'ar-SA' : 'en-US'),
    tx.partyName || (isAr ? 'عميل نقدي عام' : 'Walk-in Customer'),
    tx.cashierName,
    isAr 
      ? (tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة')
      : tx.paymentMethod,
    isAr 
      ? (tx.type === 'CREDIT_SALE' ? 'آجل' : 'نقدي')
      : (tx.type === 'CREDIT_SALE' ? 'Credit' : 'Cash'),
    tx.totalAmount,
    tx.paidAmount,
    tx.remainingDebt,
    tx.notes || '',
  ]);
  const txWs = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  XLSX.utils.book_append_sheet(wb, txWs, isAr ? 'سجل الفواتير التفصيلي' : 'Invoices Log');

  // 4. Top Sold Items Sheet
  if (data.topItemsList.length > 0) {
    const itemHeaders = isAr 
      ? ['اسم الصنف', 'الباركود', 'الكمية المباعة', 'إجمالي المبيعات']
      : ['Item Name', 'Barcode', 'Sold Quantity', 'Total Sales Revenue'];
    const itemRows = data.topItemsList.map((item) => [
      item.name,
      item.barcode || '-',
      item.quantity,
      item.revenue,
    ]);
    const itemWs = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
    XLSX.utils.book_append_sheet(wb, itemWs, isAr ? 'الأصناف المباعة' : 'Sold Products');
  }

  // Trigger Download
  const cleanDate = data.selectedDate.replace(/[^0-9a-zA-Z_-]/g, '_');
  const fullFilename = `${filenamePrefix}_${cleanDate}_${lang}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
};

/**
 * Generate and trigger download or share of a beautifully styled PDF report in Arabic or English
 */
export const exportReportToPDF = async (
  data: DailyReportSummaryData,
  settings: StoreSettings,
  filenamePrefix = 'report',
  customLanguage?: 'ar' | 'en'
) => {
  const { jsPDF } = await import('jspdf');
  const atModule = await import('jspdf-autotable');
  const autoTable = atModule.default || atModule;
  const applyPlugin = (atModule as any).applyPlugin;
  if (typeof applyPlugin === 'function') {
    try {
      applyPlugin(jsPDF);
    } catch {}
  }
  const { registerArabicFont, formatArabicPdfText } = await import('./arabicPdfFont');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const lang = resolveReportLanguage(customLanguage, settings);
  const isAr = lang === 'ar';
  const currencySymbol = settings.currency || (isAr ? 'ر.س' : 'SAR');
  const isMonth = data.periodType === 'MONTH';

  if (isAr) {
    registerArabicFont(doc);
    doc.setFont('KacstBook');
  } else {
    doc.setFont('helvetica');
  }

  const reportTitle = isMonth
    ? (isAr ? 'تقرير المبيعات والأرباح الشهري' : 'Monthly Sales & Profit Report')
    : (isAr ? 'تقرير المبيعات والأرباح اليومي' : 'Daily Sales & Profit Report');

  // Background Header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  const storeBrandName = settings.storeName || (isAr ? 'إدارة متجر قريتي' : 'FlowUp Store Management');

  // Store Brand Name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, storeBrandName), 196, 14, { align: 'right' });
  } else {
    doc.text(storeBrandName, 14, 14);
  }

  // Subtitle / Report Type
  doc.setFontSize(10.5);
  doc.setTextColor(52, 211, 153); // emerald-400
  const subText = isAr
    ? `${reportTitle} - الفترة: ${data.selectedDate}`
    : `${reportTitle} - Period: ${data.selectedDate}`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, subText), 196, 22, { align: 'right' });
  } else {
    doc.text(subText, 14, 22);
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const metaLine = isAr
    ? `تاريخ الإصدار: ${new Date().toLocaleString('ar-SA')} | إجمالي الفواتير: ${data.invoiceCount} فاتورة`
    : `Generated: ${new Date().toLocaleString('en-US')} | Total Invoices: ${data.invoiceCount}`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, metaLine), 196, 29, { align: 'right' });
  } else {
    doc.text(metaLine, 14, 29);
  }

  // Key KPI Cards (Overview Boxes)
  let y = 46;

  // Box 1: Total Sales
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'إجمالي المبيعات'), 52, y + 6, { align: 'right' });
  } else {
    doc.text('TOTAL SALES', 18, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`${fmtNum(data.totalSalesRevenue)}`, 18, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, currencySymbol), 52, y + 19, { align: 'right' });
  } else {
    doc.text(currencySymbol, 18, y + 19);
  }

  // Box 2: Net Profit
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(61, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'صافي الأرباح التقديري'), 99, y + 6, { align: 'right' });
  } else {
    doc.text('ESTIMATED PROFIT', 65, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`+${fmtNum(data.netProfit)}`, 65, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, currencySymbol), 99, y + 19, { align: 'right' });
  } else {
    doc.text(currencySymbol, 65, y + 19);
  }

  // Box 3: Cash Collected
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'النقد بالخزينة (كاش)'), 146, y + 6, { align: 'right' });
  } else {
    doc.text('CASH IN TILL', 112, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fmtNum(data.totalCashSales)}`, 112, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, currencySymbol), 146, y + 19, { align: 'right' });
  } else {
    doc.text(currencySymbol, 112, y + 19);
  }

  // Box 4: Bank / Card / Credit
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(155, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'شبكة وبطاقة وتحويل'), 193, y + 6, { align: 'right' });
  } else {
    doc.text('BANK & CARD', 159, y + 6);
  }
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${fmtNum(data.totalTransferSales + data.totalCardSales)}`, 159, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, `آجل: ${fmtNum(data.totalCreditSales)}`), 193, y + 19, { align: 'right' });
  } else {
    doc.text(`Credit: ${fmtNum(data.totalCreditSales)}`, 159, y + 19);
  }

  y += 30;

  // Section 1: Staff / Cashier Sales Table
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const sec1Title = isAr ? '1. تفصيل مبيعات الكاشيرات وفريق العمل' : '1. Cashier & Staff Sales Breakdown';
  if (isAr) {
    doc.text(formatArabicPdfText(doc, sec1Title), 196, y, { align: 'right' });
  } else {
    doc.text(sec1Title, 14, y);
  }
  y += 3;

  const fontName = isAr ? 'KacstBook' : 'helvetica';

  const cashierBody = data.cashiersList.map((c) => [
    isAr ? formatArabicPdfText(doc, c.cashierName || 'كاشير عام') : (c.cashierName || 'Staff'),
    c.invoiceCount.toString(),
    fmtNum(c.cash),
    fmtNum(c.transfer),
    fmtNum(c.card),
    fmtNum(c.credit),
    `${fmtNum(c.totalSales)} ${isAr ? formatArabicPdfText(doc, currencySymbol) : currencySymbol}`,
  ]);

  const cashierHeaders = isAr
    ? ['الكاشير', 'الفواتير', 'نقداً', 'تحويل', 'شبكة/بطاقة', 'آجل', 'إجمالي المبيعات'].map((h) => formatArabicPdfText(doc, h))
    : ['Cashier', 'Invoices', 'Cash', 'Transfer', 'Card/POS', 'Credit', 'Total Sales'];

  const noCashierText = isAr ? formatArabicPdfText(doc, 'لا توجد مبيعات مسجلة') : 'No cashier sales recorded';

  runAutoTable(doc, autoTable, {
    startY: y,
    head: [cashierHeaders],
    body: cashierBody.length > 0 ? cashierBody : [[noCashierText, '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { font: fontName, halign: isAr ? 'right' : 'left' },
    headStyles: { font: fontName, fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: isAr ? 'right' : 'left' },
    bodyStyles: { font: fontName, fontSize: 8, textColor: [30, 41, 59], halign: isAr ? 'right' : 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  y = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 10;

  // Section 2: Invoices Log Table
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const sec2Title = isAr ? '2. سجل الفواتير والمعاملات الأخيرة' : '2. Transactions & Invoices Log';
  if (isAr) {
    doc.text(formatArabicPdfText(doc, sec2Title), 196, y, { align: 'right' });
  } else {
    doc.text(sec2Title, 14, y);
  }
  y += 3;

  const txBody = data.transactions.slice(0, 40).map((tx) => [
    tx.invoiceNumber,
    new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isAr ? formatArabicPdfText(doc, tx.partyName || 'عميل نقدي عام') : (tx.partyName || 'Walk-in Customer'),
    isAr ? formatArabicPdfText(doc, tx.cashierName || 'كاشير') : tx.cashierName,
    isAr 
      ? formatArabicPdfText(doc, tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة')
      : tx.paymentMethod,
    isAr 
      ? formatArabicPdfText(doc, tx.type === 'CREDIT_SALE' ? 'آجل' : 'نقدي')
      : (tx.type === 'CREDIT_SALE' ? 'Credit' : 'Cash'),
    `${fmtNum(tx.totalAmount)} ${isAr ? formatArabicPdfText(doc, currencySymbol) : currencySymbol}`,
  ]);

  const txHeaders = isAr
    ? ['رقم الفاتورة', 'الوقت', 'العميل', 'الكاشير', 'طريقة الدفع', 'النوع', 'المبلغ'].map((h) => formatArabicPdfText(doc, h))
    : ['Invoice #', 'Time', 'Customer', 'Cashier', 'Method', 'Type', 'Amount'];

  const noTxText = isAr ? formatArabicPdfText(doc, 'لا توجد فواتير') : 'No transactions found';

  runAutoTable(doc, autoTable, {
    startY: y,
    head: [txHeaders],
    body: txBody.length > 0 ? txBody : [[noTxText, '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    styles: { font: fontName, halign: isAr ? 'right' : 'left' },
    headStyles: { font: fontName, fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: isAr ? 'right' : 'left' },
    bodyStyles: { font: fontName, fontSize: 7.5, textColor: [30, 41, 59], halign: isAr ? 'right' : 'left' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  });

  // Footer note on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    if (isAr) {
      doc.setFont('KacstBook');
      const footerAr = formatArabicPdfText(
        doc,
        `${storeBrandName} - صفحة ${i} من ${pageCount} | تم التصدير آلياً عبر نظام إدارة المبيعات`
      );
      doc.text(footerAr, 196, 288, { align: 'right' });
    } else {
      doc.setFont('helvetica');
      doc.text(
        `${storeBrandName} - Page ${i} of ${pageCount} | Generated automatically`,
        14,
        288
      );
    }
  }

  // Trigger download
  const cleanDate = data.selectedDate.replace(/[^0-9a-zA-Z_-]/g, '_');
  const fullFilename = `${filenamePrefix}_${cleanDate}_${lang}.pdf`;
  doc.save(fullFilename);
};

/**
 * Native Web Share API to share the generated summary report text and file via WhatsApp / Telegram / Mail
 */
export const shareReportSummary = async (
  data: DailyReportSummaryData,
  settings: StoreSettings,
  customLanguage?: 'ar' | 'en'
) => {
  const lang = resolveReportLanguage(customLanguage, settings);
  const isAr = lang === 'ar';
  const currencySymbol = settings.currency || (isAr ? 'ر.س' : 'SAR');
  const isMonth = data.periodType === 'MONTH';

  let shareText = '';
  if (isAr) {
    const periodLabel = isMonth ? `شهر ${data.selectedDate}` : `يوم ${data.selectedDate}`;
    shareText = `📊 *${settings.storeName || 'تقرير المبيعات'}*
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
  } else {
    const periodLabel = isMonth ? `Month ${data.selectedDate}` : `Day ${data.selectedDate}`;
    shareText = `📊 *${settings.storeName || 'Sales Report'}*
🗓️ *Period:* ${periodLabel}
⏱️ *Exported:* ${new Date().toLocaleString('en-US')}

💰 *Total Sales:* ${fmtNum(data.totalSalesRevenue)} ${currencySymbol}
✨ *Estimated Net Profit:* +${fmtNum(data.netProfit)} ${currencySymbol}
🧾 *Invoices Count:* ${data.invoiceCount}
📦 *Units Sold:* ${data.totalItemsSold}

💵 *Cash Sales:* ${fmtNum(data.totalCashSales)} ${currencySymbol}
🏦 *Bank Transfer:* ${fmtNum(data.totalTransferSales)} ${currencySymbol}
💳 *Card / POS:* ${fmtNum(data.totalCardSales)} ${currencySymbol}
⏳ *Credit Sales:* ${fmtNum(data.totalCreditSales)} ${currencySymbol}

👥 *Staff Performance:*
${data.cashiersList.map((c) => `• ${c.cashierName}: ${fmtNum(c.totalSales)} ${currencySymbol} (${c.invoiceCount} invoices)`).join('\n') || 'No sales recorded'}

📌 Generated via Store Management POS System`;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${settings.storeName || (isAr ? 'تقرير المبيعات' : 'Sales Report')} - ${data.selectedDate}`,
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

export interface InventoryAuditSummaryData {
  storeName: string;
  ownerName: string;
  phone?: string;
  taxNumber?: string;
  currency: string;
  periodLabel: string;
  generatedDate: string;
  totalItemTypes: number;
  totalUnitsCount: number;
  totalCostValuation: number;
  totalSaleValuation: number;
  expectedProfit: number;
  profitMargin: number;
  language?: 'ar' | 'en';
  items: {
    index: number;
    barcode: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    costPrice: number;
    salePrice: number;
    totalCost: number;
    totalSale: number;
    status: string;
  }[];
}

/**
 * Generate and trigger download of an official PDF inventory audit report in Arabic or English
 */
export const exportInventoryAuditToPDF = async (
  data: InventoryAuditSummaryData,
  filenamePrefix = 'inventory_audit_report',
  customLanguage?: 'ar' | 'en'
) => {
  const { jsPDF } = await import('jspdf');
  const atModule = await import('jspdf-autotable');
  const autoTable = atModule.default || atModule;
  const applyPlugin = (atModule as any).applyPlugin;
  if (typeof applyPlugin === 'function') {
    try {
      applyPlugin(jsPDF);
    } catch {}
  }
  const { registerArabicFont, formatArabicPdfText } = await import('./arabicPdfFont');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const lang = resolveReportLanguage(customLanguage || data.language);
  const isAr = lang === 'ar';
  const currencySymbol = data.currency || (isAr ? 'ر.س' : 'SAR');

  if (isAr) {
    registerArabicFont(doc);
    doc.setFont('KacstBook');
  } else {
    doc.setFont('helvetica');
  }

  // 1. Dark Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 42, 'F');

  const storeName = data.storeName || (isAr ? 'إدارة المتجر والمخزون' : 'Store Management');
  const ownerName = data.ownerName || (isAr ? 'التاجر' : 'Merchant');

  // Store Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, storeName), 196, 14, { align: 'right' });
  } else {
    doc.text(storeName, 14, 14);
  }

  // Owner Name & Store Details
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const ownerDetails = isAr
    ? `مالك المتجر: ${ownerName} | رقم الهاتف: ${data.phone || '-'}`
    : `Store Owner: ${ownerName} | Phone: ${data.phone || '-'}`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, ownerDetails), 196, 21, { align: 'right' });
  } else {
    doc.text(ownerDetails, 14, 21);
  }

  if (data.taxNumber && data.taxNumber !== '-') {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const taxLine = isAr ? `الرقم الضريبي: ${data.taxNumber}` : `Tax Number: ${data.taxNumber}`;
    if (isAr) {
      doc.text(formatArabicPdfText(doc, taxLine), 196, 27, { align: 'right' });
    } else {
      doc.text(taxLine, 14, 27);
    }
  }

  // Subtitle / Report Type & Date
  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153); // emerald-400
  const reportSubtitle = isAr
    ? `تقرير جرد وتقييم المخزون العام - ${data.periodLabel}`
    : `INVENTORY AUDIT REPORT - ${data.periodLabel}`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, reportSubtitle), 196, 33, { align: 'right' });
  } else {
    doc.text(reportSubtitle, 14, 33);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const metaReport = isAr
    ? `تاريخ الإصدار: ${data.generatedDate} | إجمالي الأصناف المسجلة: ${data.totalItemTypes}`
    : `Generated: ${data.generatedDate} | Unique Items: ${data.totalItemTypes}`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, metaReport), 196, 39, { align: 'right' });
  } else {
    doc.text(metaReport, 14, 39);
  }

  // 2. Summary KPI Cards
  let y = 48;

  // Box 1: Total Item Types
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'إجمالي الأصناف'), 52, y + 6, { align: 'right' });
  } else {
    doc.text('TOTAL ITEMS', 18, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.totalItemTypes} ${isAr ? formatArabicPdfText(doc, 'صنف') : 'Items'}`, 18, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const unitsText = isAr
    ? `${data.totalUnitsCount.toLocaleString()} قطعة بالمخزن`
    : `${data.totalUnitsCount.toLocaleString()} Units in Stock`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, unitsText), 52, y + 19, { align: 'right' });
  } else {
    doc.text(unitsText, 18, y + 19);
  }

  // Box 2: Total Cost Valuation
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(61, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'قيمة التكلفة الإجمالية'), 99, y + 6, { align: 'right' });
  } else {
    doc.text('TOTAL COST VALUE', 65, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`${fmtNum(data.totalCostValuation)}`, 65, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, currencySymbol), 99, y + 19, { align: 'right' });
  } else {
    doc.text(currencySymbol, 65, y + 19);
  }

  // Box 3: Total Sales Valuation
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'القيمة البيعية المتوقعة'), 146, y + 6, { align: 'right' });
  } else {
    doc.text('TOTAL SALES VALUE', 112, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text(`${fmtNum(data.totalSaleValuation)}`, 112, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, currencySymbol), 146, y + 19, { align: 'right' });
  } else {
    doc.text(currencySymbol, 112, y + 19);
  }

  // Box 4: Expected Profit & Margin
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(155, y, 42, 22, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (isAr) {
    doc.text(formatArabicPdfText(doc, 'الأرباح التقديرية'), 193, y + 6, { align: 'right' });
  } else {
    doc.text('EXPECTED PROFIT', 159, y + 6);
  }
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`+${fmtNum(data.expectedProfit)}`, 159, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const marginText = isAr ? `الهامش: ~${data.profitMargin.toFixed(1)}%` : `Margin: ~${data.profitMargin.toFixed(1)}%`;
  if (isAr) {
    doc.text(formatArabicPdfText(doc, marginText), 193, y + 19, { align: 'right' });
  } else {
    doc.text(marginText, 159, y + 19);
  }

  y += 28;

  // 3. Items Detailed Inventory Table
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const tableTitle = isAr ? 'سجل تفاصيل أصناف المخزون وتقييم الأسعار' : 'Detailed Inventory Items & Valuation Log';
  if (isAr) {
    doc.text(formatArabicPdfText(doc, tableTitle), 196, y, { align: 'right' });
  } else {
    doc.text(tableTitle, 14, y);
  }
  y += 3;

  const fontName = isAr ? 'KacstBook' : 'helvetica';

  const tableBody = data.items.map((it) => [
    it.index.toString(),
    it.barcode || '-',
    isAr ? formatArabicPdfText(doc, it.name) : it.name,
    isAr ? formatArabicPdfText(doc, it.category || 'عام') : (it.category || 'General'),
    `${it.quantity} ${isAr ? formatArabicPdfText(doc, it.unit) : it.unit}`,
    fmtNum(it.costPrice),
    fmtNum(it.salePrice),
    fmtNum(it.totalCost),
    fmtNum(it.totalSale),
    isAr ? formatArabicPdfText(doc, it.status) : it.status,
  ]);

  const auditHeaders = isAr
    ? ['م', 'الباركود', 'اسم الصنف', 'التصنيف', 'الكمية', 'التكلفة', 'البيع', 'إجمالي التكلفة', 'إجمالي البيع', 'الحالة'].map((h) => formatArabicPdfText(doc, h))
    : ['#', 'Barcode', 'Item Name', 'Category', 'Stock Qty', 'Cost', 'Sale', 'Total Cost', 'Total Sale', 'Status'];

  const noItemsFoundText = isAr ? formatArabicPdfText(doc, 'لا توجد أصناف مسجلة') : 'No items found';

  runAutoTable(doc, autoTable, {
    startY: y,
    head: [auditHeaders],
    body: tableBody.length > 0 ? tableBody : [[noItemsFoundText, '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: { font: fontName, halign: isAr ? 'right' : 'left' },
    headStyles: { font: fontName, fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: isAr ? 'right' : 'left' },
    bodyStyles: { font: fontName, fontSize: 7, textColor: [30, 41, 59], halign: isAr ? 'right' : 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 30;

  // Signatures / Approvals Block (check if we need new page or fits on page)
  let signY = finalY + 14;
  if (signY > 260) {
    doc.addPage();
    signY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, signY, 90, signY);
  doc.line(120, signY, 196, signY);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (isAr) {
    doc.setFont('KacstBook');
    doc.text(formatArabicPdfText(doc, 'توقيع مسؤول المستودع / الجرد'), 90, signY + 5, { align: 'right' });
    doc.text(formatArabicPdfText(doc, `اعتماد مالك المتجر: ${ownerName} (الختم الرسمي)`), 196, signY + 5, { align: 'right' });
  } else {
    doc.setFont('helvetica');
    doc.text('Warehouse / Inventory Auditor Signature', 14, signY + 5);
    doc.text(`Store Owner: ${ownerName} (Official Approval & Stamp)`, 120, signY + 5);
  }

  // Page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    if (isAr) {
      doc.setFont('KacstBook');
      const footerAr = formatArabicPdfText(
        doc,
        `${storeName} - تقرير جرد المخزون | صفحة ${i} من ${pageCount} | أُصدر لمالك المتجر: ${ownerName}`
      );
      doc.text(footerAr, 196, 290, { align: 'right' });
    } else {
      doc.setFont('helvetica');
      doc.text(
        `${storeName} - Inventory Audit | Page ${i} of ${pageCount} | Generated for ${ownerName}`,
        14,
        290
      );
    }
  }

  // Trigger Save
  const cleanStore = (storeName || 'store').replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
  const fullFilename = `${filenamePrefix}_${cleanStore}_${lang}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fullFilename);
};

/**
 * Share Inventory Audit Summary via Web Share API or Clipboard with Arabic/English support
 */
export const shareInventoryAuditSummary = async (
  data: InventoryAuditSummaryData,
  customLanguage?: 'ar' | 'en'
) => {
  const lang = resolveReportLanguage(customLanguage || data.language);
  const isAr = lang === 'ar';

  let shareText = '';
  if (isAr) {
    shareText = `📦 *تقرير جرد المخزون الشامل*
🏪 *المتجر:* ${data.storeName}
👤 *صاحب المتجر:* ${data.ownerName}
🗓️ *الفترة:* ${data.periodLabel}
⏱️ *تاريخ الجرد:* ${data.generatedDate}

📋 *الملخص التنفيذي للمخزون:*
• إجمالي أنواع الأصناف: ${data.totalItemTypes} صنف
• إجمالي عدد القطع بالمخزن: ${data.totalUnitsCount.toLocaleString()} قطعة
• إجمالي قيمة التكلفة: ${fmtNum(data.totalCostValuation)} ${data.currency}
• إجمالي القيمة البيعية المتوقعة: ${fmtNum(data.totalSaleValuation)} ${data.currency}
• صافي الأرباح المتوقعة: +${fmtNum(data.expectedProfit)} ${data.currency} (هامش ${data.profitMargin.toFixed(1)}%)

📌 تم استخراج التقرير واعتماده رسمياً عبر المنصة.`;
  } else {
    shareText = `📦 *Comprehensive Inventory Audit Report*
🏪 *Store:* ${data.storeName}
👤 *Store Owner:* ${data.ownerName}
🗓️ *Period:* ${data.periodLabel}
⏱️ *Audit Date:* ${data.generatedDate}

📋 *Executive Inventory Summary:*
• Unique Item Types: ${data.totalItemTypes}
• Total Stock Units: ${data.totalUnitsCount.toLocaleString()}
• Total Cost Valuation: ${fmtNum(data.totalCostValuation)} ${data.currency}
• Expected Sales Valuation: ${fmtNum(data.totalSaleValuation)} ${data.currency}
• Expected Profit: +${fmtNum(data.expectedProfit)} ${data.currency} (Margin ~${data.profitMargin.toFixed(1)}%)

📌 Official inventory audit generated via Store Management System.`;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${data.storeName} - ${isAr ? 'تقرير جرد المخزون' : 'Inventory Audit Report'}`,
        text: shareText,
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await copyToClipboard(shareText);
        return { success: true, method: 'clipboard' };
      }
      return { success: false, method: 'cancelled' };
    }
  } else {
    await copyToClipboard(shareText);
    return { success: true, method: 'clipboard' };
  }
};

