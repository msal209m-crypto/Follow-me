import React, { useState, useEffect } from 'react';
import {
  Compass,
  Volume2,
  VolumeX,
  Play,
  Square,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  Navigation,
  X,
  CheckCircle2,
  Sliders,
  Settings,
  Shield,
  LocateFixed,
  Sun,
  Sunrise,
  Moon,
  Sunset,
  CloudSun,
  Store,
  Radio,
  Music,
  Check
} from 'lucide-react';
import {
  calculateVillagePrayerTimes,
  getAdhanSettings,
  saveAdhanSettings,
  playAdhanAudio,
  stopAdhanAudio,
  isAdhanAudioPlaying,
  PRESET_VILLAGE_LOCATIONS,
  DEFAULT_VILLAGE_MOSQUES,
  AVAILABLE_ADHAN_SOUNDS,
  AdhanSoundType,
  PrayerTimeInfo,
  PrayerName,
  AdhanSettings,
  PrayerTimesDay,
} from '../services/adhanService';
import { VillageMapPickerModal } from './VillageMapPickerModal';

export interface PrayerTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const PrayerTimesModal: React.FC<PrayerTimesModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  isRTL = true,
}) => {
  const [settings, setSettings] = useState<AdhanSettings>(getAdhanSettings());
  const [prayerData, setPrayerData] = useState<PrayerTimesDay>(() =>
    calculateVillagePrayerTimes(new Date(), settings)
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSoundPreview, setActiveSoundPreview] = useState<AdhanSoundType | null>(null);
  const [activeTab, setActiveTab] = useState<'times' | 'mosques' | 'qibla' | 'settings'>('times');
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Update clock & countdown every second
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      setPrayerData(calculateVillagePrayerTimes(new Date(), settings));
      setIsPlayingAudio(isAdhanAudioPlaying());
    };

    tick();
    const interval = setInterval(tick, 1000);

    const handleAdhanState = (e: any) => {
      if (e.detail) {
        setIsPlayingAudio(!!e.detail.isPlaying);
        if (!e.detail.isPlaying) {
          setActiveSoundPreview(null);
        } else if (e.detail.soundType) {
          setActiveSoundPreview(e.detail.soundType);
        }
      }
    };

    window.addEventListener('qaryati:adhan-playing-state', handleAdhanState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('qaryati:adhan-playing-state', handleAdhanState);
    };
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleUpdateSettings = (partial: Partial<AdhanSettings>) => {
    const updated = saveAdhanSettings(partial);
    setSettings(updated);
    setPrayerData(calculateVillagePrayerTimes(new Date(), updated));
  };

  const handleTogglePlaySpecificSound = async (soundId: AdhanSoundType) => {
    if (isPlayingAudio && activeSoundPreview === soundId) {
      stopAdhanAudio();
      setIsPlayingAudio(false);
      setActiveSoundPreview(null);
    } else {
      setActiveSoundPreview(soundId);
      setIsPlayingAudio(true);
      await playAdhanAudio(soundId, settings.volume);
      setIsPlayingAudio(isAdhanAudioPlaying());
    }
  };

  const handleTogglePlayDefaultAudio = async () => {
    if (isPlayingAudio) {
      stopAdhanAudio();
      setIsPlayingAudio(false);
      setActiveSoundPreview(null);
    } else {
      setActiveSoundPreview(settings.selectedAdhanSound);
      setIsPlayingAudio(true);
      await playAdhanAudio(settings.selectedAdhanSound, settings.volume);
      setIsPlayingAudio(isAdhanAudioPlaying());
    }
  };

  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      setLocationStatus('خاصية تحديد الموقع غير مدعومة في هذا المتصفح');
      return;
    }
    setLocationStatus('جاري تحديد موقع قريتك عبر الأقمار الصناعية (GPS)...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        handleUpdateSettings({
          customCoords: { lat: latitude, lng: longitude },
        });
        setLocationStatus('تم تحديد إحداثيات قريتك بنجاح ومزامنة أوقات الأذان بدقة!');
        setTimeout(() => setLocationStatus(null), 4000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocationStatus('تعذر الوصول إلى الموقع الجغرافي. تأكد من تفعيل إذن الموقع في المتصفح.');
        setTimeout(() => setLocationStatus(null), 5000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getPrayerIcon = (name: PrayerName) => {
    switch (name) {
      case 'fajr':
        return <Sunrise className="w-5 h-5 text-indigo-400" />;
      case 'sunrise':
        return <Sun className="w-5 h-5 text-amber-400" />;
      case 'dhuhr':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'asr':
        return <CloudSun className="w-5 h-5 text-orange-400" />;
      case 'maghrib':
        return <Sunset className="w-5 h-5 text-rose-400" />;
      case 'isha':
        return <Moon className="w-5 h-5 text-blue-400" />;
    }
  };

  const currentSelectedSoundInfo =
    AVAILABLE_ADHAN_SOUNDS.find((s) => s.id === settings.selectedAdhanSound) ||
    AVAILABLE_ADHAN_SOUNDS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={`w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl relative border transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-emerald-500/30 text-white shadow-emerald-950/50'
            : 'bg-white border-emerald-200 text-slate-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-48 h-32 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/40 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-emerald-400">
                  مواقيت الأذان والصلاة في قريتي
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  تقويم أم القرى
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-medium text-emerald-300">{prayerData.hijriDate}</span>
                <span>•</span>
                <span>{prayerData.villageName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlayDefaultAudio}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                isPlayingAudio
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              }`}
              title={isPlayingAudio ? 'إيقاف صوت الأذان' : 'سماع الأذان المختار'}
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span className="hidden sm:inline">إيقاف</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">سماع الأذان</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 my-4 p-1 rounded-2xl bg-slate-800/60 border border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('times')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'times'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            مواقيت اليوم
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mosques')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'mosques'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            مساجد القرية
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qibla')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qibla'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            القبلة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            أصوات الحرمين
          </button>
        </div>

        {/* Hero Next Prayer Card (Always Visible on top of tabs) */}
        <div className="relative rounded-2xl p-4 sm:p-5 mb-5 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-inner">
                {prayerData.nextPrayer && getPrayerIcon(prayerData.nextPrayer.name)}
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-400 block mb-0.5">
                  {prayerData.isPrayerTimeNow ? 'حان الآن موعد الأذان' : 'الصلاة القادمة'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {prayerData.nextPrayer?.arabicName}
                </h3>
                <p className="text-xs text-slate-300">
                  الأذان: <span className="font-bold text-emerald-400">{prayerData.nextPrayer?.formattedTime}</span> • الإقامة: <span className="font-medium text-slate-300">{prayerData.nextPrayer?.iqamahFormatted}</span>
                </p>
              </div>
            </div>

            <div className="text-center sm:text-left bg-slate-950/50 px-4 py-2.5 rounded-2xl border border-emerald-500/30 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                {prayerData.isPrayerTimeNow ? 'وقت الصلاة حاضر الآن' : 'الوقت المتبقي للأذان'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-emerald-400">
                {prayerData.timeRemainingFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Adhan Listen Banner for Makkah & Madinah */}
        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-emerald-950/30 border border-amber-500/30">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>أصوات أذان الحرمين الشريفين المتاحة:</span>
            </div>
            <span className="text-[10px] text-slate-400">المؤذن المعتمد: <strong className="text-emerald-400">{currentSelectedSoundInfo.title}</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Makkah Quick Button */}
            <button
              type="button"
              onClick={() => handleTogglePlaySpecificSound('makkah')}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                isPlayingAudio && (activeSoundPreview === 'makkah' || activeSoundPreview === 'makkah_ali_mulla')
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30 animate-pulse'
                  : 'bg-slate-950/70 hover:bg-slate-900 border-amber-500/30 text-amber-200 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🕋</span>
                <div className="text-right">
                  <div className="font-extrabold text-[11px] sm:text-xs">أذان الحرم المكي</div>
                  <div className="text-[9px] opacity-80">مكة المكرمة</div>
                </div>
              </div>
              {isPlayingAudio && (activeSoundPreview === 'makkah' || activeSoundPreview === 'makkah_ali_mulla') ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current opacity-80" />
              )}
            </button>

            {/* Madinah Quick Button */}
            <button
              type="button"
              onClick={() => handleTogglePlaySpecificSound('madinah')}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                isPlayingAudio && (activeSoundPreview === 'madinah' || activeSoundPreview === 'madinah_bukhari' || activeSoundPreview === 'madinah_surayhi')
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30 animate-pulse'
                  : 'bg-slate-950/70 hover:bg-slate-900 border-emerald-500/30 text-emerald-200 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🕌</span>
                <div className="text-right">
                  <div className="font-extrabold text-[11px] sm:text-xs">أذان الحرم النبوي</div>
                  <div className="text-[9px] opacity-80">المدينة المنورة</div>
                </div>
              </div>
              {isPlayingAudio && (activeSoundPreview === 'madinah' || activeSoundPreview === 'madinah_bukhari' || activeSoundPreview === 'madinah_surayhi') ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current opacity-80" />
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: Today's Prayer Times List */}
        {activeTab === 'times' && (
          <div className="space-y-2.5">
            {prayerData.prayers.map((prayer) => {
              const isNext = prayer.isNext;
              const isCurrent = prayer.isCurrent;

              return (
                <div
                  key={prayer.name}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isNext
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-950/40'
                      : isCurrent
                      ? 'bg-teal-950/30 border-teal-500/60 text-white'
                      : isDarkMode
                      ? 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isNext
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      {getPrayerIcon(prayer.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base">{prayer.arabicName}</span>
                        {isNext && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                            القادمة
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                            الحالية
                          </span>
                        )}
                      </div>
                      {prayer.name !== 'sunrise' && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          الإقامة: {prayer.iqamahFormatted} (بعد {prayer.iqamahMinutes} دقيقة)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <div className={`text-base sm:text-lg font-black ${isNext ? 'text-emerald-400 font-extrabold' : 'text-slate-200'}`}>
                      {prayer.formattedTime}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Village Mosques */}
        {activeTab === 'mosques' && (
          <div className="space-y-3">
            {DEFAULT_VILLAGE_MOSQUES.map((mosque) => (
              <div
                key={mosque.id}
                className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-400">{mosque.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      الإمام: <strong className="text-slate-300">{mosque.imamName}</strong> • المؤذن: <strong className="text-slate-300">{mosque.muezzinName}</strong>
                    </p>
                  </div>
                  {mosque.distanceKm && (
                    <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      تبعد {mosque.distanceKm} كم
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700/40 grid grid-cols-5 gap-1.5 text-center">
                  {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]).map((pName) => (
                    <div key={pName} className="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px]">
                      <span className="text-slate-400 block">{pName === 'fajr' ? 'الفجر' : pName === 'dhuhr' ? 'الظهر' : pName === 'asr' ? 'العصر' : pName === 'maghrib' ? 'المغرب' : 'العشاء'}</span>
                      <strong className="text-emerald-400 block mt-0.5">+{mosque.iqamahOffsets[pName]} د</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Qibla Compass */}
        {activeTab === 'qibla' && (
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-emerald-500/30 animate-spin-slow" />
              <div className="w-36 h-36 rounded-full bg-slate-900 border-2 border-emerald-500/50 flex items-center justify-center shadow-inner relative">
                <Navigation
                  className="w-16 h-16 text-emerald-400 transition-transform duration-700 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  style={{ transform: `rotate(${prayerData.qiblaDegrees}deg)` }}
                />
                <span className="absolute top-2 text-[10px] font-black text-slate-400">شمال</span>
              </div>
            </div>

            <h4 className="font-extrabold text-lg text-white mb-1">
              زاوية القبلة: {prayerData.qiblaDegrees}° درجة
            </h4>
            <p className="text-xs text-slate-400 max-w-sm">
              باتجاه مكة المكرمة والكعبة المشرفة من {prayerData.villageName}. وجه هاتفك باتجاه السهم الأخضر لتحديد القبلة.
            </p>
          </div>
        )}

        {/* TAB 4: Settings & Complete Sound Selection */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Location Selector */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'} space-y-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>موقع وقرية الأذان: <span className="text-emerald-400 font-bold">{prayerData.villageName}</span></span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    يمكنك تحديد قريتك على الخريطة التفاعلية وكتابة اسمها بحرية تامة دون أي قيود
                  </p>
                </div>
              </div>

              {/* Free Custom Village Name Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.customVillageName || ''}
                  onChange={(e) =>
                    handleUpdateSettings({
                      customVillageName: e.target.value,
                    })
                  }
                  placeholder="✍️ اكتب اسم قريتك بحرية (مثلاً: قرية بقعة، وادي ظهر، حي الصفا...)"
                  className={`flex-1 p-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Action Buttons: Map Picker & Live GPS */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer active:scale-95 transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  <span>🗺️ تحديد قريتي على الخريطة والـ GPS</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0"
                  title="تحديد الموقع الحالي فوراً بالـ GPS"
                >
                  <LocateFixed className="w-4 h-4 text-emerald-400" />
                  <span>GPS 📍</span>
                </button>
              </div>

              {locationStatus && (
                <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  {locationStatus}
                </p>
              )}
            </div>

            {/* Adhan Sound Picker: Makkah, Madinah & Holy Places */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  مكتبة أصوات أذان الحرمين والمؤذنين
                </label>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {AVAILABLE_ADHAN_SOUNDS.length} أصوات مسجلة
                </span>
              </div>

              <div className="space-y-2">
                {AVAILABLE_ADHAN_SOUNDS.map((s) => {
                  const isSelected = settings.selectedAdhanSound === s.id;
                  const isCurrentlyPlaying = isPlayingAudio && activeSoundPreview === s.id;

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40'
                          : isDarkMode
                          ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl shrink-0">{s.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs sm:text-sm font-bold text-white">{s.title}</strong>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {s.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{s.subTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Listen preview button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlaySpecificSound(s.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isCurrentlyPlaying
                              ? 'bg-emerald-500 text-slate-950 animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          title={isCurrentlyPlaying ? 'إيقاف الاستماع' : 'استماع تجريبي'}
                        >
                          {isCurrentlyPlaying ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>إيقاف</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>استماع 🔊</span>
                            </>
                          )}
                        </button>

                        {/* Select as default button */}
                        <button
                          type="button"
                          onClick={() => handleUpdateSettings({ selectedAdhanSound: s.id })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>المعتمد ✅</span>
                            </>
                          ) : (
                            <span>اختيار</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Volume Slider */}
              <div className="mt-4 pt-3 border-t border-slate-700/40">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>مستوى صوت الأذان</span>
                  <span className="font-bold text-emerald-400">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => handleUpdateSettings({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Auto Play Adhan on Prayer Times */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">رفع الأذان تلقائياً عند دخول الوقت</h4>
                    <p className="text-[11px] text-slate-400">تشغيل أذان الحرمين المختار تلقائياً في المتجر</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoPlayAdhan}
                    onChange={(e) => handleUpdateSettings({ autoPlayAdhan: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Merchant Prayer Break Toggle */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">إيقاف استقبال الطلبات وقت الصلاة</h4>
                    <p className="text-[11px] text-slate-400">إظهار شارة "المتجر في استراحة صلاة" للزبائن</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.closeStoreDuringPrayer}
                    onChange={(e) => handleUpdateSettings({ closeStoreDuringPrayer: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>حساب أوقات الصلاة دقيق ومستند إلى إحداثيات القرية الفلكية</span>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-400 hover:underline font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Interactive Map Picker Modal */}
      <VillageMapPickerModal
        isOpen={showMapPicker}
        onClose={() => {
          setShowMapPicker(false);
          const updated = getAdhanSettings();
          setSettings(updated);
          setPrayerData(calculateVillagePrayerTimes(new Date(), updated));
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
