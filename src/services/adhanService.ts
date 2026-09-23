import { Coordinates, CalculationMethod, PrayerTimes, Qibla } from 'adhan';
import { getGlobalPreferences } from './globalizationService';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type AdhanSoundType =
  | 'makkah'
  | 'makkah_ali_mulla'
  | 'makkah_hadrawi'
  | 'madinah'
  | 'madinah_surehi'
  | 'alafasy'
  | 'quds'
  | 'chime';

export interface PrayerTimeInfo {
  name: PrayerName;
  arabicName: string;
  time: Date;
  formattedTime: string; // e.g. "04:35 ص"
  isNext: boolean;
  isCurrent: boolean;
  iqamahTime: Date;
  iqamahFormatted: string;
  iqamahMinutes: number;
}

export interface VillageLocation {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface VillageMosque {
  id: string;
  name: string;
  imamName?: string;
  muezzinName?: string;
  distanceKm?: number;
  iqamahOffsets: Record<PrayerName, number>; // minutes after adhan
}

export interface AdhanSoundOption {
  id: AdhanSoundType;
  title: string;
  subTitle: string;
  badge: string;
  icon: string;
  muezzin: string;
}

export interface AdhanSettings {
  autoPlayAdhan: boolean;
  selectedAdhanSound: AdhanSoundType;
  volume: number; // 0 to 1
  selectedVillageId: string;
  customVillageName?: string;
  customCoords: { lat: number; lng: number } | null;
  notifyBeforeMinutes: number;
  enablePreAdhanNotification: boolean;
  enableIqamahCountdown: boolean;
  closeStoreDuringPrayer: boolean;
  prayerBreakDurationMinutes: number;
}

export const AVAILABLE_ADHAN_SOUNDS: AdhanSoundOption[] = [
  {
    id: 'makkah',
    title: 'أذان الحرم المكي الشريف (الشيخ علي ملا) 🕋',
    subTitle: 'صوت حقيقي خاشع يصدح من رحاب المسجد الحرام بمكة المكرمة',
    badge: 'مكة المكرمة HQ',
    icon: '🕋',
    muezzin: 'الشيخ علي أحمد ملا',
  },
  {
    id: 'madinah',
    title: 'أذان المسجد النبوي الشريف (المدينة المنورة) 🕌',
    subTitle: 'تسجيل حقيقي عذب ومهيب من رحاب الحرم النبوي بالمدينة المنورة',
    badge: 'المدينة المنورة HQ',
    icon: '🕌',
    muezzin: 'مؤذن الحرم النبوي',
  },
  {
    id: 'madinah_surehi',
    title: 'أذان المدينة - الشيخ عبدالمجيد السريحي 🎙️',
    subTitle: 'أذان ندي وخاشع بنبرة أهل المدينة المنورة الأصيلة',
    badge: 'المدينة المنورة',
    icon: '🕌',
    muezzin: 'الشيخ عبدالمجيد السريحي',
  },
  {
    id: 'makkah_hadrawi',
    title: 'أذان مكة - الشيخ فاروق حضراوي 🎙️',
    subTitle: 'صوت جهوري وقوي يصدح من صحن الكعبة المشرفة',
    badge: 'الحرم المكي',
    icon: '🕋',
    muezzin: 'الشيخ فاروق عبدالرحمن حضراوي',
  },
  {
    id: 'alafasy',
    title: 'أذان الشيخ مشاري بن راشد العفاسي 📢',
    subTitle: 'أذان عذب عالي النقاء معروف في كافة أنحاء العالم الإسلامي',
    badge: 'مشاري العفاسي',
    icon: '✨',
    muezzin: 'الشيخ مشاري العفاسي',
  },
  {
    id: 'quds',
    title: 'أذان المسجد الأقصى المبارك (الشيخ ناجي قزاز) 🇵🇸',
    subTitle: 'نداء الأذان التاريخي الصادح من مآذن القدس والمسجد الأقصى',
    badge: 'المسجد الأقصى',
    icon: '🕌',
    muezzin: 'الشيخ ناجي قزاز',
  },
  {
    id: 'chime',
    title: 'نغمة المساجد الهادئة (بدون إنترنت) 🔔',
    subTitle: 'نغمات تكبير إلكترونية صوتية وقورة تعمل في وضع عدم الاتصال',
    badge: 'أوفلاين',
    icon: '🔔',
    muezzin: 'نغمة إلكترونية',
  },
];

export const PRESET_VILLAGE_LOCATIONS: VillageLocation[] = [
  { id: 'faifa', name: 'قرى جبال فيفاء (جازان)', region: 'جازان', latitude: 17.257, longitude: 43.125 },
  { id: 'makkah', name: 'مكة المكرمة - الحرم المكي', region: 'مكة المكرمة', latitude: 21.389, longitude: 39.857 },
  { id: 'madinah', name: 'المدينة المنورة - الحرم النبوي', region: 'المدينة المنورة', latitude: 24.524, longitude: 39.569 },
  { id: 'bani_malik', name: 'قرى بني مالك / الداير', region: 'جازان', latitude: 17.324, longitude: 43.148 },
  { id: 'al_aridah', name: 'قرى العارضة وجبال سلا', region: 'جازان', latitude: 17.068, longitude: 43.048 },
  { id: 'sabya', name: 'صبيا وقرى الساحل', region: 'جازان', latitude: 17.149, longitude: 42.625 },
  { id: 'abu_arish', name: 'أبو عريش والقرى المجاورة', region: 'جازان', latitude: 16.969, longitude: 42.833 },
  { id: 'jizan_city', name: 'مدينة جازان', region: 'جازان', latitude: 16.889, longitude: 42.551 },
  { id: 'abha', name: 'أبها وقرى عسير وتهامة', region: 'عسير', latitude: 18.216, longitude: 42.505 },
  { id: 'khamis', name: 'خميس مشيط والوادي', region: 'عسير', latitude: 18.300, longitude: 42.733 },
  { id: 'baha', name: 'الباحة وقرى غامد وزهران', region: 'الباحة', latitude: 20.012, longitude: 41.467 },
  { id: 'riyadh', name: 'مدينة الرياض', region: 'الرياض', latitude: 24.713, longitude: 46.675 },
  { id: 'jeddah', name: 'محافظة جدة', region: 'مكة المكرمة', latitude: 21.543, longitude: 39.172 },
  { id: 'najran', name: 'نجران وقرى وادي نجران', region: 'نجران', latitude: 17.492, longitude: 44.127 },
];

export const DEFAULT_VILLAGE_MOSQUES: VillageMosque[] = [
  {
    id: 'mosque-main',
    name: 'جامع القرية الكبير',
    imamName: 'الشيخ محمد الفيفي',
    muezzinName: 'أبو عبدالله',
    distanceKm: 0.2,
    iqamahOffsets: { fajr: 25, sunrise: 0, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 },
  },
  {
    id: 'mosque-market',
    name: 'مسجد سوق القرية التجاري',
    imamName: 'الشيخ أحمد المالكي',
    muezzinName: 'صالح السريعي',
    distanceKm: 0.5,
    iqamahOffsets: { fajr: 25, sunrise: 0, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
  },
  {
    id: 'mosque-valley',
    name: 'مسجد حي الفصور والوادي',
    imamName: 'الشيخ سالم الحكمي',
    distanceKm: 1.1,
    iqamahOffsets: { fajr: 25, sunrise: 0, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 },
  },
];

const SETTINGS_KEY = 'qaryati_adhan_settings_v3';

export const DEFAULT_ADHAN_SETTINGS: AdhanSettings = {
  autoPlayAdhan: true,
  selectedAdhanSound: 'makkah',
  volume: 1.0, // 100% full clear volume
  selectedVillageId: 'faifa',
  customCoords: null,
  notifyBeforeMinutes: 10,
  enablePreAdhanNotification: true,
  enableIqamahCountdown: true,
  closeStoreDuringPrayer: false,
  prayerBreakDurationMinutes: 30,
};

export function getAdhanSettings(): AdhanSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ADHAN_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_ADHAN_SETTINGS;
}

export function saveAdhanSettings(settings: Partial<AdhanSettings>): AdhanSettings {
  const current = getAdhanSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('qaryati:adhan-settings-updated', { detail: updated }));
  } catch (e) {
    console.warn('Error saving adhan settings:', e);
  }
  return updated;
}

