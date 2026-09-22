import React from 'react';
import { 
  Store, 
  User, 
  Truck, 
  ShieldCheck, 
  Settings, 
  Users, 
  ArrowLeft 
} from 'lucide-react';

interface DeveloperControlPanelProps {
  onNavigate: (mode: 'store' | 'merchant' | 'driver' | 'admin') => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const DeveloperControlPanel: React.FC<DeveloperControlPanelProps> = ({ 
  onNavigate, 
  onClose,
  isDarkMode = true 
}) => {
  const tools = [
    { mode: 'store', label: 'واجهة الزبون', icon: Store, color: 'text-blue-400' },
    { mode: 'merchant', label: 'واجهة التاجر', icon: User, color: 'text-emerald-400' },
    { mode: 'driver', label: 'واجهة السائق', icon: Truck, color: 'text-amber-400' },
    { mode: 'admin', label: 'واجهة المدير', icon: ShieldCheck, color: 'text-rose-400' },
    { mode: 'manage-merchants', label: 'إدارة التجار', icon: Users, color: 'text-purple-400' },
    { mode: 'manage-drivers', label: 'إدارة السائقين', icon: Truck, color: 'text-amber-500' },
  ] as const;

  return (
    <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          لوحة تحكم المطور
        </h2>
        <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <button
            key={tool.mode}
            onClick={() => onNavigate(tool.mode as any)}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 hover:border-slate-500' 
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <tool.icon className={`w-8 h-8 ${tool.color}`} />
            <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {tool.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
