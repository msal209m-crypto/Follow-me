import React, { useState, useEffect } from 'react';
import { 
  Store, 
  User, 
  Truck, 
  ShieldCheck, 
  Users, 
  ArrowLeft,
  History,
  Lock,
  Unlock,
  RefreshCw,
  Trash2,
  Fingerprint,
  Activity,
  LayoutGrid
} from 'lucide-react';
import { getAccessLogs, AccessLogEntry } from '../services/rbacAuthService';

interface DeveloperControlPanelProps {
  onNavigate: (mode: 'store' | 'merchant' | 'driver' | 'admin' | 'manage-merchants' | 'manage-drivers') => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const DeveloperControlPanel: React.FC<DeveloperControlPanelProps> = ({ 
  onNavigate, 
  onClose,
  isDarkMode = true 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'PORTALS' | 'LOGS'>('PORTALS');
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);

  // Load logs
  const loadLogs = () => {
    setLogs(getAccessLogs());
  };

  useEffect(() => {
    loadLogs();
  }, [activeSubTab]);

  const handleClearLogs = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح سجل محاولات الدخول بالكامل؟')) {
      localStorage.setItem('qaryati_access_logs', JSON.stringify([]));
      setLogs([]);
    }
  };

  const tools = [
    { mode: 'store', label: 'واجهة العميل', icon: Store, color: 'text-blue-400' },
    { mode: 'merchant', label: 'واجهة التاجر', icon: User, color: 'text-emerald-400' },
    { mode: 'driver', label: 'واجهة السائق', icon: Truck, color: 'text-amber-400' },
    { mode: 'admin', label: 'واجهة المدير العام', icon: ShieldCheck, color: 'text-rose-400' },
    { mode: 'manage-merchants', label: 'إدارة التجار', icon: Users, color: 'text-purple-400' },
    { mode: 'manage-drivers', label: 'إدارة السائقين', icon: Truck, color: 'text-amber-500' },
  ] as const;

  const getPortalLabel = (portal: string) => {
    switch (portal) {
      case 'MERCHANT': return 'بوابة التاجر 🏪';
      case 'DRIVER': return 'بوابة السائق 🛵';
      case 'DEVELOPER': return 'بوابة المطور 🛠️';
      case 'ADMIN': return 'المدير العام 🛡️';
      default: return portal;
    }
  };

  return (
    <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} max-w-4xl mx-auto w-full`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              المنظومة الرقمية الموحدة
            </h2>
            <p className="text-[10px] text-slate-400">لوحة تحكم ورصد صلاحيات النظام الشاملة</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-755 text-slate-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Control Switcher Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveSubTab('PORTALS')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'PORTALS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>بوابات ومداخل النظام ({tools.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('LOGS')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'LOGS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل محاولات الدخول ورصد الصلاحيات ({logs.length})</span>
        </button>
      </div>

      {/* Content Rendering */}
      {activeSubTab === 'PORTALS' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <button
              key={tool.mode}
              onClick={() => onNavigate(tool.mode as any)}
              className={`flex flex-col items-start gap-3 p-5 rounded-2xl border text-right transition-all group cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800/40 border-slate-800 hover:border-slate-600 hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-3 rounded-xl bg-slate-950/50 group-hover:bg-amber-500/10 transition-colors">
                <tool.icon className={`w-6 h-6 ${tool.color}`} />
              </div>
              <div>
                <span className={`text-sm font-black block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {tool.label}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">انقر للتبديل الفوري والدخول المباشر للبوابة</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Logs Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>مراقبة الوصول الفوري وبطاقات الصلاحيات:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadLogs}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث</span>
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  logs.length === 0
                    ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30'
                }`}
                title="مسح السجل بالكامل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {logs.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-850/80 rounded-2xl p-10 text-center">
                <Lock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-400 text-xs">لا توجد سجلات دخول مسجلة حالياً</h4>
                <p className="text-[10px] text-slate-500 mt-1">سيتم رصد وتسجيل أي عملية محاولة دخول فاشلة أو ناجحة لبوابات التطبيق فوراً هنا.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/30'
                      : 'bg-rose-500/[0.02] border-rose-500/20 hover:border-rose-500/30'
                  }`}
                >
                  {/* Right: Info and Portal Icon */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      log.status === 'SUCCESS' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {log.status === 'SUCCESS' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {getPortalLabel(log.portal)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {log.status === 'SUCCESS' ? 'دخول ناجح ✅' : 'محاولة فاشلة ❌'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        معرف الحساب / الرقم: <strong className="text-slate-300 font-mono">{log.usernameOrPhone}</strong>
                      </div>

                      {log.reason && (
                        <div className="text-[10px] text-rose-400 bg-rose-500/[0.04] px-2 py-0.5 rounded border border-rose-500/10 inline-block">
                          السبب: {log.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Left: Timestamp and Meta */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/60 pt-2.5 sm:pt-0 shrink-0 font-mono text-[10px] text-slate-500">
                    <div>{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    <div className="mt-0.5">{new Date(log.timestamp).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })}</div>
                    {log.ipAddress && <div className="text-[9px] text-slate-600 mt-0.5">IP: {log.ipAddress}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