export function getActiveCoordinates(settings: AdhanSettings): Coordinates {
  if (settings.customCoords) {
    return new Coordinates(settings.customCoords.lat, settings.customCoords.lng);
  }
  const globalPrefs = getGlobalPreferences();
  if (globalPrefs.customCoords) {
    return new Coordinates(globalPrefs.customCoords.lat, globalPrefs.customCoords.lng);
  }
  const found = PRESET_VILLAGE_LOCATIONS.find((v) => v.id === settings.selectedVillageId);
  if (found) {
    return new Coordinates(found.latitude, found.longitude);
  }
  return new Coordinates(17.257, 43.125); // Default
}

export function getSelectedVillageName(settings: AdhanSettings): string {
  if (settings.customVillageName && settings.customVillageName.trim()) {
    return settings.customVillageName.trim();
  }
  const globalPrefs = getGlobalPreferences();
  if (globalPrefs.customVillageName && globalPrefs.customVillageName.trim()) {
    return globalPrefs.customVillageName.trim();
  }
  if (settings.customCoords || globalPrefs.customCoords) {
    return 'موقعي المحدد على الخريطة 📍';
  }
  const found = PRESET_VILLAGE_LOCATIONS.find((v) => v.id === settings.selectedVillageId);
  return found ? found.name : 'قريتي المحددة';
}

