import React, { useState, useEffect } from 'react';
import {
  Globe,
  Coins,
  Languages,
  MapPin,
  Check,
  X,
  Compass,
  Sparkles,
  LocateFixed,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import {
  SUPPORTED_COUNTRIES,
  getGlobalPreferences,
  saveGlobalPreferences,
  GlobalUserPreferences,
  CountryInfo
} from '../services/globalizationService';
import { POPULAR_CURRENCIES, CurrencyOption } from '../data/currencies';
import { useApp } from '../context/AppContext';
import { VillageMapPickerModal } from './VillageMapPickerModal';

export interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const { setLanguage } = useApp();
  const [prefs, setPrefs] = useState<GlobalUserPreferences>(getGlobalPreferences());
  const [activeTab, setActiveTab] = useState<'country' | 'currency' | 'language' | 'prayer'>('country');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrefs(getGlobalPreferences());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCountry =
    SUPPORTED_COUNTRIES.find((c) => c.code === prefs.countryCode) || SUPPORTED_COUNTRIES[0];
  const currentCurrency =
    POPULAR_CURRENCIES.find((c) => c.code === prefs.currencyCode) || POPULAR_CURRENCIES[0];

  const handleSelectCountry = (country: CountryInfo) => {
    const updated = saveGlobalPreferences({
      countryCode: country.code,
      currencyCode: country.defaultCurrency,
      regionId: country.regions[0]?.id || 'default',
      prayerCalculationMethod: country.defaultCalculationMethod,
    });
    setPrefs(updated);
  };

  const handleSelectRegion = (regionId: string) => {
    const updated = saveGlobalPreferences({ regionId });
    setPrefs(updated);
  };

  const handleSelectCurrency = (currency: CurrencyOption) => {
    const updated = saveGlobalPreferences({ currencyCode: currency.code });
    setPrefs(updated);
  };

  const handleSelectLanguage = (langCode: string) => {
    const updated = saveGlobalPreferences({ language: langCode });
    setPrefs(updated);
    setLanguage(langCode as any);
  };

  const handleSelectPrayerMethod = (method: string) => {
    const updated = saveGlobalPreferences({ prayerCalculationMethod: method });
    setPrefs(updated);
  };

  const handleAutoGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('خاصية تحديد الموقع غير مدعومة في هذا الجهاز');
      return;
    }
    setGpsStatus('جاري تحديد موقعك الجغرافي حول العالم عبر الأقمار الصناعية...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const updated = saveGlobalPreferences({
          customCoords: { lat: latitude, lng: longitude },
          regionId: 'gps_live',
        });
        setPrefs(updated);
        setGpsStatus('تم تحديد موقعك بدقة ومزامنة التوقيت والعملة ومواقيت الأذان تلقائياً!');
        setTimeout(() => setGpsStatus(null), 4000);
      },
      (err) => {
        console.warn('GPS Error:', err);
        setGpsStatus('تعذر تحديد الموقع الجغرافي. يرجى اختيار الدولة والمنطقة يدوياً.');
        setTimeout(() => setGpsStatus(null), 4000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      dir={prefs.isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 shadow-2xl relative border transition-all ${
          isDarkMode
            ? 'bg-slate-900 border-indigo-500/30 text-white shadow-indigo-950/50'
            : 'bg-white border-indigo-200 text-slate-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-48 h-32 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/40 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Globe className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-indigo-400">
                  إعدادات التوسع العالمي للمنصة 🌍
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Global Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصيص الدولة، العملة، اللغة، ومواقيت الأذان الفلكية حول العالم
              </p>
            </div>
          </div>

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

        {/* Quick GPS Auto-Detect Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-blue-950/50 border border-indigo-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <LocateFixed className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">التحديد التلقائي للموقع والعملة بالـ GPS</h4>
              <p className="text-[11px] text-slate-400">ضبط إحداثيات قريتك وتوقيتها الفلكي أينما كنت</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoGPS}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md transition-all"
          >
            تحديد تلقائي 📍
          </button>
        </div>

        {gpsStatus && (
          <p className="text-xs text-indigo-300 mb-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 font-medium animate-fadeIn">
            {gpsStatus}
          </p>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-2xl bg-slate-800/60 border border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab('country')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'country'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{currentCountry.flag}</span>
            <span>الدولة والمنطقة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'currency'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>العملة ({currentCurrency.symbol})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('language')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'language'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>اللغة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prayer')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'prayer'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>الحساب الفلكي</span>
          </button>
        </div>

        {/* TAB 1: Country & Region Selection */}
        {activeTab === 'country' && (
          <div className="space-y-4">
            {/* Custom Village Name & Map Pin Box */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-indigo-50 border-indigo-200'} space-y-3`}>
              <div>
                <label className="text-xs font-black text-indigo-300 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>تحديد قريتك بحرية وتثبيتها على الخريطة:</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  لا نفرض عليك أي قرية أو منطقة.. يمكنك كتابة اسم قريتك وتحديد موقعها على الخريطة لحساب الأذان ومواءمة التطبيق بدقة.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={prefs.customVillageName || ''}
                  onChange={(e) => {
                    const updated = saveGlobalPreferences({ customVillageName: e.target.value });
                    setPrefs(updated);
                  }}
                  placeholder="✍️ اكتب اسم قريتك بحرية (مثلاً: قرية بقعة، قرية بيت بوس، وادي ظهر...)"
                  className="flex-1 bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/40 cursor-pointer active:scale-95 transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  <span>🗺️ فتح الخريطة التفاعلية وتثبيت القرية والـ GPS</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-2 block">
                اختر الدولة:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUPPORTED_COUNTRIES.map((c) => {
                  const isSelected = prefs.countryCode === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-md shadow-indigo-950/50'
                          : isDarkMode
                          ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xl shrink-0">{c.flag}</span>
                        <div className="truncate">
                          <div className="font-bold text-xs truncate">{c.nameAr}</div>
                          <div className="text-[10px] text-slate-400">{c.phoneCode} • {c.defaultCurrency}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regions within selected country (Optional Quick Suggestions) */}
            {currentCountry.regions && currentCountry.regions.length > 0 && (
              <div className="pt-3 border-t border-slate-700/50">
                <label className="text-xs font-bold text-slate-300 mb-2 block">
                  أو اختر منطقة سريعة مقترحة لـ ({currentCountry.nameAr}):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentCountry.regions.map((reg) => {
                    const isRegSelected = prefs.regionId === reg.id;
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => handleSelectRegion(reg.id)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                          isRegSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : isDarkMode
                            ? 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 opacity-70" />
                          <span className="text-xs">{reg.nameAr}</span>
                        </div>
                        {isRegSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Currency Selection */}
        {activeTab === 'currency' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2">
              الأسعار وعمليات الشراء والطلبات في التطبيق ستُعرض بالعملة المختارة تلقائياً:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {POPULAR_CURRENCIES.map((cur) => {
                const isSelected = prefs.currencyCode === cur.code;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => handleSelectCurrency(cur)}
                    className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-md'
                        : isDarkMode
                        ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{cur.flag}</span>
                      <div>
                        <div className="font-bold text-xs">{cur.name} ({cur.symbol})</div>
                        <div className="text-[10px] text-slate-400">{cur.code} - {cur.nameEn}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Language Selection */}
        {activeTab === 'language' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'ar', label: 'العربية (Arabic)', flag: '🇸🇦', dir: 'RTL (من اليمين لليسار)' },
              { id: 'en', label: 'English (الإنجليزية)', flag: '🇬🇧', dir: 'LTR (Left to Right)' },
              { id: 'fr', label: 'Français (الفرنسية)', flag: '🇫🇷', dir: 'LTR' },
              { id: 'ur', label: 'اردو (Urdu)', flag: '🇵🇰', dir: 'RTL' },
              { id: 'tr', label: 'Türkçe (التركية)', flag: '🇹🇷', dir: 'LTR' },
            ].map((lang) => {
              const isSelected = prefs.language === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.id)}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-md'
                      : isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className="font-extrabold text-sm">{lang.label}</div>
                      <div className="text-[10px] text-slate-400">{lang.dir}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 4: Global Astronomical Calculation Method */}
        {activeTab === 'prayer' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2">
              طريقة الحساب الفلكية المعتمدة رسمياً لحساب أوقات الأذان والصلوات الخمس حسب منطقتك الجغرافية:
            </p>
            {[
              { id: 'UmmAlQura', name: 'جامعة أم القرى - مكة المكرمة (الافتراضي للخليج والسعودية)', desc: 'فجر 18.5° • عشاء بعد المغرب بـ 90 دقيقة' },
              { id: 'MuslimWorldLeague', name: 'رابطة العالم الإسلامي (أوروبا، الشرق الأقصى، أجزاء من أمريكا)', desc: 'فجر 18° • عشاء 17°' },
              { id: 'Egyptian', name: 'الهيئة المصرية العامة للمساحة (مصر والدول الإفريقية)', desc: 'فجر 19.5° • عشاء 17.5°' },
              { id: 'NorthAmerica', name: 'الجمعية الإسلامية لأمريكا الشمالية ISNA (أمريكا وكندا)', desc: 'فجر 15° • عشاء 15°' },
              { id: 'Dubai', name: 'دائرة الشؤون الإسلامية بدبي (الإمارات)', desc: 'معتمد رسمياً في دولة الإمارات' },
              { id: 'Kuwait', name: 'وزارة الأوقاف والشؤون الإسلامية بالكويت', desc: 'معتمد رسمياً في دولة الكويت' },
              { id: 'Qatar', name: 'وزارة الأوقاف والشؤون الإسلامية بقطر', desc: 'معتمد رسمياً في دولة قطر' },
              { id: 'Turkey', name: 'رئاسة الشؤون الدينية التركية Diyanet', desc: 'معتمد رسمياً في تركيا' },
            ].map((m) => {
              const isSelected = prefs.prayerCalculationMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectPrayerMethod(m.id)}
                  className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-md'
                      : isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs sm:text-sm">{m.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>محفوظة ومزامنة تلقائياً مع حسابك وجهازك</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
          >
            حفظ وإغلاق ✅
          </button>
        </div>
      </div>

      {/* Interactive Map Picker Modal */}
      <VillageMapPickerModal
        isOpen={showMapPicker}
        onClose={() => {
          setShowMapPicker(false);
          setPrefs(getGlobalPreferences());
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
