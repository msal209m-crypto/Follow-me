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
  Store
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
  PrayerTimeInfo,
  PrayerName,
  AdhanSettings,
  PrayerTimesDay,
} from '../services/adhanService';

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
  const [prayerData, setPrayerData] = useState<PrayerTimesDay>(() => calculateVillagePrayerTimes(new Date(), settings));
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<'times' | 'mosques' | 'qibla' | 'settings'>('times');
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Update clock & countdown every second
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      setPrayerData(calculateVillagePrayerTimes(new Date(), settings));
      setIsPlayingAudio(isAdhanAudioPlaying());
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleUpdateSettings = (partial: Partial<AdhanSettings>) => {
    const updated = saveAdhanSettings(partial);
    setSettings(updated);
    setPrayerData(calculateVillagePrayerTimes(new Date(), updated));
  };

  const handleTogglePlayAudio = async () => {
    if (isPlayingAudio) {
      stopAdhanAudio();
      setIsPlayingAudio(false);
    } else {
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
              onClick={handleTogglePlayAudio}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                isPlayingAudio
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={isPlayingAudio ? 'إيقاف صوت الأذان' : 'تشغيل تجربة صوت الأذان'}
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>إيقاف</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>تجربة الأذان</span>
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
            مساجد القرية والإقامة
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
            اتجاه القبلة
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
            <Settings className="w-3.5 h-3.5" />
            الإعدادات والصوت
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

                  <div className="text-right sm:text-left">
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      {prayer.formattedTime}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Village Mosques & Iqamah */}
        {activeTab === 'mosques' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              قائمة بمساجد وجوامع القرية مع أوقات الإقامة المعتمدة والمسافة التقديرية:
            </p>

            {DEFAULT_VILLAGE_MOSQUES.map((mosque) => (
              <div
                key={mosque.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDarkMode
                    ? 'bg-slate-800/50 border-slate-700/60 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      🕌
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base">{mosque.name}</h4>
                      {mosque.imamName && (
                        <p className="text-[11px] text-slate-400">الإمام: {mosque.imamName}</p>
                      )}
                    </div>
                  </div>
                  {mosque.distanceKm && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {mosque.distanceKm} كم
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-700/40 text-center">
                  <div className="p-1.5 rounded-lg bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">الفجر</span>
                    <span className="text-xs font-bold text-emerald-400">+{mosque.iqamahOffsets.fajr}د</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">الظهر</span>
                    <span className="text-xs font-bold text-emerald-400">+{mosque.iqamahOffsets.dhuhr}د</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">العصر</span>
                    <span className="text-xs font-bold text-emerald-400">+{mosque.iqamahOffsets.asr}د</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">المغرب</span>
                    <span className="text-xs font-bold text-emerald-400">+{mosque.iqamahOffsets.maghrib}د</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900/40">
                    <span className="text-[10px] text-slate-400 block">العشاء</span>
                    <span className="text-xs font-bold text-emerald-400">+{mosque.iqamahOffsets.isha}د</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Qibla Direction Compass */}
        {activeTab === 'qibla' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center shadow-2xl shadow-emerald-950/60 p-4 mb-4">
              {/* Compass Cardinal Points */}
              <span className="absolute top-2 text-xs font-black text-rose-500">N (الشمال)</span>
              <span className="absolute bottom-2 text-xs font-bold text-slate-400">S (الجنوب)</span>
              <span className="absolute right-3 text-xs font-bold text-slate-400">E (الشرق)</span>
              <span className="absolute left-3 text-xs font-bold text-slate-400">W (الغرب)</span>

              {/* Kaaba Direction Needle */}
              <div
                className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-700"
                style={{ transform: `rotate(${prayerData.qiblaDegrees}deg)` }}
              >
                <div className="w-1.5 h-20 bg-gradient-to-t from-emerald-400 to-teal-300 rounded-full shadow-lg relative -top-6">
                  <div className="w-4 h-4 bg-emerald-400 rounded-full absolute -top-2 -left-1.5 border-2 border-white flex items-center justify-center shadow-md">
                    <span className="text-[7px] text-slate-950 font-bold">🕋</span>
                  </div>
                </div>
              </div>

              {/* Center Pivot */}
              <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center z-10 shadow-lg" />
            </div>

            <h4 className="font-extrabold text-lg text-white mb-1">
              زاوية القبلة: {prayerData.qiblaDegrees}° درجة
            </h4>
            <p className="text-xs text-slate-400 max-w-sm">
              باتجاه مكة المكرمة والكعبة المشرفة من {prayerData.villageName}. وجه هاتفك باتجاه السهم الأخضر لتحديد القبلة.
            </p>
          </div>
        )}

        {/* TAB 4: Settings & Location Selection */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Location Selector */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  موقع القرية / المنطقة
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  تحديد موقعي بالـ GPS
                </button>
              </div>

              <select
                value={settings.selectedVillageId}
                onChange={(e) =>
                  handleUpdateSettings({
                    selectedVillageId: e.target.value,
                    customCoords: null,
                  })
                }
                className={`w-full p-2.5 rounded-xl border text-sm font-semibold outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {PRESET_VILLAGE_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.region})
                  </option>
                ))}
              </select>

              {locationStatus && (
                <p className="text-xs text-emerald-400 mt-2 font-medium bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  {locationStatus}
                </p>
              )}
            </div>

            {/* Adhan Sound Picker */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                صوت مؤذن المنصة
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'makkah', label: 'أذان الحرم المكي' },
                  { id: 'madinah', label: 'أذان الحرم النبوي' },
                  { id: 'quds', label: 'أذان المسجد الأقصى' },
                  { id: 'takbeer', label: 'تكبيرات الأذان القصيرة' },
                  { id: 'chime', label: 'نغمة هادئة (بدون إنترنت)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleUpdateSettings({ selectedAdhanSound: s.id as any })}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
                      settings.selectedAdhanSound === s.id
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : isDarkMode
                        ? 'bg-slate-900/60 border-slate-700/60 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{s.label}</span>
                    {settings.selectedAdhanSound === s.id && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
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
            className="text-emerald-400 hover:underline font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