// Format prayer time into Arabic 12-hour format: "04:35 ص" / "06:12 م"
export function formatPrayerTime(date: Date): string {
  if (!date || isNaN(date.getTime())) return '--:--';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const isPM = hours >= 12;
  const h12 = hours % 12 || 12;
  const padM = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const padH = h12 < 10 ? `0${h12}` : `${h12}`;
  const period = isPM ? 'م' : 'ص';
  return `${padH}:${padM} ${period}`;
}

export function getHijriDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return 'مواقيت الصلاة حسب تقويم أم القرى';
  }
}

export function getGregorianDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export const ARABIC_PRAYER_NAMES: Record<PrayerName, string> = {
  fajr: 'صلاة الفجر',
  sunrise: 'الشروق',
  dhuhr: 'صلاة الظهر',
  asr: 'صلاة العصر',
  maghrib: 'صلاة المغرب',
  isha: 'صلاة العشاء',
};

export const DEFAULT_IQAMAH_OFFSETS: Record<PrayerName, number> = {
  fajr: 25,
  sunrise: 0,
  dhuhr: 20,
  asr: 20,
  maghrib: 10,
  isha: 20,
};

export interface PrayerTimesDay {
  prayers: PrayerTimeInfo[];
  nextPrayer: PrayerTimeInfo | null;
  currentPrayer: PrayerTimeInfo | null;
  timeRemainingSeconds: number;
  timeRemainingFormatted: string;
  isPrayerTimeNow: boolean;
  isIqamahTimeNow: boolean;
  qiblaDegrees: number;
  hijriDate: string;
  gregorianDate: string;
  villageName: string;
}

