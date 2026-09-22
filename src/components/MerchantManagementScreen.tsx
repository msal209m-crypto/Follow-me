import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  ShieldAlert, 
  Search,
  UserCheck,
  UserX
} from 'lucide-react';
import { getMerchants, saveMerchants, MerchantAccountRecord } from '../services/rbacAuthService';

export const MerchantManagementScreen: React.FC<{ onClose: () => void; isDarkMode?: boolean }> = ({ 
  onClose, 
  isDarkMode = true 
}) => {
  const [merchants, setMerchants] = useState<MerchantAccountRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMerchants(getMerchants());
    const handleUpdate = () => {
      setMerchants(getMerchants());
    };
    window.addEventListener('qaryati:merchants-updated', handleUpdate);
    return () => {
      window.removeEventListener('qaryati:merchants-updated', handleUpdate);
    };
  }, []);

  const updateMerchantStatus = (id: string, approved: boolean) => {
    const updatedMerchants = merchants.map(m => 
      m.id === id ? { ...m, isApproved: approved } : m
    );
    saveMerchants(updatedMerchants);
    setMerchants(updatedMerchants);
    // Here you would trigger a system notification to the merchant
  };

  const filteredMerchants = merchants.filter(m => 
    m.name.includes(searchTerm) || m.storeName.includes(searchTerm)
  );

  return (
    <div className={`p-6 rounded-3xl border h-full overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>إدارة التجار</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">إغلاق</button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
        <input 
          type="text"
          placeholder="بحث عن تاجر..."
          className={`w-full pl-10 pr-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200'}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredMerchants.map(merchant => (
          <div key={merchant.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <img src={merchant.photo || 'https://via.placeholder.com/64'} alt={merchant.name} className="w-16 h-16 rounded-full object-cover" />
              <div>
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{merchant.name}</h3>
                <p className="text-sm text-slate-400">{merchant.storeName} - {merchant.village}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${merchant.isApproved ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                    {merchant.isApproved ? 'مقبول' : 'بانتظار الموافقة'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => updateMerchantStatus(merchant.id, true)}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                title="قبول"
              >
                <UserCheck className="w-5 h-5" />
              </button>
              <button 
                onClick={() => updateMerchantStatus(merchant.id, false)}
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
