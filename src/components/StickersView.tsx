import React, { useState, useMemo } from 'react';
import {
  Barcode,
  Printer,
  Sliders,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Search,
  Settings2,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarcodeSticker } from './BarcodeSticker';

export const StickersView: React.FC = () => {
  const { items, settings, updateSettings, selectedStickerItemId, setSelectedStickerItemId } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, number>>(() => {
    // If a specific item was picked from items list, select it with 5 copies
    if (selectedStickerItemId) {
      return { [selectedStickerItemId]: 5 };
    }
    // Default select first 3 items with 3 copies each
    const initial: Record<string, number> = {};
    items.slice(0, 3).forEach((item) => {
      initial[item.id] = 3;
    });
    return initial;
  });

  const [stickerSize, setStickerSize] = useState<'thermal_50x30' | 'compact_40x25' | 'large_70x40'>('thermal_50x30');

  // Filter items for selection list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        String(item?.name ?? '').toLowerCase().includes(q) ||
        String(item?.barcode ?? '').toLowerCase().includes(q) ||
        String(item?.sku ?? '').toLowerCase().includes(q) ||
        (item.category && String(item.category).toLowerCase().includes(q))
      );
    });
  }, [items, searchQuery]);

  // Selected items list with copies
  const selectedItemsWithCopies = useMemo(() => {
    const list: { item: typeof items[0]; copies: number }[] = [];
    items.forEach((item) => {
      const copies = selectedItemIds[item.id];
      if (copies && copies > 0) {
        list.push({ item, copies });
      }
    });
    return list;
  }, [items, selectedItemIds]);

  // Flat array of all sticker units for rendering print preview
  const flattenedStickers = useMemo(() => {
    const stickers: typeof items[0][] = [];
    selectedItemsWithCopies.forEach(({ item, copies }) => {
      for (let i = 0; i < copies; i++) {
        stickers.push(item);
      }
    });
    return stickers;
  }, [selectedItemsWithCopies]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const copy = { ...prev };
      if (copy[itemId]) {
        delete copy[itemId];
      } else {
        copy[itemId] = 3;
      }
      return copy;
    });
  };

  const setItemCopies = (itemId: string, count: number) => {
    setSelectedItemIds((prev) => {
      const copy = { ...prev };
      if (count <= 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = Math.min(100, count);
      }
      return copy;
    });
  };

  const selectAll = () => {
    const all: Record<string, number> = {};
    filteredItems.forEach((i) => {
      all[i.id] = selectedItemIds[i.id] || 2;
    });
    setSelectedItemIds(all);
  };

  const deselectAll = () => {
    setSelectedItemIds({});
    setSelectedStickerItemId(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
              <Barcode className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">قائمة استيكرات وملصقات الباركود</h2>
          </div>
        </div>

        {/* Print Button */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-semibold bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
            إجمالي الملصقات للطباعة:{' '}
            <strong className="text-emerald-400 font-mono text-sm">{flattenedStickers.length}</strong> استيكر
          </div>

          <button
            id="btn-trigger-print-stickers"
            onClick={handlePrint}
            disabled={flattenedStickers.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-teal-950/60 transition-all cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>طباعة الاستيكرات الآن</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Selector Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Selection & Controls (Col 5) */}
        <div className="no-print lg:col-span-5 space-y-4">
          {/* Customization Settings Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm font-bold text-slate-200">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-teal-400" />
                <span>إعدادات وتخصيص الاستيكر</span>
              </div>
              <span className="text-xs text-slate-400">تخصيص مباشر</span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Size Selector */}
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1.5">
                  مقاس وحجم الاستيكر (طابعات حرارية أو ورق A4):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setStickerSize('thermal_50x30')}
                    className={`text-xs py-2 px-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      stickerSize === 'thermal_50x30'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    حراري ٥٠×٣٠ مم
                  </button>
                  <button
                    onClick={() => setStickerSize('compact_40x25')}
                    className={`text-xs py-2 px-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      stickerSize === 'compact_40x25'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    صغير ٤٠×٢٥ مم
                  </button>
                  <button
                    onClick={() => setStickerSize('large_70x40')}
                    className={`text-xs py-2 px-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      stickerSize === 'large_70x40'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    كبير ٧٠×٤٠ مم
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.stickerSettings.showStoreName}
                    onChange={(e) =>
                      updateSettings({
                        stickerSettings: {
                          ...settings.stickerSettings,
                          showStoreName: e.target.checked,
                        },
                      })
                    }
                    className="accent-teal-500 rounded"
                  />
                  <span>اسم المتجر</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.stickerSettings.showItemName}
                    onChange={(e) =>
                      updateSettings({
                        stickerSettings: {
                          ...settings.stickerSettings,
                          showItemName: e.target.checked,
                        },
                      })
                    }
                    className="accent-teal-500 rounded"
                  />
                  <span>اسم الصنف</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.stickerSettings.showPrice}
                    onChange={(e) =>
                      updateSettings({
                        stickerSettings: {
                          ...settings.stickerSettings,
                          showPrice: e.target.checked,
                        },
                      })
                    }
                    className="accent-teal-500 rounded"
                  />
                  <span>سعر السلعة ({settings.currency})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/60 p-2 rounded border border-slate-800">
                  <input
                    type="checkbox"
                    checked={settings.stickerSettings.showBarcodeText}
                    onChange={(e) =>
                      updateSettings({
                        stickerSettings: {
                          ...settings.stickerSettings,
                          showBarcodeText: e.target.checked,
                        },
                      })
                    }
                    className="accent-teal-500 rounded"
                  />
                  <span>أرقام الباركود</span>
                </label>
              </div>
            </div>
          </div>

          {/* Items Selector List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-sm text-slate-200">اختيار الأصناف وعدد النسخ</div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className="text-teal-400 hover:underline cursor-pointer"
                >
                  تحديد الكل
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={deselectAll}
                  className="text-slate-400 hover:underline cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Search items */}
            <div className="my-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="ابحث لاختيار صنف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Items scroll list */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const copies = selectedItemIds[item.id] || 0;
                const isSelected = copies > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-teal-950/30 border-teal-600/50 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {/* Checkbox & Item Info */}
                    <div
                      onClick={() => toggleItemSelection(item.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}

                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{item.barcode}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">
                            {item.salePrice.toFixed(2)} {settings.currency}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Selector for this sticker */}
                    {isSelected && (
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md p-0.5 shrink-0">
                        <button
                          onClick={() => setItemCopies(item.id, copies - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={copies}
                          onChange={(e) => setItemCopies(item.id, parseInt(e.target.value) || 0)}
                          className="w-8 text-center text-xs font-mono font-bold bg-transparent text-teal-300 focus:outline-none"
                          min="1"
                          max="100"
                        />
                        <button
                          onClick={() => setItemCopies(item.id, copies + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Sheet Preview (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm text-slate-200">
                  معاينة ورقة الطباعة (جاهزة للطابعات الحرارية وطابعات الباركود)
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {flattenedStickers.length} ملصق
              </span>
            </div>

            {/* Preview Sheet Container */}
            <div className="mt-4 bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-800/80 min-h-[480px] max-h-[640px] overflow-y-auto">
              {flattenedStickers.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
                  <Barcode className="w-16 h-16 opacity-30 mb-2" />
                  <p className="font-bold text-slate-400">لم يتم اختيار أي أصناف للطباعة</p>
                  <p className="text-xs mt-1">اختر الأصناف من القائمة الجانبية وحدد عدد النسخ المطلوبة</p>
                </div>
              ) : (
                <div
                  id="printable-stickers-sheet"
                  className="print-stickers-grid grid grid-cols-2 sm:grid-cols-3 gap-3 p-2 bg-white/95 rounded-lg shadow-inner"
                >
                  {flattenedStickers.map((item, idx) => (
                    <BarcodeSticker
                      key={`${item.id}-${idx}`}
                      item={item}
                      settings={settings}
                      size={stickerSize}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Print advice bar */}
            <div className="mt-3 p-3 bg-teal-950/30 border border-teal-800/40 rounded-lg flex items-center justify-between text-xs text-teal-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>الباركود يتم توليده بصيغة Code128 المتوافقة مع كافة قارئات الباركود</span>
              </span>
              <button
                onClick={handlePrint}
                disabled={flattenedStickers.length === 0}
                className="font-bold text-white bg-teal-600 hover:bg-teal-500 px-3 py-1 rounded-md transition-colors cursor-pointer"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
