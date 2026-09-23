import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  Check,
  X,
  Share2,
  Copy,
  Lightbulb,
  Store
} from 'lucide-react';
import { Item } from '../types';
import { generateSmartMerchantInsights, AIInsightResult } from '../services/aiCommerceService';
import { getGlobalPreferences, formatGlobalCurrency } from '../services/globalizationService';

export interface AIMerchantAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  villageName?: string;
  items: Item[];
  onPublishAdToBulletin?: (adText: string) => void;
  isDarkMode?: boolean;
}

export const AIMerchantAssistantModal: React.FC<AIMerchantAssistantModalProps> = ({
  isOpen,
  onClose,
  storeName,
  villageName = 'قريتك المحددة',
  items,
  onPublishAdToBulletin,
  isDarkMode = true,
}) => {
  const [insights, setInsights] = useState<AIInsightResult | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const res = generateSmartMerchantInsights(storeName, villageName, items);
      setInsights(res);
    }
  }, [isOpen, storeName, villageName, items]);

  if (!isOpen || !insights) return null;

  const handleCopyAd = () => {
    navigator.clipboard.writeText(insights.suggestedPromotionText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePublish = () => {
    if (onPublishAdToBulletin) {
      onPublishAdToBulletin(insights.suggestedPromotionText);
      setPublishedSuccess(true);
      setTimeout(() => setPublishedSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in dir-rtl">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-white shadow-indigo-950/30'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950 via-purple-900/60 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black">المساعد التجاري بالذكاء الاصطناعي</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
                  AI Commerce 🤖
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">تحليل المبيعات، تنبيهات المخزون، وتوليد الإعلانات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Stock Alert Box */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-300 font-extrabold mb-1">تقرير المخزون والطلب المحلي:</div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">{insights.stockAdvice}</p>
            </div>
          </div>

          {/* Smart Insights & Tips */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>توصيات ذكية لزيادة أرباح متجر ({storeName}):</span>
            </h4>

            <div className="space-y-2">
              {insights.topRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs font-medium text-slate-200 flex items-start gap-2.5"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Generated Promotion Poster */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                <span>إعلان ترويجي جاهز للنشر بقرية ({villageName}):</span>
              </span>
              {publishedSuccess && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1 border border-emerald-500/30">
                  <Check className="w-3 h-3" /> تم النشر باللوحة العامة!
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all">
              {insights.suggestedPromotionText}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAd}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedText ? 'تم النسخ ✅' : 'نسخ النص'}</span>
              </button>

              <button
                onClick={handlePublish}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>نشر فوراً باللوحة العامة 📢</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
