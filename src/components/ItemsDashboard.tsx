import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Package,
  Layers,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Item } from '../types';

interface ItemsDashboardProps {
  items: Item[];
  currency: string;
  inventoryStats: {
    totalItemsCount: number;
    totalStockUnits: number;
    totalCostValue: number;
    totalSaleValue: number;
    lowStockCount: number;
  };
  onOpenOrderGoods: (itemId?: string, type?: 'CASH' | 'CREDIT') => void;
  onFilterLowStock: () => void;
  onSelectCategory?: (category: string) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6'];

export const ItemsDashboard: React.FC<ItemsDashboardProps> = ({
  items,
  currency,
  inventoryStats,
  onOpenOrderGoods,
  onFilterLowStock,
  onSelectCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<'categories' | 'status' | 'topItems'>('categories');

  // Calculate Stock Status Breakdown
  const stockStatusData = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let healthyStock = 0;

    items.forEach((item) => {
      const minAlert = item.minStockAlert || 5;
      if (item.quantity <= 0) {
        outOfStock++;
      } else if (item.quantity <= minAlert) {
        lowStock++;
      } else {
        healthyStock++;
      }
    });

    const data = [];
    if (healthyStock > 0 || items.length === 0) {
      data.push({ name: 'مخزون وفير', count: healthyStock, color: '#10b981' });
    }
    if (lowStock > 0) {
      data.push({ name: 'نقص كمية (تنبيه)', count: lowStock, color: '#f59e0b' });
    }
    if (outOfStock > 0) {
      data.push({ name: 'نفد من المخزن (صفر)', count: outOfStock, color: '#ef4444' });
    }

    return data;
  }, [items]);

  // Calculate Value & Quantity by Category
  const categoryData = useMemo(() => {
    const map = new Map<
      string,
      { category: string; costValue: number; saleValue: number; count: number; units: number }
    >();

    items.forEach((item) => {
      const cat = item.category?.trim() || 'غير مصنف';
      const prev = map.get(cat) || {
        category: cat,
        costValue: 0,
        saleValue: 0,
        count: 0,
        units: 0,
      };

      prev.costValue += item.quantity * item.costPrice;
      prev.saleValue += item.quantity * item.salePrice;
      prev.count += 1;
      prev.units += item.quantity;
      map.set(cat, prev);
    });

    return Array.from(map.values())
      .sort((a, b) => b.costValue - a.costValue)
      .slice(0, 6);
  }, [items]);

