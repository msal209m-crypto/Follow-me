import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdRecord, AdPackage, AdThemeType } from '../types';

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

const INITIAL_FESTIVE_ADS: AdRecord[] = [
  {
    id: 'ad_festive_opening_1',
    storeName: 'بقالة البركة المركزية',
    title: '🎉 تم بحمد الله وتوفيقه افتتاح بقالة البركة المركزية في قرية بني عيسى!',
    description: 'يسرنا استقبالكم بأحدث المنتجات الطازجة والمواد الغذائية مع خصومات وهدايا كبرى بمناسبة الافتتاح المبارك وتوصيل فوري لجميع المنازل 🚚✨',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    packageName: 'الباقة الذهبية الممتازة VIP 👑',
    status: 'APPROVED',
    village: 'بني عيسى',
    theme: 'CELEBRATION',
    badgeText: 'افتتاح رسمي مبارك 🎉',
    isConfettiEnabled: true,
    actionText: 'تسوق من بقالة البركة الآن 🛒',
    actionUrl: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2035-12-31',
    createdAt: new Date().toISOString(),
    approvedBy: 'المطور المعتمد'
  },
  {
    id: 'ad_festive_opening_2',
    storeName: 'مخبز وأفران القرية الحديثة',
    title: '🔥 عروض نارية بمناسبة تدشين الفرع الجديد في قرية الجعدة!',
    description: 'خصم خاص 20% على كافة المخبوزات والحلويات والمعجنات الطازجة لأهالي قريتنا الكرام مع التوصيل السريع للمنازل 🥐🍰',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
    packageName: 'الباقة الشهرية الفضية 🥈',
    status: 'APPROVED',
    village: 'الجعدة',
    theme: 'HOT_DEAL',
    badgeText: 'عروض الافتتاح الكبرى 🔥',
    isConfettiEnabled: true,
    actionText: 'اطلب من المخبز فوراً 🥖',
    actionUrl: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2035-12-31',
    createdAt: new Date().toISOString(),
    approvedBy: 'المطور المعتمد'
  }
];

export function getAds(): AdRecord[] {
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(INITIAL_FESTIVE_ADS));
      return INITIAL_FESTIVE_ADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdRecord(ad: AdRecord) {
  try {
    const ads = getAds();
    const idx = ads.findIndex((item) => item.id === ad.id);
    if (idx >= 0) {
      ads[idx] = ad;
    } else {
      ads.unshift(ad);
    }
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: ads }));

    // Sync to Firestore
    setDoc(doc(db, 'ads', ad.id), ad, { merge: true })
      .catch((e) => console.warn('Firestore ads sync error:', e));
  } catch (e) {
    console.warn('Failed to save ad locally:', e);
  }
}

export function deleteAdRecord(id: string) {
  try {
    const ads = getAds();
    const filtered = ads.filter((item) => item.id !== id);
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: filtered }));

    // Delete from Firestore
    deleteDoc(doc(db, 'ads', id))
      .catch((e) => console.warn('Firestore ads delete error:', e));
  } catch (e) {
    console.warn('Failed to delete ad locally:', e);
  }
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
  try {
    const ads = getAds();
    const updated = ads.map((ad) => ({
      ...ad,
      status: 'REJECTED' as const
    }));
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: updated }));
  } catch (e) {
    console.warn('Failed to pause all ads:', e);
  }
}

export function resumeAllAds(): void {
  try {
    const ads = getAds();
    const updated = ads.map((ad) => ({
      ...ad,
      status: 'APPROVED' as const,
      approvedBy: 'المطور المعتمد'
    }));
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: updated }));
  } catch (e) {
    console.warn('Failed to resume all ads:', e);
  }
}

export function clearAllAds(): void {
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: [] }));
  } catch (e) {
    console.warn('Failed to clear all ads:', e);
  }
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
