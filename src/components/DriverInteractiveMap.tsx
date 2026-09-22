import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, Compass, Info, Award, Clock, ArrowLeftRight, CheckCircle2, ChevronRight, AlertCircle, Phone, MessageSquare, Plus, Check } from 'lucide-react';
import { DeliveryOrder, StoreSettings } from '../types';

interface DriverInteractiveMapProps {
  availableOrders: DeliveryOrder[];
  activeDeliveries: DeliveryOrder[];
  onAcceptOrder: (orderId: string) => void;
  settings: StoreSettings;
  isRTL: boolean;
}

// 10 Villages with beautifully balanced coordinates on an 800x450 canvas
const VILLAGE_COORDS: Record<string, { x: number; y: number; label: string; desc: string }> = {
  'قرية الفصور': { x: 400, y: 220, label: 'قرية الفصور', desc: 'المركز الرئيسي والجامع الكبير' },
  'قرية الحقالي': { x: 240, y: 130, label: 'قرية الحقالي', desc: 'شمال غرب الوادي العام' },
  'قرية الباركة': { x: 570, y: 120, label: 'قرية الباركة', desc: 'منطقة المزارع الشرقية' },
  'قرية الانهوم': { x: 190, y: 260, label: 'قرية الانهوم', desc: 'هضبة الانهوم الغربية' },
  'قرية مشيجبه': { x: 620, y: 270, label: 'قرية مشيجبه', desc: 'مرتفعات مشيجبه المطلة' },
  'سوق حول جباري': { x: 400, y: 70, label: 'سوق حول جباري', desc: 'منطقة المجمعات التجارية شمالاً' },
  'قرية المداد': { x: 260, y: 360, label: 'قرية المداد', desc: 'جنوب غرب وادي المداد' },
  'قرية الجامع': { x: 540, y: 350, label: 'قرية الجامع', desc: 'منطقة الجامع والمنازل الحديثة' },
  'قرية المسيلة': { x: 400, y: 380, label: 'قرية المسيلة', desc: 'جنوباً بمحاذاة السد المائي' },
  'قرية المكيل': { x: 120, y: 120, label: 'قرية المكيل', desc: 'المنطقة الشمالية الأبعد' },
};

// Village road network
const ROADS = [
  { from: 'قرية الفصور', to: 'قرية الحقالي' },
  { from: 'قرية الفصور', to: 'قرية الباركة' },
  { from: 'قرية الفصور', to: 'قرية الانهوم' },
  { from: 'قرية الفصور', to: 'قرية مشيجبه' },
  { from: 'قرية الفصور', to: 'سوق حول جباري' },
  { from: 'قرية الفصور', to: 'قرية المسيلة' },
  { from: 'قرية الحقالي', to: 'قرية المكيل' },
  { from: 'قرية الانهوم', to: 'قرية المداد' },
  { from: 'قرية مشيجبه', to: 'قرية الجامع' },
  { from: 'قرية المسيلة', to: 'قرية الجامع' },
  { from: 'قرية المسيلة', to: 'قرية المداد' },
];

