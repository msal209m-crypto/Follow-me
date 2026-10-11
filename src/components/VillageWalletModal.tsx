import React, { useState, useEffect } from 'react';
import {
  Wallet,
  PlusCircle,
  History as HistoryIcon,
  CheckCircle2,
  X,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Globe,
  AlertCircle,
  Info,
  Copy,
  Check
} from 'lucide-react';
import {
  getVillageWallet,
  depositToWallet,
  VillageWalletState,
  WalletTransaction
} from '../services/villageWalletService';
import {
  getGlobalPreferences,
  formatGlobalCurrency,
  getCountryPaymentGateways,
  getCountryByCode
} from '../services/globalizationService';

export interface VillageWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const VillageWalletModal: React.FC<VillageWalletModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const [wallet, setWallet] = useState<VillageWalletState>(getVillageWallet());
  const [activeTab, setActiveTab] = useState<'balance' | 'deposit' | 'history'>('balance');
  const [topupAmount, setTopupAmount] = useState<number>(1000);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [refNoInput, setRefNoInput] = useState<string>('');
  const [senderNameInput, setSenderNameInput] = useState<string>('');
  const [senderPhoneInput, setSenderPhoneInput] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const prefs = getGlobalPreferences();
  const country = getCountryByCode(prefs.countryCode);
  const countryGateways = getCountryPaymentGateways(prefs.countryCode).filter((g) => g.id !== 'village_wallet');

  useEffect(() => {
    if (isOpen) {
      setWallet(getVillageWallet());
      if (countryGateways.length > 0) {
        setSelectedGatewayId(countryGateways[0].id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2500);
    }
  };

  const handlePerformDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (topupAmount <= 0) {
      setErrorMessage('يرجى تحديد مبلغ شحن صحيح أكبر من الصفر.');
      return;
    }

    const selectedGateway = countryGateways.find((g) => g.id === selectedGatewayId);
    if (!selectedGateway) {
      setErrorMessage('يرجى اختيار وسيلة الشحن المستخدمة في التحويل أولاً.');
      return;
    }

    // Require transaction reference or proof number to prevent fake free top-ups
    const trimmedRef = refNoInput.trim();
    if (!trimmedRef) {
      setErrorMessage('⚠️ تنبيه أمان: يرجى إدخال رقم الحوالة أو رقم إشعار التحويل البنكي/المحفظة الصادر من تطبيقك (مثل الكريمي أو جيب) لتوثيق الإيداع.');
      return;
    }

    if (trimmedRef.length < 4) {
      setErrorMessage('⚠️ رقم الإشعار/الحوالة المدخل قصير جداً، يرجى كتابة الرقم المرجعي الكامل للعملية.');
      return;
    }

    const methodName = selectedGateway.nameAr;
    const senderDetails = senderNameInput.trim() ? ` (المودع: ${senderNameInput.trim()})` : '';

    const updated = depositToWallet(topupAmount, methodName + senderDetails, trimmedRef);
    setWallet(updated);
    setSuccessMessage(`تم تسجيل شحن رصيدك بنجاح بمبلغ ${formatGlobalCurrency(topupAmount)} عبر (${methodName}) برقم مرجع #${trimmedRef} ✓`);
    setRefNoInput('');
    setSenderNameInput('');
    setSenderPhoneInput('');

    setTimeout(() => {
      setSuccessMessage(null);
      setActiveTab('balance');
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in dir-rtl">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all transform ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-white shadow-emerald-950/30'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
      >
        {/* Header */}
        <div className="relative p-5 bg-gradient-to-r from-emerald-900/60 via-teal-900/50 to-slate-900 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-wide">محفظة القرية الرقمية</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span>{country.flag}</span>
                  <span>{country.nameAr}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">الدفع السريع، الشحن الفوري، وعزل الأموال الآمن</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('balance')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'balance'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>رصيدي الحساس</span>
          </button>

          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>شحن المحفظة ({country.flag})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>سجل المعاملات</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-bounce">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: Balance Card */}
          {activeTab === 'balance' && (
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 border border-emerald-500/30 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>الرصيد المتاح حالياً بالـ {country.nameAr}</span>
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold">
                    نشط وفوري
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                  {formatGlobalCurrency(wallet.balance)}
                </div>

                <p className="text-[11px] text-slate-300 font-medium">
                  يمكنك استخدام هذا الرصيد للدفع الفوري في كافة متاجر قريتك ولطلب التوصيل بنقرة واحدة
                </p>

                <div className="mt-5 pt-4 border-t border-emerald-500/20 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>شحن الرصيد الآن</span>
                  </button>

                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    <span>عملة المتجر: {prefs.currencyCode}</span>
                  </span>
                </div>
              </div>

              {/* Quick Perks */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs">
                  <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>دفع بنقرة واحدة</span>
                  </div>
                  <p className="text-[11px] text-slate-400">دون الحاجة لإدخال بيانات البطاقة كل مرة</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs">
                  <div className="font-bold text-teal-400 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>مخصص لقريتك</span>
                  </div>
                  <p className="text-[11px] text-slate-400">متوافق مع وسائل دفع {country.nameAr}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Deposit Form */}
          {activeTab === 'deposit' && (
            <form onSubmit={handlePerformDeposit} className="space-y-4">
              {/* Notice Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>كيفية شحن رصيد المحفظة بالخطوات:</span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 mr-1">
                  <li>حدد مبلغ الشحن المطلوب، واختر وسيلة الدفع المناسبة لك أدناه.</li>
                  <li>قم بتحويل المبلغ من تطبيقك البنكي أو المحفظة (مثل الكريمي أو جيب) إلى الحساب الموضح أدناه.</li>
                  <li>انسخ رقم إشعار الحوالة / السند من تطبيقك وأدخله في خانة "رقم الإشعار" لتوثيق الإيداع.</li>
                </ol>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  اختر أو اكتب مبلغ الشحن ({prefs.currencyCode}):
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[500, 1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                        topupAmount === amt
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  required
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm outline-none focus:border-emerald-500"
                  placeholder="مبلغ مخصص..."
                />
              </div>

              {/* Localized Gateways Options for Country */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>اختر وسيلة الشحن التي ستقوم بالتحويل منها ({country.nameAr} {country.flag}):</span>
                </label>

                <div className="space-y-2">
                  {countryGateways.map((gtw) => {
                    const isSelected = selectedGatewayId === gtw.id;
                    return (
                      <div
                        key={gtw.id}
                        onClick={() => setSelectedGatewayId(gtw.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-md'
                            : 'bg-slate-800/30 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{gtw.icon}</span>
                            <div>
                              <div className="text-xs font-bold flex items-center gap-2">
                                <span>{gtw.nameAr}</span>
                                {gtw.badgeAr && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                                    {gtw.badgeAr}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-emerald-400 bg-emerald-500'
                                : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />}
                          </div>
                        </div>

                        {/* Instructions & Transfer Account Details */}
                        {isSelected && gtw.instructionsAr && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/60 bg-slate-950/60 p-2.5 rounded-xl space-y-1.5">
                            <p className="text-[11px] text-amber-300 font-medium flex items-start gap-1">
                              <span>📌</span>
                              <span>{gtw.instructionsAr}</span>
                            </p>

                            {/* Quick copy buttons for Yemen accounts */}
                            {gtw.id === 'kuraimi_haseb' && (
                              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="text-[11px] font-mono text-emerald-300 font-bold">حساب الكريمي: 301294857</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard('301294857', 'كريمي');
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedText === 'كريمي' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedText === 'كريمي' ? 'تم النسخ' : 'نسخ الرقم'}</span>
                                </button>
                              </div>
                            )}

                            {gtw.id === 'jeeb' && (
                              <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="text-[11px] font-mono text-emerald-300 font-bold">رقم محفظة جيب: 770001122</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard('770001122', 'جيب');
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedText === 'جيب' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedText === 'جيب' ? 'تم النسخ' : 'نسخ الرقم'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sender Info & Proof of Payment (Required for verification) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>بيانات تأكيد الإيداع والتحويل الفعلي:</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 mb-1 block">
                    رقم الإشعار / رقم الحوالة / السند <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={refNoInput}
                    onChange={(e) => setRefNoInput(e.target.value)}
                    placeholder="أدخل رقم الإشعار أو الحوالة الصادر من تطبيق البنك..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يتم التحقق من رقم السند لمطابقة وصول المبلغ الفعلي إلى حساب إدارة المتجر.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 mb-1 block">
                      اسم المودع / المحول (اختياري):
                    </label>
                    <input
                      type="text"
                      value={senderNameInput}
                      onChange={(e) => setSenderNameInput(e.target.value)}
                      placeholder="اسم صاحب الحساب المحول منه..."
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 mb-1 block">
                      رقم هاتف المودع للتواصل (اختياري):
                    </label>
                    <input
                      type="tel"
                      value={senderPhoneInput}
                      onChange={(e) => setSenderPhoneInput(e.target.value)}
                      placeholder="77XXXXXXX"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all active:scale-95"
              >
                <PlusCircle className="w-5 h-5" />
                <span>تأكيد تسجيل إيداع الرصيد</span>
              </button>
            </form>
          )}

          {/* TAB 3: Transaction History */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {wallet.transactions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد معاملات سابقة بالمحفظة حتى الآن.</p>
              ) : (
                wallet.transactions.map((tx: WalletTransaction) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl ${
                          tx.type === 'DEPOSIT'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-white">{tx.title}</div>
                        <p className="text-[10px] text-slate-400">{tx.description}</p>
                        <span className="text-[9px] text-slate-500">{tx.timestamp}</span>
                      </div>
                    </div>

                    <div className="text-left font-black">
                      <div
                        className={tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-slate-300'}
                      >
                        {tx.type === 'DEPOSIT' ? '+' : '-'} {formatGlobalCurrency(tx.amount)}
                      </div>
                      {tx.refNumber && (
                        <span className="text-[9px] text-slate-500 block font-mono">{tx.refNumber}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
