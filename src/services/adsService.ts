import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdRecord, AdPackage } from '../types';

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
    description: 'ترويج حصري وممتاز لمدة 3 أشهر مع إحصائيات ظهور متقدمة ودعم فني خاص لرفع المبيعات.'
  }
];

export function getAds(): AdRecord[] {
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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

export function submitAdRequest(params: {
  merchantId: string;
  storeId: string;
  storeName: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl?: string;
  packageName: string;
  village: string;
}): AdRecord {
  const adId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newAd: AdRecord = {
    id: adId,
    merchantId: params.merchantId,
    storeId: params.storeId,
    storeName: params.storeName,
    title: params.title.trim(),
    description: params.description.trim(),
    imageUrl: params.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
    linkUrl: params.linkUrl || '',
    packageName: params.packageName,
    status: 'PENDING',
    village: params.village,
    createdAt: new Date().toISOString()
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
  const days = pack ? pack.durationDays : 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
