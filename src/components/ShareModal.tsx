import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  QrCode,
  MessageCircle,
  Send,
  Globe,
  Store,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { settings, language } = useApp();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const storeTitle = settings?.storeName || (language === 'ar' ? 'متجري الذكي' : 'My Smart Store');
  const shareText =
    language === 'ar'
      ? `جرّب تطبيق FlowApp Pro لإدارة المبيعات، المخزون، ونقاط البيع الذكية:\n${shareUrl}`
      : `Try FlowApp Pro for smart POS, inventory, and sales management:\n${shareUrl}`;

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('QR Code generation error:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy error:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `FlowApp Pro - ${storeTitle}`,
          text: shareText,
          url: shareUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                {language === 'ar' ? 'مشاركة رابط التطبيق' : 'Share Application Link'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'افتح التطبيق على الأجهزة الأخرى أو شاركه مع العملاء' : 'Open on other devices or share with team'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Store Info Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">{storeTitle}</span>
                <span className="text-[10px] text-slate-400 block font-mono">{shareUrl}</span>
              </div>
            </div>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-slate-800 transition-colors"
              title={language === 'ar' ? 'فتح في نافذة جديدة' : 'Open in new tab'}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs font-bold">
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>{language === 'ar' ? 'امسح الرمز لفتح التطبيق في الجوال فوراً' : 'Scan to open on smartphone'}</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl shadow-md">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="App QR Code"
                  className="w-40 h-40 object-contain rounded-lg"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                  جارٍ التوليد...
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center max-w-xs">
              {language === 'ar'
                ? 'وجّه كاميرا هاتفك نحو الرمز وسيفتح التطبيق فوراً بدون الحاجة لكتابة الرابط.'
                : 'Point your mobile camera at this code to launch the app directly.'}
            </p>
          </div>

          {/* URL Copy Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              {language === 'ar' ? 'رابط الوصول المباشر:' : 'Direct App URL:'}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs font-mono text-slate-300 select-all overflow-hidden text-ellipsis whitespace-nowrap">
                <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="overflow-hidden text-ellipsis">{shareUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                <span>{copied ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* Quick Sharing Channels */}
          <div className="space-y-2 pt-1">
            <span className="block text-xs font-bold text-slate-400">
              {language === 'ar' ? 'مشاركة فورية عبر:' : 'Quick Share Via:'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? 'واتساب WhatsApp' : 'WhatsApp'}</span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={handleTelegramShare}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Send className="w-4 h-4 text-sky-400" />
                <span>{language === 'ar' ? 'تيليجرام Telegram' : 'Telegram'}</span>
              </button>
            </div>

            {/* Native Mobile Share if supported */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98 shadow-md mt-1"
              >
                <Share2 className="w-4 h-4" />
                <span>{language === 'ar' ? 'مشاركة عبر تطبيقات الهاتف الأخرى...' : 'Share with mobile apps...'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer font-medium"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
