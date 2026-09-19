import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeftRight,
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  DollarSign,
  User,
  Phone,
  FileText,
  CreditCard,
  Building2,
  Sparkles,
  Package,
  Camera,
  Coins,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  TransactionType,
  PaymentMethod,
  TransactionCartItem,
  Item,
  Transaction,
} from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { convertCurrency, findCurrency, POPULAR_CURRENCIES } from '../data/currencies';

interface TransactionsViewProps {
  onPrintReceipt: (transaction: Transaction) => void;
  onOpenOrderGoodsModal?: (type?: 'CASH' | 'CREDIT') => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onPrintReceipt,
  onOpenOrderGoodsModal,
}) => {
  const {
    items,
    transactions,
    createTransaction,
    deleteTransaction,
    findItemByBarcode,
    settings,
    currentCashier,
    showNotification,
    isCashierMode,
    language,
    t,
    isRTL,
  } = useApp();

  // Active operation mode (بيع كاش / بيع أجل)
  const [operationType, setOperationType] = useState<TransactionType>('SALE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // التأكد من أن الكاشير محصور في بيع كاش أو بيع أجل فقط
  useEffect(() => {
    if (isCashierMode && operationType === 'PURCHASE') {
      setOperationType('SALE');
    }
  }, [isCashierMode, operationType]);

  // Input view mode: Barcode scan or Visual Catalog List
  const [inputViewMode, setInputViewMode] = useState<'BARCODE' | 'CATALOG'>('BARCODE');
  const [catalogCategory, setCatalogCategory] = useState<string>('ALL');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogLowStockOnly, setCatalogLowStockOnly] = useState<boolean>(false);

  // Customer / Supplier info
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Cart state
  const [cart, setCart] = useState<TransactionCartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');

  // POS Tabs & UI states
  const [posActiveTab, setPosActiveTab] = useState<'TERMINAL' | 'HISTORY'>('TERMINAL');
  const [showCustomerInputs, setShowCustomerInputs] = useState<boolean>(false);

  // Barcode / Search input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Foreign Currency Tender states
  const [showForeignPaymentCalc, setShowForeignPaymentCalc] = useState(false);
  const [foreignCurrencyCode, setForeignCurrencyCode] = useState<string>(
    settings.multiCurrency?.secondaryCurrencyCode || 'USD'
  );
  const [foreignTenderInput, setForeignTenderInput] = useState<string>('');

  // Filter for past transactions log
  const [historyFilterType, setHistoryFilterType] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Confirmation modal state for safe transaction deletion
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);

  // Catalog categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered catalog items
  const filteredCatalogItems = React.useMemo(() => {
    return items.filter((item) => {
      const q = catalogSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(item?.name ?? '').toLowerCase().includes(q) ||
        String(item?.barcode ?? '').toLowerCase().includes(q) ||
        String(item?.sku ?? '').toLowerCase().includes(q) ||
        (item.category && String(item.category).toLowerCase().includes(q));
      const matchesCategory =
        catalogCategory === 'ALL' || item.category === catalogCategory;
      const matchesLowStock =
        !catalogLowStockOnly || item.quantity <= (item.minStockAlert || 5);
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [items, catalogSearch, catalogCategory, catalogLowStockOnly]);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = Math.max(0, subtotal - (discount || 0));

  const isCreditOperation =
    operationType === 'CREDIT_SALE' || operationType === 'ORDER_GOODS_CREDIT';

  const paidAmount = isCreditOperation
    ? parseFloat(paidAmountInput) || 0
    : totalAmount;

  const remainingDebt = Math.max(0, totalAmount - paidAmount);

  // Shelf stock verification status for sales
  const isSaleMode = operationType === 'SALE' || operationType === 'CREDIT_SALE';
  const hasOversoldItems =
    isSaleMode &&
    cart.some((c) => {
      const s = items.find((i) => i.id === c.itemId);
      return !s || c.quantity > s.quantity || s.quantity <= 0;
    });

  // Add Item to cart with inventory quantity verification
  const addItemToCart = (item: Item, quantity: number = 1) => {
    const isPurchase =
      operationType === 'PURCHASE' ||
      operationType === 'ORDER_GOODS_CASH' ||
      operationType === 'ORDER_GOODS_CREDIT';
    const isSale = operationType === 'SALE' || operationType === 'CREDIT_SALE';

    // Get up-to-date item data from global state
    const storeItem = items.find((i) => i.id === item.id) || item;
    const itemUnit = storeItem.unit || (language === 'ar' ? 'حبة' : 'pc');

    // Strict validation for sales: prevent selling more than shelf inventory
    if (isSale) {
      if (storeItem.quantity <= 0) {
        showNotification(
          language === 'ar'
            ? `⚠️ لا يمكن البيع! الصنف (${storeItem.name}) غير متوفر على الرف (المتبقي: 0 ${itemUnit}).`
            : `Cannot sell! Item (${storeItem.name}) is out of stock (0 ${itemUnit} remaining).`,
          'error'
        );
        return;
      }

      const existing = cart.find((i) => i.itemId === item.id);
      const currentInCart = existing ? existing.quantity : 0;
      const targetQuantity = currentInCart + quantity;

      if (targetQuantity > storeItem.quantity) {
        if (currentInCart >= storeItem.quantity) {
          showNotification(
            language === 'ar'
              ? `⚠️ تنبيه المخزون: المتبقي على الرف من (${storeItem.name}) هو (${storeItem.quantity} ${itemUnit}) فقط، والكمية في السلة وصلت للحد الأقصى المتوفر! لا يمكن إضافة المزيد.`
              : `Stock Alert: Only (${storeItem.quantity} ${itemUnit}) available for (${storeItem.name}). Cart already has maximum available.`,
            'warning'
          );
          return;
        }

        const allowedToAdd = storeItem.quantity - currentInCart;
        showNotification(
          language === 'ar'
            ? `⚠️ تنبيه المخزون: المطلوب (${targetQuantity} ${itemUnit}) يتجاوز المتبقي على الرف (${storeItem.quantity} ${itemUnit}) للصنف (${storeItem.name})! تمت إضافة المتبقي فقط (${allowedToAdd} ${itemUnit}).`
            : `Stock Alert: Only (${allowedToAdd} ${itemUnit}) added to match shelf available stock (${storeItem.quantity} ${itemUnit}).`,
          'warning'
        );
        quantity = allowedToAdd;
      }
    }

    const unitPrice = isPurchase ? item.costPrice : item.salePrice;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.itemId === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          total: Number((newQty * updated[existingIdx].unitPrice).toFixed(2)),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            barcode: item.barcode,
            name: item.name,
            quantity,
            unitPrice,
            costPrice: item.costPrice,
            total: Number((quantity * unitPrice).toFixed(2)),
          },
        ];
      }
    });
  };

  // Barcode Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = findItemByBarcode(barcodeInput);
    if (found) {
      addItemToCart(found, 1);
      setBarcodeInput('');
    } else {
      showNotification(`لم يتم العثور على صنف برقم الباركود (${barcodeInput})`, 'error');
    }
  };

  // Update item quantity in cart with shelf stock verification
  const updateCartItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    const cartItem = cart[index];
    if (!cartItem) return;

    const isSale = operationType === 'SALE' || operationType === 'CREDIT_SALE';
    const storeItem = items.find((i) => i.id === cartItem.itemId);
    const itemUnit = storeItem?.unit || (language === 'ar' ? 'حبة' : 'pc');

    if (isSale && storeItem) {
      if (storeItem.quantity <= 0) {
        showNotification(
          language === 'ar'
            ? `⚠️ الصنف (${storeItem.name}) غير متوفر على الرف (المتبقي: 0 ${itemUnit}). تم حذفه من السلة.`
            : `Item (${storeItem.name}) is out of stock. Removed from cart.`,
          'error'
        );
        removeFromCart(index);
        return;
      }

      if (newQty > storeItem.quantity) {
        showNotification(
          language === 'ar'
            ? `⚠️ تنبيه المخزون: المتبقي على الرف من (${storeItem.name}) هو (${storeItem.quantity} ${itemUnit}) فقط! لا يمكن بيع (${newQty} ${itemUnit}). تم تثبيت الكمية على المتوفر (${storeItem.quantity} ${itemUnit}).`
            : `Stock Alert: Only (${storeItem.quantity} ${itemUnit}) available for (${storeItem.name}). Quantity set to available stock.`,
          'warning'
        );
        newQty = storeItem.quantity;
      }
    }

    setCart((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        total: Number((newQty * updated[index].unitPrice).toFixed(2)),
      };
      return updated;
    });
  };

  // Update custom unit price in cart
  const updateCartItemPrice = (index: number, newPrice: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unitPrice: newPrice,
        total: Number((updated[index].quantity * newPrice).toFixed(2)),
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setPaidAmountInput('');
    setPartyName('');
    setPartyPhone('');
    setNotes('');
  };

  // Complete Transaction with comprehensive stock validation
  const handleCompleteTransaction = () => {
    if (cart.length === 0) {
      showNotification('الرجاء إضافة أصناف إلى السلة أولاً', 'warning');
      return;
    }

    // Comprehensive stock verification for sales: prevent selling more than shelf inventory
    if (operationType === 'SALE' || operationType === 'CREDIT_SALE') {
      for (const cartItem of cart) {
        const storeItem = items.find((i) => i.id === cartItem.itemId);
        const availableStock = storeItem ? storeItem.quantity : 0;
        const unit = storeItem?.unit || (language === 'ar' ? 'حبة' : 'pc');

        if (availableStock <= 0) {
          showNotification(
            language === 'ar'
              ? `🚨 لا يمكن إتمام البيع! الصنف (${cartItem.name}) نفد من المخزون تماماً (المتبقي: 0 ${unit}). يرجى حذفه من السلة.`
              : `Cannot complete sale! Item (${cartItem.name}) is out of stock (0 ${unit}). Please remove it from cart.`,
            'error'
          );
          return;
        }

        if (cartItem.quantity > availableStock) {
          showNotification(
            language === 'ar'
              ? `🚨 لا يمكن إتمام البيع! الصنف (${cartItem.name}) الكمية المطلوب بيعها (${cartItem.quantity} ${unit}) أكبر من المتبقي الفعلي على الرف (${availableStock} ${unit}). يرجى تعديل الكمية أولاً.`
              : `Cannot complete sale! Quantity requested (${cartItem.quantity} ${unit}) for (${cartItem.name}) exceeds available shelf stock (${availableStock} ${unit}).`,
            'error'
          );
          return;
        }
      }
    }

    if (isCreditOperation && !partyName.trim()) {
      showNotification('الرجاء كتابة اسم العميل / المورد للعمليات الآجلة لتسجيل الدين في حسابه', 'warning');
      return;
    }

    try {
      const tx = createTransaction({
        type: operationType,
        paymentMethod,
        partyName: partyName.trim() || (operationType.includes('SALE') ? 'عميل نقدي' : 'مورد بضاعة'),
        partyPhone: partyPhone.trim(),
        items: cart,
        discount,
        notes,
        paidAmount: isCreditOperation ? paidAmount : totalAmount,
      });

      clearCart();
      onPrintReceipt(tx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الفاتورة';
      showNotification(msg, 'error');
    }
  };

  // Filter recent transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType =
      historyFilterType === 'ALL' || tx.type === historyFilterType;
    const q = historySearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      tx.invoiceNumber.toLowerCase().includes(q) ||
      tx.partyName.toLowerCase().includes(q) ||
      tx.cashierName.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const getTypeNameInArabic = (type: TransactionType) => {
    switch (type) {
      case 'SALE':
        return 'بيع نقدي';
      case 'PURCHASE':
        return 'شراء نقدي';
      case 'CREDIT_SALE':
        return 'بيع آجل (دين)';
      case 'ORDER_GOODS_CASH':
        return 'طلب بضاعة (نقد)';
      case 'ORDER_GOODS_CREDIT':
        return 'طلب بضاعة (آجل)';
    }
  };

  const getPaymentNameInArabic = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return 'كاش';
      case 'TRANSFER':
        return 'تحويل بنكي';
      case 'CARD':
        return 'دفع بالبطاقة / شبكة';
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Top Header & Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
            <ArrowLeftRight className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight">
              {posActiveTab === 'TERMINAL' ? 'شاشة الكاشير والبيع السريع (POS)' : 'سجل الفواتير والحركات المالية'}
            </h2>
            <div className="text-[11px] text-slate-400">
              {posActiveTab === 'TERMINAL'
                ? 'إدخال فوري بالباركود والاسم مع إصدار وطباعة الإيصالات'
                : `إجمالي ${filteredTransactions.length} حركة مسجلة`}
            </div>
          </div>
        </div>

        {/* Operation mode buttons (when on Terminal) + Tab switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {posActiveTab === 'TERMINAL' && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
              <button
                type="button"
                id="btn-pos-sale-cash"
                onClick={() => setOperationType('SALE')}
                className={`text-xs py-1.5 px-3 rounded-md font-bold transition-all cursor-pointer ${
                  operationType === 'SALE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛒 بيع نقدي
              </button>
              <button
                type="button"
                id="btn-pos-sale-credit"
                onClick={() => setOperationType('CREDIT_SALE')}
                className={`text-xs py-1.5 px-3 rounded-md font-bold transition-all cursor-pointer ${
                  operationType === 'CREDIT_SALE'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⏳ بيع آجل (دين)
              </button>
              {!isCashierMode && (
                <button
                  type="button"
                  id="btn-pos-purchase-cash"
                  onClick={() => setOperationType('PURCHASE')}
                  className={`text-xs py-1.5 px-3 rounded-md font-bold transition-all cursor-pointer ${
                    operationType === 'PURCHASE'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📥 شراء سريع
                </button>
              )}
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setPosActiveTab('TERMINAL')}
              className={`text-xs py-1.5 px-3 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                posActiveTab === 'TERMINAL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>الكاشير</span>
            </button>
            <button
              type="button"
              onClick={() => setPosActiveTab('HISTORY')}
              className={`text-xs py-1.5 px-3 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                posActiveTab === 'HISTORY'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>السجل ({filteredTransactions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {posActiveTab === 'TERMINAL' ? (
        /* Main Grid: POS Terminal (Left: Barcode/Catalog + Cart, Right: Payment & Summary) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: POS Terminal & Cart (Col 7 on lg, Col 7 on xl) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-3">
            {/* Mode Tabs: Barcode Scan VS Interactive Items Catalog */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs font-bold">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setInputViewMode('BARCODE')}
                  className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer min-w-0 ${
                    inputViewMode === 'BARCODE'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{language === 'ar' ? 'مسح الباركود' : 'Barcode Scan'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputViewMode('CATALOG')}
                  className={`flex-1 py-1.5 px-2 sm:px-3 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer min-w-0 ${
                    inputViewMode === 'CATALOG'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="truncate">{language === 'ar' ? `الأصناف (${items.length})` : `Catalog (${items.length})`}</span>
                </button>
              </div>
            </div>

            {/* If Input View Mode is BARCODE */}
            {inputViewMode === 'BARCODE' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Direct Barcode Entry */}
                  <form onSubmit={handleBarcodeSubmit} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-400 font-bold block">
                        مسح الباركود (قارئ أو يدوي):
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCameraScanner(true)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>كاميرا الجوال</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Barcode className="w-4 h-4 text-emerald-400 absolute right-2.5 top-2.5" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="امسح الباركود ثم اضغط Enter..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-8 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCameraScanner(true)}
                        className="absolute left-1.5 top-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 cursor-pointer"
                        title="مسح بالكاميرا"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>
                  </form>

                {/* Item Name Quick Selector */}
                <div className="relative">
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">
                    أو اختر الصنف بالاسم:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم للإضافة..."
                      value={searchItemQuery}
                      onFocus={() => setShowItemDropdown(true)}
                      onChange={(e) => {
                        setSearchItemQuery(e.target.value);
                        setShowItemDropdown(true);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    {/* Dropdown suggestions */}
                    {showItemDropdown && searchItemQuery && (
                      <div className="absolute top-full right-0 left-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                        {items
                          .filter((i) =>
                            i.name.toLowerCase().includes(searchItemQuery.toLowerCase())
                          )
                          .slice(0, 8)
                          .map((item) => {
                            const isSale = operationType === 'SALE' || operationType === 'CREDIT_SALE';
                            const isOutOfStock = isSale && item.quantity <= 0;

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  addItemToCart(item, 1);
                                  setSearchItemQuery('');
                                  setShowItemDropdown(false);
                                }}
                                className={`p-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800 flex items-center justify-between text-xs ${
                                  isOutOfStock ? 'opacity-60 bg-rose-950/10' : ''
                                }`}
                              >
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                    {isOutOfStock && (
                                      <span className="text-[10px] bg-rose-900/80 text-rose-300 px-1.5 py-0.2 rounded font-bold">
                                        نفد المخزون
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    المخزون: {item.quantity} {item.unit || 'حبة'} • باركود: {item.barcode}
                                  </div>
                                </div>
                                <div className="font-bold text-emerald-400 font-mono">
                                  {operationType.includes('PURCHASE') || operationType.includes('ORDER')
                                    ? item.costPrice.toFixed(2)
                                    : item.salePrice.toFixed(2)}{' '}
                                  {settings.currency}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Item Buttons Bar */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 mb-1.5 font-semibold">الأصناف السريعة:</div>
                <div className="flex flex-wrap gap-1.5">
                  {items.slice(0, 8).map((item) => {
                    const isSale = operationType === 'SALE' || operationType === 'CREDIT_SALE';
                    const isOutOfStock = isSale && item.quantity <= 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItemToCart(item, 1)}
                        className={`text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer border flex items-center gap-1.5 ${
                          isOutOfStock
                            ? 'bg-rose-950/20 text-slate-400 border-rose-900/40 hover:border-rose-700'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
                        }`}
                        title={`المتوفر: ${item.quantity} ${item.unit || 'حبة'}`}
                      >
                        <span>+ {item.name.slice(0, 18)}</span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1 rounded ${
                            isOutOfStock
                              ? 'text-rose-400 bg-rose-950/80'
                              : 'text-slate-400 bg-slate-900'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* If Input View Mode is CATALOG: Rich Interactive Items Picker */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                {/* Search in catalog */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الباركود..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {catalogSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch('')}
                      className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 hover:text-white"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Category filter */}
                <div className="flex gap-1.5">
                  <select
                    value={catalogCategory}
                    onChange={(e) => setCatalogCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">كل التصنيفات ({items.length})</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setCatalogLowStockOnly(!catalogLowStockOnly)}
                    title="عرض الأصناف الناقصة فقط"
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      catalogLowStockOnly
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>النواقص</span>
                  </button>
                </div>
              </div>

              {/* Items Catalog List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                    لا توجد أصناف مسجلة حتى الآن. أضف أصنافاً أولاً للبدء.
                  </div>
                ) : filteredCatalogItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                    لا توجد أصناف مطابقة للبحث أو التصفية
                  </div>
                ) : (
                  filteredCatalogItems.map((item) => {
                    const inCartItem = cart.find((c) => c.itemId === item.id);
                    const isOrderMode =
                      operationType === 'PURCHASE' ||
                      operationType === 'ORDER_GOODS_CASH' ||
                      operationType === 'ORDER_GOODS_CREDIT';
                    const displayPrice = isOrderMode ? item.costPrice : item.salePrice;
                    const isLow = item.quantity <= (item.minStockAlert || 5);

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          inCartItem
                            ? 'bg-cyan-950/30 border-cyan-500/60'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-bold text-xs text-white">
                            <span className="truncate">{item.name}</span>
                            {isLow && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono shrink-0">
                                ناقص ({item.quantity})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>باركود: {item.barcode}</span>
                            <span>•</span>
                            <span>المخزون: {item.quantity} {item.unit || 'حبة'}</span>
                          </div>
                        </div>

                        {/* Price & Cart Add button */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-left font-mono">
                            <div className="text-[9px] text-slate-400">
                              {isOrderMode ? 'سعر التكلفة' : 'سعر البيع'}
                            </div>
                            <div className="text-xs font-bold text-cyan-400">
                              {displayPrice.toFixed(2)} {settings.currency}
                            </div>
                          </div>

                          {inCartItem ? (
                            <div className="flex items-center gap-1 bg-slate-900 border border-cyan-700 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = cart.findIndex((c) => c.itemId === item.id);
                                  if (idx >= 0) updateCartItemQuantity(idx, inCartItem.quantity - 1);
                                }}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-white text-xs">
                                {inCartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = cart.findIndex((c) => c.itemId === item.id);
                                  if (idx >= 0) updateCartItemQuantity(idx, inCartItem.quantity + 1);
                                }}
                                disabled={
                                  (operationType === 'SALE' || operationType === 'CREDIT_SALE') &&
                                  inCartItem.quantity >= item.quantity
                                }
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  (operationType === 'SALE' || operationType === 'CREDIT_SALE') &&
                                  inCartItem.quantity >= item.quantity
                                    ? `الحد الأقصى على الرف (${item.quantity})`
                                    : 'إضافة'
                                }
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItemToCart(item, 1)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border ${
                                (operationType === 'SALE' || operationType === 'CREDIT_SALE') && item.quantity <= 0
                                  ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800'
                                  : 'bg-slate-850 hover:bg-cyan-600 text-slate-200 hover:text-white border-slate-700'
                              }`}
                            >
                              {(operationType === 'SALE' || operationType === 'CREDIT_SALE') && item.quantity <= 0 ? (
                                <span>نفد المخزون (0)</span>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>{isOrderMode ? 'طلب' : 'إضافة'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Cart Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>سلة الحركة ({cart.length} أصناف)</span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  تفريغ السلة
                </button>
              )}
            </div>

            {/* Items inside cart */}
            {cart.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-25" />
                <p className="font-bold text-slate-400 text-xs">السلة فارغة حالياً</p>
                <p className="text-[11px] mt-0.5">امسح الباركود أو اختر صنفاً لإتمام الحركة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold">
                      <th className={`pb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الصنف' : 'Item'}</th>
                      <th className="pb-2 text-center w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="pb-2 text-center w-24">{language === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="pb-2 text-center w-24">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                      <th className="pb-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cart.map((cartItem, idx) => {
                      const storeItem = items.find((i) => i.id === cartItem.itemId);
                      const isSale = operationType === 'SALE' || operationType === 'CREDIT_SALE';
                      const availableStock = storeItem ? storeItem.quantity : 0;
                      const itemUnit = storeItem?.unit || (language === 'ar' ? 'حبة' : 'pc');
                      const isOversold = isSale && cartItem.quantity > availableStock;
                      const isMaxStockReached = isSale && cartItem.quantity >= availableStock;

                      return (
                        <tr key={`${cartItem.itemId}-${idx}`} className="text-slate-200">
                          <td className="py-2.5">
                            <div className="font-bold text-white flex items-center flex-wrap gap-1.5">
                              <span>{cartItem.name}</span>
                              {isSale && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                    availableStock <= 0
                                      ? 'bg-rose-950/90 text-rose-300 border border-rose-700'
                                      : isOversold
                                      ? 'bg-rose-950/90 text-rose-200 border border-rose-600 animate-pulse'
                                      : isMaxStockReached
                                      ? 'bg-amber-950/80 text-amber-300 border border-amber-700'
                                      : 'bg-slate-950 text-slate-300 border border-slate-700'
                                  }`}
                                  title={`الرصيد المتاح على الرف: ${availableStock} ${itemUnit}`}
                                >
                                  الرف: {availableStock} {itemUnit}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              <span>{cartItem.barcode}</span>
                              {isSale && isOversold && (
                                <span className="text-rose-400 font-bold bg-rose-950/70 border border-rose-800 px-1 py-0.2 rounded">
                                  ⚠️ يتجاوز المتوفر ({availableStock} {itemUnit})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 bg-slate-950 border border-slate-800 rounded p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(idx, cartItem.quantity - 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                                title="تقليل الكمية"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={isSale ? availableStock : undefined}
                                value={cartItem.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) updateCartItemQuantity(idx, val);
                                }}
                                className={`w-11 bg-slate-900 border text-center font-mono font-bold text-xs py-0.5 rounded focus:outline-none ${
                                  isOversold
                                    ? 'border-rose-500 text-rose-300 bg-rose-950/50'
                                    : isMaxStockReached
                                    ? 'border-amber-500/70 text-amber-300'
                                    : 'border-slate-700 text-white focus:border-emerald-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => updateCartItemQuantity(idx, cartItem.quantity + 1)}
                                disabled={isSale && isMaxStockReached}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                                title={
                                  isSale && isMaxStockReached
                                    ? `الحد الأقصى على الرف (${availableStock} ${itemUnit})`
                                    : 'زيادة الكمية'
                                }
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <input
                              type="number"
                              value={cartItem.unitPrice}
                              onChange={(e) => updateCartItemPrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center font-mono font-bold text-slate-200 text-xs focus:outline-none"
                              step="0.5"
                            />
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold text-emerald-400">
                            {cartItem.total.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                              title="حذف من السلة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout & Payment & Summary (Col 5) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
            {/* Payment Method Selector (كاش أو تحويل أو دفع بالبطاقة) */}
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1.5">
                طريقة الدفع (مطلوب):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>كاش</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    paymentMethod === 'TRANSFER'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>تحويل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    paymentMethod === 'CARD'
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-teal-400" />
                  <span>شبكة / بطاقة</span>
                </button>
              </div>
            </div>

            {/* Customer / Supplier Information */}
            {isCreditOperation ? (
              /* Always visible and prominent when Credit operation */
              <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>بيانات العميل للحساب الآجل (مطلوب):</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">* إلزامي لتوثيق الدين</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">اسم العميل:</label>
                    <input
                      type="text"
                      placeholder="اسم العميل كاملاً..."
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      className="w-full bg-slate-950 border border-amber-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      {language === 'ar' ? 'رقم الهاتف:' : 'Phone Number:'}
                    </label>
                    <input
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={partyPhone}
                      onChange={(e) => setPartyPhone(e.target.value)}
                      className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 ${isRTL ? 'text-right' : 'text-left'} font-mono`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      {language === 'ar' ? 'المبلغ المدفوع مقدماً:' : 'Advance Paid:'}
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      {language === 'ar' ? 'المتبقي كدين آجل:' : 'Remaining Debt:'}
                    </label>
                    <div className="bg-slate-950 border border-amber-800/60 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                      {remainingDebt.toFixed(2)} {settings.currency}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Compact / Collapsible for Cash / Card sale */
              <div className="border-t border-slate-800/80 pt-2">
                {!showCustomerInputs && !partyName && !partyPhone ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomerInputs(true)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors py-1"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'ar' ? '+ إضافة بيانات العميل على الفاتورة (اختياري)' : '+ Add Customer Details (Optional)'}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{language === 'ar' ? 'بيانات العميل (اختياري):' : 'Customer Info (Optional):'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerInputs(false);
                          setPartyName('');
                          setPartyPhone('');
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-400 cursor-pointer"
                      >
                        {language === 'ar' ? 'إخفاء' : 'Hide'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={language === 'ar' ? 'اسم العميل (اختياري)...' : 'Customer Name...'}
                        value={partyName}
                        onChange={(e) => setPartyPhone ? setPartyName(e.target.value) : undefined}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="tel"
                        placeholder={language === 'ar' ? 'رقم الهاتف (اختياري)...' : 'Phone Number...'}
                        value={partyPhone}
                        onChange={(e) => setPartyPhone(e.target.value)}
                        className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 ${isRTL ? 'text-right' : 'text-left'} font-mono`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Discount and Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">قيمة الخصم ({settings.currency}):</label>
                <input
                  type="number"
                  value={discount || ''}
                  placeholder="0.00"
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">ملاحظات الفاتورة:</label>
                <input
                  type="text"
                  value={notes}
                  placeholder="أي ملاحظة أو تفاصيل إضافية..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                />
              </div>
            </div>

            {/* Foreign Currency Payment Calculator (Optional for Multi-Currency) */}
            {settings.multiCurrency?.enabled && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowForeignPaymentCalc(!showForeignPaymentCalc)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>الدفع بعملة أجنبية أخرى (حاسبة التحويل الفوري)</span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {findCurrency(foreignCurrencyCode).code} ({findCurrency(foreignCurrencyCode).symbol})
                  </span>
                </div>

                {showForeignPaymentCalc && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-amber-900/40 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Foreign Currency Selector */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          عملة الدفع المستلمة:
                        </label>
                        <select
                          value={foreignCurrencyCode}
                          onChange={(e) => setForeignCurrencyCode(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          {POPULAR_CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name} ({c.code} - {c.symbol})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Foreign Amount Tendered */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          المبلغ المستلم من العميل ({findCurrency(foreignCurrencyCode).symbol}):
                        </label>
                        <input
                          type="number"
                          placeholder={`المطلوب: ${(convertCurrency(totalAmount, settings.multiCurrency?.baseCurrencyCode || 'SAR', foreignCurrencyCode, settings.multiCurrency?.rates || {}, settings.multiCurrency?.baseCurrencyCode || 'SAR')).toFixed(findCurrency(foreignCurrencyCode).decimalDigits || 2)}`}
                          value={foreignTenderInput}
                          onChange={(e) => setForeignTenderInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Calculations Display */}
                    {(() => {
                      const foreignRequired = convertCurrency(
                        totalAmount,
                        settings.multiCurrency?.baseCurrencyCode || 'SAR',
                        foreignCurrencyCode,
                        settings.multiCurrency?.rates || {},
                        settings.multiCurrency?.baseCurrencyCode || 'SAR'
                      );
                      const foreignPaid = parseFloat(foreignTenderInput) || 0;
                      const basePaidEquivalent = convertCurrency(
                        foreignPaid,
                        foreignCurrencyCode,
                        settings.multiCurrency?.baseCurrencyCode || 'SAR',
                        settings.multiCurrency?.rates || {},
                        settings.multiCurrency?.baseCurrencyCode || 'SAR'
                      );
                      const baseChange = Math.max(0, basePaidEquivalent - totalAmount);
                      const foreignChange = Math.max(0, foreignPaid - foreignRequired);

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-[11px]">
                          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">المعادل المطلوب:</span>
                            <strong className="font-mono text-white text-xs">
                              {foreignRequired.toFixed(findCurrency(foreignCurrencyCode).decimalDigits || 2)}{' '}
                              {findCurrency(foreignCurrencyCode).symbol}
                            </strong>
                          </div>

                          <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">المعادل بالعملة الأساسية:</span>
                            <strong className="font-mono text-emerald-400 text-xs">
                              {basePaidEquivalent.toFixed(2)} {settings.currency}
                            </strong>
                          </div>

                          <div className="col-span-2 sm:col-span-1 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px]">الباقي للعميل:</span>
                            <strong className="font-mono text-amber-300 text-xs">
                              {baseChange.toFixed(2)} {settings.currency}
                              {foreignChange > 0 && ` (${foreignChange.toFixed(2)} ${findCurrency(foreignCurrencyCode).symbol})`}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Stock warning banner if cart contains items exceeding shelf inventory */}
            {hasOversoldItems && (
              <div className="bg-rose-950/70 border border-rose-700/80 rounded-xl p-3 flex items-center gap-3 text-xs text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold text-rose-300">
                    {language === 'ar'
                      ? 'تنبيه: لا يمكن البيع! توجد أصناف في السلة تتجاوز الرصيد المتوفر على الرف'
                      : 'Stock Alert: Sale blocked! Cart contains items exceeding available shelf inventory'}
                  </div>
                  <div className="text-slate-300 text-[11px] mt-0.5">
                    {language === 'ar'
                      ? 'يرجى تعديل الكمية في السلة لتطابق المتوفر فعلياً في المتجر أو حذف الصنف غير المتوفر لتتمكن من إتمام البيع.'
                      : 'Please adjust the cart quantities or remove out of stock items to complete the transaction.'}
                  </div>
                </div>
              </div>
            )}

            {/* Total Amount & Submit Button */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">صافي المبلغ الإجمالي:</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {totalAmount.toFixed(2)}{' '}
                  <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
                </div>
                {/* Secondary Currency conversion preview if enabled */}
                {settings.multiCurrency?.showDualCurrency && settings.multiCurrency?.secondaryCurrencyCode && (
                  <div className="text-[11px] text-teal-400 font-mono font-bold flex items-center gap-1 mt-0.5">
                    <span>≈</span>
                    <span>
                      {(convertCurrency(
                        totalAmount,
                        settings.multiCurrency.baseCurrencyCode || 'SAR',
                        settings.multiCurrency.secondaryCurrencyCode,
                        settings.multiCurrency.rates || {},
                        settings.multiCurrency.baseCurrencyCode || 'SAR'
                      )).toFixed(findCurrency(settings.multiCurrency.secondaryCurrencyCode).decimalDigits || 2)}
                    </span>
                    <span className="font-sans text-[10px]">
                      {findCurrency(settings.multiCurrency.secondaryCurrencyCode).symbol} ({settings.multiCurrency.secondaryCurrencyCode})
                    </span>
                  </div>
                )}
              </div>

              <button
                id="btn-complete-transaction"
                type="button"
                onClick={handleCompleteTransaction}
                disabled={cart.length === 0 || hasOversoldItems}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 font-extrabold px-8 py-3 rounded-xl shadow-lg transition-all text-sm cursor-pointer ${
                  hasOversoldItems
                    ? 'bg-rose-950/90 text-rose-200 border border-rose-700 hover:bg-rose-900 cursor-not-allowed opacity-90'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-emerald-950/80'
                }`}
              >
                {hasOversoldItems ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-300" />
                    <span>غير مسموح بالبيع (المطلوب يتجاوز رصيد الرف)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>حفظ الحركة وطباعة الإيصال</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Tab 2: Transactions History Log (Full Width) */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-white">سجل الحركات الأخيرة</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {filteredTransactions.length} حركة
              </span>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث برقم الفاتورة أو الاسم..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1 text-[11px]">
                {(isCashierMode
                  ? ['ALL', 'SALE', 'CREDIT_SALE']
                  : ['ALL', 'SALE', 'CREDIT_SALE', 'PURCHASE', 'ORDER_GOODS_CASH']
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => setHistoryFilterType(type)}
                    className={`px-2 py-1 rounded font-bold transition-colors cursor-pointer ${
                      historyFilterType === type
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {type === 'ALL'
                      ? 'الكل'
                      : type === 'SALE'
                      ? 'بيع'
                      : type === 'CREDIT_SALE'
                      ? 'آجل'
                      : type === 'PURCHASE'
                      ? 'شراء'
                      : 'طلب بضاعة'}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لا توجد حركات مسجلة مطابقة للبحث
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {tx.invoiceNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tx.type === 'SALE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : tx.type === 'CREDIT_SALE'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {getTypeNameInArabic(tx.type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-200">{tx.partyName}</div>
                        <div className="text-[10px] text-slate-400">
                          بواسطة: {tx.cashierName} • {getPaymentNameInArabic(tx.paymentMethod)}
                        </div>
                      </div>
                      <div className={`${isRTL ? 'text-left' : 'text-right'} font-mono`}>
                        <div className="font-black text-emerald-400 text-sm">
                          {tx.totalAmount.toFixed(2)} {settings.currency}
                        </div>
                        {tx.remainingDebt > 0 && (
                          <div className="text-[10px] text-amber-400 font-bold">
                            متبقي دين: {tx.remainingDebt.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date & Action Buttons (Print + Safe Delete) */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span>{new Date(tx.timestamp).toLocaleString('ar-SA')}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(tx)}
                          className="flex items-center gap-1 text-teal-400 hover:text-teal-300 bg-teal-950/40 hover:bg-teal-900/50 px-2 py-1 rounded-lg border border-teal-800/50 cursor-pointer font-bold transition-colors"
                          title="طباعة الإيصال"
                        >
                          <Printer className="w-3 h-3" />
                          <span>طباعة الإيصال</span>
                        </button>

                        {!isCashierMode && (
                          <button
                            type="button"
                            id={`btn-delete-tx-${tx.id}`}
                            onClick={() => {
                              setTxToDelete(tx);
                              setRestoreStockOnDelete(true);
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 rounded-lg border border-rose-800/40 transition-colors cursor-pointer"
                            title="حذف الحركة المالية"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Safe Transaction Deletion */}
      {txToDelete && (
        <ConfirmationModal
          isOpen={!!txToDelete}
          onClose={() => setTxToDelete(null)}
          onConfirm={() => {
            deleteTransaction(txToDelete.id, restoreStockOnDelete);
            setTxToDelete(null);
          }}
          title={language === 'ar' ? 'تأكيد حذف الحركة المالية / الفاتورة' : 'Confirm Delete Transaction'}
          message={
            language === 'ar'
              ? `هل أنت متأكد من رغبتك في حذف الفاتورة رقم (${txToDelete.invoiceNumber}) بقيمة (${txToDelete.totalAmount.toFixed(2)} ${settings.currency})؟ سيتم تحديث التقارير المالية والإحصائيات مباشرة.`
              : `Are you sure you want to delete transaction #${txToDelete.invoiceNumber} permanently?`
          }
          confirmText={language === 'ar' ? 'نعم، حذف الحركة المالية' : 'Yes, Delete Transaction'}
          cancelText={language === 'ar' ? 'إلغاء الأمر' : 'Cancel'}
          type="danger"
          checkboxOption={{
            label: language === 'ar' ? 'استعادة كميات البضاعة إلى المخزون تلقائياً' : 'Auto-restore inventory stock',
            description:
              language === 'ar'
                ? 'عند التفعيل: سيتم عكس تأثير حركة الأصناف (إرجاع كميات المبيعات للمخزن، أو خصم المشتريات المستلمة).'
                : 'Reverses stock adjustments for the cart items.',
            checked: restoreStockOnDelete,
            onChange: (checked) => setRestoreStockOnDelete(checked),
          }}
          itemDetails={[
            {
              label: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
              value: `#${txToDelete.invoiceNumber}`,
              isMono: true,
              isHighlight: true,
            },
            {
              label: language === 'ar' ? 'نوع الحركة' : 'Type',
              value:
                txToDelete.type === 'SALE'
                  ? '🛒 بيع نقدي'
                  : txToDelete.type === 'CREDIT_SALE'
                  ? '⏳ بيع آجل (ذمة)'
                  : txToDelete.type === 'PURCHASE' || txToDelete.type === 'ORDER_GOODS_CASH'
                  ? '📦 شراء بضاعة نقدي'
                  : '📦 شراء بضاعة آجل',
            },
            {
              label: language === 'ar' ? 'الطرف / العميل' : 'Party / Client',
              value: txToDelete.partyName,
            },
            {
              label: language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount',
              value: `${txToDelete.totalAmount.toFixed(2)} ${settings.currency}`,
              isMono: true,
              isHighlight: true,
            },
            {
              label: language === 'ar' ? 'المدفوع نقداً' : 'Paid',
              value: `${txToDelete.paidAmount.toFixed(2)} ${settings.currency}`,
              isMono: true,
            },
            {
              label: language === 'ar' ? 'المتبقي (آجل)' : 'Remaining',
              value: `${txToDelete.remainingDebt.toFixed(2)} ${settings.currency}`,
              isMono: true,
            },
            {
              label: language === 'ar' ? 'طريقة السداد' : 'Payment Method',
              value:
                txToDelete.paymentMethod === 'CASH'
                  ? '💵 كاش'
                  : txToDelete.paymentMethod === 'TRANSFER'
                  ? '🏦 تحويل بنكي'
                  : '💳 شبكة / بطاقة',
            },
            {
              label: language === 'ar' ? 'عدد الأصناف' : 'Items Count',
              value: `${txToDelete.items?.length || 0} صنف`,
            },
            {
              label: language === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
              value: new Date(txToDelete.timestamp).toLocaleString('ar-SA'),
            },
            {
              label: language === 'ar' ? 'الكاشير المسؤول' : 'Cashier',
              value: txToDelete.cashierName,
            },
          ]}
        />
      )}

      {/* Camera Barcode Scanner Modal for POS */}
      {showCameraScanner && (
        <BarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          items={items}
          currency={settings.currency}
          mode="POS"
          title={language === 'ar' ? 'كاشير الباركود فائق السرعة' : 'High-Speed POS Barcode Scanner'}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          cartTotal={totalAmount}
          onAddToCart={(item) => {
            addItemToCart(item, 1);
          }}
        />
      )}

      {/* Mobile Floating Quick-Checkout Bar: Cashier can complete transaction from anywhere on the screen */}
      {posActiveTab === 'TERMINAL' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-40 animate-fadeIn safe-bottom">
          <div className="bg-slate-900/98 backdrop-blur-md border border-emerald-500/50 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                <span>السلة ({cart.reduce((sum, it) => sum + it.quantity, 0)} قطع)</span>
              </div>
              <div className="text-base font-black text-emerald-400 font-mono truncate mt-0.5">
                {totalAmount.toFixed(2)}{' '}
                <span className="text-xs font-sans text-slate-400">{settings.currency}</span>
              </div>
            </div>

            <button
              type="button"
              id="mobile-btn-complete-transaction"
              onClick={handleCompleteTransaction}
              disabled={hasOversoldItems}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
                hasOversoldItems
                  ? 'bg-rose-950 text-rose-300 border border-rose-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/80'
              }`}
            >
              {hasOversoldItems ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-300" />
                  <span>تجاوز المخزون</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إتمام وطباعة الإيصال</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
