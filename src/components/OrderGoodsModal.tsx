import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Package,
  Search,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Building2,
  DollarSign,
  CreditCard,
  Layers,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Item, Transaction, PaymentMethod, TransactionType } from '../types';

interface OrderGoodsModalProps {
  initialItemId?: string | null;
  initialOrderType?: 'CASH' | 'CREDIT';
  onClose: () => void;
  onSuccess?: (tx: Transaction) => void;
  onOpenAddItem?: () => void;
}

interface SelectedOrderItem {
  item: Item;
  quantity: number;
  costPrice: number;
}

export const OrderGoodsModal: React.FC<OrderGoodsModalProps> = ({
  initialItemId,
  initialOrderType = 'CASH',
  onClose,
  onSuccess,
  onOpenAddItem,
}) => {
  const { items, createTransaction, settings, currentCashier, debts, showNotification } = useApp();

  // Order mode: Cash (نقد) or Credit (آجل)
  const [orderType, setOrderType] = useState<'CASH' | 'CREDIT'>(initialOrderType);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [fulfillmentMode, setFulfillmentMode] = useState<'SUPPLY_ORDER' | 'DIRECT_RECEIPT'>('SUPPLY_ORDER');

  // Supplier info
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');

  // Search and Category filters for the items catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Selected items map: itemId -> SelectedOrderItem
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, SelectedOrderItem>>(() => {
    const map = new Map<string, SelectedOrderItem>();
    if (initialItemId) {
      const found = items.find((i) => i.id === initialItemId);
      if (found) {
        map.set(found.id, {
          item: found,
          quantity: 10,
          costPrice: found.costPrice,
        });
      }
    } else if (items.length === 1) {
      // Auto-select if there is only 1 item in system
      const single = items[0];
      map.set(single.id, {
        item: single,
        quantity: 10,
        costPrice: single.costPrice,
      });
    }
    return map;
  });

  // Sync with initialItemId or initialOrderType if modal reopens or props change
  useEffect(() => {
    if (initialItemId) {
      const found = items.find((i) => i.id === initialItemId);
      if (found) {
        setSelectedItemsMap((prev) => {
          const next = new Map(prev);
          if (!next.has(found.id)) {
            next.set(found.id, {
              item: found,
              quantity: 10,
              costPrice: found.costPrice,
            });
          }
          return next;
        });
      }
    } else if (items.length === 1 && selectedItemsMap.size === 0) {
      const single = items[0];
      setSelectedItemsMap(
        new Map([
          [
            single.id,
            {
              item: single,
              quantity: 10,
              costPrice: single.costPrice,
            },
          ],
        ])
      );
    }
  }, [initialItemId, items]);

  useEffect(() => {
    if (initialOrderType) {
      setOrderType(initialOrderType);
    }
  }, [initialOrderType]);

  // Unique categories from items
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  // Suppliers list for quick autocomplete
  const existingSuppliers = useMemo(() => {
    return debts.filter((d) => d.type === 'SUPPLIER');
  }, [debts]);

  // Filtered items list in catalog
  const filteredCatalogItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.barcode.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;

      const matchesLowStock =
        !filterLowStockOnly || item.quantity <= (item.minStockAlert || 5);

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [items, searchQuery, selectedCategory, filterLowStockOnly]);

  // Low stock items count
  const lowStockItems = useMemo(() => {
    return items.filter((i) => i.quantity <= (i.minStockAlert || 5));
  }, [items]);

  // Add/toggle item in order
  const handleToggleItem = (item: Item, defaultQty = 10) => {
    setSelectedItemsMap((prev: Map<string, SelectedOrderItem>) => {
      const next = new Map<string, SelectedOrderItem>(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, {
          item,
          quantity: defaultQty,
          costPrice: item.costPrice,
        });
      }
      return next;
    });
  };

  // Change quantity for an item
  const handleUpdateQty = (itemId: string, newQty: number) => {
    setSelectedItemsMap((prev: Map<string, SelectedOrderItem>) => {
      const next = new Map<string, SelectedOrderItem>(prev);
      const entry = next.get(itemId);
      if (!entry) return prev;

      if (newQty <= 0) {
        next.delete(itemId);
      } else {
        next.set(itemId, {
          item: entry.item,
          quantity: newQty,
          costPrice: entry.costPrice,
        });
      }
      return next;
    });
  };

  // Change cost price for an item
  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setSelectedItemsMap((prev: Map<string, SelectedOrderItem>) => {
      const next = new Map<string, SelectedOrderItem>(prev);
      const entry = next.get(itemId);
      if (!entry) return prev;
      next.set(itemId, {
        item: entry.item,
        quantity: entry.quantity,
        costPrice: Math.max(0, newPrice),
      });
      return next;
    });
  };

  // Add all low stock items in 1 click
  const handleAddAllLowStock = () => {
    setSelectedItemsMap((prev: Map<string, SelectedOrderItem>) => {
      const next = new Map<string, SelectedOrderItem>(prev);
      lowStockItems.forEach((item) => {
        if (!next.has(item.id)) {
          // Suggest order quantity to reach above min stock
          const needed = Math.max(10, (item.minStockAlert || 5) * 2 - item.quantity);
          next.set(item.id, {
            item,
            quantity: needed,
            costPrice: item.costPrice,
          });
        }
      });
      return next;
    });
  };

  // Add all items in catalog in 1 click
  const handleSelectAllItems = () => {
    setSelectedItemsMap(() => {
      const next = new Map<string, SelectedOrderItem>();
      items.forEach((item) => {
        next.set(item.id, {
          item,
          quantity: 10,
          costPrice: item.costPrice,
        });
      });
      return next;
    });
  };

  const handleDeselectAllItems = () => {
    setSelectedItemsMap(new Map());
  };

  // Calculations
  const selectedList: SelectedOrderItem[] = useMemo(() => {
    return Array.from(selectedItemsMap.values());
  }, [selectedItemsMap]);

  const totalItemsCount: number = selectedList.length;
  const totalUnitsCount: number = selectedList.reduce((sum: number, i: SelectedOrderItem) => sum + i.quantity, 0);
  const totalCost: number = selectedList.reduce((sum: number, i: SelectedOrderItem) => sum + (i.quantity * i.costPrice), 0);

  const paidAmount: number = orderType === 'CREDIT'
    ? (parseFloat(paidAmountInput) || 0)
    : totalCost;
  const remainingDebt: number = Math.max(0, totalCost - paidAmount);

  // Submit Order
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedList.length === 0) {
      showNotification('الرجاء اختيار صنف واحد على الأقل لطلب البضاعة', 'warning');
      return;
    }

    if (orderType === 'CREDIT' && !supplierName.trim()) {
      showNotification('الرجاء إدخال اسم المورد لتسجيل فاتورة طلب البضاعة الآجل على حسابه', 'warning');
      return;
    }

    const txType: TransactionType =
      orderType === 'CASH' ? 'ORDER_GOODS_CASH' : 'ORDER_GOODS_CREDIT';

    const isDirect = fulfillmentMode === 'DIRECT_RECEIPT';

    const cartItems = selectedList.map(({ item, quantity, costPrice }) => ({
      itemId: item.id,
      barcode: item.barcode,
      name: item.name,
      quantity,
      unitPrice: costPrice,
      costPrice,
      total: Number((quantity * costPrice).toFixed(2)),
      receivedQuantity: isDirect ? quantity : 0,
    }));

    const tx = createTransaction({
      type: txType,
      paymentMethod,
      partyName: supplierName.trim() || 'مورد بضاعة عام',
      partyPhone: supplierPhone.trim(),
      items: cartItems,
      discount: 0,
      notes: notes.trim() || (isDirect ? 'استلام وتوريد بضاعة فوري' : 'أمر طلب بضاعة من المورد بانتظار الشحنة'),
      paidAmount,
      isDirectReceipt: isDirect,
    });

    if (onSuccess) {
      onSuccess(tx);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>طلب وتوريد بضاعة للمخزن</span>
                <span className="text-xs font-normal text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                  تحديد الأصناف والكميات
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                اختر الأصناف من القائمة وحدد الكمية وسعر التكلفة لتوريدها نقد أو آجل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Catalog Picker (Left) & Order Summary (Right) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-800">
          {/* Left Column (Col 7): Items Catalog Selection */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* Step 1: Order Type Selector (نقد أو آجل) */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
                <span>١. اختر طريقة طلب البضاعة:</span>
                <span className="text-[11px] text-cyan-400 font-normal">
                  {orderType === 'CASH' ? 'دفع فوري من الخزينة' : 'تسجيل دين على حساب المورد'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('CASH')}
                  className={`py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    orderType === 'CASH'
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>📦 طلب بضاعة (نقد - كاش)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('CREDIT')}
                  className={`py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    orderType === 'CREDIT'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-950'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>📋 طلب بضاعة (آجل - دين مورد)</span>
                </button>
              </div>
            </div>

            {/* Step 2: Search & Filter Catalog */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300">
                <div className="flex items-center gap-2">
                  <span>٢. حدد الأصناف المراد طلبها ({items.length} صنف مسجل):</span>
                  {items.length > 0 && (
                    <span className="text-[11px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 font-mono">
                      تم اختيار: {selectedItemsMap.size}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {items.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectAllItems}
                        className="text-[11px] text-cyan-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        تحديد الكل ({items.length})
                      </button>
                      {selectedItemsMap.size > 0 && (
                        <button
                          type="button"
                          onClick={handleDeselectAllItems}
                          className="text-[11px] text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          إلغاء التحديد
                        </button>
                      )}
                    </>
                  )}
                  {lowStockItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAllLowStock}
                      className="text-[11px] text-amber-400 hover:text-amber-300 bg-amber-950/50 border border-amber-800/60 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>إضافة النواقص ({lowStockItems.length})</span>
                    </button>
                  )}
                  {onOpenAddItem && (
                    <button
                      type="button"
                      onClick={onOpenAddItem}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>صنف جديد</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search bar & Category filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الباركود أو التصنيف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
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

                <div className="sm:col-span-4 flex gap-1">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">كل الأقسام</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                    title="عرض الأصناف الناقصة فقط"
                    className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      filterLowStockOnly
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Items List */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <Package className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs text-slate-400 font-bold">
                    لا توجد أصناف مسجلة في النظام حتى الآن
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAddItem}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة صنفك الأول للبدء</span>
                  </button>
                </div>
              ) : filteredCatalogItems.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  لا توجد أصناف مطابقة للبحث أو التصفية الحالية
                </div>
              ) : (
                filteredCatalogItems.map((item) => {
                  const isSelected = selectedItemsMap.has(item.id);
                  const selectedData = selectedItemsMap.get(item.id);
                  const isLow = item.quantity <= (item.minStockAlert || 5);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/40'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Checkbox and Info */}
                        <div
                          onClick={() => handleToggleItem(item)}
                          className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-400 text-white'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <div>
                            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              {isLow && (
                                <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                                  ناقص: {item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono flex items-center gap-2">
                              <span>باركود: {item.barcode}</span>
                              <span>•</span>
                              <span>المخزون الحالي: {item.quantity} {item.unit || 'حبة'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Quantity Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-left font-mono">
                            <div className="text-[10px] text-slate-400">سعر التكلفة</div>
                            <div className="text-xs font-bold text-cyan-400">
                              {item.costPrice.toFixed(2)} {settings.currency}
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="flex items-center gap-1 bg-slate-900 border border-cyan-800 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, (selectedData?.quantity || 1) - 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={selectedData?.quantity || 1}
                                onChange={(e) =>
                                  handleUpdateQty(item.id, parseInt(e.target.value) || 1)
                                }
                                className="w-12 text-center bg-slate-950 text-white font-mono font-bold text-xs py-0.5 rounded border border-slate-700 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, (selectedData?.quantity || 1) + 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item, 10)}
                              className="text-xs bg-slate-850 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>طلب</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (Col 5): Order Confirmation & Supplier Details */}
          <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-950/80 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  <span>تفاصيل وسلة طلب البضاعة</span>
                </div>
                <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                  {totalItemsCount} أصناف ({totalUnitsCount} وحدة)
                </span>
              </div>

              {/* Selected items quick review list */}
              {selectedList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                  <Package className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-cyan-400" />
                  <div className="text-xs font-bold text-slate-400">لم يتم تحديد أي صنف بعد</div>
                  <div className="text-[11px] mt-0.5">
                    انقر على الأصناف من القائمة على اليمين لتحديدها وضبط الكميات
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {selectedList.map(({ item, quantity, costPrice }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {quantity} {item.unit || 'حبة'} × {costPrice.toFixed(2)} {settings.currency}
                        </div>
                      </div>
                      <div className="text-left font-mono font-bold text-cyan-400 mr-2">
                        {(quantity * costPrice).toFixed(2)} {settings.currency}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="إزالة من الطلب"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Workflow mode selector: Pending Order vs Direct Stock-in */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-xs">
                <div className="font-bold text-slate-300 text-[11px]">طريقة تنفيذ الطلبية:</div>
                <div className="grid grid-cols-1 gap-1.5">
                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      fulfillmentMode === 'SUPPLY_ORDER'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modalFulfillmentMode"
                      checked={fulfillmentMode === 'SUPPLY_ORDER'}
                      onChange={() => setFulfillmentMode('SUPPLY_ORDER')}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-amber-300">أمر طلب من المورد (بانتظار الشحنة)</div>
                      <div className="text-[10px] text-slate-400">
                        لن تضاف للمخزون ولن يُرفع تنبيه النواقص حتى تستلم وتفحص الشحنة فعلياً
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      fulfillmentMode === 'DIRECT_RECEIPT'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modalFulfillmentMode"
                      checked={fulfillmentMode === 'DIRECT_RECEIPT'}
                      onChange={() => setFulfillmentMode('DIRECT_RECEIPT')}
                      className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-emerald-300">استلام فوري مباشر (البضاعة بيدك الآن)</div>
                      <div className="text-[10px] text-slate-400">
                        تضاف الكميات فوراً للمخزن وتحدث الأرصدة لوصولها الفعلي
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Supplier info input */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {orderType === 'CREDIT' ? 'اسم المورد (مطلوب للآجل):' : 'اسم المورد / الشركة (اختياري):'}
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      list="suppliers-list"
                      placeholder="مثال: شركة الوفاء للتجارة أو اسم المندوب..."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className={`w-full bg-slate-900 border rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none ${
                        orderType === 'CREDIT' && !supplierName.trim()
                          ? 'border-purple-500/80 focus:border-purple-400'
                          : 'border-slate-800 focus:border-cyan-500'
                      }`}
                    />
                    <datalist id="suppliers-list">
                      {existingSuppliers.map((s) => (
                        <option key={s.id} value={s.personName} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      جوال المورد:
                    </label>
                    <input
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {orderType === 'CASH' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        طريقة الدفع:
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="TRANSFER">تحويل بنكي 🏦</option>
                        <option value="CASH">كاش (الخزينة) 💵</option>
                        <option value="CARD">بطاقة / شبكة 💳</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        الدفعة المسددة مقدماً:
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    ملاحظات الفاتورة أو رقم سند المورد:
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الفاتورة الورقية للمورد أو ملاحظات..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Total Financial Summary Box */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>إجمالي قيمة البضاعة المطلوبة:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {totalCost.toFixed(2)} {settings.currency}
                  </span>
                </div>

                {orderType === 'CREDIT' && (
                  <>
                    <div className="flex items-center justify-between text-xs text-emerald-400">
                      <span>المدفوع مقدماً:</span>
                      <span className="font-mono font-bold">
                        {paidAmount.toFixed(2)} {settings.currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-purple-300 pt-1 border-t border-slate-800">
                      <span>المتبقي ديناً للمورد:</span>
                      <span className="font-mono font-black text-sm">
                        {remainingDebt.toFixed(2)} {settings.currency}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={selectedList.length === 0}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedList.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : fulfillmentMode === 'SUPPLY_ORDER'
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/60 font-black'
                    : orderType === 'CASH'
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/60'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/60'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {fulfillmentMode === 'SUPPLY_ORDER'
                    ? `إرسال أمر طلب البضاعة للمورد (${totalCost.toFixed(2)} ${settings.currency}) - بانتظار الاستلام`
                    : orderType === 'CASH'
                    ? `تأكيد واستلام البضاعة فوراً نقداً (${totalCost.toFixed(2)} ${settings.currency})`
                    : `تأكيد واستلام البضاعة فوراً آجل (${totalCost.toFixed(2)} ${settings.currency})`}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