export const DriverInteractiveMap: React.FC<DriverInteractiveMapProps> = ({
  availableOrders,
  activeDeliveries,
  onAcceptOrder,
  settings,
  isRTL,
}) => {
  // Driver simulated location state (starts at main village الفصور)
  const [driverPos, setDriverPos] = useState({ x: 400, y: 220, village: 'قرية الفصور' });
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [mapAlert, setMapAlert] = useState<string | null>(null);

  // Parse order destination to coordinate village mapping
  const getOrderVillage = (order: DeliveryOrder): string => {
    const address = order.customerAddress.toLowerCase();
    for (const vName of Object.keys(VILLAGE_COORDS)) {
      const shortName = vName.replace('قرية ', '').replace('سوق ', '').trim();
      if (address.includes(shortName)) {
        return vName;
      }
    }
    // Fallback based on deterministic hashing
    const villages = Object.keys(VILLAGE_COORDS);
    let hash = 0;
    for (let i = 0; i < order.id.length; i++) {
      hash = order.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % villages.length;
    return villages[index];
  };

  // Group available orders by village
  const ordersByVillage = useMemo(() => {
    const map: Record<string, DeliveryOrder[]> = {};
    availableOrders.forEach((order) => {
      const v = getOrderVillage(order);
      if (!map[v]) map[v] = [];
      map[v].push(order);
    });
    return map;
  }, [availableOrders]);

  // Group active deliveries by village
  const activeByVillage = useMemo(() => {
    const map: Record<string, DeliveryOrder[]> = {};
    activeDeliveries.forEach((order) => {
      const v = getOrderVillage(order);
      if (!map[v]) map[v] = [];
      map[v].push(order);
    });
    return map;
  }, [activeDeliveries]);

  // When clicking on a village node
  const handleVillageClick = (vName: string) => {
    setSelectedVillage(vName);
    const vOrders = ordersByVillage[vName] || [];
    const vActive = activeByVillage[vName] || [];
    
    if (vOrders.length > 0) {
      setSelectedOrder(vOrders[0]);
    } else if (vActive.length > 0) {
      setSelectedOrder(vActive[0]);
    } else {
      setSelectedOrder(null);
    }
  };

  // Set simulated driver location when clicking map space
  const handleMapBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to viewbox coordinates (800x450 scale)
    const scaleX = 800 / rect.width;
    const scaleY = 450 / rect.height;
    const viewX = clickX * scaleX;
    const viewY = clickY * scaleY;

    // Find closest village
    let closestVillage = 'قرية الفصور';
    let minDist = Infinity;
    Object.entries(VILLAGE_COORDS).forEach(([vName, coord]) => {
      const d = Math.sqrt((coord.x - viewX) ** 2 + (coord.y - viewY) ** 2);
      if (d < minDist) {
        minDist = d;
        closestVillage = vName;
      }
    });

    const targetCoord = VILLAGE_COORDS[closestVillage];
    setDriverPos({ x: targetCoord.x, y: targetCoord.y, village: closestVillage });
    
    setMapAlert(`تم تحديث موقعك الحالي كبائع/سائق محاكاة إلى: ${closestVillage} 📍`);
    setTimeout(() => setMapAlert(null), 3000);
  };

  // Distance calculator helper
  const calculateDistance = (fromX: number, fromY: number, toX: number, toY: number) => {
    const dx = fromX - toX;
    const dy = fromY - toY;
    // 100 pixels represents 1.5 km
    const km = Math.sqrt(dx * dx + dy * dy) * 0.015;
    return km;
  };

  // Compute stats for current selected routing if any
  const routeStats = useMemo(() => {
    if (!selectedOrder) return null;
    const destVillage = getOrderVillage(selectedOrder);
    const destCoord = VILLAGE_COORDS[destVillage];
    if (!destCoord) return null;

    // Store is always at Central Village (قرية الفصور)
    const storeCoord = VILLAGE_COORDS['قرية الفصور'];

    // Driver to Store
    const distToStore = calculateDistance(driverPos.x, driverPos.y, storeCoord.x, storeCoord.y);
    // Store to Client
    const distToClient = calculateDistance(storeCoord.x, storeCoord.y, destCoord.x, destCoord.y);
    
    const totalDist = distToStore + distToClient;
    const eta = Math.max(2, Math.round(totalDist * 2.5)); // 2.5 min per km

    return {
      toStoreKm: distToStore.toFixed(1),
      toClientKm: distToClient.toFixed(1),
      totalKm: totalDist.toFixed(1),
      etaMinutes: eta,
      destVillage,
      destCoord
    };
  }, [selectedOrder, driverPos]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
      {/* Map Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-500 animate-spin-slow" />
            <span>خريطة التوصيل الذكية ومواقع الطلبات بالقرى</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            تظهر نقاط الطلبات المعلقة والنشطة باللون البرتقالي والأخضر. انقر على أي قرية لتحديد المسار واستلام الطلب فوراً.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-850 shrink-0">
          <span className="flex items-center gap-1 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>موقعك الحالي:</span>
          </span>
          <strong className="text-amber-400 font-bold">{driverPos.village}</strong>
        </div>
      </div>

      {mapAlert && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-2 text-[10px] text-amber-400 text-center rounded-xl animate-pulse">
          {mapAlert}
        </div>
      )}

      {/* Grid Layout: Map SVG on Left/Main, and Detail Info Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Interactive Map Visualizer (8 columns) */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden relative min-h-[320px]">
          
          {/* Legend HUD overlay */}
          <div className="absolute top-3 right-3 bg-slate-900/95 border border-slate-800 p-2.5 rounded-xl text-[9px] text-slate-300 space-y-1.5 z-10 shadow-lg select-none">
            <div className="font-bold border-b border-slate-800 pb-1 mb-1 text-white">مفتاح الخريطة:</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 block" />
              <span>قرية الفصور (مركز استلام البضائع)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse block" />
              <span>موقعك الحالي (السائق)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 block" />
              <span>قرية بها طلبات معلقة (للانتظار)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
              <span>قرية بها طلبات جارية (توصيلك)</span>
            </div>
            <div className="pt-1 text-[8px] text-slate-500 border-t border-slate-850 mt-1">
              * انقر على أي مساحة بالخريطة لنقل موقعك (محاكاة GPS)
            </div>
          </div>

          {/* Map Compass */}
          <div className="absolute bottom-3 right-3 bg-slate-900/80 border border-slate-800 w-9 h-9 rounded-full flex items-center justify-center text-slate-500 pointer-events-none z-10">
            <div className="text-center">
              <span className="block text-[8px] font-black text-amber-500 -mt-1 font-mono">N</span>
              <Compass className="w-4 h-4 text-slate-400 rotate-45 -mt-0.5" />
            </div>
          </div>

          {/* SVG Map Canvas */}
          <svg
            viewBox="0 0 800 450"
            className="w-full h-auto max-h-[420px] bg-slate-950 select-none cursor-crosshair"
            onClick={handleMapBackgroundClick}
          >
            {/* Terrain Decorative Gradients */}
            <defs>
              <radialGradient id="mountain-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="road-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Tactical Grid Background lines */}
            <g stroke="#1e293b" strokeWidth="0.5" opacity="0.4">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`v-${i}`} x1={(i + 1) * 80} y1="0" x2={(i + 1) * 80} y2="450" />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={(i + 1) * 75} x2="800" y2={(i + 1) * 75} />
              ))}
            </g>

            {/* Valley mountain decorative shapes */}
            <circle cx="100" cy="80" r="120" fill="url(#mountain-glow)" />
            <circle cx="700" cy="380" r="160" fill="url(#mountain-glow)" />
            <circle cx="750" cy="100" r="100" fill="url(#mountain-glow)" />

            {/* Winding Blue River/Water Stream */}
            <path
              d="M 120 0 Q 200 150 400 240 T 800 320"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="4"
              opacity="0.12"
            />

            {/* DRAW ROADS BETWEEN VILLAGES */}
            <g stroke="#334155" strokeWidth="2.5" opacity="0.6">
              {ROADS.map((road, idx) => {
                const start = VILLAGE_COORDS[road.from];
                const end = VILLAGE_COORDS[road.to];
                if (!start || !end) return null;
                return (
                  <line
                    key={`road-${idx}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    strokeDasharray="4 4"
                  />
                );
              })}
            </g>

            {/* DRAW ROUTING PATHWAY IF THERE IS AN ACTIVE SELECTION */}
            {routeStats && (
              <g>
                {/* Segment 1: Driver to central store */}
                <path
                  d={`M ${driverPos.x} ${driverPos.y} L 400 220`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  className="animate-[pulse_1.5s_infinite]"
                  opacity="0.85"
                />
                
                {/* Segment 2: Central store to client delivery */}
                <path
                  d={`M 400 220 L ${routeStats.destCoord.x} ${routeStats.destCoord.y}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray="8 5"
                  className="animate-[pulse_1.5s_infinite]"
                  opacity="0.9"
                />

                {/* Pulsing indicator moving on route */}
                <circle cx="400" cy="220" r="7" fill="#3b82f6" className="animate-ping" opacity="0.7" />
              </g>
            )}

            {/* DRAW VILLAGE NODES */}
            {Object.entries(VILLAGE_COORDS).map(([vName, coord]) => {
              const pendingCount = (ordersByVillage[vName] || []).length;
              const activeCount = (activeByVillage[vName] || []).length;
              
              const isSelected = selectedVillage === vName;
              const isCenter = vName === 'قرية الفصور';

              let nodeColor = 'fill-slate-800 stroke-slate-700';
              if (isCenter) {
                nodeColor = 'fill-cyan-950 stroke-cyan-500';
              } else if (activeCount > 0) {
                nodeColor = 'fill-emerald-950 stroke-emerald-500';
              } else if (pendingCount > 0) {
                nodeColor = 'fill-orange-950 stroke-orange-500';
              }

              return (
                <g
                  key={vName}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVillageClick(vName);
                  }}
                >
                  {/* Glowing Radar pulse rings */}
                  {pendingCount > 0 && (
                    <circle r="22" className="fill-none stroke-orange-500 animate-ping opacity-40" strokeWidth="1" />
                  )}
                  {activeCount > 0 && (
                    <circle r="18" className="fill-none stroke-emerald-500 animate-ping opacity-30" strokeWidth="1" />
                  )}

                  {/* Outer selection boundary */}
                  <circle
                    r={isSelected ? 16 : 11}
                    className={`transition-all duration-300 ${isSelected ? 'stroke-amber-400 stroke-[3]' : 'stroke-slate-700'} fill-slate-900/90`}
                  />

                  {/* Inner node indicator */}
                  <circle
                    r={isSelected ? 10 : 7}
                    className={`transition-all duration-300 ${nodeColor} stroke-[2]`}
                  />

                  {/* Center Store icon */}
                  {isCenter && (
                    <path
                      d="M -4 -2 L 0 -5 L 4 -2 L 4 4 L -4 4 Z"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Pending Orders Count Badge */}
                  {pendingCount > 0 && (
                    <g transform="translate(10, -10)">
                      <circle r="8.5" fill="#f97316" className="stroke-slate-950 stroke-1" />
                      <text
                        y="3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        {pendingCount}
                      </text>
                    </g>
                  )}

                  {/* Village Label text with Backdrop */}
                  <g transform="translate(0, 24)">
                    <rect
                      x={-45}
                      y={-10}
                      width={90}
                      height={15}
                      rx="4"
                      className={`${isSelected ? 'fill-amber-500/10 stroke-amber-500/20' : 'fill-slate-950/80 stroke-slate-900'} stroke-[0.5]`}
                    />
                    <text
                      textAnchor="middle"
                      className={`text-[9px] font-bold ${isSelected ? 'fill-amber-400 font-extrabold' : isCenter ? 'fill-cyan-400' : pendingCount > 0 ? 'fill-orange-300' : 'fill-slate-300'}`}
                    >
                      {coord.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* DRAW DRIVER SIMULATED SCOOTER MARKER */}
            <g
              transform={`translate(${driverPos.x}, ${driverPos.y})`}
              className="pointer-events-none transition-all duration-500"
            >
              {/* Pulsing halo */}
              <circle r="18" className="fill-none stroke-amber-500 animate-ping opacity-60" strokeWidth="1.5" />
              <circle r="10" fill="#f59e0b" className="stroke-slate-950 stroke-[2] opacity-80" />
              
              {/* Scooter pointer direction */}
              <path
                d="M -5 -2 L 0 -11 L 5 -2 Z"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          </svg>
        </div>

        {/* Selected Location / Order Info Desk (4 columns) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-4 flex-1">
            
            {/* Header selection card */}
            <div className="border-b border-slate-900 pb-3">
              {selectedVillage ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">تفاصيل الموقع المحدد</span>
                    <button
                      onClick={() => {
                        setSelectedVillage(null);
                        setSelectedOrder(null);
                      }}
                      className="text-[10px] text-slate-500 hover:text-white"
                    >
                      مسح التحديد ×
                    </button>
                  </div>
                  <h4 className="text-sm font-black text-white mt-1">{selectedVillage}</h4>
                  <p className="text-[10px] text-slate-400">{VILLAGE_COORDS[selectedVillage]?.desc}</p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
                  <span className="text-xs font-bold text-slate-400 block">اضغط على قرية لاستعراض طلباتها</span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    أو انقر على الخريطة لتغيير موقعك الجغرافي.
                  </p>
                </div>
              )}
            </div>

            {/* Selected Village Orders Switcher */}
            {selectedVillage && (
              <div className="space-y-3">
                {/* Count and status */}
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold">الطلبات المعلقة هنا:</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-black">
                    {(ordersByVillage[selectedVillage] || []).length} طلب جاهز
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] border-b border-slate-900 pb-3">
                  <span className="text-slate-400 font-bold">الطلبات قيد التوصيل هنا:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black">
                    {(activeByVillage[selectedVillage] || []).length} طلب جاري
                  </span>
                </div>

                {/* Route statistics overlay */}
                {routeStats && (
                  <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-2 text-[10px]">
                    <div className="font-bold text-slate-300 flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-amber-500" />
                      <span>بيانات المسار والمسافات (GPS):</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div>الموقع الحالي ← المتجر: <strong className="text-white font-mono">{routeStats.toStoreKm} كم</strong></div>
                      <div>المتجر ← الزبون: <strong className="text-white font-mono">{routeStats.toClientKm} كم</strong></div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800/80 flex justify-between items-center">
                      <span className="text-slate-400">مجموع المسافة الكلية:</span>
                      <strong className="text-amber-400 font-mono text-xs">{routeStats.totalKm} كم</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">الزمن التقديري للتوصيل:</span>
                      <strong className="text-emerald-400 font-bold text-xs flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>~ {routeStats.etaMinutes} دقيقة</span>
                      </strong>
                    </div>
                  </div>
                )}

                {/* Selected Order Detail Form */}
                {selectedOrder ? (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-mono font-black text-amber-400 text-xs">{selectedOrder.orderNumber}</span>
                      <span className="text-[9px] text-slate-400">{new Date(selectedOrder.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="text-[11px] space-y-1">
                      <div>العميل: <strong className="text-white">{selectedOrder.customerName}</strong></div>
                      <div>المكان: <strong className="text-slate-300">{selectedOrder.customerAddress}</strong></div>
                      {selectedOrder.notes && <div className="text-orange-400 text-[10px]">ملاحظة: {selectedOrder.notes}</div>}
                    </div>

                    <div className="text-[11px] bg-slate-950 p-2 rounded border border-slate-900 flex justify-between items-center">
                      <span className="text-slate-500 font-bold">قيمة الطلب:</span>
                      <span className="text-emerald-400 font-black font-mono">{selectedOrder.totalAmount} {settings.currency}</span>
                    </div>

                    <div className="text-[11px] bg-slate-950 p-2 rounded border border-slate-900 flex justify-between items-center">
                      <span className="text-slate-500 font-bold">أجرة التوصيل للقرية:</span>
                      <span className="text-amber-400 font-black font-mono">+{selectedOrder.deliveryFee} {settings.currency}</span>
                    </div>

                    {/* Order Action */}
                    {selectedOrder.status === 'READY_FOR_PICKUP' || selectedOrder.status === 'NEW' ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAcceptOrder(selectedOrder.id);
                          setMapAlert('تم قبول وتعيين الطلب بنجاح! تتبعه الآن في قائمة الطلبات الجارية 🛵');
                          setTimeout(() => setMapAlert(null), 3000);
                          // Clear selection to refresh
                          setSelectedVillage(null);
                          setSelectedOrder(null);
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>قبول الطلب وبدء المسار 🛵</span>
                      </button>
                    ) : (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] text-center font-bold rounded-lg flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>الطلب جارٍ توصيله بواسطتك حالياً</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[11px] text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    لا توجد طلبات ترويج معلقة حالياً في هذا الموقع.
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Direct quick action reminder */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 flex items-center gap-2.5 text-[10px] text-slate-400">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>نصيحة: المندوب الذي يتحرك في اتجاه القرى المجاورة القريبة جغرافياً يوفر 45% من استهلاك الوقود والوقت!</span>
          </div>
        </div>

      </div>
    </div>
  );
};
