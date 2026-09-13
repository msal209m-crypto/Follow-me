import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, X, Check, Share2, Copy, Coins } from 'lucide-react';
import { Transaction, DebtRecord, DebtPaymentHistoryItem, StoreSettings } from '../types';
import { convertCurrency, findCurrency } from '../data/currencies';

interface PrintReceiptModalProps {
  transaction?: Transaction | null;
  debtPayment?: {
    debt: DebtRecord;
    payment: DebtPaymentHistoryItem;
  } | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  transaction,
  debtPayment,
  settings,
  onClose,
}) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && transaction?.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, transaction.invoiceNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 32,
          displayValue: true,
          fontSize: 10,
          font: 'Cairo',
          textAlign: 'center',
          margin: 2,
        });
      } catch (e) {
        console.warn(e);
      }
    }
  }, [transaction]);

  const handlePrint = () => {
    window.print();
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'SALE':
        return 'فاتورة مبيعات نقدية';
      case 'CREDIT_SALE':
        return 'فاتورة مبيعات آجلة (دين)';
      case 'PURCHASE':
        return 'فاتورة مشتريات نقدية';
      case 'ORDER_GOODS_CASH':
        return 'سند طلب بضاعة نقد';
      case 'ORDER_GOODS_CREDIT':
        return 'سند طلب بضاعة آجل';
      default:
        return 'فاتورة حركة';
    }
  };

  const getPaymentName = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'كاش (نقدي)';
      case 'TRANSFER':
        return 'تحويل بنكي';
      case 'CARD':
        return 'دفع بالبطاقة / شبكة';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="no-print p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-sm">معاينة الإيصال للطباعة</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex justify-center">
          <div
            id="printable-receipt"
            className="print-receipt-container bg-white text-slate-900 p-5 rounded-lg shadow-md w-full max-w-[340px] text-xs font-sans border border-slate-200"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-base text-slate-950">{settings.storeName || 'متجر فلو اب'}</h2>
              {settings.address && (
                <div className="text-[10px] text-slate-600 mt-0.5">{settings.address}</div>
              )}
              {settings.phone && (
                <div className="text-[10px] text-slate-600 font-mono">هاتف: {settings.phone}</div>
              )}
              {settings.taxNumber && (
                <div className="text-[10px] text-slate-600 font-mono">
                  الرقم الضريبي: {settings.taxNumber}
                </div>
              )}
            </div>

            {/* If standard Transaction Receipt */}
            {transaction && (
              <div className="py-2.5 space-y-2 border-b border-dashed border-slate-300">
                <div className="text-center font-bold text-xs text-slate-800 bg-slate-100 py-1 rounded">
                  {getTypeName(transaction.type)}
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                  <div>
                    رقم الفاتورة:{' '}
                    <strong className="text-slate-900 font-mono">{transaction.invoiceNumber}</strong>
                  </div>
                  <div className="text-left font-mono">
                    {new Date(transaction.timestamp).toLocaleDateString('ar-SA')}
                  </div>
                  <div>
                    العميل / الطرف:{' '}
                    <strong className="text-slate-900">{transaction.partyName}</strong>
                  </div>
                  <div className="text-left">
                    الموظف: <strong className="text-slate-900">{transaction.cashierName}</strong>
                  </div>
                  <div className="col-span-2">
                    طريقة الدفع: <strong className="text-slate-900">{getPaymentName(transaction.paymentMethod)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* If Debt Payment Receipt */}
            {debtPayment && (
              <div className="py-2.5 space-y-2 border-b border-dashed border-slate-300">
                <div className="text-center font-bold text-xs bg-emerald-50 py-1 rounded text-emerald-950 border border-emerald-200">
                  {debtPayment.debt.type === 'PERSONAL_LOAN'
                    ? 'سند قبض - سداد دفعة سلفة نقدية'
                    : debtPayment.debt.type === 'SUPPLIER'
                    ? 'سند صرف - سداد مستحقات مورد'
                    : 'سند قبض - سداد حساب عميل'}
                </div>

                <div className="space-y-1 text-[10px] text-slate-700">
                  <div className="flex justify-between">
                    <span>رقم السند:</span>
                    <strong className="font-mono">{debtPayment.payment.receiptNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>التاريخ:</span>
                    <span className="font-mono">
                      {new Date(debtPayment.payment.date).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{debtPayment.debt.type === 'SUPPLIER' ? 'صرفنا إلى:' : 'استلمنا من:'}</span>
                    <strong className="text-slate-950">{debtPayment.debt.personName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>طريقة السداد:</span>
                    <strong>{getPaymentName(debtPayment.payment.paymentMethod)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>الموظف المسؤول:</span>
                    <strong>{debtPayment.payment.recordedBy}</strong>
                  </div>
                  {debtPayment.payment.notes && (
                    <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                      <span>البيان:</span>
                      <span>{debtPayment.payment.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items Table (if transaction) */}
            {transaction && (
              <div className="py-2.5 border-b border-dashed border-slate-300">
                <table className="w-full text-right text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-700 font-bold">
                      <th className="pb-1">الصنف</th>
                      <th className="pb-1 text-center">الكمية</th>
                      <th className="pb-1 text-center">السعر</th>
                      <th className="pb-1 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaction.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1 font-semibold text-slate-900">{it.name}</td>
                        <td className="py-1 text-center font-mono">{it.quantity}</td>
                        <td className="py-1 text-center font-mono">{it.unitPrice.toFixed(2)}</td>
                        <td className="py-1 text-center font-mono font-bold text-slate-950">
                          {it.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Totals */}
            <div className="py-2.5 space-y-1 text-xs">
              {transaction && (
                <>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{transaction.subtotal.toFixed(2)} {settings.currency}</span>
                  </div>
                  {transaction.discount > 0 && (
                    <div className="flex justify-between text-rose-600 text-[11px]">
                      <span>الخصم:</span>
                      <span className="font-mono">-{transaction.discount.toFixed(2)} {settings.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-200">
                    <span>المبلغ الإجمالي:</span>
                    <span className="font-mono text-emerald-800">
                      {transaction.totalAmount.toFixed(2)} {settings.currency}
                    </span>
                  </div>
                  {settings.multiCurrency?.showDualCurrency && settings.multiCurrency?.secondaryCurrencyCode && (
                    <div className="flex justify-between font-bold text-[11px] text-teal-800 bg-teal-50/80 px-1.5 py-0.5 rounded border border-teal-200/60">
                      <span>المعادل بالعملة الثانوية ({findCurrency(settings.multiCurrency.secondaryCurrencyCode).code}):</span>
                      <span className="font-mono">
                        {convertCurrency(
                          transaction.totalAmount,
                          settings.multiCurrency.baseCurrencyCode || 'SAR',
                          settings.multiCurrency.secondaryCurrencyCode,
                          settings.multiCurrency.rates || {},
                          settings.multiCurrency.baseCurrencyCode || 'SAR'
                        ).toFixed(findCurrency(settings.multiCurrency.secondaryCurrencyCode).decimalDigits || 2)}{' '}
                        {findCurrency(settings.multiCurrency.secondaryCurrencyCode).symbol}
                      </span>
                    </div>
                  )}
                  {transaction.remainingDebt > 0 && (
                    <div className="flex justify-between font-bold text-[11px] text-amber-700 pt-0.5">
                      <span>المتبقي في حساب الدين:</span>
                      <span className="font-mono">{transaction.remainingDebt.toFixed(2)} {settings.currency}</span>
                    </div>
                  )}
                </>
              )}

              {debtPayment && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between font-black text-sm text-emerald-800 bg-emerald-50 p-1.5 rounded">
                    <span>المبلغ المسدد:</span>
                    <span className="font-mono">
                      {debtPayment.payment.amount.toFixed(2)} {settings.currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>الرصيد المتبقي بعد السداد:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {debtPayment.debt.remainingDebt.toFixed(2)} {settings.currency}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Barcode Graphic */}
            {transaction && (
              <div className="pt-2 flex justify-center">
                <svg ref={barcodeRef} className="max-w-full"></svg>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-0.5">
              <p className="font-medium">{settings.footerNote || 'شكراً لزيارتكم ونسعد بخدمتكم دائماً'}</p>
              <p className="font-mono text-[9px]">تطبيق فلو اب (FlowApp) لإدارة المخزون والمبيعات</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="no-print p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الإيصال (Ctrl+P)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
