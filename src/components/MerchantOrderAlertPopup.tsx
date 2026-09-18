import React, { useState, useEffect } from 'react';
import { Bell, ChefHat, Package, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { DeliveryOrder, StoreSettings } from '../types';
import { updateOrderStatus, playNotificationChime } from '../services/deliveryService';

interface MerchantOrderAlertPopupProps {
  settings: StoreSettings;
  isRTL: boolean;
  onOpenOrdersModal: () => void;
}

export const MerchantOrderAlertPopup: React.FC<MerchantOrderAlertPopupProps> = ({
  settings,
  isRTL,
  onOpenOrdersModal,
}) => {
  const [activeAlertOrder, setActiveAlertOrder] = useState<DeliveryOrder | null>(null);

  useEffect(() => {
    const handleNewOrder = (e: any) => {
      const order = e.detail as DeliveryOrder;
      if (order && order.status === 'NEW') {
        setActiveAlertOrder(order);
        playNotificationChime('new_order');
      }
    };

    window.addEventListener('qaryati:new-order-received', handleNewOrder);
    return () => {
      window.removeEventListener('qaryati:new-order-received', handleNewOrder);
    };
  }, []);

  if (!activeAlertOrder) return null;

  const handleQuickAccept = () => {
    updateOrderStatus(activeAlertOrder.id, 'ACCEPTED');
    setActiveAlertOrder(null);
    onOpenOrdersModal();
  };

  const currency = settings.currency || 'ر.س';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-bounce">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl shadow-amber-950/80 text-white flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black animate-pulse">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400">إشعار طلب جديد وارد!</span>
                <span className="font-mono text-xs font-black text-white px-2 py-0.5 rounded bg-slate-800">
                  {activeAlertOrder.orderNumber}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white mt-0.5">
                {activeAlertOrder.customerName || 'عميل المتجر'} طلب {activeAlertOrder.items.length} أصناف
              </h4>
            </div>
          </div>

          <button
            onClick={() => setActiveAlertOrder(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400">إجمالي الحساب المطلوب:</span>
          <span className="text-sm font-black text-emerald-400 font-mono">
            {activeAlertOrder.totalAmount.toFixed(2)} {currency}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleQuickAccept}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <ChefHat className="w-4 h-4" />
            <span>قبول الطلب والبدء بالتجهيز 👨‍🍳</span>
          </button>

          <button
            onClick={() => {
              setActiveAlertOrder(null);
              onOpenOrdersModal();
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
          >
            عرض التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
};
