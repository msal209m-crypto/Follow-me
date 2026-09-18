import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Phone,
  MessageCircle,
  X,
  Printer,
  ChevronRight,
  Filter,
  User,
  MapPin,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Bell,
  ChefHat
} from 'lucide-react';
import { DeliveryOrder, DeliveryOrderStatus, StoreSettings } from '../types';
import { getDeliveryOrders, updateOrderStatus, playNotificationChime } from '../services/deliveryService';

interface MerchantOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  isRTL: boolean;
  onOpenStore?: () => void;
}

export const MerchantOrdersModal: React.FC<MerchantOrdersModalProps> = ({
  isOpen,
  onClose,
  settings,
  isRTL,
  onOpenStore,
}) => {
  const [orders, setOrders] = useState<DeliveryOrder[]>(() => getDeliveryOrders());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  const refreshOrders = () => {
    const updated = getDeliveryOrders();
    setOrders(updated);
    if (selectedOrder) {
      const refreshedSelected = updated.find((o) => o.id === selectedOrder.id);
      if (refreshedSelected) setSelectedOrder(refreshedSelected);
    }
  };

  useEffect(() => {
    const handleUpdate = () => refreshOrders();
    window.addEventListener('qaryati:orders-updated', handleUpdate);
    window.addEventListener('qaryati:new-order-received', handleUpdate);
    return () => {
      window.removeEventListener('qaryati:orders-updated', handleUpdate);
      window.removeEventListener('qaryati:new-order-received', handleUpdate);
    };
  }, [selectedOrder]);

  if (!isOpen) return null;

  const newOrdersCount = orders.filter((o) => o.status === 'NEW').length;
  const inPrepOrdersCount = orders.filter((o) => o.status === 'ACCEPTED').length;
  const readyPickupCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;
  const onWayCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'ON_THE_WAY').length;

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
    return order.status === statusFilter;
  });

  // Actions
  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'ACCEPTED');
    refreshOrders();
  };

  const handleMarkReadyForPickup = (orderId: string) => {
    updateOrderStatus(orderId, 'READY_FOR_PICKUP');
    refreshOrders();
  };

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
      updateOrderStatus(orderId, 'CANCELLED');
      refreshOrders();
    }
  };

  const handlePrintOrderSlip = (order: DeliveryOrder) => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) return;

    const currency = settings.currency || 'ر.س';
    const storeName = settings.storeName || 'متجر قريتي';

    const itemsHtml = order.items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px dashed #ddd;">
          <td style="padding: 6px 4px; font-weight: bold;">${idx + 1}. ${it.name}</td>
          <td style="padding: 6px 4px; text-align: center;">${it.quantity} ${it.unit || ''}</td>
          <td style="padding: 6px 4px; text-align: left; font-weight: bold;">${(it.total || it.quantity * it.unitPrice).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة تحضير طلب ${order.orderNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 13px; color: #111; }
            h2, h3 { margin: 4px 0; text-align: center; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
            .meta { margin-bottom: 12px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { border-bottom: 1px solid #000; padding: 6px 4px; font-size: 12px; }
            .totals { margin-top: 15px; border-top: 2px solid #000; padding-top: 8px; font-size: 14px; }
            .footer { margin-top: 25px; text-align: center; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${storeName}</h2>
            <h3>إيصال تحضير وتوصيل طلب (${order.orderNumber})</h3>
          </div>
          <div class="meta">
            <div><strong>تاريخ الطلب:</strong> ${new Date(order.createdAt).toLocaleString('ar-SA')}</div>
            <div><strong>اسم العميل:</strong> ${order.customerName}</div>
            <div><strong>هاتف العميل:</strong> ${order.customerPhone}</div>
            <div><strong>عنوان التوصيل:</strong> ${order.customerAddress || 'القرية'}</div>
            ${order.notes ? `<div><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: right;">الصنف</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: left;">المبلغ (${currency})</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>قيمة الأصناف:</span>
              <strong>${order.subtotal.toFixed(2)} ${currency}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>أجرة التوصيل:</span>
              <strong>${order.deliveryFee.toFixed(2)} ${currency}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 6px;">
              <span>الإجمالي المطلوب:</span>
              <span>${order.totalAmount.toFixed(2)} ${currency}</span>
            </div>
            <div style="margin-top: 6px; font-size: 12px; color: #444;">
              طريقة الدفع: ${order.paymentMethod === 'TRANSFER' ? 'تحويل بنكي' : 'كاش عند الاستلام'}
            </div>
          </div>
          <div class="footer">
            شكراً لطلبكم عبر منصة متجر قريتي
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const getStatusBadge = (status: DeliveryOrderStatus) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            طلب جديد وارد 🛎️
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <ChefHat className="w-3.5 h-3.5 text-amber-400" />
            تم القبول وقيد التجهيز 👨‍🍳
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            جاهز للاستلام والتوصيل 📦
          </span>
        );
      case 'OUT_FOR_DELIVERY':
      case 'ON_THE_WAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
            خرج للتوصيل مع السائق 🛵
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            تم التسليم بنجاح ✅
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <X className="w-3.5 h-3.5" />
            تم الإلغاء
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  طلبات متجر القرية والتوصيل
                </h2>
                {newOrdersCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                    {newOrdersCount} طلب جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                إدارة وقبول طلبات أهالي القرية وتجهيزها وتسليمها لمناديب التوصيل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => playNotificationChime('new_order')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 text-xs transition-colors hidden sm:flex items-center gap-1.5"
              title="تجربة صوت التنبيه"
            >
              <Bell className="w-4 h-4" />
              <span>فحص الجرس</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Stats Bar */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              جميع الطلبات ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              الطلبات الجارية ({newOrdersCount + inPrepOrdersCount + readyPickupCount + onWayCount})
            </button>
            <button
              onClick={() => setStatusFilter('NEW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'NEW'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-800/80 text-rose-400 hover:bg-slate-800'
              }`}
            >
              <span>جديدة واردة</span>
              {newOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                  {newOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('ACCEPTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ACCEPTED'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-amber-400 hover:bg-slate-800'
              }`}
            >
              قيد التجهيز ({inPrepOrdersCount})
            </button>
            <button
              onClick={() => setStatusFilter('READY_FOR_PICKUP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'READY_FOR_PICKUP'
                  ? 'bg-blue-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-blue-400 hover:bg-slate-800'
              }`}
            >
              جاهزة للمندوب ({readyPickupCount})
            </button>
            <button
              onClick={() => setStatusFilter('DELIVERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'DELIVERED'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              المسلّمة
            </button>
          </div>

          <div className="text-xs text-slate-400">
            تحديث مباشر وتلقائي فور وصول أي طلب ⚡
          </div>
        </div>

        {/* Content Body: Orders List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center">
              <Package className="w-14 h-14 stroke-1 mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-slate-300 mb-1">لا توجد طلبات في هذا القسم</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                ستظهر هنا طلبات الزبائن مباشرة عند إرسالها من متجر القرية مع صوت تنبيهي وتحديث فوري.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((order) => {
                const currency = settings.currency || 'ر.س';
                const isNew = order.status === 'NEW';
                const isAccepted = order.status === 'ACCEPTED';
                const isReady = order.status === 'READY_FOR_PICKUP';
                const isOut = order.status === 'OUT_FOR_DELIVERY' || order.status === 'ON_THE_WAY';

                return (
                  <div
                    key={order.id}
                    className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 ${
                      isNew
                        ? 'bg-gradient-to-b from-rose-950/30 to-slate-900 border-rose-500/50 shadow-lg shadow-rose-950/20 ring-1 ring-rose-500/30'
                        : isAccepted
                        ? 'bg-gradient-to-b from-amber-950/20 to-slate-900 border-amber-500/40'
                        : isReady
                        ? 'bg-gradient-to-b from-blue-950/20 to-slate-900 border-blue-500/40'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    {/* Order Top Bar */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm sm:text-base text-white tracking-wider font-mono">
                              {order.orderNumber}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {new Date(order.createdAt).toLocaleDateString('ar-SA')} -{' '}
                              {new Date(order.createdAt).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handlePrintOrderSlip(order)}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="طباعة إيصال التحضير"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Customer Info Card */}
                      <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/70 mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{order.customerName || 'عميل المتجر'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {order.customerPhone && (
                              <>
                                <a
                                  href={`tel:${order.customerPhone}`}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-1"
                                  title="اتصال مباشر بالعميل"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>اتصال</span>
                                </a>
                                <a
                                  href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `مرحباً ${order.customerName}، بخصوص طلبكم رقم ${order.orderNumber} من متجر ${settings.storeName || 'قريتي'}`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-[11px] flex items-center gap-1"
                                  title="مراسلة العميل واتساب"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>واتساب</span>
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {order.customerAddress && (
                          <div className="flex items-start gap-1.5 text-xs text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{order.customerAddress}</span>
                          </div>
                        )}

                        {order.notes && (
                          <div className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl px-2.5 py-1">
                            <strong>ملاحظة العميل:</strong> {order.notes}
                          </div>
                        )}

                        {order.driverName && (
                          <div className="text-xs text-indigo-300 flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <div className="flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-indigo-400" />
                              <span>مندوب التوصيل: <strong>{order.driverName}</strong></span>
                            </div>
                            {order.driverPhone && (
                              <a
                                href={`tel:${order.driverPhone}`}
                                className="text-[11px] text-indigo-400 hover:underline"
                              >
                                {order.driverPhone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 mb-3">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">
                          الأصناف المطلوبة ({order.items.length}):
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {order.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800/50"
                            >
                              <div className="flex items-center gap-2 text-white">
                                <span className="text-slate-500 text-[10px]">{idx + 1}.</span>
                                <span className="font-medium truncate max-w-[200px] sm:max-w-xs">
                                  {it.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-emerald-400 font-bold">
                                  {it.quantity} {it.unit || ''}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {(it.total || it.quantity * it.unitPrice).toFixed(2)} {currency}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400">طريقة الدفع: </span>
                          <span className="font-bold text-slate-200">
                            {order.paymentMethod === 'TRANSFER' ? 'تحويل بنكي' : 'كاش عند الاستلام'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">المجموع: </span>
                          <span className="text-base font-extrabold text-emerald-400 font-mono">
                            {order.totalAmount.toFixed(2)} {currency}
                          </span>
                          {order.deliveryFee > 0 && (
                            <div className="text-[10px] text-slate-500">
                              (شامل توصيل {order.deliveryFee} {currency})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step Flow Action Buttons: Accept -> Prepare -> Send to Driver */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                      {isNew && (
                        <>
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <ChefHat className="w-4 h-4" />
                            <span>قبول الطلب والبدء بالتجهيز 👨‍🍳</span>
                          </button>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 transition-colors"
                          >
                            رفض
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          onClick={() => handleMarkReadyForPickup(order.id)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Truck className="w-4 h-4" />
                          <span>اكتمل التجهيز - إرسال لسائق التوصيل 🛵📦</span>
                        </button>
                      )}

                      {isReady && (
                        <div className="flex-1 py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                            جاهز - بانتظار استلام المندوب
                          </span>
                          <span className="text-[11px] text-slate-400">
                            تم إرسال إشعار لمناديب القرية ⚡
                          </span>
                        </div>
                      )}

                      {isOut && (
                        <div className="flex-1 py-2 px-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4" />
                            الطلب في الطريق مع السائق ({order.driverName})
                          </span>
                        </div>
                      )}

                      {order.status === 'DELIVERED' && (
                        <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم تسليم الطلب واستلام المبلغ بنجاح ✅</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>دورة متكاملة: العميل يطلب ⬅️ التاجر يقبل ويجهز ⬅️ السائق يستلم ويوصل 🛵</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