export function getCalculationMethodInstance(methodName?: string) {
  const method = methodName || getGlobalPreferences().prayerCalculationMethod || 'UmmAlQura';
  switch (method) {
    case 'MuslimWorldLeague':
      return CalculationMethod.MuslimWorldLeague();
    case 'Egyptian':
      return CalculationMethod.Egyptian();
    case 'NorthAmerica':
      return CalculationMethod.NorthAmerica();
    case 'Dubai':
      return CalculationMethod.Dubai();
    case 'Kuwait':
      return CalculationMethod.Kuwait();
    case 'Qatar':
      return CalculationMethod.Qatar();
    case 'Singapore':
      return CalculationMethod.Singapore();
    case 'Tehran':
      return CalculationMethod.Tehran();
    case 'Karachi':
      return CalculationMethod.Karachi();
    case 'Turkey':
      return typeof CalculationMethod.Turkey === 'function' ? CalculationMethod.Turkey() : CalculationMethod.MuslimWorldLeague();
    case 'UmmAlQura':
    default:
      return CalculationMethod.UmmAlQura();
  }
}

export function calculateVillagePrayerTimes(
  date: Date = new Date(),
  settings: AdhanSettings = getAdhanSettings()
): PrayerTimesDay {
  const coords = getActiveCoordinates(settings);
  const params = getCalculationMethodInstance(getGlobalPreferences().prayerCalculationMethod);
  const pt = new PrayerTimes(coords, date, params);

  const rawPrayers: { name: PrayerName; time: Date }[] = [
    { name: 'fajr', time: pt.fajr },
    { name: 'sunrise', time: pt.sunrise },
    { name: 'dhuhr', time: pt.dhuhr },
    { name: 'asr', time: pt.asr },
    { name: 'maghrib', time: pt.maghrib },
    { name: 'isha', time: pt.isha },
  ];

  const nowMs = date.getTime();

  // Find next prayer today or Fajr tomorrow
  let nextIdx = rawPrayers.findIndex((p) => p.time.getTime() > nowMs);
  let nextPrayerRaw = nextIdx !== -1 ? rawPrayers[nextIdx] : null;

  if (!nextPrayerRaw) {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowPt = new PrayerTimes(coords, tomorrow, params);
    nextPrayerRaw = { name: 'fajr', time: tomorrowPt.fajr };
  }

  let currentIdx = -1;
  for (let i = rawPrayers.length - 1; i >= 0; i--) {
    if (rawPrayers[i].time.getTime() <= nowMs) {
      currentIdx = i;
      break;
    }
  }

  const prayersList: PrayerTimeInfo[] = rawPrayers.map((p, idx) => {
    const offsetMin = DEFAULT_IQAMAH_OFFSETS[p.name] || 15;
    const iqamahDate = new Date(p.time.getTime() + offsetMin * 60 * 1000);
    const isNext =
      nextPrayerRaw ? nextPrayerRaw.name === p.name && (nextIdx === idx || (nextIdx === -1 && idx === 0)) : false;
    const isCurrent = currentIdx === idx;

    return {
      name: p.name,
      arabicName: ARABIC_PRAYER_NAMES[p.name],
      time: p.time,
      formattedTime: formatPrayerTime(p.time),
      isNext,
      isCurrent,
      iqamahTime: iqamahDate,
      iqamahFormatted: formatPrayerTime(iqamahDate),
      iqamahMinutes: offsetMin,
    };
  });

  const nextInfo = prayersList.find((p) => p.isNext) || prayersList[0];
  const currentInfo = prayersList.find((p) => p.isCurrent) || null;

  const diffMs = Math.max(0, nextPrayerRaw.time.getTime() - nowMs);
  const remainingSec = Math.floor(diffMs / 1000);
  const remH = Math.floor(remainingSec / 3600);
  const remM = Math.floor((remainingSec % 3600) / 60);
  const remS = remainingSec % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const timeRemainingFormatted =
    remH > 0 ? `${pad(remH)}:${pad(remM)}:${pad(remS)}` : `${pad(remM)}:${pad(remS)}`;

  let isPrayerTimeNow = false;
  let isIqamahTimeNow = false;

  if (currentInfo && currentInfo.name !== 'sunrise') {
    const msSincePrayer = nowMs - currentInfo.time.getTime();
    if (msSincePrayer >= 0 && msSincePrayer <= 15 * 60 * 1000) {
      isPrayerTimeNow = true;
    }
    const msToIqamah = currentInfo.iqamahTime.getTime() - nowMs;
    if (msToIqamah >= -5 * 60 * 1000 && msToIqamah <= 0) {
      isIqamahTimeNow = true;
    }
  }

  let qiblaDegrees = 323;
  try {
    qiblaDegrees = Math.round(Qibla(coords));
  } catch {}

  return {
    prayers: prayersList,
    nextPrayer: nextInfo,
    currentPrayer: currentInfo,
    timeRemainingSeconds: remainingSec,
    timeRemainingFormatted,
    isPrayerTimeNow,
    isIqamahTimeNow,
    qiblaDegrees,
    hijriDate: getHijriDateString(date),
    gregorianDate: getGregorianDateString(date),
    villageName: getSelectedVillageName(settings),
  };
}

