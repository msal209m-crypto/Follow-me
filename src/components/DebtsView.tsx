import React, { useState } from 'react';
import {
  CreditCard,
  UserCheck,
  Search,
  Plus,
  DollarSign,
  Building2,
  Phone,
  Printer,
  History,
  Trash2,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DebtRecord, PaymentMethod, DebtPaymentHistoryItem, DebtAdvanceLoanItem } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface DebtsViewProps {
  onPrintDebtReceipt: (debt: DebtRecord, payment: DebtPaymentHistoryItem) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ onPrintDebtReceipt }) => {
  const {
    debts,
    recordDebtPayment,
    addDebtRecord,
    addCashLoanRecord,
    addLoanAdvanceToDebt,
    deleteDebtRecord,
    settings,
    showNotification,
    isRTL,
    language,
  } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOMER' | 'PERSONAL_LOAN' | 'SUPPLIER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(debts[0]?.id || null);

  // Modal for recording repayment (سداد دفعة)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Modal for creating new personal cash loan (تسليف مبلغ نقدي)
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [loanPersonName, setLoanPersonName] = useState('');
  const [loanPhone, setLoanPhone] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPaymentSource, setLoanPaymentSource] = useState<PaymentMethod>('CASH');
  const [loanNotes, setLoanNotes] = useState('');

  // Modal for adding additional advance/loan to existing person (تسليف مبلغ إضافي)
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [extraLoanAmount, setExtraLoanAmount] = useState('');
  const [extraLoanSource, setExtraLoanSource] = useState<PaymentMethod>('CASH');
  const [extraLoanNotes, setExtraLoanNotes] = useState('');

  // Modal for creating general debt account
  const [showNewDebtModal, setShowNewDebtModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<'CUSTOMER' | 'SUPPLIER' | 'PERSONAL_LOAN'>('CUSTOMER');
  const [newTotalDebt, setNewTotalDebt] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Confirmation modal state for safe account deletion
  const [debtToDelete, setDebtToDelete] = useState<DebtRecord | null>(null);

  const selectedDebt = debts.find((d) => d.id === selectedDebtId) || null;

  // Filtered debts list
  const filteredDebts = debts.filter((d) => {
    const matchesType = filterType === 'ALL' || d.type === filterType;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.personName.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      (d.notes && d.notes.toLowerCase().includes(q));
    return matchesType && matchesSearch;
  });

  // Calculate high level summaries
  const totalOutstandingCustomerDebt = debts
    .filter((d) => d.type === 'CUSTOMER')
    .reduce((sum, d) => sum + d.remainingDebt, 0);

  const totalOutstandingPersonalLoans = debts
    .filter((d) => d.type === 'PERSONAL_LOAN')
    .reduce((sum, d) => sum + d.remainingDebt, 0);

  const totalOutstandingSupplierDebt = debts
    .filter((d) => d.type === 'SUPPLIER')
    .reduce((sum, d) => sum + d.remainingDebt, 0);

  // Handle submit payment (سداد دفعة جزئية أو كاملة)
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showNotification('الرجاء إدخال مبلغ سداد صحيح أكبر من الصفر', 'warning');
      return;
    }

    const payRecord = recordDebtPayment(
      selectedDebt.id,
      amount,
      paymentMethod,
      paymentNotes.trim()
    );

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNotes('');

    // Trigger printable receipt for this payment
    const updatedDebt = debts.find((d) => d.id === selectedDebt.id);
    if (updatedDebt) {
      onPrintDebtReceipt(
        {
          ...updatedDebt,
          paidDebt: updatedDebt.paidDebt + amount,
          remainingDebt: Math.max(0, updatedDebt.remainingDebt - amount),
        },
        payRecord
      );
    }
  };

  // Handle create new personal cash loan
  const handleCreateCashLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanPersonName.trim()) {
      showNotification('الرجاء إدخال اسم الشخص المستلف', 'warning');
      return;
    }
    const val = parseFloat(loanAmount);
    if (isNaN(val) || val <= 0) {
      showNotification('الرجاء إدخال مبلغ السلفة بشكل صحيح', 'warning');
      return;
    }

    const { debt } = addCashLoanRecord({
      personName: loanPersonName.trim(),
      phone: loanPhone.trim(),
      amount: val,
      paymentSource: loanPaymentSource,
      notes: loanNotes.trim() || 'سلفة نقدية مستلمة نقداً',
    });

    setShowNewLoanModal(false);
    setLoanPersonName('');
    setLoanPhone('');
    setLoanAmount('');
    setLoanNotes('');
    setSelectedDebtId(debt.id);
  };

  // Handle adding more loan/borrowing amount to existing person
  const handleAddExtraLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    const val = parseFloat(extraLoanAmount);
    if (isNaN(val) || val <= 0) {
      showNotification('الرجاء إدخال مبلغ السلفة الإضافية بشكل صحيح', 'warning');
      return;
    }

    addLoanAdvanceToDebt(
      selectedDebt.id,
      val,
      extraLoanSource,
      extraLoanNotes.trim() || 'سلفة نقدية إضافية'
    );

    setShowAddLoanModal(false);
    setExtraLoanAmount('');
    setExtraLoanNotes('');
  };

  // Handle submit general new debt record
  const handleCreateNewDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      showNotification('الرجاء إدخال اسم العميل أو المورد', 'warning');
      return;
    }
    const debtVal = parseFloat(newTotalDebt);
    if (isNaN(debtVal) || debtVal <= 0) {
      showNotification('الرجاء إدخال مبلغ الدين الأولي', 'warning');
      return;
    }

    const newRecord = addDebtRecord({
      personName: newPersonName.trim(),
      phone: newPhone.trim(),
      type: newType,
      category: newType === 'PERSONAL_LOAN' ? 'CASH_LOAN' : newType === 'CUSTOMER' ? 'SALES_CREDIT' : 'SUPPLIER_CREDIT',
      totalDebt: debtVal,
      paidDebt: 0,
      remainingDebt: debtVal,
      lastTransactionDate: new Date().toISOString(),
      notes: newNotes.trim(),
    });

    setShowNewDebtModal(false);
    setNewPersonName('');
    setNewPhone('');
    setNewTotalDebt('');
    setNewNotes('');
    setSelectedDebtId(newRecord.id);
  };

  return (
    <div className="space-y-6" id="debts-view-root">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              <CreditCard className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              قائمة الديون، السلف النقدية، والسداد
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Action 1: Cash Loan (سلفة نقدية) */}
          <button
            id="btn-new-cash-loan"
            onClick={() => setShowNewLoanModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-950/60 transition-all cursor-pointer text-xs sm:text-sm"
          >
            <HandCoins className="w-4 h-4" />
            <span>تسجيل سلفة نقدية (تسليف مبلغ)</span>
          </button>

          {/* Main Action 2: General Debt */}
          <button
            id="btn-new-debt-account"
            onClick={() => setShowNewDebtModal(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>فتح حساب دين</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. ديون العملاء */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>ديون العملاء (مبيعات آجلة)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {(totalOutstandingCustomerDebt ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {debts.filter((d) => d.type === 'CUSTOMER' && d.remainingDebt > 0).length} عملاء لديهم مبالغ متبقية
          </div>
        </div>

        {/* 2. السلف النقدية الشخصية */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm border-amber-500/20">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-2">
            <span>سلف نقدية مستحقة (تسليف)</span>
            <HandCoins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {(totalOutstandingPersonalLoans ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {debts.filter((d) => d.type === 'PERSONAL_LOAN' && d.remainingDebt > 0).length} أشخاص مستلفين بانتظار السداد
          </div>
        </div>

        {/* 3. ديون الموردين */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>مستحقات الموردين علينا</span>
            <Building2 className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {(totalOutstandingSupplierDebt ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {debts.filter((d) => d.type === 'SUPPLIER' && d.remainingDebt > 0).length} موردين بانتظار السداد
          </div>
        </div>

        {/* 4. طرق السداد المعتمدة */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>طرق السداد المعتمدة</span>
            <CreditCard className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[11px] px-2 py-0.5 rounded font-bold">
              💵 كاش
            </span>
            <span className="bg-blue-950/60 text-blue-300 border border-blue-800/60 text-[11px] px-2 py-0.5 rounded font-bold">
              🏦 تحويل
            </span>
            <span className="bg-teal-950/60 text-teal-300 border border-teal-800/60 text-[11px] px-2 py-0.5 rounded font-bold">
              💳 شبكة
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">سداد جزئي أو كامل مع سند قبض فوري</div>
        </div>
      </div>

      {/* Main Grid: Accounts List Left, Account Details & Statement Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Debtors & Borrowers List (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            {/* Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              <button
                onClick={() => setFilterType('ALL')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  filterType === 'ALL'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل ({debts.length})
              </button>
              <button
                onClick={() => setFilterType('PERSONAL_LOAN')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  filterType === 'PERSONAL_LOAN'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                سلف نقدية
              </button>
              <button
                onClick={() => setFilterType('CUSTOMER')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  filterType === 'CUSTOMER'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                العملاء
              </button>
              <button
                onClick={() => setFilterType('SUPPLIER')}
                className={`py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center ${
                  filterType === 'SUPPLIER'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الموردين
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الجوال، أو الملاحظة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* List of Accounts */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredDebts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لا توجد حسابات مطابقة للبحث
                </div>
              ) : (
                filteredDebts.map((debt) => {
                  const isSelected = selectedDebt?.id === debt.id;
                  const isLoan = debt.type === 'PERSONAL_LOAN';
                  const isCustomer = debt.type === 'CUSTOMER';
                  const isPaidOff = debt.remainingDebt <= 0;

                  return (
                    <div
                      key={debt.id}
                      onClick={() => setSelectedDebtId(debt.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? isLoan
                            ? 'bg-slate-800/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                            : 'bg-slate-800/90 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isLoan
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isCustomer
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {isLoan ? '🤝 سلفة نقدية' : isCustomer ? 'عميل آجل' : 'مورد بضاعة'}
                          </span>
                          <span className="font-bold text-white text-sm">{debt.personName}</span>
                        </div>

                        <div className="text-left font-mono">
                          <span
                            className={`text-sm font-black ${
                              isPaidOff
                                ? 'text-slate-500'
                                : isLoan
                                ? 'text-amber-400'
                                : isCustomer
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {debt.remainingDebt.toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          {debt.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{debt.phone}</span>
                            </span>
                          ) : (
                            <span>بدون هاتف</span>
                          )}
                        </div>

                        <div className="text-[11px]">
                          المبلغ:{' '}
                          <span className="font-bold text-slate-300 font-mono">
                            {debt.totalDebt.toFixed(2)}
                          </span>{' '}
                          | مسدد:{' '}
                          <span className="font-bold text-emerald-400 font-mono">
                            {debt.paidDebt.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Statement of Account & Settle Payment (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedDebt ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
              {/* Account Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-lg sm:text-xl text-white">{selectedDebt.personName}</h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        selectedDebt.type === 'PERSONAL_LOAN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : selectedDebt.type === 'CUSTOMER'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {selectedDebt.type === 'PERSONAL_LOAN'
                        ? '🤝 سلفة نقدية شخصية'
                        : selectedDebt.type === 'CUSTOMER'
                        ? 'حساب عميل (مبيعات بالآجل)'
                        : 'حساب مورد (مستحقات بضاعة)'}
                    </span>
                  </div>

                  {selectedDebt.phone && (
                    <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedDebt.phone}</span>
                    </div>
                  )}

                  {selectedDebt.notes && (
                    <div className="text-xs text-slate-400 mt-1 bg-slate-950/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 font-bold">ملاحظات:</span> {selectedDebt.notes}
                    </div>
                  )}
                </div>

                {/* Top Actions: Settle Payment + Add Loan */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Settle Payment Button */}
                  <button
                    id="btn-record-debt-payment"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={selectedDebt.remainingDebt <= 0}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-3.5 py-2 rounded-xl transition-all shadow-md text-xs cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>تسجيل سداد دفعة (سداد جزئي/كامل)</span>
                  </button>

                  {/* Add Extra Loan Button (if it's a loan or customer) */}
                  {(selectedDebt.type === 'PERSONAL_LOAN' || selectedDebt.type === 'CUSTOMER') && (
                    <button
                      id="btn-add-extra-loan"
                      onClick={() => setShowAddLoanModal(true)}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسليف مبلغ إضافي</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Balance Numbers Banner */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center font-mono">
                <div>
                  <div className="text-[11px] text-slate-400 font-sans">
                    {selectedDebt.type === 'PERSONAL_LOAN' ? 'إجمالي مبلغ السلفة' : 'إجمالي الدين'}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                    {selectedDebt.totalDebt.toFixed(2)}{' '}
                    <span className="text-[10px] font-sans text-slate-500">{settings.currency}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-sans">المبلغ المسدد حتى الآن</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">
                    {selectedDebt.paidDebt.toFixed(2)}{' '}
                    <span className="text-[10px] font-sans text-slate-500">{settings.currency}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-sans">المتبقي المطلوب سداده</div>
                  <div
                    className={`text-base sm:text-lg font-black mt-0.5 ${
                      selectedDebt.remainingDebt <= 0 ? 'text-slate-500' : 'text-amber-400'
                    }`}
                  >
                    {selectedDebt.remainingDebt.toFixed(2)}{' '}
                    <span className="text-[10px] font-sans text-slate-500">{settings.currency}</span>
                  </div>
                </div>
              </div>

              {/* Loan Disbursements History (If personal loan or loans exist) */}
              {selectedDebt.loans && selectedDebt.loans.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <ArrowDownLeft className="w-4 h-4 text-amber-400" />
                    <span>مبالغ السلفة المسلمة للمستلف ({selectedDebt.loans.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {selectedDebt.loans.map((loan) => (
                      <div
                        key={loan.id}
                        className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-amber-300 font-mono">
                            -{loan.amount.toFixed(2)} {settings.currency}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            سند صرف: <span className="font-mono text-slate-300">{loan.receiptNumber}</span> •{' '}
                            المصدر:{' '}
                            <span className="text-amber-200 font-bold">
                              {loan.paymentSource === 'CASH'
                                ? 'نقداً من الدرج (كاش)'
                                : loan.paymentSource === 'TRANSFER'
                                ? 'تحويل بنكي'
                                : 'شبكة'}
                            </span>
                          </div>
                          {loan.notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{loan.notes}</div>
                          )}
                        </div>

                        <div className="text-left text-[11px] text-slate-400">
                          <div>{new Date(loan.date).toLocaleDateString('ar-SA')}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            المسؤول: {loan.recordedBy}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment History Log (دفعات السداد المستلمة) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <span>سجل دفعات السداد المستلمة (سندات القبض) ({selectedDebt.payments?.length || 0})</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {!selectedDebt.payments || selectedDebt.payments.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                      لم يتم تسجيل أي دفعات سداد لهذا الحساب حتى الآن
                    </div>
                  ) : (
                    selectedDebt.payments.map((pay) => (
                      <div
                        key={pay.id}
                        className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-emerald-400 font-mono">
                            +{pay.amount.toFixed(2)} {settings.currency}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            سند قبض: <span className="font-mono text-slate-300">{pay.receiptNumber}</span> •{' '}
                            طريقة السداد:{' '}
                            <span className="text-teal-300 font-bold">
                              {pay.paymentMethod === 'CASH'
                                ? '💵 كاش'
                                : pay.paymentMethod === 'TRANSFER'
                                ? '🏦 تحويل بنكي'
                                : '💳 شبكة / بطاقة'}
                            </span>
                          </div>
                          {pay.notes && (
                            <div className="text-[10px] text-slate-500 mt-0.5">{pay.notes}</div>
                          )}
                        </div>

                        <div className="text-left text-[11px] text-slate-400">
                          <div>{new Date(pay.date).toLocaleDateString('ar-SA')}</div>
                          <button
                            onClick={() => onPrintDebtReceipt(selectedDebt, pay)}
                            className="text-teal-400 hover:underline text-[10px] mt-1 flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>طباعة السند</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <button
                  type="button"
                  id="btn-delete-debt-account"
                  onClick={() => setDebtToDelete(selectedDebt)}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-bold px-2 py-1 rounded hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الحساب</span>
                </button>

                <div className="text-[11px] text-slate-500">
                  آخر نشاط: {selectedDebt.lastTransactionDate ? new Date(selectedDebt.lastTransactionDate).toLocaleDateString('ar-SA') : '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-slate-400 text-sm">اختر حساباً من القائمة على اليمين</p>
              <p className="text-xs mt-1">لعرض كشف السلف والديون وسجل السداد وتسجيل دفعات جزئية أو كاملة</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Settle Payment Modal (تسجيل سداد دفعة جزئية أو كاملة) */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-black text-lg text-white">
                {selectedDebt.type === 'PERSONAL_LOAN' ? 'تسجيل سداد دفعة سلفة نقدية' : 'تسجيل سداد دفعة دين'}
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
              <div className="text-slate-400">اسم الحساب:</div>
              <div className="font-bold text-white text-sm">{selectedDebt.personName}</div>
              <div className="text-amber-400 font-bold font-mono mt-1">
                المبلغ المتبقي حالياً: {selectedDebt.remainingDebt.toFixed(2)} {settings.currency}
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              {/* Payment Amount */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  مبلغ الدفعة المسددة ({settings.currency}):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    max={selectedDebt.remainingDebt}
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-lg font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {/* Shortcut buttons for quick amount selection */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedDebt.remainingDebt.toString())}
                    className="text-[11px] text-teal-300 bg-teal-950/60 border border-teal-800/60 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                  >
                    سداد كامل المبلغ ({selectedDebt.remainingDebt.toFixed(2)})
                  </button>
                  {selectedDebt.remainingDebt > 50 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount((selectedDebt.remainingDebt / 2).toFixed(2))
                      }
                      className="text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                    >
                      سداد النصف
                    </button>
                  )}
                  {selectedDebt.remainingDebt >= 100 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount('100')}
                      className="text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                    >
                      100 {settings.currency}
                    </button>
                  )}
                  {selectedDebt.remainingDebt >= 500 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount('500')}
                      className="text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                    >
                      500 {settings.currency}
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method (تحويل او كاش او شبكة) */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">طريقة استلام الدفعة:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-2 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    💵 كاش (نقداً)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`py-2 px-2 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    🏦 تحويل بنكي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-2 px-2 rounded-lg font-bold border transition-colors cursor-pointer text-center ${
                      paymentMethod === 'CARD'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    💳 شبكة / بطاقة
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات وبيان السند:</label>
                <input
                  type="text"
                  placeholder="مثال: سداد دفعة نقدية باليد / تحويل عبر الراجحي"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-lg cursor-pointer"
                >
                  تأكيد السداد وطباعة السند
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: New Personal Cash Loan Modal (تسجيل سلفة نقدية جديدة) */}
      {showNewLoanModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-400" />
                <div className="font-black text-lg text-white">تسجيل سلفة نقدية (تسليف شخص)</div>
              </div>
              <button
                onClick={() => setShowNewLoanModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCashLoan} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">اسم الشخص المستلف:</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: فهد بن محمد / موظف أحمد"
                    value={loanPersonName}
                    onChange={(e) => setLoanPersonName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {language === 'ar' ? 'رقم الجوال:' : 'Phone Number:'}
                </label>
                <div className="relative">
                  <Phone className={`w-4 h-4 text-slate-500 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
                  <input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={loanPhone}
                    onChange={(e) => setLoanPhone(e.target.value)}
                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2 text-white focus:outline-none font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  المبلغ المستلف ({settings.currency}):
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="مثال: 500"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-lg text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">مصدر صرف السلفة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoanPaymentSource('CASH')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      loanPaymentSource === 'CASH'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    💵 نقداً من الخزينة (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanPaymentSource('TRANSFER')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      loanPaymentSource === 'TRANSFER'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    🏦 تحويل بنكي
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">سبب أو ملاحظات السلفة:</label>
                <input
                  type="text"
                  placeholder="سلفة خاصة، سداد مع الراتب القادم..."
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-2.5 rounded-xl shadow-lg cursor-pointer"
                >
                  حفظ وتسجيل السلفة
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewLoanModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Extra Loan/Advance to Existing Person */}
      {showAddLoanModal && selectedDebt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-black text-lg text-white">تسليف مبلغ إضافي للحساب</div>
              <button
                onClick={() => setShowAddLoanModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div className="text-slate-400">المستلف:</div>
              <div className="font-bold text-white text-sm">{selectedDebt.personName}</div>
              <div className="text-slate-400 mt-1">
                الرصيد المتبقي الحالي:{' '}
                <span className="text-amber-400 font-bold font-mono">
                  {selectedDebt.remainingDebt.toFixed(2)} {settings.currency}
                </span>
              </div>
            </div>

            <form onSubmit={handleAddExtraLoan} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  المبلغ الإضافي المطلوب تسليفه ({settings.currency}):
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="0.00"
                  value={extraLoanAmount}
                  onChange={(e) => setExtraLoanAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base text-amber-400 font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">مصدر الصرف:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraLoanSource('CASH')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      extraLoanSource === 'CASH'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    💵 كاش من الخزينة
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtraLoanSource('TRANSFER')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      extraLoanSource === 'TRANSFER'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    🏦 تحويل بنكي
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات وبيان الصرف:</label>
                <input
                  type="text"
                  placeholder="طلب سلفة إضافية..."
                  value={extraLoanNotes}
                  onChange={(e) => setExtraLoanNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  تأكيد تسليف المبلغ وزيادة الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLoanModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: General New Debt Modal */}
      {showNewDebtModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-black text-lg text-white">فتح حساب دين جديد</div>
              <button
                onClick={() => setShowNewDebtModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewDebt} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">نوع الحساب:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewType('CUSTOMER')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer text-center text-[11px] ${
                      newType === 'CUSTOMER'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    عميل (مبيعات آجلة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('PERSONAL_LOAN')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer text-center text-[11px] ${
                      newType === 'PERSONAL_LOAN'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    سلفة نقدية
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('SUPPLIER')}
                    className={`py-2 rounded-lg font-bold border transition-colors cursor-pointer text-center text-[11px] ${
                      newType === 'SUPPLIER'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    مورد (بضاعة علينا)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">اسم الشخص / الجهة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فهد الدوسري"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {language === 'ar' ? 'رقم الجوال:' : 'Phone Number:'}
                </label>
                <input
                  type="tel"
                  placeholder="05XXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none ${isRTL ? 'text-right' : 'text-left'} font-mono`}
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  مبلغ الدين / السلفة الأولي ({settings.currency}):
                </label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={newTotalDebt}
                  onChange={(e) => setNewTotalDebt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات وتفاصيل:</label>
                <input
                  type="text"
                  placeholder="تاريخ الاستحقاق أو تفاصيل الاتفاق..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  حفظ الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDebtModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Safe Debt / Loan Account Deletion */}
      {debtToDelete && (
        <ConfirmationModal
          isOpen={!!debtToDelete}
          onClose={() => setDebtToDelete(null)}
          onConfirm={() => {
            deleteDebtRecord(debtToDelete.id);
            setSelectedDebtId(null);
            setDebtToDelete(null);
          }}
          title="تأكيد حذف حساب الديون / السلف"
          message={`هل أنت متأكد من رغبتك في حذف حساب (${debtToDelete.personName}) نهائياً؟ سيتم حذف كافة سجلات السلف والدفعات وسندات القبض المرتبطة بهذا الحساب.`}
          confirmText="نعم، حذف الحساب نهائياً"
          cancelText="إلغاء الأمر"
          type="danger"
          itemDetails={[
            {
              label: 'صاحب الحساب',
              value: debtToDelete.personName,
              isHighlight: true,
            },
            {
              label: 'نوع الحساب',
              value:
                debtToDelete.type === 'CUSTOMER'
                  ? 'عميل (مبيعات آجلة)'
                  : debtToDelete.type === 'PERSONAL_LOAN'
                  ? 'سلفة نقدية شخصية'
                  : 'مورد بضائع',
            },
            {
              label: 'رقم الهاتف',
              value: debtToDelete.phone || 'غير مسجل',
              isMono: !!debtToDelete.phone,
            },
            {
              label: 'إجمالي الدين / السلفة',
              value: `${debtToDelete.totalDebt.toFixed(2)} ${settings.currency}`,
              isMono: true,
            },
            {
              label: 'المبلغ المسدد',
              value: `${debtToDelete.paidDebt.toFixed(2)} ${settings.currency}`,
              isMono: true,
            },
            {
              label: 'المبلغ المتبقي المطلوب',
              value: `${debtToDelete.remainingDebt.toFixed(2)} ${settings.currency}`,
              isMono: true,
              isHighlight: debtToDelete.remainingDebt > 0,
            },
            {
              label: 'عدد سندات القبض المسجلة',
              value: `${debtToDelete.payments?.length || 0} سند`,
            },
          ]}
        />
      )}
    </div>
  );
};
