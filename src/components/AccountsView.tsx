import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Wallet,
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AccountsView: React.FC = () => {
  const { transactions, debts, settings, financialSummary, isRTL, language } = useApp();
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'CREDIT' | 'PAID' | 'TRANSFER' | 'CARD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate complete journal / ledger entries from transactions + debt payments
  const ledgerEntries = useMemo(() => {
    const list: {
      id: string;
      date: string;
      reference: string;
      party: string;
      typeLabel: string;
      typeCategory: 'CREDIT' | 'PAID' | 'INCOME' | 'EXPENSE';
      paymentMethod: string;
      debit: number;   // مدين (استلام نقد أو دين على العميل)
      credit: number;  // دائن (صرف نقد أو دين للمورد)
      notes: string;
    }[] = [];

    // Process transactions
    transactions.forEach((tx) => {
      if (tx.type === 'SALE') {
        list.push({
          id: `tx-${tx.id}`,
          date: tx.timestamp,
          reference: tx.invoiceNumber,
          party: tx.partyName,
          typeLabel: 'مبيعات نقدية (دفع)',
          typeCategory: 'PAID',
          paymentMethod: tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة',
          debit: tx.paidAmount,
          credit: 0,
          notes: tx.notes || `فاتورة بيع نقدي #${tx.invoiceNumber}`,
        });
      } else if (tx.type === 'CREDIT_SALE') {
        // Credit sale creates debt receivable
        list.push({
          id: `tx-credit-${tx.id}`,
          date: tx.timestamp,
          reference: tx.invoiceNumber,
          party: tx.partyName,
          typeLabel: 'بيع آجل (ذمم مدينة)',
          typeCategory: 'CREDIT',
          paymentMethod: 'آجل / ذمة',
          debit: tx.remainingDebt,
          credit: 0,
          notes: `بيع آجل مسجل على حساب العميل - إجمالي الفاتورة ${tx.totalAmount} ${settings.currency}`,
        });

        if (tx.paidAmount > 0) {
          list.push({
            id: `tx-paidpart-${tx.id}`,
            date: tx.timestamp,
            reference: `${tx.invoiceNumber}-PAY`,
            party: tx.partyName,
            typeLabel: 'دفعة مقدمة مع البيع الآجل',
            typeCategory: 'PAID',
            paymentMethod: tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة',
            debit: tx.paidAmount,
            credit: 0,
            notes: 'دفعة مسددة فوراً عند إنشاء الفاتورة الآجلة',
          });
        }
      } else if (tx.type === 'PURCHASE' || tx.type === 'ORDER_GOODS_CASH') {
        list.push({
          id: `tx-pur-${tx.id}`,
          date: tx.timestamp,
          reference: tx.invoiceNumber,
          party: tx.partyName,
          typeLabel: 'مشتريات بضاعة (دفع)',
          typeCategory: 'PAID',
          paymentMethod: tx.paymentMethod === 'CASH' ? 'كاش' : tx.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة',
          debit: 0,
          credit: tx.paidAmount,
          notes: tx.notes || 'سداد قيمة بضاعة نقد',
        });
      } else if (tx.type === 'ORDER_GOODS_CREDIT') {
        list.push({
          id: `tx-purcred-${tx.id}`,
          date: tx.timestamp,
          reference: tx.invoiceNumber,
          party: tx.partyName,
          typeLabel: 'شراء بضاعة آجل (ذمم دائنة)',
          typeCategory: 'CREDIT',
          paymentMethod: 'آجل للمورد',
          debit: 0,
          credit: tx.remainingDebt,
          notes: 'مستحقات توريد بضاعة بالآجل',
        });
      }
    });

    // Process loan disbursements
    debts.forEach((debt) => {
      (debt.loans || []).forEach((loan) => {
        list.push({
          id: `loan-${loan.id}`,
          date: loan.date,
          reference: loan.receiptNumber,
          party: debt.personName,
          typeLabel: 'صرف سلفة نقدية (إقراض)',
          typeCategory: 'PAID',
          paymentMethod: loan.paymentSource === 'CASH' ? 'كاش' : loan.paymentSource === 'TRANSFER' ? 'تحويل' : 'شبكة',
          debit: 0,
          credit: loan.amount,
          notes: loan.notes || 'سند صرف سلفة نقدية من الخزينة',
        });
      });
    });

    // Process separate debt & loan repayments
    debts.forEach((debt) => {
      (debt.payments || []).forEach((pay) => {
        const isReceivable = debt.type === 'CUSTOMER' || debt.type === 'PERSONAL_LOAN';
        const label =
          debt.type === 'PERSONAL_LOAN'
            ? 'سداد دفعة من سلفة نقدية (قبض)'
            : debt.type === 'CUSTOMER'
            ? 'سداد دين عميل (قبض)'
            : 'سداد مستحقات مورد (دفع)';

        list.push({
          id: `pay-${pay.id}`,
          date: pay.date,
          reference: pay.receiptNumber,
          party: debt.personName,
          typeLabel: label,
          typeCategory: 'PAID',
          paymentMethod: pay.paymentMethod === 'CASH' ? 'كاش' : pay.paymentMethod === 'TRANSFER' ? 'تحويل' : 'شبكة',
          debit: isReceivable ? pay.amount : 0,
          credit: !isReceivable ? pay.amount : 0,
          notes: pay.notes || 'سند قبض / سداد حساب',
        });
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, debts, settings.currency]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const matchesFilter =
        accountFilter === 'ALL' ||
        (accountFilter === 'CREDIT' && entry.typeCategory === 'CREDIT') ||
        (accountFilter === 'PAID' && entry.typeCategory === 'PAID') ||
        (accountFilter === 'TRANSFER' && entry.paymentMethod.includes('تحويل')) ||
        (accountFilter === 'CARD' && entry.paymentMethod.includes('شبكة'));

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        entry.party.toLowerCase().includes(q) ||
        entry.reference.toLowerCase().includes(q) ||
        entry.typeLabel.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [ledgerEntries, accountFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              <Calculator className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">جدول الحسابات والأرصدة</h2>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة جدول الحسابات</span>
        </button>
      </div>

      {/* Account Balances Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>الخزينة النقدية (كاش)</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {(financialSummary?.cashBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">النقد الفعلي المتوفر في الصندوق</div>
        </div>

        {/* Bank Transfer balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>حساب التحويلات البنكية</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {(financialSummary?.bankTransferBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">إجمالي الحوالات البنكية المحصلة</div>
        </div>

        {/* Card POS balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>مدفوعات البطاقة والشبكة</span>
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400 font-mono">
            {(financialSummary?.cardBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">مقبوضات أجهزة نقاط البيع POS</div>
        </div>

        {/* Credit sales due (البيع آجل) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>مستحقات البيع الآجل (لنا)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {(financialSummary?.totalCreditSalesDue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">ديون متأخرة على العملاء واجبة التحصيل</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => setAccountFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              accountFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            جميع القيود والحسابات ({ledgerEntries.length})
          </button>
          <button
            onClick={() => setAccountFilter('CREDIT')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              accountFilter === 'CREDIT'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            البيع آجل والذمم
          </button>
          <button
            onClick={() => setAccountFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              accountFilter === 'PAID'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            المدفوعات والمقبوضات (دفع)
          </button>
          <button
            onClick={() => setAccountFilter('TRANSFER')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              accountFilter === 'TRANSFER'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            التحويلات
          </button>
          <button
            onClick={() => setAccountFilter('CARD')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              accountFilter === 'CARD'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            الشبكة
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو السند..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs sm:text-sm`}>
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                <th className="p-3.5">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                <th className="p-3.5">{language === 'ar' ? 'رقم المرجع / الفاتورة' : 'Reference / Invoice #'}</th>
                <th className="p-3.5">{language === 'ar' ? 'الطرف (العميل / المورد)' : 'Party (Customer / Supplier)'}</th>
                <th className="p-3.5">{language === 'ar' ? 'نوع العملية (بيع آجل / دفع)' : 'Operation Type'}</th>
                <th className="p-3.5 text-center">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</th>
                <th className="p-3.5 text-center text-emerald-400">{language === 'ar' ? 'مدين (لنا / قبض)' : 'Debit (Receive)'}</th>
                <th className="p-3.5 text-center text-rose-400">{language === 'ar' ? 'دائن (صرف / علينا)' : 'Credit (Pay)'}</th>
                <th className="p-3.5">{language === 'ar' ? 'البيان والتفاصيل' : 'Notes / Description'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-400">لا توجد قيود مسجلة</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-400 text-xs font-mono">
                      {new Date(entry.date).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-white text-xs">
                      {entry.reference}
                    </td>
                    <td className="p-3.5 font-bold text-slate-200">{entry.party}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          entry.typeCategory === 'CREDIT'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {entry.typeLabel}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-xs text-slate-300">
                        {entry.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                      {entry.debit > 0 ? (
                        `${entry.debit.toFixed(2)} ${settings.currency}`
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-rose-400">
                      {entry.credit > 0 ? (
                        `${entry.credit.toFixed(2)} ${settings.currency}`
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs text-slate-400 max-w-xs truncate">
                      {entry.notes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
