import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Store,
  Home,
  Truck,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { DeliveryOrder, StoreSettings } from '../types';

interface OrderDeliveryMiniMapProps {
  order: DeliveryOrder;
  settings?: StoreSettings;
  isRTL?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

// Master node coordinate map (500x320 canvas viewBox)
const MAP_NODES: Record<string, { x: number; y: number; name: string; tag: string }> = {
  'المركز التجاري': { x: 140, y: 150, name: 'المركز التجاري', tag: 'المركز التجاري' },
  'السوق المركزي': { x: 160, y: 160, name: 'السوق المركزي', tag: 'السوق المركزي' },
  'شمال المنطقة': { x: 260, y: 90, name: 'شمال المنطقة', tag: 'شمال المنطقة' },
  'المنطقة الشرقية': { x: 370, y: 110, name: 'المنطقة الشرقية', tag: 'المنطقة الشرقية' },
  'شمال غرب': { x: 120, y: 80, name: 'شمال غرب', tag: 'شمال غرب' },
  'جنوب شرق': { x: 380, y: 220, name: 'جنوب شرق', tag: 'جنوب شرق' },
  'الهضبة الغربية': { x: 90, y: 230, name: 'الهضبة الغربية', tag: 'الهضبة الغربية' },
  'المرتفعات': { x: 420, y: 160, name: 'المرتفعات', tag: 'المرتفعات' },
  'جنوب غرب': { x: 170, y: 260, name: 'جنوب غرب', tag: 'جنوب غرب' },
  'حي المساكن': { x: 320, y: 240, name: 'حي المساكن', tag: 'حي المساكن' },
  'وسط المنطقة': { x: 280, y: 180, name: 'وسط المنطقة', tag: 'الوسط' },
  'المنطقة الجنوبية': { x: 240, y: 270, name: 'المنطقة الجنوبية', tag: 'المنطقة الجنوبية' },
};

// Road network interconnects
const MAP_ROADS = [
  { from: 'المركز التجاري', to: 'شمال المنطقة' },
  { from: 'شمال المنطقة', to: 'المنطقة الشرقية' },
  { from: 'المنطقة الشرقية', to: 'المرتفعات' },
  { from: 'المركز التجاري', to: 'شمال غرب' },
  { from: 'المركز التجاري', to: 'وسط المنطقة' },
  { from: 'وسط المنطقة', to: 'حي المساكن' },
  { from: 'حي المساكن', to: 'جنوب شرق' },
  { from: 'المركز التجاري', to: 'الهضبة الغربية' },
  { from: 'الهضبة الغربية', to: 'جنوب غرب' },
  { from: 'جنوب غرب', to: 'المنطقة الجنوبية' },
  { from: 'المنطقة الجنوبية', to: 'حي المساكن' },
  { from: 'وسط المنطقة', to: 'شمال المنطقة' },
];

export const OrderDeliveryMiniMap: React.FC<OrderDeliveryMiniMapProps> = ({
  order,
  settings,
  isRTL = true,
  className = '',
  defaultExpanded = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeTooltip, setActiveTooltip] = useState<'merchant' | 'customer' | 'driver' | null>(null);

  // 1. Resolve Merchant Coordinate
  const merchantLocation = useMemo(() => {
    const storeName = order.storeName || settings?.storeName || 'المتجر';
    const storeAddress = settings?.address || '';
    
    // Check if store address matches a known village node
    for (const [vKey, node] of Object.entries(MAP_NODES)) {
      if (storeAddress.includes(vKey) || storeName.includes(vKey)) {
        return { ...node, label: storeName };
      }
    }
    // Default merchant node (المركز التجاري / Central Hub)
    return { ...MAP_NODES['المركز التجاري'], label: storeName };
  }, [order.storeName, settings]);

  // 2. Resolve Customer Coordinate
  const customerLocation = useMemo(() => {
    const custAddr = (order.customerAddress || '').trim();
    const custName = order.customerName || 'العميل';

    // Match address with village nodes
    for (const [vKey, node] of Object.entries(MAP_NODES)) {
      const shortName = vKey.replace('قرية ', '').trim();
      if (custAddr.includes(vKey) || custAddr.includes(shortName)) {
        return {
          x: node.x + 10,
          y: node.y - 10,
          name: node.name,
          tag: custAddr,
          label: custName,
        };
      }
    }

    // Deterministic offset based on order id if not matched directly
    let hash = 0;
    for (let i = 0; i < (order.id || '').length; i++) {
      hash = (hash << 5) - hash + order.id.charCodeAt(i);
      hash |= 0;
    }
    const nodeKeys = Object.keys(MAP_NODES);
    const chosenKey = nodeKeys[Math.abs(hash) % nodeKeys.length];
    const baseNode = MAP_NODES[chosenKey];

    // Ensure customer node is not on the exact same spot as merchant
    const offsetX = (Math.abs(hash * 13) % 40) - 20;
    const offsetY = (Math.abs(hash * 17) % 40) - 20;

    return {
      x: Math.max(50, Math.min(450, baseNode.x + offsetX)),
      y: Math.max(50, Math.min(270, baseNode.y + offsetY)),
      name: custAddr || baseNode.name,
      tag: custAddr || 'موقع العميل بالقرية',
      label: custName,
    };
  }, [order.customerAddress, order.customerName, order.id]);

  // 3. Calculate distance and ETA
  const { distanceKm, etaMinutes, routePath } = useMemo(() => {
    const dx = customerLocation.x - merchantLocation.x;
    const dy = customerLocation.y - merchantLocation.y;
    const directDistancePx = Math.sqrt(dx * dx + dy * dy);
    
    // Scale: 100px ~ 1.2 km
    const dist = Math.max(0.4, Number((directDistancePx * 0.012).toFixed(1)));
    
    // ETA: average village speed (25 km/h + 5 min preparation buffer)
    const eta = Math.max(8, Math.round(dist * 3.5 + 5));

    // Calculate a gentle curved bezier route path between store and customer
    const midX = (merchantLocation.x + customerLocation.x) / 2 + (dy > 0 ? 30 : -30);
    const midY = (merchantLocation.y + customerLocation.y) / 2 + (dx > 0 ? -25 : 25);
    const pathStr = `M ${merchantLocation.x} ${merchantLocation.y} Q ${midX} ${midY} ${customerLocation.x} ${customerLocation.y}`;

    return { distanceKm: dist, etaMinutes: eta, routePath: pathStr };
  }, [merchantLocation, customerLocation]);

  // 4. Calculate driver vehicle location along the path
  const driverPos = useMemo(() => {
    if (!order.driverName && order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'ON_THE_WAY') {
      return null;
    }

    // Determine progress factor based on order status (0 = store, 0.6 = on way, 1.0 = delivered)
    let progress = 0.55;
    if (order.status === 'READY_FOR_PICKUP') progress = 0.15;
    else if (order.status === 'DELIVERED') progress = 0.95;

    const t = progress;
    const p0 = merchantLocation;
    const p1 = {
      x: (merchantLocation.x + customerLocation.x) / 2,
      y: (merchantLocation.y + customerLocation.y) / 2 - 20,
    };
    const p2 = customerLocation;

    // Quadratic bezier point formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const curX = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const curY = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

    return { x: curX, y: curY, driverName: order.driverName || 'المندوب' };
  }, [merchantLocation, customerLocation, order.driverName, order.status]);

  // Google Maps Universal Link
  const handleOpenGoogleMaps = () => {
    const query = encodeURIComponent(
      `${order.customerAddress || 'القرية'} ${order.customerName ? `(${order.customerName})` : ''}`
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-2xl sm:rounded-3xl border border-slate-800 bg-[#0d1117] overflow-hidden shadow-xl transition-all ${className} ${
        isExpanded ? 'p-3 sm:p-4' : 'p-2 sm:p-3'
      }`}
    >
      {/* Mini-Map Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 animate-spin text-emerald-400" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>خريطة مسار التوصيل المباشر</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                GPS محلي
              </span>
            </h5>
            <p className="text-[10px] text-slate-400">
              تحديد موقع المتجر ومنزل العميل وحساب المسافة التقديرية
            </p>
          </div>
        </div>

        {/* Action Controls (Zoom / Expand / Google Maps) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 transition-colors text-[10px] flex items-center gap-1 border border-slate-700/80"
            title="فتح العنوان في خرائط جوجل"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Maps</span>
          </button>

          <button
            type="button"
            onClick={() => setZoomLevel((prev) => (prev >= 1.4 ? 1 : prev + 0.2))}
            className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="تكبير الخريطة"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isExpanded ? 'تصغير الخريطة' : 'تكبير ملء البطاقة'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas Container */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-[#070a0f] border border-slate-800/90 shadow-inner select-none transition-all ${
          isExpanded ? 'h-56 sm:h-72' : 'h-36 sm:h-44'
        }`}
      >
        {/* Tactical Grid Background & Elevation Contours */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #10b981 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
            backgroundSize: '24px 24px, 48px 48px, 48px 48px',
          }}
        />

        <svg
          viewBox="0 0 500 320"
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Glow filters for interactive markers */}
            <filter id="emeraldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="amberGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradient for active delivery route */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* 1. Base Village Roads Network */}
          {MAP_ROADS.map((road, idx) => {
            const start = MAP_NODES[road.from];
            const end = MAP_NODES[road.to];
            if (!start || !end) return null;
            return (
              <line
                key={`road-${idx}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#1e293b"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            );
          })}

          {/* 2. Village Landmark Nodes */}
          {Object.entries(MAP_NODES).map(([vKey, node]) => (
            <g key={vKey} className="opacity-40 hover:opacity-100 transition-opacity">
              <circle cx={node.x} cy={node.y} r="3" fill="#475569" />
              <text
                x={node.x}
                y={node.y + 11}
                textAnchor="middle"
                fontSize="8"
                fill="#64748b"
                fontWeight="bold"
                className="select-none font-sans"
              >
                {node.name.replace('قرية ', '')}
              </text>
            </g>
          ))}

          {/* 3. Active Delivery Route Line (Curved Glowing Path) */}
          <path
            d={routePath}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            className="animate-pulse"
          />

          {/* Directional Route Pulse Shadow */}
          <path
            d={routePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeOpacity="0.15"
            strokeLinecap="round"
          />

          {/* 4. Merchant Pin (Store Location 🏪) */}
          <g
            transform={`translate(${merchantLocation.x}, ${merchantLocation.y})`}
            className="cursor-pointer"
            onClick={() => setActiveTooltip(activeTooltip === 'merchant' ? null : 'merchant')}
          >
            {/* Animated Radar Pulse Rings */}
            <circle r="16" fill="#10b981" fillOpacity="0.15" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle r="10" fill="#10b981" fillOpacity="0.3" />
            
            {/* Merchant Hub Circle */}
            <circle r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" filter="url(#emeraldGlow)" />

            {/* Icon Graphic */}
            <circle r="4" fill="#064e3b" />

            {/* Merchant Badge Label */}
            <rect x="-35" y="-24" width="70" height="15" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <text x="0" y="-14" textAnchor="middle" fill="#ecfdf5" fontSize="8" fontWeight="bold">
              🏪 {merchantLocation.label.slice(0, 10)}
            </text>
          </g>

          {/* 5. Customer Pin (Delivery Destination 🏠) */}
          <g
            transform={`translate(${customerLocation.x}, ${customerLocation.y})`}
            className="cursor-pointer"
            onClick={() => setActiveTooltip(activeTooltip === 'customer' ? null : 'customer')}
          >
            {/* Animated Beacon Ring */}
            <circle r="16" fill="#f59e0b" fillOpacity="0.15" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            <circle r="10" fill="#f59e0b" fillOpacity="0.3" />

            {/* Destination Point */}
            <circle r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" filter="url(#amberGlow)" />
            <circle r="4" fill="#78350f" />

            {/* Customer Badge Label */}
            <rect x="-35" y="-24" width="70" height="15" rx="5" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
            <text x="0" y="-14" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="bold">
              📍 {customerLocation.label.slice(0, 10)}
            </text>
          </g>

          {/* 6. Live Driver Vehicle Marker (🛵) if active */}
          {driverPos && (
            <g
              transform={`translate(${driverPos.x}, ${driverPos.y})`}
              className="cursor-pointer transition-all duration-700"
              onClick={() => setActiveTooltip(activeTooltip === 'driver' ? null : 'driver')}
            >
              <circle r="12" fill="#38bdf8" fillOpacity="0.25" className="animate-pulse" />
              <circle r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <rect x="-25" y="-20" width="50" height="13" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
              <text x="0" y="-11" textAnchor="middle" fill="#e0f2fe" fontSize="7" fontWeight="black">
                🛵 المندوب
              </text>
            </g>
          )}
        </svg>

        {/* Floating Metrics Overlay (Distance & ETA) */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
          {/* Distance Badge */}
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md pointer-events-auto backdrop-blur-md">
            <Navigation className="w-3 h-3 text-emerald-400 shrink-0 rotate-45" />
            <span>المسافة:</span>
            <strong className="text-emerald-400 font-mono">{distanceKm} كم</strong>
          </div>

          {/* Estimated Time Badge */}
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md pointer-events-auto backdrop-blur-md">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>الوقت المتوقع:</span>
            <strong className="text-amber-400 font-mono">~{etaMinutes} دقيقة</strong>
          </div>
        </div>

        {/* Interactive Legend / Tooltip info (on click pin) */}
        {activeTooltip && (
          <div className="absolute top-2 inset-x-2 p-2 rounded-xl bg-slate-950/95 border border-emerald-500/40 text-xs text-white shadow-2xl flex items-center justify-between gap-2 animate-in fade-in backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              {activeTooltip === 'merchant' && <Store className="w-4 h-4 text-emerald-400 shrink-0" />}
              {activeTooltip === 'customer' && <Home className="w-4 h-4 text-amber-400 shrink-0" />}
              {activeTooltip === 'driver' && <Truck className="w-4 h-4 text-sky-400 shrink-0" />}

              <div className="min-w-0 truncate text-[11px]">
                {activeTooltip === 'merchant' && (
                  <span>
                    <strong>{merchantLocation.label}:</strong> {merchantLocation.name} ({merchantLocation.tag})
                  </span>
                )}
                {activeTooltip === 'customer' && (
                  <span>
                    <strong>منزل {customerLocation.label}:</strong> {order.customerAddress || customerLocation.name}
                  </span>
                )}
                {activeTooltip === 'driver' && (
                  <span>
                    <strong>مندوب التوصيل:</strong> {order.driverName || 'جاري التوصيل عبر أقصر طريق معبد'}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTooltip(null)}
              className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-300 hover:text-white"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>

      {/* Footer Details: Quick Location Summary */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
        {/* Merchant Side */}
        <div className="flex items-start gap-1.5 bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Store className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-400 font-bold block">موقع المتجر (الانطلاق):</span>
            <span className="text-white font-medium truncate block">{merchantLocation.label}</span>
            <span className="text-[10px] text-slate-400 truncate block">{merchantLocation.name}</span>
          </div>
        </div>

        {/* Customer Side */}
        <div className="flex items-start gap-1.5 bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-amber-400 font-bold block">موقع العميل (الوجهة):</span>
            <span className="text-white font-medium truncate block">{customerLocation.label}</span>
            <span className="text-[10px] text-slate-400 truncate block">{order.customerAddress || customerLocation.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