// ------------------------------------------------------------------
// 100% Verified Real Audio URLs for Makkah, Madinah & Holy Mosques
// ------------------------------------------------------------------

let globalAudioElement: HTMLAudioElement | null = null;
let globalAudioCtx: AudioContext | null = null;

// Multi-CDN verified high performance endpoints
export const ADHAN_REAL_AUDIO_URLS: Record<AdhanSoundType, string[]> = {
  makkah: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_HQ.mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Ali_Ibn_Ahmad_Mala_HQ.mp3',
    'https://fastly.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_HQ.mp3',
  ],
  makkah_ali_mulla: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Ali_Ibn_Ahmad_Mala_HQ.mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Ali_Ibn_Ahmad_Mala_HQ.mp3',
  ],
  madinah: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D8%AF%D9%86%D9%8A_-_%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D9%85%D9%86%D9%88%D8%B1%D8%A9).mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(أذان_الحرم_المدني_-_المدينة_المنورة).mp3',
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Abdul_Majid_Al_Surehi_1_(%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF_%D8%A7%D9%84%D8%B3%D8%B1%D9%8A%D8%AD%D9%8A).mp3',
  ],
  madinah_surehi: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Abdul_Majid_Al_Surehi_1_(%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF_%D8%A7%D9%84%D8%B3%D8%B1%D9%8A%D8%AD%D9%8A).mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Abdul_Majid_Al_Surehi_1_(عبدالمجيد_السريحي).mp3',
  ],
  makkah_hadrawi: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Faruq_Abdul_Rahman_Hadrawe_-_Al_Haram_Al_Maki_(%D9%81%D8%A7%D8%B1%D9%88%D9%82_%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86_%D8%AD%D8%B6%D8%B1%D8%A7%D9%88%D9%8A_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Faruq_Abdul_Rahman_Hadrawe_-_Al_Haram_Al_Maki_(فاروق_عبدالرحمن_حضراوي_-_الحرم_المكي).mp3',
  ],
  alafasy: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Mishary_Rashid_Alafasy_1_-_Kuwait_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%B1%D8%A7%D8%B4%D8%AF_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A_-_%D8%A7%D9%84%D9%83%D9%88%D9%8A%D8%AA).mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mishary_Rashid_Alafasy_1_-_Kuwait_(مشاري_راشد_العفاسي_-_الكويت).mp3',
  ],
  quds: [
    'https://cdn.jsdelivr.net/gh/Kiwifu/adhan-mp3@main/Najee_Qazaz_-_Al_Aqsa_Jerusalem_(%D9%86%D8%A7%D8%AC%D9%8A_%D9%82%D8%B2%D8%A7%D8%B2_-_%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D8%AF_%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D9%89_%D8%A7%D9%84%D9%82%D8%AF%D8%B3).mp3',
    'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Najee_Qazaz_-_Al_Aqsa_Jerusalem_(ناجي_قزاز_-_المسجد_الأقصى_القدس).mp3',
  ],
  chime: ['synthetic'],
};

