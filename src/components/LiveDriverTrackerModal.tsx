import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  Clock,
  X,
  Truck,
  CheckCircle2,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import L from 'leaflet';
import { generateWhatsAppOrderLink } from '../services/whatsappHelper';

export interface LiveDriverTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerName?: string;
  driverName?: string;
  driverPhone?: string;
  villageName?: string;
  destinationCoords?: { lat: number; lng: number };
  isDarkMode?: boolean;
}

export const LiveDriverTrackerModal: React.FC<LiveDriverTrackerModalProps> = ({
  isOpen,
  onClose,
  orderId,
  customerName = 'العميل العزيز',
  driverName = 'المندوب أحمد العفيفي',
  driverPhone = '+966501234567',
  villageName = 'قريتك المحددة',
  destinationCoords = { lat: 17.257, lng: 43.125 },
  isDarkMode = true,
}) => {
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number }>({
    lat: destinationCoords.lat - 0.012,
    lng: destinationCoords.lng - 0.015,
  });

  const [etaMinutes, setEtaMinutes] = useState(8);
  const [distanceKm, setDistanceKm] = useState(2.4);
  const [statusText, setStatusText] = useState('المندوب في الطريق إليك عبر الخريطة 🚗');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map & Animated Driver Marker Movement
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const startLat = destinationCoords.lat - 0.012;
    const startLng = destinationCoords.lng - 0.015;

    // Driver Marker Icon
    const driverIcon = L.divIcon({
      className: 'custom-driver-pin',
      html: `
        <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center animate-bounce">
          <div style="background: linear-gradient(135deg, #059669, #0d9488); width: 42px; height: 42px; border-radius: 50%; box-shadow: 0 10px 25px rgba(0,0,0,0.6); border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 20px;">🚗</span>
          </div>
          <div style="width: 12px; height: 12px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(2px); margin-top: 2px;"></div>
        </div>
      `,
      iconSize: [42, 50],
      iconAnchor: [21, 50],
    });

    // House Marker Icon
    const houseIcon = L.divIcon({
      className: 'custom-house-pin',
      html: `
        <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center">
          <div style="background: linear-gradient(135deg, #4f46e5, #4338ca); width: 40px; height: 40px; border-radius: 50%; box-shadow: 0 10px 25px rgba(0,0,0,0.6); border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 18px;">🏠</span>
          </div>
          <div style="width: 10px; height: 10px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(2px); margin-top: 2px;"></div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [(startLat + destinationCoords.lat) / 2, (startLng + destinationCoords.lng) / 2],
        zoom: 14,
        zoomControl: true,
      });

      // Google Maps Roadmap Layer
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar', {
        attribution: '&copy; Google Maps Platform',
        maxZoom: 20,
      }).addTo(map);

      // Add House Marker
      L.marker([destinationCoords.lat, destinationCoords.lng], { icon: houseIcon })
        .addTo(map)
        .bindPopup(`<b>منزل ${customerName}</b><br/>${villageName}`);

      // Add Driver Marker
      const driverMarker = L.marker([startLat, startLng], { icon: driverIcon }).addTo(map);
      driverMarkerRef.current = driverMarker;
      mapInstanceRef.current = map;
    }

    // Simulate real-time movement step by step
    let step = 0;
    const totalSteps = 20;

    const interval = setInterval(() => {
      step++;
      if (step <= totalSteps) {
        const ratio = step / totalSteps;
        const currentLat = startLat + (destinationCoords.lat - startLat) * ratio;
        const currentLng = startLng + (destinationCoords.lng - startLng) * ratio;

        setDriverPos({ lat: currentLat, lng: currentLng });

        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng([currentLat, currentLng]);
        }

        const remainingEta = Math.max(1, Math.round(8 * (1 - ratio)));
        const remainingDist = Number((2.4 * (1 - ratio)).toFixed(1));

        setEtaMinutes(remainingEta);
        setDistanceKm(remainingDist);

        if (step === totalSteps) {
          setStatusText('وصل المندوب إلى باب منزلك بنجاح! 📦🎉');
        }
      }
    }, 2500);

    return () => {
      clearInterval(interval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const whatsappUrl = `https://wa.me/${driverPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    `مرحباً بك يا مندوبنا العزيز (${driverName})، أتابع طلب برقم #${orderId} المتجه إلى ${villageName}.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in dir-rtl">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-2">
                <span>تتبع المندوب المباشر بالـ GPS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 animate-pulse">
                  مباشر 🔴
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">طلب رقم #{orderId} - {villageName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Map Area */}
        <div className="relative w-full h-64 sm:h-72 bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Live Overlay Status */}
          <div className="absolute top-3 right-3 left-3 z-20 p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs font-bold text-emerald-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>{statusText}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-black">
                ⏱️ {etaMinutes} دقيقة
              </span>
              <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-slate-300">
                📍 {distanceKm} كم
              </span>
            </div>
          </div>
        </div>

        {/* Driver Info & Action Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow">
                🚗
              </div>
              <div>
                <div className="text-xs font-black text-white">{driverName}</div>
                <div className="text-[10px] text-slate-400">مندوب معتمد بقرية {villageName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${driverPhone}`}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-300 flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>يصلك إشعار فور وصول المندوب إلى منزلكم وتأكيد كلمة المرور السريعة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
