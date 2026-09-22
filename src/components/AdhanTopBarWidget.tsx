import React, { useState, useEffect } from 'react';
import {
  Clock,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  MapPin,
  ChevronDown,
  Moon
} from 'lucide-react';
import { AdhkarModal } from './AdhkarModal';
import {
  calculateVillagePrayerTimes,
  getAdhanSettings,
  saveAdhanSettings,
  playAdhanAudio,
  stopAdhanAudio,
  isAdhanAudioPlaying,
  PrayerTimesDay,
  AdhanSettings
} from '../services/adhanService';
import { PrayerTimesModal } from './PrayerTimesModal';

export interface AdhanTopBarWidgetProps {
  isDarkMode?: boolean;
  isRTL?: boolean;
  compact?: boolean;
  className?: string;
}

export const AdhanTopBarWidget: React.FC<AdhanTopBarWidgetProps> = ({
  isDarkMode = true,
  isRTL = true,
  compact = false,
  className = '',
}) => {
  const [settings, setSettings] = useState<AdhanSettings>(getAdhanSettings());
  const [prayerData, setPrayerData] = useState<PrayerTimesDay>(() =>
    calculateVillagePrayerTimes(new Date(), settings)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdhkarModalOpen, setIsAdhkarModalOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    // Show AdhkarModal when prayer time becomes "now" (simulated check)
    if (prayerData.isPrayerTimeNow) {
       // Ideally, use a ref or state to ensure it only shows ONCE per prayer
    }
    
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
        setPrayerData(calculateVillagePrayerTimes(new Date(), e.detail));
      }
    };
    window.addEventListener('qaryati:adhan-settings-updated', handleSettingsUpdate);

    const timer = setInterval(() => {
      setPrayerData(calculateVillagePrayerTimes(new Date(), settings));
      setIsPlayingAudio(isAdhanAudioPlaying());
    }, 1000);

    return () => {
      window.removeEventListener('qaryati:adhan-settings-updated', handleSettingsUpdate);
      clearInterval(timer);
    };
  }, [settings]);

  const handleAudioQuickToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingAudio) {
      stopAdhanAudio();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      await playAdhanAudio(settings.selectedAdhanSound, settings.volume);
      setIsPlayingAudio(isAdhanAudioPlaying());
    }
  };

  const isPrayerNow = prayerData.isPrayerTimeNow;

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`group cursor-pointer select-none transition-all duration-300 flex items-center justify-between gap-2.5 rounded-2xl border px-3 py-1.5 shadow-sm hover:shadow-md ${
          isPrayerNow
            ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-emerald-400 text-white animate-pulse'
            : isDarkMode
            ? 'bg-slate-900/80 hover:bg-slate-800/90 border-emerald-500/30 text-slate-200 hover:border-emerald-400/50'
            : 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200 text-slate-800 hover:border-emerald-300'
        } ${className}`}
        title="انقر لعرض مواقيت الأذان والقبلة ومساجد القرية"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isPrayerNow
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
          </div>

            <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-emerald-400 truncate">
                {isPrayerNow ? 'حان موعد الأذان 🕌' : prayerData.nextPrayer?.arabicName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {prayerData.nextPrayer?.formattedTime}
              </span>
            </div>
            {/* Show countdown in both compact and full modes for clarity */}
            <p className="text-[10px] text-slate-400 truncate">
                {isPrayerNow ? (
                  <span className="text-emerald-300 font-bold">الله أكبر • حان وقت الصلاة</span>
                ) : (
                  <>متبقي: <span className="text-emerald-400 font-mono font-bold">{prayerData.timeRemainingFormatted}</span></>
                )}
              </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleAudioQuickToggle}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isPlayingAudio
                ? 'bg-emerald-500 text-white'
                : isDarkMode
                ? 'hover:bg-slate-700 text-slate-400 hover:text-emerald-400'
                : 'hover:bg-emerald-200 text-slate-600 hover:text-emerald-700'
            }`}
            title={isPlayingAudio ? 'إيقاف صوت الأذان' : 'تجربة الأذان'}
          >
            {isPlayingAudio ? (
              <Square className="w-3.5 h-3.5 fill-current text-white" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <PrayerTimesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
      <AdhkarModal
        isOpen={isAdhkarModalOpen}
        onClose={() => setIsAdhkarModalOpen(false)}
        isDarkMode={isDarkMode}
      />
    </>
  );
};
