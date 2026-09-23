import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  LocateFixed,
  Search,
  Check,
  X,
  Clock,
} from 'lucide-react';
import L from 'leaflet';
import {
  getAdhanSettings,
  saveAdhanSettings,
  calculateVillagePrayerTimes,
  AdhanSettings,
  PrayerTimesDay
} from '../services/adhanService';
import {
  getGlobalPreferences,
  saveGlobalPreferences
} from '../services/globalizationService';

export interface VillageMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const VillageMapPickerModal: React.FC<VillageMapPickerModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const [adhanSettings, setAdhanSettings] = useState<AdhanSettings>(getAdhanSettings());
  const [villageName, setVillageName] = useState<string>(() => {
    return adhanSettings.customVillageName || getGlobalPreferences().customVillageName || '';
  });

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => {
    if (adhanSettings.customCoords) return adhanSettings.customCoords;
    const globalPrefs = getGlobalPreferences();
    if (globalPrefs.customCoords) return globalPrefs.customCoords;
    return { lat: 17.257, lng: 43.125 }; // Default Faifa / Jazan Mountains
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [reverseGeocodedName, setReverseGeocodedName] = useState<string | null>(null);
  const [previewPrayerData, setPreviewPrayerData] = useState<PrayerTimesDay | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Recalculate live preview prayer times when coordinates change
  useEffect(() => {
    const previewSettings: AdhanSettings = {
      ...adhanSettings,
      customCoords: coords,
      customVillageName: villageName,
    };
    setPreviewPrayerData(calculateVillagePrayerTimes(new Date(), previewSettings));
  }, [coords, villageName, adhanSettings]);

  // Reverse geocode when coordinates change
  useEffect(() => {
    let isMounted = true;
    const fetchLocationName = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&accept-language=ar,en`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data) {
          const detected =
            data.address?.village ||
            data.address?.hamlet ||
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.town ||
            data.address?.city ||
            data.name ||
            data.display_name?.split(',')[0];

          if (detected) {
            setReverseGeocodedName(detected);
            if (!villageName.trim()) {
              setVillageName(detected);
            }
          }
        }
      } catch (e) {
        console.warn('Geocoding error:', e);
      }
    };

    const timer = setTimeout(fetchLocationName, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [coords]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Fix leaflet default icon issue
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="transform: translate(-50%, -100%);" class="flex flex-col items-center">
          <div style="background: linear-gradient(135deg, #10b981, #047857); width: 38px; height: 38px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center;">
            <span style="transform: rotate(45deg); font-size: 16px;">🕌</span>
          </div>
          <div style="width: 10px; height: 10px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(2px); margin-top: 2px;"></div>
        </div>
      `,
      iconSize: [38, 48],
      iconAnchor: [19, 48],
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 12,
        zoomControl: true,
      });

      // CartoDB Voyager Tile Layer (Clean, crisp, multilingual)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setCoords({ lat: position.lat, lng: position.lng });
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        marker.setLatLng([lat, lng]);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([coords.lat, coords.lng], mapInstanceRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng]);
      }
      mapInstanceRef.current.invalidateSize();
    }

    return () => {
      // Clean up map when modal unmounts
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle Current GPS Location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('خاصية تحديد الموقع غير مدعومة في جهازك');
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setCoords(newCoords);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        setIsLocatingGPS(false);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setIsLocatingGPS(false);
        alert('تعذر تحديد موقعك الحالي عبر GPS. يرجى تحريك الخريطة واختيار الموقع يدوياً.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search Address / Village Name via OpenStreetMap Nominatim
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&accept-language=ar,en&limit=1`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newCoords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
        setCoords(newCoords);
        if (!villageName.trim()) {
          setVillageName(searchQuery.trim());
        }

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 14);
          markerRef.current.setLatLng([newCoords.lat, newCoords.lng]);
        }
      } else {
        alert('لم يتم العثور على نتائج للبحث. يمكنك النقر مباشرة على الخريطة لتحديد الموقع.');
      }
    } catch (e) {
      console.warn('Location search error:', e);
      alert('حدث خطأ أثناء البحث. يرجى النقر على الخريطة لتثبيت الموقع.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveAndConfirm = () => {
    const finalVillageName = villageName.trim() || reverseGeocodedName || 'قريتي المحددة';

    // Save in Adhan settings
    saveAdhanSettings({
      customCoords: coords,
      customVillageName: finalVillageName,
      selectedVillageId: 'custom_map',
    });

    // Save in Global Preferences
    saveGlobalPreferences({
      customCoords: coords,
      customVillageName: finalVillageName,
      regionId: 'custom_map',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl relative border overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-emerald-500/30 text-white shadow-emerald-950/60'
            : 'bg-white border-emerald-200 text-slate-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/90 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <MapPin className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-emerald-400">
                تحديد قريتك وموقعك على الخريطة 🗺️
              </h2>
              <p className="text-xs text-slate-400">
                حدد قريتك بحرية كاملة بدون أي قيود لحساب مواقيت الأذان والصلوات بدقة
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Custom Village Name Input (Free text without restriction) */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 shadow-inner">
            <label className="text-xs font-black text-emerald-300 mb-1.5 flex items-center gap-1.5">
              <span>✍️ اكتب اسم قريتك أو منطقتك بحرية (من اختيارك):</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={villageName}
                onChange={(e) => setVillageName(e.target.value)}
                placeholder="مثال: قرية بقعة، قرية بيت بوس، وادي ظهر، قرية آل ظلمة، حي الصفا..."
                className="flex-1 bg-slate-900 border border-emerald-500/50 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-bold"
              />
              {reverseGeocodedName && reverseGeocodedName !== villageName && (
                <button
                  type="button"
                  onClick={() => setVillageName(reverseGeocodedName)}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  title="استخدام الاسم المكتشف من الخريطة"
                >
                  استخدام: {reverseGeocodedName}
                </button>
              )}
            </div>
          </div>

          {/* Search bar & Live GPS Button */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <form onSubmit={handleSearchLocation} className="w-full sm:flex-1 flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن اسم مدينة، قرية، جبل، أو حي..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 pr-9"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
              >
                {isSearching ? 'جاري البحث...' : 'بحث 🔍'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocatingGPS}
              className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer transition-all"
            >
              <LocateFixed className={`w-4 h-4 ${isLocatingGPS ? 'animate-spin' : ''}`} />
              <span>{isLocatingGPS ? 'جاري التحديد...' : 'موقعي الحالي عبر GPS 📍'}</span>
            </button>
          </div>

          {/* Interactive Leaflet Map View */}
          <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-lg">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Map overlay hint */}
            <div className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-700 text-[11px] text-emerald-300 font-bold shadow-md backdrop-blur-sm pointer-events-none flex items-center gap-1.5">
              <span>🖱️ انقر أو اسحب الدبوس لتحديد قريتك بدقة</span>
            </div>

            {/* Coordinates Badge */}
            <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-lg bg-slate-950/80 text-[10px] text-slate-300 font-mono border border-slate-800 backdrop-blur-sm pointer-events-none">
              {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
            </div>
          </div>

          {/* Live Prayer Times Preview from Pinned Coordinates */}
          {previewPrayerData && (
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Clock className="w-4 h-4" />
                  <span>مواقيت الأذان المحسوبة لإحداثيات هذا الموقع:</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {villageName || 'الموقع المختار'}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {previewPrayerData.prayers.map((p) => (
                  <div
                    key={p.name}
                    className={`p-2 rounded-xl text-center border ${
                      p.isNext
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] truncate">{p.arabicName}</div>
                    <div className="text-xs font-mono font-bold mt-0.5">{p.formattedTime}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSaveAndConfirm}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>تثبيت موقع وقرية ({villageName || 'الموقع المحدد'}) ✅</span>
          </button>
        </div>
      </div>
    </div>
  );
};