  // Top 5 Items by Total Tied-up Capital
  const topItemsByValue = useMemo(() => {
    return items
      .map((item) => ({
        name: item.name.length > 14 ? item.name.slice(0, 14) + '...' : item.name,
        fullName: item.name,
        totalCost: Math.round(item.quantity * item.costPrice),
        totalSale: Math.round(item.quantity * item.salePrice),
        quantity: item.quantity,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [items]);

  const expectedProfit = Math.max(0, inventoryStats.totalSaleValue - inventoryStats.totalCostValue);
  const profitMarginPercent =
    inventoryStats.totalCostValue > 0
      ? ((expectedProfit / inventoryStats.totalCostValue) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Dashboard Top Header & Collapsible Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                لوحة بيانات وتحليلات المخزون
              </h3>
              <span className="text-[10px] font-bold bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                <span>مباشر</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              مؤشرات فورية لرأس المال والكميات وحالة النواقص وتوزيع الأصناف
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'تصغير اللوحة' : 'عرض التفاصيل والرسوم'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Items */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5">
            <span>عدد الأصناف الكلية</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {inventoryStats.totalItemsCount}{' '}
              <span className="text-xs text-slate-400 font-sans">صنف</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>إجمالي القطع بالمخزن:</span>
              <span className="font-bold text-slate-200 font-mono">
                {inventoryStats.totalStockUnits} وحدة
              </span>
            </div>
          </div>
        </div>

        {/* Total Cost Capital */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5">
            <span>إجمالي قيمة المخزون (التكلفة)</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono truncate">
              {inventoryStats.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs text-slate-400 font-sans">{currency}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              رأس المال الفعلي المجمد في البضاعة
            </div>
          </div>
        </div>

        {/* Expected Sale Value & Margin */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5">
            <span>القيمة البيعية المتوقعة</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono truncate">
              {inventoryStats.totalSaleValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs text-slate-400 font-sans">{currency}</span>
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center justify-between">
              <span>هامش الربح المتوقع:</span>
              <span className="font-bold font-mono">
                +{expectedProfit.toLocaleString('en-US', { minimumFractionDigits: 0 })} ({profitMarginPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          className={`border rounded-xl p-3.5 flex flex-col justify-between transition-colors ${
            inventoryStats.lowStockCount > 0
              ? 'bg-amber-950/20 border-amber-500/40'
              : 'bg-slate-950/70 border-slate-800/90'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1.5">
            <span className={inventoryStats.lowStockCount > 0 ? 'text-amber-300 font-bold' : ''}>
              الأصناف منخفضة المخزون
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                inventoryStats.lowStockCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'
              }`}
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div
                className={`text-xl sm:text-2xl font-black font-mono ${
                  inventoryStats.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {inventoryStats.lowStockCount}{' '}
                <span className="text-xs text-slate-400 font-sans">أصناف</span>
              </div>
              {inventoryStats.lowStockCount > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenOrderGoods(undefined, 'CASH')}
                  className="text-[11px] text-amber-300 hover:text-white bg-amber-950/80 hover:bg-amber-900/80 border border-amber-700/60 px-2 py-0.5 rounded font-bold cursor-pointer transition-colors"
                  title="طلب توريد النواقص فورا"
                >
                  توريد الآن ←
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>
                {inventoryStats.lowStockCount > 0 ? 'تحتاج إلى إعادة طلب' : 'حالة المخزون ممتازة'}
              </span>
              {inventoryStats.lowStockCount > 0 && (
                <button
                  type="button"
                  onClick={onFilterLowStock}
                  className="text-amber-400 hover:underline cursor-pointer text-[10px]"
                >
                  تصفية الجدول
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Charts Area */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          {/* Charts Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveChartTab('categories')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeChartTab === 'categories'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>قيمة المخزون حسب التصنيف</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartTab('status')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeChartTab === 'status'
                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>حالة وفرة المخزون</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartTab('topItems')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeChartTab === 'topItems'
                    ? 'bg-slate-800 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>أعلى الأصناف قيمة</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block font-mono">
              إجمالي {items.length} صنف مسجل في النظام
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 sm:p-4 min-h-[220px]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <Package className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-bold">لا توجد أصناف كافية لعرض الرسوم البيانية</p>
                <p className="text-[11px] text-slate-600">أضف أصنافاً جديدة لبدء التحليل التلقائي</p>
              </div>
            ) : (
              <>
                {/* 1. Category Value Bar Chart */}
                {activeChartTab === 'categories' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-1">
                      <span className="font-bold text-slate-300">
                        توزيع رأس المال (التكلفة) مقارنة بالقيمة البيعية لكل تصنيف:
                      </span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                          <span>قيمة التكلفة</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span>القيمة البيعية</span>
                        </span>
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                        >
                          <XAxis
                            dataKey="category"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            dy={5}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(v) => `${v.toLocaleString()}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '0.75rem',
                              color: '#f8fafc',
                              fontSize: '12px',
                              textAlign: 'right',
                              direction: 'rtl',
                            }}
                            formatter={(value: any, name: any) => {
                              const label = name === 'costValue' ? 'قيمة التكلفة' : 'القيمة البيعية';
                              return [`${Number(value).toLocaleString()} ${currency}`, label];
                            }}
                            labelFormatter={(label) => `التصنيف: ${label}`}
                          />
                          <Bar
                            dataKey="costValue"
                            name="costValue"
                            fill="#06b6d4"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={35}
                          />
                          <Bar
                            dataKey="saleValue"
                            name="saleValue"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={35}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 2. Stock Health Pie Chart */}
                {activeChartTab === 'status' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                    <div className="h-[190px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stockStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="count"
                          >
                            {stockStatusData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '0.75rem',
                              color: '#f8fafc',
                              fontSize: '12px',
                              textAlign: 'right',
                              direction: 'rtl',
                            }}
                            formatter={(val: any, name: any) => [`${val} صنف`, `${name}`]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-slate-300 mb-1">تفاصيل حالة توفر المخزون:</div>
                      {stockStatusData.map((s) => (
                        <div
                          key={s.name}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: s.color }}
                            ></span>
                            <span className="text-slate-200 font-medium">{s.name}</span>
                          </div>
                          <span className="font-bold font-mono text-white">
                            {s.count} صنف ({((s.count / items.length) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Top Items Tied-up Capital Bar Chart */}
                {activeChartTab === 'topItems' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-1">
                      <span className="font-bold text-slate-300">
                        أكثر 5 أصناف يتركز فيها رأس مال المخزون حالياً:
                      </span>
                      <span className="text-[11px] text-cyan-400 font-mono">
                        (الكمية الحالية × سعر التكلفة)
                      </span>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topItemsByValue}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                        >
                          <XAxis
                            type="number"
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(v) => `${v.toLocaleString()}`}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            width={110}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '0.75rem',
                              color: '#f8fafc',
                              fontSize: '12px',
                              textAlign: 'right',
                              direction: 'rtl',
                            }}
                            formatter={(value: any) => [
                              `${Number(value).toLocaleString()} ${currency}`,
                              'قيمة المخزون',
                            ]}
                            labelFormatter={(label, payload) => {
                              const item = payload?.[0]?.payload;
                              return item ? `${item.fullName} (متوفر: ${item.quantity} قطعة)` : label;
                            }}
                          />
                          <Bar
                            dataKey="totalCost"
                            fill="#10b981"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={22}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
