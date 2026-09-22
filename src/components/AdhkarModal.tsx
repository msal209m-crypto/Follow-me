import React, { useState } from 'react';
import { POST_PRAYER_ADHKAR } from '../data/adhkar';
import { X, CheckCircle2 } from 'lucide-react';

export interface AdhkarModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const AdhkarModal: React.FC<AdhkarModalProps> = ({ isOpen, onClose, isDarkMode = true }) => {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleAdhkar = (id: string) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>أذكار ما بعد الصلاة</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {POST_PRAYER_ADHKAR.map((adhkar) => (
            <div
              key={adhkar.id}
              onClick={() => toggleAdhkar(adhkar.id)}
              className={`p-4 rounded-2xl border cursor-pointer flex items-center gap-4 transition-all ${
                completed[adhkar.id]
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : isDarkMode
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${completed[adhkar.id] ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500'}`}>
                {completed[adhkar.id] && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-sm ${completed[adhkar.id] ? 'text-emerald-100' : isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{adhkar.text}</p>
                {adhkar.description && <p className="text-[10px] text-slate-500 mt-1">{adhkar.description}</p>}
              </div>
              <span className="text-xs font-mono font-bold bg-slate-950/20 px-2 py-1 rounded-lg text-emerald-400">×{adhkar.count}</span>
            </div>
          ))}
        </div>
        
        <button onClick={onClose} className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all">
          إغلاق
        </button>
      </div>
    </div>
  );
};
