import { isStoreClosedForPrayer, getAdhanSettings } from '../services/adhanService';
import { StoreDirectoryRecord, StoreSettings } from '../types';

export interface WorkingHoursConfig {
  isOpen24Hours?: boolean;
  openTime?: string; // e.g. "06:00"
  closeTime?: string; // e.g. "23:30"
  isSplitShift?: boolean; // Has evening / second shift
  secondOpenTime?: string; // e.g. "16:00"
  secondCloseTime?: string; // e.g. "01:00"
  workingDays?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday, 5 = Friday, 6 = Saturday)
  autoCloseForPrayer?: boolean; // Automatically pause during village prayer times
}

export interface StoreLiveStatus {
  isOpen: boolean;
  statusType: 'OPEN' | 'CLOSED' | 'PRAYER_PAUSE';
  badgeText: string;
  detailText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextClass: string;
  dotColor: string;
}

export const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  isOpen24Hours: false,
  openTime: '06:30',
  closeTime: '23:30',
  isSplitShift: false,
  secondOpenTime: '16:00',
  secondCloseTime: '00:00',
  workingDays: [0, 1, 2, 3, 4, 5, 6], // All week
  autoCloseForPrayer: true,
};

export const WEEK_DAYS_AR = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الاثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' },
];

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const period = h >= 12 ? 'م' : 'ص';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function isTimeInWindow(currentMin: number, startMin: number, endMin: number): boolean {
  if (startMin <= endMin) {
    // Standard daytime window, e.g. 07:00 (420) to 23:00 (1380)
    return currentMin >= startMin && currentMin < endMin;
  }
  // Overnight window, e.g. 18:00 (1080) to 02:00 (120)
  return currentMin >= startMin || currentMin < endMin;
}

/**
 * Calculates the live working status of a store in real-time
 */
export function getStoreLiveStatus(
  store?: Partial<StoreDirectoryRecord> | null,
  fallbackSettings?: StoreSettings | null
): StoreLiveStatus {
  // 1. Check if store is suspended or pending
  if (store?.status === 'SUSPENDED') {
    return {
      isOpen: false,
      statusType: 'CLOSED',
      badgeText: 'مغلق (محظور)',
      detailText: 'المتجر متوقف مؤقتاً',
      badgeBg: 'bg-rose-950/60',
      badgeBorder: 'border-rose-500/50',
      badgeTextClass: 'text-rose-300',
      dotColor: 'bg-rose-500',
    };
  }

  // 2. Resolve working hours config
  const config: WorkingHoursConfig =
    (store as any)?.workingHours ||
    fallbackSettings?.workingHours ||
    DEFAULT_WORKING_HOURS;

  // 3. Prayer time check
  if (config.autoCloseForPrayer !== false) {
    try {
      const prayerClosed = isStoreClosedForPrayer(getAdhanSettings());
      if (prayerClosed.isClosed) {
        return {
          isOpen: false,
          statusType: 'PRAYER_PAUSE',
          badgeText: 'استراحة صلاة 🕌',
          detailText: `لأداء ${prayerClosed.prayerName || 'الصلاة'} (~${prayerClosed.minutesRemaining || 10} د)`,
          badgeBg: 'bg-amber-950/70',
          badgeBorder: 'border-amber-500/60',
          badgeTextClass: 'text-amber-300',
          dotColor: 'bg-amber-400 animate-pulse',
        };
      }
    } catch {
      // ignore
    }
  }

  // 4. 24/7 Always Open
  if (config.isOpen24Hours) {
    return {
      isOpen: true,
      statusType: 'OPEN',
      badgeText: 'مفتوح 24/7',
      detailText: 'متاح على مدار الساعة',
      badgeBg: 'bg-emerald-950/70',
      badgeBorder: 'border-emerald-500/50',
      badgeTextClass: 'text-emerald-300',
      dotColor: 'bg-emerald-400 animate-ping',
    };
  }

  // 5. Weekly Working Days Check
  const now = new Date();
  const currentDay = now.getDay();
  const allowedDays = config.workingDays && config.workingDays.length > 0
    ? config.workingDays
    : [0, 1, 2, 3, 4, 5, 6];

  if (!allowedDays.includes(currentDay)) {
    return {
      isOpen: false,
      statusType: 'CLOSED',
      badgeText: 'مغلق اليوم',
      detailText: 'عطلة المتجر الأسبوعية',
      badgeBg: 'bg-slate-900',
      badgeBorder: 'border-slate-700',
      badgeTextClass: 'text-slate-400',
      dotColor: 'bg-slate-500',
    };
  }

  // 6. Time Window Check
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const open1 = parseTimeToMinutes(config.openTime || '06:30');
  const close1 = parseTimeToMinutes(config.closeTime || '23:30');

  const inFirstShift = isTimeInWindow(currentMin, open1, close1);

  let inSecondShift = false;
  if (config.isSplitShift && config.secondOpenTime && config.secondCloseTime) {
    const open2 = parseTimeToMinutes(config.secondOpenTime);
    const close2 = parseTimeToMinutes(config.secondCloseTime);
    inSecondShift = isTimeInWindow(currentMin, open2, close2);
  }

  if (inFirstShift || inSecondShift) {
    const closingTimeFormatted = inFirstShift
      ? formatTime12h(config.closeTime || '23:30')
      : formatTime12h(config.secondCloseTime || '00:00');

    return {
      isOpen: true,
      statusType: 'OPEN',
      badgeText: 'مفتوح الآن',
      detailText: `يغلق ${closingTimeFormatted}`,
      badgeBg: 'bg-emerald-950/80',
      badgeBorder: 'border-emerald-500/60',
      badgeTextClass: 'text-emerald-300',
      dotColor: 'bg-emerald-400 animate-pulse',
    };
  }

  // Store is Closed - Compute next opening time
  const openingTimeFormatted = formatTime12h(config.openTime || '06:30');
  return {
    isOpen: false,
    statusType: 'CLOSED',
    badgeText: 'مغلق حالياً',
    detailText: `يفتح ${openingTimeFormatted}`,
    badgeBg: 'bg-slate-950/90',
    badgeBorder: 'border-slate-800',
    badgeTextClass: 'text-slate-400',
    dotColor: 'bg-rose-500',
  };
}