// Generates an offline harmonic chime only if explicitly selected
export function playSyntheticMosqueChime(volume: number = 0.8): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }
      if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
        globalAudioCtx = new AudioContextClass();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }

      const ctx = globalAudioCtx;
      const now = ctx.currentTime;

      const notes = [
        { freq: 293.66, time: 0.0, dur: 1.2 },
        { freq: 349.23, time: 0.8, dur: 1.2 },
        { freq: 392.00, time: 1.6, dur: 1.4 },
        { freq: 440.00, time: 2.5, dur: 1.6 },
        { freq: 587.33, time: 3.6, dur: 2.8 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);
        gain.gain.setValueAtTime(0.0001, now + note.time);
        gain.gain.exponentialRampToValueAtTime(volume * 0.5, now + note.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });

      setTimeout(() => resolve(), 6500);
    } catch {
      resolve();
    }
  });
}

/**
 * Plays the actual real vocal Adhan audio with automatic fallback to redundant CDNs
 */
export async function playAdhanAudio(
  soundType: AdhanSoundType = 'makkah',
  volume: number = 1.0
): Promise<{ success: boolean; mode: 'audio' | 'chime' | 'error'; soundUsed: string }> {
  stopAdhanAudio();

  if (soundType === 'chime') {
    await playSyntheticMosqueChime(volume);
    return { success: true, mode: 'chime', soundUsed: 'chime' };
  }

  const urls = ADHAN_REAL_AUDIO_URLS[soundType] || ADHAN_REAL_AUDIO_URLS.makkah;

  for (const url of urls) {
    if (url === 'synthetic') continue;
    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
      audio.volume = Math.max(0.1, Math.min(1.0, volume || 1.0));
      audio.preload = 'auto';
      globalAudioElement = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;

        window.dispatchEvent(
          new CustomEvent('qaryati:adhan-playing-state', {
            detail: { isPlaying: true, soundType, audioUrl: url },
          })
        );

        audio.onended = () => {
          stopAdhanAudio();
        };

        return { success: true, mode: 'audio', soundUsed: soundType };
      }
    } catch (err) {
      console.warn(`[Adhan Audio] Mirror failed (${url}), trying next mirror:`, err);
    }
  }

  // If network is completely offline, fall back to chime
  console.warn('[Adhan Audio] All audio mirrors unreachable, fallback to chime');
  await playSyntheticMosqueChime(volume);
  return { success: true, mode: 'chime', soundUsed: 'chime' };
}

export function stopAdhanAudio(): void {
  if (globalAudioElement) {
    try {
      globalAudioElement.pause();
      globalAudioElement.currentTime = 0;
    } catch {}
    globalAudioElement = null;
  }
  if (globalAudioCtx && globalAudioCtx.state === 'running') {
    try {
      globalAudioCtx.suspend();
    } catch {}
  }
  window.dispatchEvent(
    new CustomEvent('qaryati:adhan-playing-state', {
      detail: { isPlaying: false },
    })
  );
}

export function isAdhanAudioPlaying(): boolean {
  if (globalAudioElement && !globalAudioElement.paused) return true;
  return false;
}

export function isStoreClosedForPrayer(settings: AdhanSettings = getAdhanSettings()): {
  isClosed: boolean;
  prayerName?: string;
  minutesRemaining?: number;
} {
  if (!settings.closeStoreDuringPrayer) {
    return { isClosed: false };
  }

  const times = calculateVillagePrayerTimes(new Date(), settings);
  if (!times.currentPrayer || times.currentPrayer.name === 'sunrise') {
    return { isClosed: false };
  }

  const nowMs = Date.now();
  const prayerMs = times.currentPrayer.time.getTime();
  const durationMs = (settings.prayerBreakDurationMinutes || 30) * 60 * 1000;
  const elapsed = nowMs - prayerMs;

  if (elapsed >= 0 && elapsed <= durationMs) {
    const remainingMs = durationMs - elapsed;
    const minutesRemaining = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
    return {
      isClosed: true,
      prayerName: times.currentPrayer.arabicName,
      minutesRemaining,
    };
  }

  return { isClosed: false };
}
