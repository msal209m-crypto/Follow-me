import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  MapPin,
  ChevronDown,
  Moon,
  Radio,
  X
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
  AdhanSettings,
  AVAILABLE_ADHAN_SOUNDS
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
  const lastPlayedPrayerRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
        setPrayerData(calculateVillagePrayerTimes(new Date(), e.detail));
      }
    };

    const handleAdhanState = (e: any) => {
      if (e.detail) {
        setIsPlayingAudio(!!e.detail.isPlaying);
      }
    };

    window.addEventListener('qaryati:adhan-settings-updated', handleSettingsUpdate);
    window.addEventListener('qaryati:adhan-playing-state', handleAdhanState);

    const timer = setInterval(() => {
      const currentTimes = calculateVillagePrayerTimes(new Date(), settings);
      setPrayerData(currentTimes);
      setIsPlayingAudio(isAdhanAudioPlaying());

      // Auto play adhan if enabled and prayer time just started
      if (
        settings.autoPlayAdhan &&
        currentTimes.isPrayerTimeNow &&
        currentTimes.currentPrayer &&
        currentTimes.currentPrayer.name !== 'sunrise'
      ) {
        const prayerKey = `${currentTimes.currentPrayer.name}_${new Date().toDateString()}`;
        if (lastPlayedPrayerRef.current !== prayerKey) {
          lastPlayedPrayerRef.current = prayerKey;
          playAdhanAudio(settings.selectedAdhanSound, settings.volume);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('qaryati:adhan-settings-updated', handleSettingsUpdate);
      window.removeEventListener('qaryati:adhan-playing-state', handleAdhanState);
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
  const currentSoundInfo =
    AVAILABLE_ADHAN_SOUNDS.find((s) => s.id === settings.selectedAdhanSound) ||
    AVAILABLE_ADHAN_SOUNDS[0];

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`group cursor-pointer select-none transition-all duration-300 flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 shadow-xs hover:shadow-md ${
          isPrayerNow
            ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-emerald-400 text-white animate-pulse shadow-emerald-500/20'
            : isDarkMode
            ? 'bg-slate-900/90 hover:bg-slate-800/90 border-emerald-500/30 text-slate-200 hover:border-emerald-400/50'
            : 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-200 text-slate-800 hover:border-emerald-300'
        } ${className}`}
        title="انقر لعرض مواقيت الأذان والقبلة ومساجد القرية وأصوات أذان الحرمين"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isPrayerNow
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40 animate-bounce'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-black text-emerald-400 truncate">
              {isPrayerNow ? 'حان الأذان 🕌' : prayerData.nextPrayer?.arabicName}
            </span>
            <span className="text-[11px] text-slate-300 font-mono font-bold">
              {prayerData.nextPrayer?.formattedTime}
            </span>
            {!compact && (
              <p className="hidden md:inline text-[11px] text-slate-400 truncate ms-1">
                {isPrayerNow ? (
                  <span className="text-emerald-300 font-bold">الله أكبر • يصدح الآن</span>
                ) : (
                  <>متبقي: <span className="text-emerald-400 font-mono font-bold">{prayerData.timeRemainingFormatted}</span></>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleAudioQuickToggle}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
              isPlayingAudio
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40 animate-pulse'
                : isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
            }`}
            title={isPlayingAudio ? 'إيقاف صوت الأذان' : 'سماع صوت الأذان الحقيقي'}
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="text-[10px]">إيقاف</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">أذان الحرمين</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Real-Time Adhan Player Bar when audio is actively broadcasting */}
      {isPlayingAudio && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-3.5 rounded-2xl bg-slate-950/95 border-2 border-emerald-400 text-white shadow-2xl backdrop-blur-xl animate-slideUp flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 shrink-0 animate-pulse">
              <Radio className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-400">يصدح الآن نداء الحق</span>
                <span className="flex gap-0.5 items-end h-3">
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-2"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3 delay-75"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-1.5 delay-150"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-3 delay-200"></span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate font-semibold">
                {currentSoundInfo.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                stopAdhanAudio();
                setIsPlayingAudio(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1 shadow-md cursor-pointer transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>إيقاف ⏹️</span>
            </button>
          </div>
        </div>
      )}

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
