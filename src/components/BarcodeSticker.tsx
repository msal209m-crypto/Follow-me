import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Item, StoreSettings } from '../types';

interface BarcodeStickerProps {
  item: Item;
  settings: StoreSettings;
  size?: 'thermal_50x30' | 'compact_40x25' | 'large_70x40';
  customCopies?: number;
}

export const BarcodeSticker: React.FC<BarcodeStickerProps> = ({
  item,
  settings,
  size = 'thermal_50x30',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !item.barcode) return;
    try {
      JsBarcode(svgRef.current, item.barcode, {
        format: 'CODE128',
        lineColor: '#000000',
        width: size === 'compact_40x25' ? 1.4 : 1.8,
        height: size === 'compact_40x25' ? 26 : 38,
        displayValue: settings.stickerSettings.showBarcodeText,
        fontSize: size === 'compact_40x25' ? 10 : 12,
        font: 'Cairo, sans-serif',
        textAlign: 'center',
        textMargin: 2,
        margin: 2,
        background: '#ffffff',
      });
    } catch (e) {
      console.warn('Barcode render error:', e);
    }
  }, [item.barcode, size, settings.stickerSettings.showBarcodeText]);

  // Size dimensional classes
  const sizeClasses = {
    compact_40x25: 'w-[42mm] h-[26mm] p-1 text-[10px]',
    thermal_50x30: 'w-[52mm] h-[34mm] p-2 text-xs',
    large_70x40: 'w-[72mm] h-[44mm] p-3 text-sm',
  }[size];

  return (
    <div
      className={`sticker-item bg-white text-slate-900 border border-slate-300 rounded-md shadow-xs flex flex-col justify-between items-center text-center overflow-hidden mx-auto transition-all ${sizeClasses}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Store Header */}
      {settings.stickerSettings.showStoreName && (
        <div className="w-full font-bold text-[10px] sm:text-[11px] text-slate-700 truncate border-b border-dashed border-slate-200 pb-0.5 mb-0.5">
          {settings.storeName || 'متجر فلو اب'}
        </div>
      )}

      {/* Item Name */}
      {settings.stickerSettings.showItemName && (
        <div className="w-full font-bold text-slate-950 truncate line-clamp-1 leading-tight px-1">
          {item.name}
        </div>
      )}

      {/* Barcode Graphic */}
      <div className="w-full flex justify-center items-center my-0.5 overflow-hidden">
        <svg ref={svgRef} className="max-w-full max-h-full"></svg>
      </div>

      {/* Price & Unit (سعر السلعة) */}
      {settings.stickerSettings.showPrice && (
        <div className="w-full flex items-center justify-between bg-slate-100 rounded px-1.5 py-0.5 mt-0.5 text-slate-900 font-extrabold border border-slate-200">
          <span className="text-[9px] text-slate-600 font-medium">السعر:</span>
          <span className="text-xs sm:text-sm text-emerald-800 dir-ltr font-black">
            {item.salePrice.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-700 font-semibold">{settings.currency}</span>
          </span>
        </div>
      )}
    </div>
  );
};
