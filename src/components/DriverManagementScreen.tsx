import React, { useState, useEffect } from 'react';
import { 
  Search,
  UserCheck,
  UserX,
  Truck,
  IdCard
} from 'lucide-react';
import { getDrivers, saveDrivers, DriverAccountRecord } from '../services/rbacAuthService';

export const DriverManagementScreen: React.FC<{ onClose: () => void; isDarkMode?: boolean }> = ({ 
  onClose, 
  isDarkMode = true 
}) => {
  const [drivers, setDrivers] = useState<DriverAccountRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setDrivers(getDrivers());
  }, []);

  const updateDriverStatus = (id: string, approved: boolean) => {
    const updatedDrivers = drivers.map(d => 
      d.id === id ? { ...d, isApproved: approved } : d
    );
    saveDrivers(updatedDrivers);
    setDrivers(updatedDrivers);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.includes(searchTerm) || d.phone.includes(searchTerm)
  );

  return (
    <div className={`p-6 rounded-3xl border h-full overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>إدارة السائقين</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">إغلاق</button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
        <input 
          type="text"
          placeholder="بحث عن سائق..."
          className={`w-full pl-10 pr-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200'}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredDrivers.map(driver => (
          <div key={driver.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <img src={driver.photo || 'https://via.placeholder.com/64'} alt={driver.name} className="w-16 h-16 rounded-full object-cover" />
              <div>
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{driver.name}</h3>
                <p className="text-sm text-slate-400">{driver.phone} - {driver.vehicleType}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${driver.isApproved ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                    {driver.isApproved ? 'مفعل' : 'محظور'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {driver.idCardPhoto && (
                <div className="text-center">
                    <img src={driver.idCardPhoto} alt="ID" className="w-16 h-10 rounded object-cover" />
                    <span className="text-[10px] text-slate-500">الهوية</span>
                </div>
              )}
              <button 
                onClick={() => updateDriverStatus(driver.id, true)}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                title="تفعيل"
              >
                <UserCheck className="w-5 h-5" />
              </button>
              <button 
                onClick={() => updateDriverStatus(driver.id, false)}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
                title="حظر"
              >
                <UserX className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
