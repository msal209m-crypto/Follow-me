import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdRecord, AdPackage, AdThemeType } from '../types';
import {
  syncSaveAd,
  syncDeleteAd,
  syncClearAllAds,
  syncUpdateAllAdsStatus
} from './crossDeviceSyncService';

const ADS_STORAGE_KEY = 'qaryati_ads_directory';

export const DEFAULT_AD_PACKAGES: AdPackage[] = [
  {
    id: 'pack_week',
    name: 'الباقة الأسبوعية البرونزية 🥉',
    price: 49,
    durationDays: 7,
    description: 'عرض إعلانك الترويجي في أعلى الشاشات للعملاء والمناديب لمدة أسبوع كامل لتنشيط مبيعاتك.'
  },
  {
    id: 'pack_month_silver',
    name: 'الباقة الشهرية الفضية 🥈',
    price: 149,
    durationDays: 30,
    description: 'أفضل قيمة! ترويج متواصل لمتجرك وموقعك في ترويسة التطبيق لمدة شهر لترسيخ اسمك التجاري.'
  },
  {
    id: 'pack_vip_gold',
    name: 'الباقة الذهبية الممتازة VIP 👑',
    price: 299,
    durationDays: 90,
    description: 'ترويج حصري وممتاز لمدة 3 أشهر مع إحصائيات ظهور متقدمة ودعم فني خاص لرفع المبيعات مع مؤثرات احتفالية متحركة.'
  }
];

const INITIAL_FESTIVE_ADS: AdRecord[] = [];

const DELETED_ADS_STORAGE_KEY = 'qaryati_deleted_ad_ids';

export function getDeletedAdIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ADS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      // Ensure the two annoying legacy demo ads are always marked permanently deleted
      return new Set([...arr, 'ad_festive_opening_1', 'ad_festive_opening_2', 'default-ad-1', 'default-ad-2']);
    }
  } catch {}
  return new Set(['ad_festive_opening_1', 'ad_festive_opening_2', 'default-ad-1', 'default-ad-2']);
}

export function markAdAsDeleted(id: string): void {
  try {
    const set = getDeletedAdIds();
    set.add(id);
    localStorage.setItem(DELETED_ADS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getAds(): AdRecord[] {
  const deletedIds = getDeletedAdIds();
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a) => a && a.id && !deletedIds.has(a.id));
      }
    }
  } catch (e) {
    console.warn('Error reading ads from storage:', e);
  }
  return [];
}

export function saveAdRecord(ad: AdRecord) {
  try {
    const current = getAds().filter((a) => a.id !== ad.id);
    const updated = [ad, ...current];
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem('qaryati_platform_ads_v1', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: updated }));
  } catch {}
  syncSaveAd(ad).catch((e) => console.warn('syncSaveAd failed:', e));
}

export function updateAdRecord(ad: AdRecord) {
  saveAdRecord(ad);
}

export function deleteAdRecord(id: string) {
  markAdAsDeleted(id);
  syncDeleteAd(id).catch((e) => console.warn('syncDeleteAd failed:', e));
}

export function toggleAdActiveStatus(id: string): AdRecord | null {
  const ads = getAds();
  const ad = ads.find((a) => a.id === id);
  if (ad) {
    const newStatus: AdRecord['status'] = ad.status === 'APPROVED' ? 'REJECTED' : 'APPROVED';
    const updated: AdRecord = {
      ...ad,
      status: newStatus,
      approvedBy: newStatus === 'APPROVED' ? 'المطور المعتمد' : ad.approvedBy,
      startDate: newStatus === 'APPROVED' ? (ad.startDate || new Date().toISOString().split('T')[0]) : ad.startDate,
      endDate: newStatus === 'APPROVED' ? (ad.endDate || '2035-12-31') : ad.endDate
    };
    saveAdRecord(updated);
    return updated;
  }
  return null;
}

export function pauseAllAds(): void {
  syncUpdateAllAdsStatus('REJECTED').catch((e) => console.warn('pauseAllAds failed:', e));
}

export function resumeAllAds(): void {
  syncUpdateAllAdsStatus('APPROVED').catch((e) => console.warn('resumeAllAds failed:', e));
}

export function clearAllAds(): void {
  const current = getAds();
  current.forEach((a) => markAdAsDeleted(a.id));
  INITIAL_FESTIVE_ADS.forEach((a) => markAdAsDeleted(a.id));
  syncClearAllAds().catch((e) => console.warn('clearAllAds failed:', e));
}

export function submitAdRequest(params: {
  merchantId?: string;
  storeId?: string;
  storeName: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  packageName: string;
  village: string;
  status?: AdRecord['status'];
  theme?: AdThemeType;
  badgeText?: string;
  isConfettiEnabled?: boolean;
  actionText?: string;
  actionUrl?: string;
  startDate?: string;
  endDate?: string;
}): AdRecord {
  const adId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newAd: AdRecord = {
    id: adId,
    merchantId: params.merchantId,
    storeId: params.storeId,
    storeName: params.storeName,
    title: params.title.trim(),
    description: params.description.trim(),
    imageUrl: params.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    linkUrl: params.linkUrl || '',
    packageName: params.packageName,
    status: params.status || 'PENDING',
    village: params.village,
    theme: params.theme || 'CELEBRATION',
    badgeText: params.badgeText || 'إعلان ترويجي 📢',
    isConfettiEnabled: params.isConfettiEnabled !== false,
    actionText: params.actionText || 'تسوق الآن 🛒',
    actionUrl: params.actionUrl || '',
    startDate: params.startDate || (params.status === 'APPROVED' ? new Date().toISOString().split('T')[0] : undefined),
    endDate: params.endDate || (params.status === 'APPROVED' ? '2035-12-31' : undefined),
    createdAt: new Date().toISOString(),
    approvedBy: params.status === 'APPROVED' ? 'المطور المعتمد' : undefined
  };

  saveAdRecord(newAd);
  return newAd;
}

export function updateAdStatus(id: string, status: AdRecord['status'], approvedBy?: string) {
  const ads = getAds();
  const ad = ads.find((a) => a.id === id);
  if (ad) {
    const updatedAd: AdRecord = {
      ...ad,
      status,
      approvedBy,
      startDate: status === 'APPROVED' ? new Date().toISOString().split('T')[0] : ad.startDate,
      endDate: status === 'APPROVED' ? calculateEndDate(ad.packageName) : ad.endDate
    };
    saveAdRecord(updatedAd);
  }
}

function calculateEndDate(packageName: string): string {
  const pack = DEFAULT_AD_PACKAGES.find((p) => p.name === packageName || p.id === packageName);
  const days = pack ? pack.durationDays : 365;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
