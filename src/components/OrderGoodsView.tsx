import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Phone,
  DollarSign,
  CreditCard,
  Layers,
  ArrowRight,
  Filter,
  ShoppingBag,
  History,
  Calendar,
  User,
  Printer,
  ChevronDown,
  ChevronUp,
  Share2,
  Sparkles,
  RefreshCw,
  Package,
  Clock,
  CheckSquare,
  Boxes,
  ArrowDownToLine,
  XCircle,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Item, Transaction, PaymentMethod, TransactionType, TransactionCartItem } from '../types';

interface OrderGoodsViewProps {
  onOpenAddItem: () => void;
  onPrintReceipt: (transaction: Transaction) => void;
}

interface SelectedOrderItem {
  item: Item;
  quantity: number;
  costPrice: number;
}

export const OrderGoodsView: React.FC<OrderGoodsViewProps> = ({
  onOpenAddItem,
  onPrintReceipt,
}) => {
  const {
    items,
    transactions,
    createTransaction,
    pendingSupplyOrders,
    receiveSupplyOrder,
    cancelSupplyOrder,
    settings,
    currentCashier,
    debts,
    showNotification,
  } = useApp();

  // Success notification toast state
  const [successToast, setSuccessToast] = useState<{
    message: string;
    description: string;
    orderId?: string;
    isPending?: boolean;
  } | null>(null);

  // Active subtab: 'NEW_ORDER' | 'RECEIVE_ORDERS' | 'ORDERS_HISTORY'
  const [activeSubTab, setActiveSubTab] = useState<'NEW_ORDER' | 'RECEIVE_ORDERS' | 'ORDERS_HISTORY'>('NEW_ORDER');

  // Operation Mode:
  // 'SUPPLY_ORDER': طلب بضاعة من المورد (بانتظار وصول الشحنة) -> لا تضاف للمخزون فوراً ويبقى تنبيه النواقص نشطاً
  // 'DIRECT_RECEIPT': استلام وتوريد فوري مباشر (البضاعة بيدك الآن) -> تضاف فوراً للمخزون
  const [fulfillmentMode, setFulfillmentMode] = useState<'SUPPLY_ORDER' | 'DIRECT_RECEIPT'>('SUPPLY_ORDER');

  // Order mode: Cash (نقد) or Credit (آجل)
  const [orderType, setOrderType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');

  // Supplier info
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');

  // Search & Filter state for catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Selected items map: itemId -> SelectedOrderItem
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, SelectedOrderItem>>(new Map());

  // Search for past purchase/order transactions
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'CASH' | 'CREDIT'>('ALL');

  // State for inspecting/receiving a pending order
  const [inspectingOrder, setInspectingOrder] = useState<Transaction | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [receivedCostPrices, setReceivedCostPrices] = useState<Record<string, number>>({});
  const [receiverName, setReceiverName] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptPaidAmount, setReceiptPaidAmount] = useState<string>('');
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState<PaymentMethod>('CASH');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [items]);

  // Filter items in stock
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterLowStockOnly && item.quantity > (item.minStockAlert || 5)) {
        return false;
      }
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = String(item.name || '').toLowerCase().includes(q);
        const matchBarcode = String(item.barcode || '').toLowerCase().includes(q);
        const matchCategory = String(item.category || '').toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchCategory) {
          return false;
        }
      }
      return true;
    });
  }, [items, searchQuery, selectedCategory, filterLowStockOnly]);

  // Selected items array
  const selectedItemsList = useMemo(() => {
    return Array.from(selectedItemsMap.values());
  }, [selectedItemsMap]);

  // Calculate Order Totals
  const totalAmount = useMemo(() => {
    return selectedItemsList.reduce((sum, current) => sum + current.quantity * current.costPrice, 0);
  }, [selectedItemsList]);

  const totalUnits = useMemo(() => {
    return selectedItemsList.reduce((sum, current) => sum + current.quantity, 0);
  }, [selectedItemsList]);

  const paidAmount = useMemo(() => {
    if (orderType === 'CASH') {
      return totalAmount;
    }
    if (paidAmountInput === '') return 0;
    const num = parseFloat(paidAmountInput);
    return isNaN(num) ? 0 : Math.min(Math.max(0, num), totalAmount);
  }, [orderType, totalAmount, paidAmountInput]);

  const remainingDebt = Math.max(0, totalAmount - paidAmount);

  // Past Orders/Purchases History
  const purchaseTransactions = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.type === 'PURCHASE' ||
          t.type === 'ORDER_GOODS_CASH' ||
          t.type === 'ORDER_GOODS_CREDIT'
      )
      .filter((t) => {
        if (historyTypeFilter === 'CASH' && t.type === 'ORDER_GOODS_CREDIT') return false;
        if (historyTypeFilter === 'CREDIT' && t.type !== 'ORDER_GOODS_CREDIT') return false;
        if (historySearchQuery.trim()) {
          const q = historySearchQuery.toLowerCase().trim();
          const matchInv = t.invoiceNumber.toLowerCase().includes(q);
          const matchParty = (t.partyName || '').toLowerCase().includes(q);
          const matchItems = t.items.some((i) => i.name.toLowerCase().includes(q));
          return matchInv || matchParty || matchItems;
        }
        return true;
      });
  }, [transactions, historyTypeFilter, historySearchQuery]);

  // Quick Pick: Select All Low Stock Items
  const handleSelectAllLowStock = () => {
    const lowStockItems = items.filter((i) => i.quantity <= (i.minStockAlert || 5));
    if (lowStockItems.length === 0) {
      showNotification('لا توجد أصناف منخفضة أو ناقصة في المخزون حالياً.', 'info');
      return;
    }

    const nextMap = new Map<string, SelectedOrderItem>(selectedItemsMap);
    lowStockItems.forEach((item) => {
      const minAlert = item.minStockAlert || 5;
      const deficit = Math.max(1, minAlert - item.quantity);
      const suggestedReorder = Math.max(10, deficit + 5);

      if (!nextMap.has(item.id)) {
        nextMap.set(item.id, {
          item,
          quantity: suggestedReorder,
          costPrice: item.costPrice || 0,
        });
      }
    });

    setSelectedItemsMap(nextMap);
  };

  // Toggle or select an item into the order cart
  const handleToggleItem = (item: Item) => {
    const nextMap = new Map<string, SelectedOrderItem>(selectedItemsMap);
    if (nextMap.has(item.id)) {
      nextMap.delete(item.id);
    } else {
      const minAlert = item.minStockAlert || 5;
      const deficit = Math.max(1, minAlert - item.quantity);
      const defaultQty = Math.max(5, deficit);

      nextMap.set(item.id, {
        item,
        quantity: defaultQty,
        costPrice: item.costPrice || 0,
      });
    }
    setSelectedItemsMap(nextMap);
  };

  const handleUpdateItemQuantity = (itemId: string, qty: number) => {
    const nextMap = new Map<string, SelectedOrderItem>(selectedItemsMap);
    const existing = nextMap.get(itemId);
    if (existing) {
      if (qty <= 0) {
        nextMap.delete(itemId);
      } else {
        nextMap.set(itemId, {
          item: existing.item,
          quantity: qty,
          costPrice: existing.costPrice,
        });
      }
      setSelectedItemsMap(nextMap);
    }
  };

  const handleUpdateItemCostPrice = (itemId: string, cost: number) => {
    const nextMap = new Map<string, SelectedOrderItem>(selectedItemsMap);
    const existing = nextMap.get(itemId);
    if (existing) {
      nextMap.set(itemId, {
        item: existing.item,
        quantity: existing.quantity,
        costPrice: Math.max(0, cost),
      });
      setSelectedItemsMap(nextMap);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const nextMap = new Map<string, SelectedOrderItem>(selectedItemsMap);
    nextMap.delete(itemId);
    setSelectedItemsMap(nextMap);
  };

  // SUBMIT SUPPLY ORDER / DIRECT RECEIPT
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItemsList.length === 0) {
      showNotification('يرجى اختيار صنف واحد على الأقل لطلب التوريد.', 'warning');
      return;
    }

    if (orderType === 'CREDIT' && !supplierName.trim()) {
      showNotification('يرجى إدخال اسم المورد أو الشركة لربط طلبية الآجل بحسابه بدقة.', 'warning');
      return;
    }

    const txType: TransactionType =
      orderType === 'CASH' ? 'ORDER_GOODS_CASH' : 'ORDER_GOODS_CREDIT';

    const isDirect = fulfillmentMode === 'DIRECT_RECEIPT';

    const cartItems: TransactionCartItem[] = selectedItemsList.map((selected) => ({
      itemId: selected.item.id,
      barcode: selected.item.barcode,
      name: selected.item.name,
      quantity: selected.quantity,
      unitPrice: selected.costPrice,
      costPrice: selected.costPrice,
      total: selected.quantity * selected.costPrice,
      receivedQuantity: isDirect ? selected.quantity : 0,
    }));

    const transaction = createTransaction({
      type: txType,
      paymentMethod: orderType === 'CASH' ? paymentMethod : 'CASH',
      partyName: supplierName.trim() || 'مورد عام / شركة بضاعة',
      partyPhone: supplierPhone.trim(),
      items: cartItems,
      discount: 0,
      notes: notes.trim() || (isDirect ? 'استلام وتوريد بضاعة فوري' : 'أمر طلب بضاعة من المورد بانتظار الشحنة'),
      paidAmount,
      isDirectReceipt: isDirect,
      ...(expectedDeliveryDate.trim() ? { expectedDeliveryDate: expectedDeliveryDate.trim() } : {}),
    });

    // Reset Form
    setSelectedItemsMap(new Map());
    setSupplierName('');
    setSupplierPhone('');
    setExpectedDeliveryDate('');
    setNotes('');
    setPaidAmountInput('');

    if (transaction) {
      if (isDirect) {
        setSuccessToast({
          message: 'تم استلام البضاعة وتوريدها للمخزن فورياً!',
          description: `تمت زيادة أرصدة (${cartItems.length}) صنفاً في المخزن، ورفع تنبيه النواقص فوراً لوصولها الفعلي.`,
          orderId: transaction.id,
          isPending: false,
        });
        onPrintReceipt(transaction);
      } else {
        setSuccessToast({
          message: `تم إصدار أمر طلب البضاعة (${transaction.invoiceNumber}) بنجاح!`,
          description: `الشحنة الآن مسجلة بانتظار وصول المورد في قسم [استلام وتوريد الطلبيات الناقصة]. المخزون لن يتأثر وتنبيه النواقص يظل نشطاً حتى يتم فحص واستلام الشحنة فعلياً.`,
          orderId: transaction.id,
          isPending: true,
        });
      }
    }
  };

  // Generate WhatsApp Order Text to Send to Supplier/Vendor
  const handleShareToWhatsApp = () => {
    if (selectedItemsList.length === 0) {
      showNotification('يرجى اختيار أصناف أولاً لتوليد رسالة الطلب.', 'warning');
      return;
    }

    const storeTitle = settings.storeName || 'المتجر';
    let text = `📦 *أمر طلب بضاعة وتوريد من: ${storeTitle}*\n`;
    text += `📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n`;
    if (supplierName) text += `👤 المورد / الشركة: ${supplierName}\n`;
    if (expectedDeliveryDate) text += `⏰ موعد الوصول المطلوب: ${expectedDeliveryDate}\n`;
    text += `--------------------------------\n`;
    text += `*قائمة الأصناف المطلوبة بالتفصيل:*\n`;

    selectedItemsList.forEach((si, idx) => {
      text += `${idx + 1}. *${si.item.name}*\n   الكمية المطلوبة: *${si.quantity}* ${si.item.unit || 'حبة'} (باركود: ${si.item.barcode})\n`;
    });

    text += `--------------------------------\n`;
    text += `🔢 إجمالي الأصناف: ${selectedItemsList.length} صنف\n`;
    text += `📦 إجمالي القطع المطلوبة: ${totalUnits} قطعة\n`;
    text += `💰 القيمة المقدرة: ${totalAmount.toLocaleString()} ${settings.currency}\n`;
    if (notes) text += `📝 ملاحظات الشحنة: ${notes}\n`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${supplierPhone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');
  };

  // Open inspection/receipt modal for a pending order
  const handleOpenReceiveModal = (order: Transaction) => {
    setInspectingOrder(order);
    const initialQtyMap: Record<string, number> = {};
    const initialCostMap: Record<string, number> = {};

    order.items.forEach((item) => {
      const alreadyReceived = item.receivedQuantity || 0;
      const remaining = Math.max(0, item.quantity - alreadyReceived);
      initialQtyMap[item.itemId] = remaining > 0 ? remaining : item.quantity;
      initialCostMap[item.itemId] = item.costPrice || item.unitPrice;
    });

    setReceivedQuantities(initialQtyMap);
    setReceivedCostPrices(initialCostMap);
    setReceiverName(currentCashier.name || 'مدير الفرع');
    setReceiptNotes('');
    setReceiptPaidAmount(order.paidAmount ? String(order.paidAmount) : '');
    setReceiptPaymentMethod(order.paymentMethod || 'CASH');
  };

  // Submit Inspection & Stock-In
  const handleConfirmReceiveSupplyOrder = () => {
    if (!inspectingOrder) return;

    const receivedItemsPayload = inspectingOrder.items.map((it) => {
      const recQty = receivedQuantities[it.itemId] !== undefined ? receivedQuantities[it.itemId] : 0;
      const recCost = receivedCostPrices[it.itemId] !== undefined ? receivedCostPrices[it.itemId] : it.costPrice;
      return {
        itemId: it.itemId,
        receivedQuantity: Math.max(0, recQty),
        costPrice: Math.max(0, recCost),
      };
    });

    const totalNewlyReceived = receivedItemsPayload.reduce((sum, i) => sum + i.receivedQuantity, 0);
    if (totalNewlyReceived <= 0) {
      showNotification('يرجى إدخال كمية مستلمة (1 على الأقل) لتوريدها للمخزن.', 'warning');
      return;
    }

    const paidVal = receiptPaidAmount.trim() !== '' ? parseFloat(receiptPaidAmount) : inspectingOrder.paidAmount;

    const updatedTx = receiveSupplyOrder(inspectingOrder.id, {
      receivedItems: receivedItemsPayload,
      paidAmount: paidVal,
      paymentMethod: receiptPaymentMethod,
      receiverName: receiverName.trim() || currentCashier.name,
      notes: receiptNotes.trim(),
    });

    setInspectingOrder(null);

    if (updatedTx) {
      setSuccessToast({
        message: 'تم فحص واستلام الشحنة وتوريدها للمخزن بنجاح!',
        description: `تمت إضافة الكميات المستلمة فعلياً (${totalNewlyReceived} قطعة) إلى المخزن، وتم حل وتحديث تنبيهات النواقص بعد وصول البضاعة للرفوف.`,
        orderId: updatedTx.id,
        isPending: false,
      });

      // Prompt print of delivery voucher
      onPrintReceipt(updatedTx);
    }
  };

  // Cancel a pending supply order
  const handleCancelOrder = (order: Transaction) => {
    const confirmCancel = window.confirm(
      `هل أنت متأكد من إلغاء أمر التوريد #${order.invoiceNumber} للمورد (${order.partyName})؟\nلن يتم التأثير على المخزون.`
    );
    if (!confirmCancel) return;

    cancelSupplyOrder(order.id, 'تم الإلغاء بطلب من الإدارة');
    setSuccessToast({
      message: `تم إلغاء أمر التوريد #${order.invoiceNumber}`,
      description: 'تم تحويل حالة الطلبية إلى ملغية ولن تظهر في الشحنات المعلقة.',
      isPending: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-950/50 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                توريد البضاعة والمشتريات
              </h2>
              <span className="text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
                إدارة احترافية دقيقة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              إصدار أوامر طلب النواقص، مراقبة الشحنات قيد التوريد، واستلام البضاعة وفحصها قبل إضافتها للمخزن
            </p>
          </div>
        </div>

        {/* Subtabs Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-stretch md:self-auto overflow-x-auto">
          {/* TAB 1: NEW ORDER */}
          <button
            type="button"
            onClick={() => setActiveSubTab('NEW_ORDER')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'NEW_ORDER'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>طلب بضاعة جديدة</span>
            {selectedItemsList.length > 0 && (
              <span className="bg-white text-amber-950 font-black text-[11px] px-1.5 py-0.2 rounded-full font-mono">
                {selectedItemsList.length}
              </span>
            )}
          </button>

          {/* TAB 2: RECEIVE PENDING SUPPLY ORDERS (الاستلام والتوريد الفعلي) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('RECEIVE_ORDERS')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'RECEIVE_ORDERS'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>استلام وتوريد الطلبيات الناقصة</span>
            {pendingSupplyOrders.length > 0 ? (
              <span className="bg-rose-500 text-white font-black text-[11px] px-2 py-0.5 rounded-full font-mono animate-pulse shadow-sm shadow-rose-950">
                {pendingSupplyOrders.length} معلقة
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-400 text-[11px] px-1.5 py-0.5 rounded-full font-mono">
                0
              </span>
            )}
          </button>

          {/* TAB 3: HISTORY */}
          <button
            type="button"
            onClick={() => setActiveSubTab('ORDERS_HISTORY')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'ORDERS_HISTORY'
                ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل فواتير التوريد ({purchaseTransactions.length})</span>
          </button>
        </div>
      </div>

      {/* Success/Status Notification Banner */}
      {successToast && (
        <div
          className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white shadow-xl animate-in fade-in zoom-in-95 ${
            successToast.isPending
              ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950/80 border-amber-500/60 shadow-amber-950/60'
              : 'bg-gradient-to-r from-emerald-950 to-teal-950 border-emerald-500/60 shadow-emerald-950/60'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                successToast.isPending
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {successToast.isPending ? <Clock className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <div
                className={`font-black text-sm sm:text-base ${
                  successToast.isPending ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {successToast.message}
              </div>
              <div className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {successToast.description}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {successToast.isPending && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('RECEIVE_ORDERS');
                  setSuccessToast(null);
                }}
                className="text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>عرض الشحنات بانتظار الاستلام</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              إغلاق ✕
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: NEW ORDER / PURCHASE CREATION */}
      {activeSubTab === 'NEW_ORDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Catalog & Selection): 7 Cols */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Action Banner (Auto-pick Low Stock) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-200">تجهيز سريع للنواقص:</span>
                <span className="text-slate-400 text-[11px]">
                  (يوجد {items.filter((i) => i.quantity <= (i.minStockAlert || 5)).length} صنف يحتاج توريد)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllLowStock}
                  className="bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/60 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تحديد كافة النواقص تلقائياً</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAddItem}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>صنف جديد</span>
                </button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الباركود لتحديد البضاعة المطلوبة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-2 text-[10px] text-slate-400 hover:text-white"
                    >
                      مسح
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">جميع الأقسام ({items.length})</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      filterLowStockOnly
                        ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>النواقص فقط</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs font-bold text-slate-400 mb-3 flex items-center justify-between">
                <span>اختر الأصناف المطلوب توريدها من القائمة ({filteredItems.length}):</span>
                <span className="text-[11px] text-amber-400 font-normal">
                  (انقر على الصنف لإضافته للطلبية)
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لا توجد أصناف مطابقة لخيارات البحث.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const isSelected = selectedItemsMap.has(item.id);
                    const selectedData = selectedItemsMap.get(item.id);
                    const isLowStock = item.quantity <= (item.minStockAlert || 5);
                    const isOutOfStock = item.quantity <= 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500/80 shadow-sm shadow-amber-950'
                            : 'bg-slate-950 hover:bg-slate-950/70 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isOutOfStock ? (
                                <span className="text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 px-1 rounded">
                                  نافد
                                </span>
                              ) : isLowStock ? (
                                <span className="text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800 px-1 rounded">
                                  ناقص
                                </span>
                              ) : null}
                              <h4 className="font-bold text-xs text-white truncate">
                                {item.name}
                              </h4>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>باركود: {item.barcode}</span>
                              {item.category && <span>• {item.category}</span>}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/60">
                          <div className="text-slate-400">
                            المخزون الحالي:{' '}
                            <span
                              className={`font-mono font-bold ${
                                isOutOfStock
                                  ? 'text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            >
                              {item.quantity} {item.unit || 'حبة'}
                            </span>
                          </div>

                          <div className="text-slate-400">
                            التكلفة:{' '}
                            <span className="font-mono font-bold text-emerald-400">
                              {item.costPrice} {settings.currency}
                            </span>
                          </div>
                        </div>

                        {/* If selected: inline quick quantity controls */}
                        {isSelected && selectedData && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900/90 rounded-lg p-2 flex items-center justify-between gap-2 border border-amber-900/60 mt-1"
                          >
                            <span className="text-[11px] font-bold text-amber-300">
                              الكمية المطلوبة:
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateItemQuantity(item.id, selectedData.quantity - 1)
                                }
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={selectedData.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)
                                }
                                className="w-14 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs text-amber-300 font-mono font-bold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateItemQuantity(item.id, selectedData.quantity + 1)
                                }
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Order Configuration & Summary): 5 Cols */}
          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={handleSubmitOrder}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    بيانات أمر التوريد والطلب
                  </h3>
                </div>

                <div className="text-xs font-mono font-bold text-slate-400">
                  الأصناف: <span className="text-amber-400">{selectedItemsList.length}</span>
                </div>
              </div>

              {/* CRITICAL STRICT INVENTORY WORKFLOW SWITCH */}
              <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="block text-xs font-extrabold text-white">
                  طريقة إدارة العملية المخزنية:
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {/* Mode 1: Safe Pending Order (Default) */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      fulfillmentMode === 'SUPPLY_ORDER'
                        ? 'bg-amber-950/40 border-amber-500/80 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillmentMode"
                      checked={fulfillmentMode === 'SUPPLY_ORDER'}
                      onChange={() => setFulfillmentMode('SUPPLY_ORDER')}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <div className="font-black text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>أمر طلب بضاعة من المورد (بانتظار وصول الشحنة) - موصى به</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        الكميات <strong>لن تضاف إلى المخزون</strong> و<strong>لن يُلغى تنبيه النواقص</strong> حتى تصل الشحنة ويتم فحصها واستلامها يدوياً وتأكيدها عبر تبويب (استلام وتوريد الطلبيات الناقصة).
                      </p>
                    </div>
                  </label>

                  {/* Mode 2: Immediate Direct Stock-in */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      fulfillmentMode === 'DIRECT_RECEIPT'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillmentMode"
                      checked={fulfillmentMode === 'DIRECT_RECEIPT'}
                      onChange={() => setFulfillmentMode('DIRECT_RECEIPT')}
                      className="mt-1 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-black text-emerald-300 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>استلام فوري مباشر (البضاعة وصلت الآن ومستلمة باليد)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        تضاف الكميات فوراً للمخزن وتحدث الأرصدة في الحال لأن البضاعة تم استلامها باليد فعلياً.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Mode: Cash vs Credit */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نوع الحساب والدفع:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOrderType('CASH')}
                    className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      orderType === 'CASH'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>نقدي (كاش / تحويل)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('CREDIT')}
                    className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      orderType === 'CREDIT'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>آجل (ذمم المورد)</span>
                  </button>
                </div>
              </div>

              {/* Payment method for cash */}
              {orderType === 'CASH' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">طريقة السداد:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'TRANSFER', 'CARD'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          paymentMethod === method
                            ? 'bg-slate-800 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {method === 'CASH' ? 'كاش نقدي' : method === 'TRANSFER' ? 'تحويل بنكي' : 'بطاقة / شبكة'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    اسم المورد أو الشركة:{' '}
                    {orderType === 'CREDIT' && <span className="text-rose-400">*</span>}
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="مثال: شركة البركة للتجارة"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      required={orderType === 'CREDIT'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-300">
                    رقم هاتف المورد / المندوب:
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="05xxxxxxxx"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Expected Delivery Date (Optional) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  موعد وصول الشحنة المتوقع (اختياري):
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300">
                  ملاحظات الطلبية (رقم كرتونة، شروط توريد، تاريخ صلاحية):
                </label>
                <input
                  type="text"
                  placeholder="ملاحظات الشحنة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Selected Items preview list */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>الأصناف المختارة للطلب ({selectedItemsList.length}):</span>
                  {selectedItemsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemsMap(new Map())}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      إفراغ القائمة
                    </button>
                  )}
                </div>

                {selectedItemsList.length === 0 ? (
                  <div className="bg-slate-950/70 border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
                    لم تختر أي صنف بعد. اختر الأصناف من القائمة على اليمين.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedItemsList.map(({ item, quantity, costPrice }) => (
                      <div
                        key={item.id}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {quantity} {item.unit || 'حبة'} × {costPrice} ={' '}
                            <strong className="text-amber-300">
                              {((quantity || 0) * (costPrice || 0)).toLocaleString()} {settings.currency}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Calculation Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>إجمالي كمية البضاعة المطلوبة:</span>
                  <span className="font-mono text-slate-200 font-bold">{totalUnits} قطعة</span>
                </div>
                <div className="flex items-center justify-between text-sm font-black border-t border-slate-800/80 pt-2">
                  <span className="text-white">إجمالي قيمة الفاتورة:</span>
                  <span className="text-amber-400 font-mono text-base">
                    {(totalAmount ?? 0).toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={selectedItemsList.length === 0}
                  className={`w-full font-black py-3 px-4 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                    fulfillmentMode === 'DIRECT_RECEIPT'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                  }`}
                >
                  {fulfillmentMode === 'DIRECT_RECEIPT' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      <span>استلام فوري وتوريد للمخزون الآن</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-5 h-5 text-slate-950" />
                      <span>إصدار أمر طلب البضاعة (بانتظار الشحنة)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  disabled={selectedItemsList.length === 0}
                  className="w-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 disabled:opacity-50 text-emerald-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>مشاركة أمر الطلبية مع المورد (واتساب)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: RECEIVE PENDING SUPPLY ORDERS (استلام وتوريد الشحنات الناقصة) */}
      {activeSubTab === 'RECEIVE_ORDERS' && (
        <div className="space-y-5">
          {/* Header & KPI Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">طلبيات معلقة بانتظار الشحنة</div>
                <div className="text-xl font-black text-white font-mono">
                  {pendingSupplyOrders.length} طلبية
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">قطع مطلوبة قيد التوريد</div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {pendingSupplyOrders.reduce((sum, order) => {
                    const orderPendingUnits = order.items.reduce((s, it) => {
                      const rec = it.receivedQuantity || 0;
                      return s + Math.max(0, it.quantity - rec);
                    }, 0);
                    return sum + orderPendingUnits;
                  }, 0)}{' '}
                  قطعة
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">إجمالي قيمة البضائع المتوقعة</div>
                <div className="text-xl font-black text-cyan-400 font-mono">
                  {pendingSupplyOrders
                    .reduce((sum, order) => sum + order.totalAmount, 0)
                    .toLocaleString()}{' '}
                  {settings.currency}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Shipments List */}
          {pendingSupplyOrders.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-base text-slate-200">
                لا توجد شحنات معلقة بانتظار الاستلام حالياً
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                كافة طلبيات التوريد تم فحصها واستلامها وإضافتها للمخزن بالكامل.
                إذا أردت طلب نواقص جديدة، اضغط على تبويب <strong>"طلب بضاعة جديدة"</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('NEW_ORDER')}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 transition-colors cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار طلب بضاعة جديدة</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>شحنات الموردين المعلقة بانتظار الفحص والاستلام الفعلي:</span>
                <span className="text-amber-400 text-[11px]">
                  (تنبيه: لن تضاف الكميات للمخزن حتى تضغط فحص واستلام الشحنة)
                </span>
              </div>

              {pendingSupplyOrders.map((order) => {
                const isPartiallyReceived = order.status === 'PARTIALLY_RECEIVED';
                const totalRequestedUnits = order.items.reduce((s, i) => s + i.quantity, 0);
                const totalReceivedUnits = order.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm hover:border-slate-700 transition-all"
                  >
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isPartiallyReceived
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                          }`}
                        >
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm sm:text-base text-white font-mono">
                              طلب #{order.invoiceNumber}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                isPartiallyReceived
                                  ? 'bg-amber-950 border-amber-700 text-amber-300'
                                  : 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
                              }`}
                            >
                              {isPartiallyReceived
                                ? 'مستلم جزئياً - بانتظار استكمال الباقي'
                                : 'بانتظار وصول الشحنة من المورد'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                            <span>
                              المورد: <strong className="text-slate-200">{order.partyName}</strong>
                            </span>
                            {order.partyPhone && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-300">{order.partyPhone}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>
                              التاريخ: {new Date(order.timestamp).toLocaleDateString('ar-SA')}
                            </span>
                            {order.expectedDeliveryDate && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-bold">
                                  موعد الوصول: {order.expectedDeliveryDate}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenReceiveModal(order)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
                        >
                          <ArrowDownToLine className="w-4 h-4" />
                          <span>فحص واستلام وتوريد الشحنة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          className="bg-slate-800 hover:bg-rose-950/60 hover:border-rose-700 hover:text-rose-300 text-slate-400 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
                          title="إلغاء أمر الطلبية"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>

                    {/* Order Line Items Table */}
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>الأصناف المطلوبة في هذه الطلبية ({order.items.length} صنف):</span>
                        <span className="font-mono text-slate-400">
                          المستلم: {totalReceivedUnits} / {totalRequestedUnits} قطعة
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                              <th className="pb-1.5 font-bold">الصنف والباركود</th>
                              <th className="pb-1.5 font-bold text-center">المطلوب</th>
                              <th className="pb-1.5 font-bold text-center">المستلم حالياً</th>
                              <th className="pb-1.5 font-bold text-center">الرصيد بالمحل الآن</th>
                              <th className="pb-1.5 font-bold text-left">التكلفة المتوقعة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {order.items.map((cartItem) => {
                              const storeItem = items.find((i) => i.id === cartItem.itemId);
                              const currentStoreQty = storeItem ? storeItem.quantity : 0;
                              const minAlert = storeItem?.minStockAlert || 5;
                              const isLowOnShelf = currentStoreQty <= minAlert;
                              const isZero = currentStoreQty <= 0;
                              const received = cartItem.receivedQuantity || 0;

                              return (
                                <tr key={cartItem.itemId} className="hover:bg-slate-900/50">
                                  <td className="py-2">
                                    <div className="font-bold text-slate-200">{cartItem.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {cartItem.barcode}
                                    </div>
                                  </td>
                                  <td className="py-2 text-center font-mono font-bold text-slate-200">
                                    {cartItem.quantity}
                                  </td>
                                  <td className="py-2 text-center font-mono font-bold text-emerald-400">
                                    {received}
                                  </td>
                                  <td className="py-2 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                        isZero
                                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                          : isLowOnShelf
                                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                          : 'bg-slate-900 text-slate-300'
                                      }`}
                                    >
                                      {currentStoreQty} (
                                      {isZero ? 'نافد!' : isLowOnShelf ? 'ناقص' : 'متوفر'})
                                    </span>
                                  </td>
                                  <td className="py-2 text-left font-mono font-bold text-amber-400">
                                    {(cartItem.total ?? 0).toLocaleString()} {settings.currency}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: PURCHASE & ORDER TRANSACTIONS HISTORY */}
      {activeSubTab === 'ORDERS_HISTORY' && (
        <div className="space-y-4">
          {/* History Search & Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم المورد أو الصنف..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                  historyTypeFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('CASH')}
                className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                  historyTypeFilter === 'CASH'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                نقد
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('CREDIT')}
                className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                  historyTypeFilter === 'CREDIT'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                آجل (ذمم)
              </button>
            </div>
          </div>

          {/* History List Table / Cards */}
          {purchaseTransactions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Truck className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <p className="font-bold text-base text-slate-300">لا توجد فواتير توريد مسجلة حتى الآن</p>
              <p className="text-xs text-slate-500">
                يمكنك الضغط على تبويب "طلب بضاعة جديدة" لإصدار طلب مشتريات وتوريد للمخزن
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {purchaseTransactions.map((tx) => {
                const isCredit = tx.type === 'ORDER_GOODS_CREDIT';
                const isPending = tx.status === 'PENDING_RECEIPT' || tx.status === 'PARTIALLY_RECEIVED';
                const isCancelled = tx.status === 'CANCELLED';

                return (
                  <div
                    key={tx.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isCancelled
                              ? 'bg-slate-800 text-slate-500 border border-slate-700'
                              : isPending
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
                              : isCredit
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                          }`}
                        >
                          {isCancelled ? 'ملغي' : isPending ? 'معلق' : isCredit ? 'آجل' : 'نقد'}
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>فاتورة #{tx.invoiceNumber}</span>
                            <span className="text-xs font-normal text-slate-400 font-sans">
                              (المورد: {tx.partyName || 'عام'})
                            </span>
                            {isPending && (
                              <span className="text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full">
                                بانتظار الاستلام الفعلي
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">
                              {new Date(tx.timestamp).toLocaleString('ar-SA')}
                            </span>
                            <span>•</span>
                            <span>بواسطة: {tx.cashierName}</span>
                            {tx.receivedBy && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400">استلمها: {tx.receivedBy}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className="text-base font-black text-amber-400 font-mono">
                            {tx.totalAmount.toLocaleString()} {settings.currency}
                          </div>
                          {isCredit && tx.remainingDebt > 0 && (
                            <div className="text-[11px] text-rose-400 font-mono">
                              المتبقي: {tx.remainingDebt.toLocaleString()} {settings.currency}
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(tx)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-950"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            <span>استلام الآن</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onPrintReceipt(tx)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          title="طباعة سند أو فاتورة التوريد"
                        >
                          <Printer className="w-4 h-4 text-cyan-400" />
                        </button>
                      </div>
                    </div>

                    {/* Items List Inside Invoice */}
                    <div className="bg-slate-950/80 rounded-lg p-2.5">
                      <div className="text-[11px] font-bold text-slate-400 mb-1">
                        الأصناف المذكورة في هذه الفاتورة ({tx.items.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {tx.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/90 border border-slate-800/80 rounded px-2 py-1 text-xs flex items-center justify-between"
                          >
                            <span className="text-slate-200 truncate">{item.name}</span>
                            <span className="font-mono font-bold text-emerald-400 shrink-0 mr-2">
                              {item.receivedQuantity !== undefined ? item.receivedQuantity : item.quantity} ×{' '}
                              {item.costPrice || item.unitPrice}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INSPECTION & RECEIPT MODAL (نافذة فحص واستلام الشحنة وتوريدها للمخزن) */}
      {inspectingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white">
                    فحص واستلام شحنة بضاعة وتوريدها للمخزن
                  </h3>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                    <span>طلب: {inspectingOrder.invoiceNumber}</span>
                    <span>•</span>
                    <span>المورد: {inspectingOrder.partyName}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Important Inventory Rule Banner */}
              <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-emerald-300 block mb-0.5">
                    تأكيد الفحص والاستلام الفعلي:
                  </strong>
                  بمجرد تأكيدك، ستتم إضافة الكميات المستلمة فعلياً باليد إلى رصيد المخزن في الحال، وسيتم حل تنبيهات النواقص تلقائياً بعد أن أصبحت البضاعة متوفرة على الرف.
                </div>
              </div>

              {/* Items Verification Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>فحص كميات الأصناف المستلمة وتعديل التكلفة إن لزم:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allMax: Record<string, number> = {};
                      inspectingOrder.items.forEach((it) => {
                        allMax[it.itemId] = it.quantity;
                      });
                      setReceivedQuantities(allMax);
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    استلام كامل الكميات بنقرة واحدة
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {inspectingOrder.items.map((it) => {
                    const reqQty = it.quantity;
                    const recQty = receivedQuantities[it.itemId] !== undefined ? receivedQuantities[it.itemId] : reqQty;
                    const recCost = receivedCostPrices[it.itemId] !== undefined ? receivedCostPrices[it.itemId] : it.costPrice;

                    return (
                      <div
                        key={it.itemId}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-white">{it.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              باركود: {it.barcode} | المطلوب في الطلبية: <strong>{reqQty} قطعة</strong>
                            </div>
                          </div>

                          <div className="text-left">
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {((recQty || 0) * (recCost || 0)).toLocaleString()} {settings.currency}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              الكمية المستلمة فعلياً باليد:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max={reqQty * 2}
                                value={recQty}
                                onChange={(e) =>
                                  setReceivedQuantities({
                                    ...receivedQuantities,
                                    [it.itemId]: Math.max(0, parseInt(e.target.value) || 0),
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setReceivedQuantities({
                                    ...receivedQuantities,
                                    [it.itemId]: reqQty,
                                  })
                                }
                                className="bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] whitespace-nowrap cursor-pointer"
                              >
                                كامل ({reqQty})
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">
                              سعر التكلفة الفعلي للصنف:
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={recCost}
                              onChange={(e) =>
                                setReceivedCostPrices({
                                  ...receivedCostPrices,
                                  [it.itemId]: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receipt Details & Responsible Cashier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم الموظف المستلم والفاحص:
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="اسم المستلم..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ملاحظات الفحص وحالة الشحنة:
                  </label>
                  <input
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="مثال: تم فحص الكراتين سليمة وتواريخ الصلاحية جديدة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Settlement for Credit Orders */}
              {inspectingOrder.type === 'ORDER_GOODS_CREDIT' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300">
                    تسوية مالية لفاتورة المورد الآجل:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        المبلغ المسدد نقداً الآن عند الاستلام (إن وجد):
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={receiptPaidAmount}
                        onChange={(e) => setReceiptPaidAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        طريقة سداد الدفعة:
                      </label>
                      <select
                        value={receiptPaymentMethod}
                        onChange={(e) => setReceiptPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                      >
                        <option value="CASH">نقداً من الصندوق</option>
                        <option value="TRANSFER">تحويل بنكي</option>
                        <option value="CARD">بطاقة بنكية</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmReceiveSupplyOrder}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>تأكيد الاستلام وإضافة البضاعة رسمياً للمخزن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
