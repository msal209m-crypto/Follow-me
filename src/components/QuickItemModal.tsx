import React, { useState, useEffect } from 'react';
import { X, Barcode, Sparkles, Package, DollarSign, Layers, Camera } from 'lucide-react';
import { Item, StoreSettings } from '../types';
import { useApp } from '../context/AppContext';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface QuickItemModalProps {
  itemToEdit?: Item | null;
  initialBarcode?: string;
  settings: StoreSettings;
  onClose: () => void;
}

export const QuickItemModal: React.FC<QuickItemModalProps> = ({
  itemToEdit,
  initialBarcode,
  settings,
  onClose,
}) => {
  const { items, addItem, updateItem, showNotification } = useApp();

  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('مواد غذائية');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [unit, setUnit] = useState('حبة');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [notes, setNotes] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setBarcode(itemToEdit.barcode);
      setName(itemToEdit.name);
      setCategory(itemToEdit.category || 'مواد غذائية');
      setQuantity(itemToEdit.quantity.toString());
      setCostPrice(itemToEdit.costPrice.toString());
      setSalePrice(itemToEdit.salePrice.toString());
      setUnit(itemToEdit.unit || 'حبة');
      setMinStockAlert((itemToEdit.minStockAlert || 5).toString());
      setNotes(itemToEdit.notes || '');
    } else if (initialBarcode) {
      setBarcode(initialBarcode);
    }
  }, [itemToEdit, initialBarcode]);

  const generateBarcode = () => {
    // Generate standard 12-digit barcode prefixed with 628 (Saudi Arabia / standard prefix)
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
    setBarcode(`628${randomSuffix.slice(0, 9)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      showNotification('الرجاء إدخال اسم الصنف والباركود', 'warning');
      return;
    }

    const cost = parseFloat(costPrice) || 0;
    const sale = parseFloat(salePrice) || 0;
    const qty = parseInt(quantity) || 0;
    const minAlert = parseInt(minStockAlert) || 5;

    if (itemToEdit) {
      updateItem(itemToEdit.id, {
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim(),
        quantity: qty,
        costPrice: cost,
        salePrice: sale,
        unit: unit.trim(),
        minStockAlert: minAlert,
        notes: notes.trim(),
      });
    } else {
      addItem({
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim(),
        quantity: qty,
        costPrice: cost,
        salePrice: sale,
        unit: unit.trim(),
        minStockAlert: minAlert,
        notes: notes.trim(),
      });
    }

    onClose();
  };

  const totalValue = (parseInt(quantity) || 0) * (parseFloat(salePrice) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-lg text-white">
              {itemToEdit ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزون'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5 text-xs">
          {/* Barcode with Camera Scan & Auto Generate Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-bold block">الباركود (Barcode):</label>
              <button
                type="button"
                id="btn-scan-camera-in-add-modal"
                onClick={() => setShowCameraScanner(true)}
                className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>تصوير الباركود بالكاميرا</span>
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-emerald-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="امسح أو صوّر الباركود أو أدخله..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-9 py-2 font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="absolute left-2 top-1.5 p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                  title="تصوير بالكاميرا"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={generateBarcode}
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 px-3 py-2 rounded-lg font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title="توليد رقم باركود آلي جديد"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>توليد آلي</span>
              </button>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="text-slate-300 font-bold block mb-1">اسم الصنف:</label>
            <input
              type="text"
              required
              placeholder="مثال: أرز بسمتي هندي 5 كجم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">التصنيف:</label>
              <input
                type="text"
                placeholder="مواد غذائية / تموينية..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">الوحدة:</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none cursor-pointer"
              >
                <option value="حبة">حبة</option>
                <option value="قطعة">قطعة</option>
                <option value="كيس">كيس</option>
                <option value="كرتون">كرتون</option>
                <option value="علبة">علبة</option>
                <option value="كيلو">كيلو (كجم)</option>
                <option value="لتر">لتر</option>
                <option value="طقم">طقم / باقة</option>
              </select>
            </div>
          </div>

          {/* Prices (سعر التكلفة & سعر البيع) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                سعر التكلفة ({settings.currency}):
              </label>
              <input
                type="number"
                step="0.25"
                required
                placeholder="0.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                سعر البيع ({settings.currency}):
              </label>
              <input
                type="number"
                step="0.25"
                required
                placeholder="0.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Quantity & Min Stock Alert */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">الكمية بالمخزون:</label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">حد تنبيه النقص:</label>
              <input
                type="number"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Total calculated price preview */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">إجمالي القيمة البيعية للكمية:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currency}
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex gap-2">
            <button
              id="btn-save-item-modal"
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-lg shadow-emerald-950"
            >
              {itemToEdit ? 'حفظ التعديلات' : 'إضافة الصنف'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>

      {/* Camera Barcode Scanner Modal inside Add/Edit item */}
      {showCameraScanner && (
        <BarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          items={items}
          currency={settings.currency}
          mode="LOOKUP"
          title="تصوير وقراءة الباركود بالكاميرا"
          onItemScanned={(foundItem, scannedBarcode) => {
            setBarcode(scannedBarcode || (foundItem ? foundItem.barcode : ''));
            if (foundItem && !name) {
              setName(foundItem.name);
              setCategory(foundItem.category || category);
              setCostPrice(foundItem.costPrice.toString());
              setSalePrice(foundItem.salePrice.toString());
              setUnit(foundItem.unit || unit);
            }
            setShowCameraScanner(false);
          }}
        />
      )}
    </div>
  );
};
