import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  CheckCircle2,
  Truck,
  Store,
  ShieldCheck,
  X,
  Compass,
  Sparkles,
} from 'lucide-react';
import L from 'leaflet';
import { DeliveryOrder } from '../types';
import { getGlobalPreferences } from '../services/globalizationService';

export interface LiveDriverTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DeliveryOrder | null;
  isDarkMode?: boolean;
}

export const LiveDriverTrackingModal: React.FC<LiveDriverTrackingModalProps> = ({
  isOpen,
  onClose,
  order,
  isDarkMode = true,
}) => {
  const globalPrefs = getGlobalPreferences();

  // Base coordinates
  const storeCoords = useRef<{ lat: number; lng: number }>({
    lat: globalPrefs.customCoords?.lat || 17.257,
    lng: globalPrefs.customCoords?.lng || 43.125,
  });

  const customerCoords = useRef<{ lat: number; lng: number }>({
    lat: (globalPrefs.customCoords?.lat || 17.257) + 0.015,
    lng: (globalPrefs.customCoords?.lng || 43.125) + 0.012,
  });

  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number }>(storeCoords.current);
  const [etaMinutes, setEtaMinutes] = useState<number>(8);
  const [distanceKm, setDistanceKm] = useState<number>(2.4);
  const [driverSpeedKm, setDriverSpeedKm] = useState<number>(35);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Animate driver moving smoothly along path from store to customer
  useEffect(() => {
    if (!isOpen || !order) return;

    let progress = 0.15; // 15% towards customer
    const interval = setInterval(() => {
      progress += 0.025;
      if (progress > 0.95) progress = 0.95;

      const currentLat =
        storeCoords.current.lat + (customerCoords.current.lat - storeCoords.current.lat) * progress;
      const currentLng =
        storeCoords.current.lng + (customerCoords.current.lng - storeCoords.current.lng) * progress;

      const newPos = { lat: currentLat, lng: currentLng };
      setDriverPos(newPos);

      const remainingDistance = Math.max(0.2, (1 - progress) * 2.8);
      setDistanceKm(parseFloat(remainingDistance.toFixed(1)));
      setEtaMinutes(Math.max(1, Math.round(remainingDistance * 3.5)));
      setDriverSpeedKm(Math.floor(28 + Math.random() * 15));

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([currentLat, currentLng]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, order]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Custom Icons
    const driverIcon = L.divIcon({
      className: 'driver-live-pin',
      html: `
        <div style="transform: translate(-50%, -50%);" class="relative flex items-center justify-center">
          <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 10px 25px rgba(29, 78, 216, 0.6);">
            <span style="font-size: 20px;">🚗</span>
          </div>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full animate-ping"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const storeIcon = L.divIcon({
      className: 'store-pin',
      html: `
        <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
            <span style="transform: rotate(45deg); font-size: 16px;">🏪</span>
          </div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });

    const customerIcon = L.divIcon({
      className: 'customer-pin',
      html: `
        <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center">
          <div style="background: linear-gradient(135deg, #10b981, #059669); width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
            <span style="transform: rotate(45deg); font-size: 16px;">🏡</span>
          </div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
    });

    if (!mapInstanceRef.current) {
      const midLat = (storeCoords.current.lat + customerCoords.current.lat) / 2;
      const midLng = (storeCoords.current.lng + customerCoords.current.lng) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [midLat, midLng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      // Add Store & Customer Markers
      L.marker([storeCoords.current.lat, storeCoords.current.lng], { icon: storeIcon })
        .bindTooltip(`متجر: ${order?.storeName || 'المتجر'}`, { permanent: true, direction: 'top' })
        .addTo(map);

      L.marker([customerCoords.current.lat, customerCoords.current.lng], { icon: customerIcon })
        .bindTooltip(`موقعك: ${order?.customerName || 'العميل'}`, { permanent: true, direction: 'top' })
        .addTo(map);

      // Route Polyline
      const routePoints: [number, number][] = [
        [storeCoords.current.lat, storeCoords.current.lng],
        [
          storeCoords.current.lat + (customerCoords.current.lat - storeCoords.current.lat) * 0.5 + 0.002,
          storeCoords.current.lng + (customerCoords.current.lng - storeCoords.current.lng) * 0.5 - 0.001,
        ],
        [customerCoords.current.lat, customerCoords.current.lng],
      ];

      L.polyline(routePoints, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(map);

      // Driver Marker
      const driverMarker = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon }).addTo(map);

      mapInstanceRef.current = map;
      driverMarkerRef.current = driverMarker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleOpenWhatsApp = () => {
    const phone = order?.driverPhone || '0502063584';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `السلام عليكم يا كابتن، بخصوص طلب التوصيل رقم #${order?.id?.slice(-4) || '101'} من متجر (${order?.storeName || 'قريتي'}). أنا بانتظارك في موقعي.`
    );
    window.open(`https://wa.me/${cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : cleanPhone}?text=${message}`, '_blank');
  };

  const handleCallDriver = () => {
    const phone = order?.driverPhone || '0502063584';
    window.location.href = `tel:${phone}`;
  };

  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div
        className={`w-full max-w-xl max-h-[94vh] flex flex-col rounded-3xl shadow-2xl relative border overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-blue-500/30 text-white shadow-blue-950/50'
            : 'bg-white border-blue-200 text-slate-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/90 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-blue-400 flex items-center gap-2">
                <span>تتبع المندوب والطلب مباشرة 🚗📍</span>
              </h2>
              <p className="text-xs text-slate-400">
                طلب رقم #{order.id.slice(-4)} • من {order.storeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map View */}
        <div className="relative w-full h-60 sm:h-72 shrink-0 bg-slate-950 border-b border-slate-800">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating ETA & Distance Card */}
          <div className="absolute top-3 right-3 left-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-blue-500/40 shadow-xl backdrop-blur-md text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>المندوب في طريقه إليك</span>
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl backdrop-blur-md text-xs font-mono font-black text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{etaMinutes} دقيقة للوصول</span>
            </div>
          </div>

          {/* Speed & Distance Metric Badges */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
            <div className="px-2.5 py-1 rounded-xl bg-slate-900/90 text-[11px] font-mono text-slate-300 border border-slate-800 backdrop-blur-sm">
              المسافة: <span className="text-blue-400 font-bold">{distanceKm} كم</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-900/90 text-[11px] font-mono text-slate-300 border border-slate-800 backdrop-blur-sm">
              السرعة: <span className="text-emerald-400 font-bold">{driverSpeedKm} كم/س</span>
            </div>
          </div>
        </div>

        {/* Driver Details & Quick Contact */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Driver Info Card */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-lg">
                🚗
              </div>
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>كابتن التوصيل: {order.driverName || 'أبو فيصل (مندوب القرية)'}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {order.driverPhone || '0502063584'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCallDriver}
                className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
                title="اتصال هاتفي بالكابتن"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95 font-bold"
                title="مراسلة واتساب فورية"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delivery Timeline Tracker */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <div className="text-xs font-bold text-slate-300">مراحل تنفيذ وتوصيل الطلب:</div>
            
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-1" />
                <span>تم التأكيد</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Store className="w-3.5 h-3.5 mx-auto mb-1" />
                <span>تم التجهيز</span>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/30 text-blue-300 border border-blue-400 font-black animate-pulse">
                <Truck className="w-3.5 h-3.5 mx-auto mb-1" />
                <span>في الطريق 🚗</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 text-slate-500 border border-slate-800">
                <MapPin className="w-3.5 h-3.5 mx-auto mb-1" />
                <span>تم الاستلام</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs shrink-0">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>إرسال إحداثيات موقعي عبر واتساب</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
