import React, { useState, useEffect, useRef } from 'react';
import { X, Barcode, Sparkles, Package, DollarSign, Layers, Camera, Image as ImageIcon, Upload, Trash2, Check, Store, Loader2 } from 'lucide-react';
import { Item, StoreSettings } from '../types';
import { useApp } from '../context/AppContext';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import {
  compressImageFile,
  compressDataUrl,
  sanitizeProductImage,
  DEFAULT_PRODUCT_IMAGE,
} from '../utils/imageUtils';

interface QuickItemModalProps {
  itemToEdit?: Item | null;
  initialBarcode?: string;
  settings: StoreSettings;
  onClose: () => void;
}

const PRODUCT_IMAGE_PRESETS = [
  { name: 'عام تموين', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60' },
  { name: 'أرز وحبوب', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60' },
  { name: 'زيت وسمن', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60' },
  { name: 'ألبان وحليب', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60' },
  { name: 'شاي وقهوة', url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60' },
  { name: 'عصائر ومياه', url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&auto=format&fit=crop&q=60' },
  { name: 'بهارات وتوابل', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=60' },
  { name: 'خضار وفواكه', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&auto=format&fit=crop&q=60' },
  { name: 'منظفات وعناية', url: 'https://images.unsplash.com/photo-1585670210693-e7fdd16b142e?w=500&auto=format&fit=crop&q=60' },
];

export const QuickItemModal: React.FC<QuickItemModalProps> = ({
  itemToEdit,
  initialBarcode,
  settings,
  onClose,
}) => {
  const { items, addItem, updateItem, showNotification } = useApp();

  const [barcode, setBarcode] = useState(initialBarcode != null ? String(initialBarcode) : '');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('مواد غذائية');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [unit, setUnit] = useState('حبة');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setBarcode(itemToEdit.barcode != null ? String(itemToEdit.barcode) : '');
      setName(itemToEdit.name != null ? String(itemToEdit.name) : '');
      setCategory(itemToEdit.category || 'مواد غذائية');
      setQuantity(itemToEdit.quantity != null ? itemToEdit.quantity.toString() : '');
      setCostPrice(itemToEdit.costPrice != null ? itemToEdit.costPrice.toString() : '');
      setSalePrice(itemToEdit.salePrice != null ? itemToEdit.salePrice.toString() : '');
      setUnit(itemToEdit.unit || 'حبة');
      setMinStockAlert((itemToEdit.minStockAlert ?? 5).toString());
      setNotes(itemToEdit.notes || '');
      setImage(itemToEdit.image || itemToEdit.imageUrl || '');
    } else if (initialBarcode != null) {
      setBarcode(String(initialBarcode));
    }
  }, [itemToEdit, initialBarcode]);

  const generateBarcode = () => {
    // Generate standard 12-digit barcode prefixed with 628 (Saudi Arabia / standard prefix)
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
    setBarcode(`628${randomSuffix.slice(0, 9)}`);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      console.log('Selected image file:', file.name, 'size:', (file.size / 1024).toFixed(1) + ' KB');
      // Compress to max 350px width/height and 0.65 JPEG quality (~10-25KB, safe for localStorage)
      const compressedDataUrl = await compressImageFile(file, 350, 0.65);
      setImage(compressedDataUrl);
      showNotification('تم ضغط وتحسين الصورة بنجاح لتسريع المتجر وتوفير الذاكرة', 'info');
    } catch (err) {
      console.error('Failed to compress image file:', err);
      showNotification('تعذر ضغط الصورة المختارة، يرجى اختيار صورة أخرى أو لصق رابط مباشر', 'warning');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    console.log('Processing item submission...', {
      mode: itemToEdit ? 'EDIT' : 'ADD',
      name,
      barcode,
      salePrice,
      costPrice,
      quantity,
    });

    try {
      const cleanBarcode = String(barcode ?? '').trim();
      const cleanName = String(name ?? '').trim();

      if (!cleanName || !cleanBarcode) {
        showNotification('الرجاء إدخال اسم الصنف والباركود', 'warning');
        setIsSubmitting(false);
        return;
      }

      const cost = parseFloat(costPrice) || 0;
      const sale = parseFloat(salePrice) || 0;
      const qty = parseInt(quantity) || 0;
      const minAlert = parseInt(minStockAlert) || 5;

      // Ensure image is safe and compressed, never exceeding localStorage threshold
      let finalImage = sanitizeProductImage(image, DEFAULT_PRODUCT_IMAGE);
      if (finalImage.startsWith('data:') && finalImage.length > 50000) {
        try {
          console.log('Re-compressing large data URL prior to saving...');
          finalImage = await compressDataUrl(finalImage, 300, 0.6);
        } catch (compErr) {
          console.warn('Re-compression warning:', compErr);
          if (finalImage.length > 100000) {
            console.warn('Image is too large for local cache quota. Using default store image.');
            finalImage = DEFAULT_PRODUCT_IMAGE;
          }
        }
      }

      if (itemToEdit) {
        updateItem(itemToEdit.id, {
          barcode: cleanBarcode,
          name: cleanName,
          category: String(category ?? '').trim(),
          quantity: qty,
          costPrice: cost,
          salePrice: sale,
          price: sale,
          image: finalImage,
          imageUrl: finalImage,
          available: qty > 0,
          unit: String(unit ?? '').trim(),
          minStockAlert: minAlert,
          notes: String(notes ?? '').trim(),
        });
        showNotification('تم تحديث الصنف ومزامنته مع المتجر العام!', 'success');
      } else {
        addItem({
          barcode: cleanBarcode,
          name: cleanName,
          category: String(category ?? '').trim(),
          quantity: qty,
          costPrice: cost,
          salePrice: sale,
          price: sale,
          image: finalImage,
          imageUrl: finalImage,
          available: qty > 0,
          unit: String(unit ?? '').trim(),
          minStockAlert: minAlert,
          notes: String(notes ?? '').trim(),
        });
        showNotification('تم إضافة الصنف بنجاح وسيعرض في المتجر فوراً!', 'success');
      }

      // Safe update of qaryati_products in localStorage
      try {
        const qaryatiList = JSON.parse(localStorage.getItem('qaryati_products') || '[]');
        const newProductEntry = {
          id: itemToEdit ? itemToEdit.id : Date.now(),
          name: cleanName,
          price: sale,
          image: finalImage,
          available: qty > 0,
        };
        const filtered = qaryatiList.filter((p: any) => String(p.id) !== String(newProductEntry.id));
        filtered.unshift(newProductEntry);
        localStorage.setItem('qaryati_products', JSON.stringify(filtered));
        console.log('Synced to qaryati_products successfully');
      } catch (storageErr) {
        console.error('Warning: Failed to sync qaryati_products in localStorage:', storageErr);
      }

      onClose();
    } catch (err) {
      console.error('Fatal error in save product handler:', err);
      showNotification('حدث خطأ أثناء حفظ الصنف. راجع الكونسول لمزيد من التفاصيل.', 'error');
    } finally {
      setIsSubmitting(false);
    }
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

          {/* Product Image Section for Storefront & POS */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>صورة الصنف (للعرض في متجر العملاء):</span>
              </label>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                يعرض في المتجر
              </span>
            </div>

            <div className="flex items-start gap-3">
              {/* Image Preview */}
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                <img
                  src={image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60'}
                  alt="معاينة"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                  }}
                />
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 text-rose-400 rounded hover:text-white"
                    title="حذف الصورة"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Upload & URL Controls */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={isCompressingImage || isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isCompressingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                        <span>جاري ضغط الصورة...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>رفع صورة / تصوير</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPresets(!showPresets)}
                    className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {showPresets ? 'إخفاء النماذج' : 'صور جاهزة'}
                  </button>
                </div>

                <input
                  type="url"
                  placeholder="أو ضع رابط صورة مباشر..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Presets Carousel/Grid */}
            {showPresets && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-1.5">
                {PRODUCT_IMAGE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImage(preset.url);
                      setShowPresets(false);
                    }}
                    className={`flex items-center gap-1.5 p-1 rounded-lg border text-[11px] transition-all cursor-pointer text-right ${
                      image === preset.url
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
                    }`}
                  >
                    <img src={preset.url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            )}
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
              disabled={isSubmitting || isCompressingImage}
              className={`flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 ${
                isSubmitting || isCompressingImage ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري الحفظ والمزامنة...</span>
                </>
              ) : isCompressingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري معالجة الصورة...</span>
                </>
              ) : (
                <span>{itemToEdit ? 'حفظ التعديلات' : 'إضافة الصنف'}</span>
              )}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
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
