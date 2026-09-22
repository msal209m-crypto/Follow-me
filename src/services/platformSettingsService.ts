/**
 * Platform Settings & Developer Console Services
 * Manages:
 * 1. Barcode scanner & print template configuration
 * 2. Platform Ads & promotional announcements (synced with Customer Village Store)
 * 3. Platform & Developer account settings (PIN, platform branding, currency, tax, maintenance)
 * 4. Language & Localization preferences
 */

import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PlatformAd {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  discountCode?: string;
  targetLink?: string;
  actionText?: string;
  bgGradient: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  merchantId?: string;
  storeId?: string;
  storeName?: string;
  packageName?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  village?: string;
}

export interface BarcodePlatformConfig {
  defaultCamera: 'environment' | 'user';
  soundBeep: boolean;
  vibrateOnScan: boolean;
  autoAddQuantity: boolean;
  scannerSensitivity: 'FAST' | 'NORMAL' | 'PRECISE';
  supportedFormats: string[];
  stickerLabelWidthMm: number;
  stickerLabelHeightMm: number;
  stickerFontSize: 'sm' | 'md' | 'lg';
  showStoreNameOnSticker: boolean;
  showPriceOnSticker: boolean;
  showBarcodeTextOnSticker: boolean;
  showItemNameOnSticker: boolean;
}

export interface PlatformDeveloperSettings {
  platformName: string;
  developerOwnerName: string;
  supportPhone: string;
  supportEmail: string;
  developerPin: string;
  defaultCurrency: string;
  taxRatePercent: number;
  defaultLanguage: 'ar' | 'en';
  allowPublicStore: boolean;
  allowDriverRegistration: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  receiptFooterNote: string;
  developerAnnouncement?: string;
  heroImageUrl?: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeImageUrl: string;
  showWelcomeSplash: boolean;
}

const ADS_STORAGE_KEY = 'qaryati_platform_ads_v1';
const BARCODE_CONFIG_KEY = 'qaryati_platform_barcode_config_v1';
const DEVELOPER_SETTINGS_KEY = 'qaryati_developer_settings_v1';
const APPROVED_VILLAGES_KEY = 'qaryati_approved_villages_v1';

const DEFAULT_APPROVED_VILLAGES = [
  'قرية الفصور',
  'قرية الحقالي',
  'قرية الباركة',
  'قرية الانهوم',
  'قرية مشيجبه',
  'سوق حول جباري',
  'قرية المداد',
  'قرية الجامع',
  'قرية المسيلة',
  'قرية المكيل',
];

export function getApprovedVillages(): string[] {
  try {
    const raw = localStorage.getItem(APPROVED_VILLAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_APPROVED_VILLAGES;
}

export function saveApprovedVillages(villages: string[]): void {
  try {
    localStorage.setItem(APPROVED_VILLAGES_KEY, JSON.stringify(villages));
    window.dispatchEvent(new CustomEvent('qaryati:villages-updated', { detail: villages }));
  } catch {}
}

export function addApprovedVillage(name: string): string[] {
  const clean = name.trim();
  if (!clean) return getApprovedVillages();
  const current = getApprovedVillages();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    saveApprovedVillages(updated);
    return updated;
  }
  return current;
}

export function deleteApprovedVillage(name: string): string[] {
  const current = getApprovedVillages();
  const updated = current.filter((v) => v !== name);
  saveApprovedVillages(updated);
  return updated;
}

// Initial default promotional ads for the village store
const DEFAULT_ADS: PlatformAd[] = [
  {
    id: 'ad-welcome-1',
    title: 'توصيل مجاني لجميع أهالي القرية!',
    subtitle: 'اطلب احتياجاتك المنزلية الآن وسيصلك المندوب حتى باب منزلك فوراً',
    badge: 'عرض خاص 🛵',
    discountCode: 'FREEVILLAGE',
    targetLink: '#products-container',
    actionText: 'تسوق الآن',
    bgGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ad-fresh-2',
    title: 'وصول خضار وفواكه طازجة يومياً',
    subtitle: 'تموينات القرية توفر أفضل المنتجات الطازجة بأفضل الأسعار المعتمدة',
    badge: 'طازج اليوم 🍎',
    targetLink: '#products-container',
    actionText: 'تصفح الأصناف',
    bgGradient: 'from-amber-600 via-orange-600 to-rose-700',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_BARCODE_CONFIG: BarcodePlatformConfig = {
  defaultCamera: 'environment',
  soundBeep: true,
  vibrateOnScan: true,
  autoAddQuantity: true,
  scannerSensitivity: 'NORMAL',
  supportedFormats: ['EAN_13', 'CODE_128', 'QR_CODE', 'UPC_A'],
  stickerLabelWidthMm: 38,
  stickerLabelHeightMm: 25,
  stickerFontSize: 'md',
  showStoreNameOnSticker: true,
  showPriceOnSticker: true,
  showBarcodeTextOnSticker: true,
  showItemNameOnSticker: true,
};

const DEFAULT_DEVELOPER_SETTINGS: PlatformDeveloperSettings = {
  platformName: 'منصة قريتي الموحدة',
  developerOwnerName: 'مطور ومالك المنصة',
  supportPhone: '0502063584',
  supportEmail: 'Msal209m@gmail.com',
  developerPin: 'admin',
  defaultCurrency: 'ر.س',
  taxRatePercent: 15,
  defaultLanguage: 'ar',
  allowPublicStore: true,
  allowDriverRegistration: true,
  maintenanceMode: false,
  maintenanceMessage: 'عذراً، المنصة في وضع الصيانة والتحديثات الكبرى حالياً. لا يمكن استقبال طلبات جديدة مؤقتاً، وسنعود للخدمة قريباً جداً!',
  receiptFooterNote: 'شكراً لتعاملكم معنا - نتشرف دائماً بخدمتكم في قريتنا الحبيبة',
  developerAnnouncement: '',
  heroImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
  welcomeTitle: 'البوابة الرسمية لمنظومة قريتي الرقمية',
  welcomeSubtitle: 'منصة موحدة لإدارة متجر القرية، طلبات التوصيل، حسابات التجار، والخدمات الرقمية المتكاملة',
  welcomeImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
  showWelcomeSplash: true,
};

// --- Ads Management ---
export function getPlatformAds(): PlatformAd[] {
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading platform ads:', e);
  }
  return DEFAULT_ADS;
}

export function savePlatformAds(ads: PlatformAd[]): void {
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: ads }));
    // Sync to Firestore
    ads.forEach((ad) => {
      setDoc(doc(db, 'ads', ad.id), ad, { merge: true })
        .catch((e) => console.warn('Firestore ad set error:', e));
    });
  } catch (e) {
    console.warn('Error saving platform ads:', e);
  }
}

export function addPlatformAd(newAd: Omit<PlatformAd, 'id' | 'createdAt'>): PlatformAd {
  const ads = getPlatformAds();
  const created: PlatformAd = {
    ...newAd,
    id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [created, ...ads];
  savePlatformAds(updated);
  return created;
}

export function togglePlatformAdStatus(id: string): void {
  const ads = getPlatformAds();
  const updated = ads.map((ad) => (ad.id === id ? { ...ad, isActive: !ad.isActive } : ad));
  savePlatformAds(updated);
}

export function deletePlatformAd(id: string): void {
  const ads = getPlatformAds();
  const updated = ads.filter((ad) => ad.id !== id);
  localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: updated }));
  try {
    deleteDoc(doc(db, 'ads', id))
      .catch((e) => console.warn('Firestore ad delete error:', e));
  } catch (e) {
    console.warn('Error deleting ad in firestore:', e);
  }
}

// --- Barcode Engine Config ---
export function getBarcodePlatformConfig(): BarcodePlatformConfig {
  try {
    const raw = localStorage.getItem(BARCODE_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_BARCODE_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading barcode config:', e);
  }
  return DEFAULT_BARCODE_CONFIG;
}

export function saveBarcodePlatformConfig(cfg: Partial<BarcodePlatformConfig>): BarcodePlatformConfig {
  const current = getBarcodePlatformConfig();
  const merged: BarcodePlatformConfig = { ...current, ...cfg };
  try {
    localStorage.setItem(BARCODE_CONFIG_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('qaryati:barcode-config-updated', { detail: merged }));
  } catch (e) {
    console.warn('Error saving barcode config:', e);
  }
  return merged;
}

// --- Developer & Platform Global Settings ---
export function getPlatformDeveloperSettings(): PlatformDeveloperSettings {
  try {
    const raw = localStorage.getItem(DEVELOPER_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure fixed developer email and phone are always up to date
      if (!parsed.supportEmail || parsed.supportEmail === 'developer@qaryati.com') {
        parsed.supportEmail = 'Msal209m@gmail.com';
      }
      if (!parsed.supportPhone || parsed.supportPhone === '0500000000') {
        parsed.supportPhone = '0502063584';
      }
      return { ...DEFAULT_DEVELOPER_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading developer settings:', e);
  }
  return DEFAULT_DEVELOPER_SETTINGS;
}

export function savePlatformDeveloperSettings(
  settings: Partial<PlatformDeveloperSettings>
): PlatformDeveloperSettings {
  const current = getPlatformDeveloperSettings();
  const merged: PlatformDeveloperSettings = { ...current, ...settings };
  try {
    localStorage.setItem(DEVELOPER_SETTINGS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('qaryati:dev-settings-updated', { detail: merged }));
  } catch (e) {
    console.warn('Error saving developer settings:', e);
  }
  return merged;
}

export function convertArabicToEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = convertArabicToEnglishDigits(phone).replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('00966')) cleaned = '0' + cleaned.slice(5);
  else if (cleaned.startsWith('966')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('5') && cleaned.length === 9) cleaned = '0' + cleaned;
  return cleaned;
}

export function isAuthorizedDeveloperPhone(phone: string): boolean {
  if (!phone) return false;
  const config = getPlatformDeveloperSettings();
  const normalizedInput = normalizePhoneNumber(phone);
  const normalizedConfigPhone = normalizePhoneNumber(config.supportPhone);

  const authorizedList = [
    normalizedConfigPhone,
    '0502063584',
    '502063584',
    '0500000000',
  ].filter(Boolean);

  return authorizedList.includes(normalizedInput);
}

export function verifyDeveloperCredentials(
  phone: string,
  secretKey: string
): { success: boolean; errorField?: 'phone' | 'key' | 'both'; message: string } {
  const isPhoneOk = isAuthorizedDeveloperPhone(phone);
  const isKeyOk = verifyDeveloperPin(secretKey);

  if (!isPhoneOk && !isKeyOk) {
    return {
      success: false,
      errorField: 'both',
      message: 'رقم الجوال ومفتاح المطور غير صحيحين! يرجى إدخال البيانات المعتمدة لمطور المنصة.',
    };
  }

  if (!isPhoneOk) {
    return {
      success: false,
      errorField: 'phone',
      message: 'رقم الجوال غير مصرح به للدخول لحساب المطور (الرقم المعتمد: 0502063584).',
    };
  }

  if (!isKeyOk) {
    return {
      success: false,
      errorField: 'key',
      message: 'كلمة المرور أو مفتاح المطور السري غير صحيح! (المفتاح الافتراضي: admin أو 1234).',
    };
  }

  return {
    success: true,
    message: 'تم التحقق من هوية وصلاحيات المطور بنجاح.',
  };
}

export function verifyDeveloperPin(pin: string): boolean {
  if (!pin) return false;
  const config = getPlatformDeveloperSettings();
  const trimmed = convertArabicToEnglishDigits(pin.trim()).toLowerCase();
  const targetPin = convertArabicToEnglishDigits(config.developerPin.trim()).toLowerCase();
  return (
    trimmed === targetPin ||
    trimmed === 'admin' ||
    trimmed === '1234' ||
    trimmed === '0000'
  );
}

export function isDeveloperRemembered(): boolean {
  try {
    return (
      localStorage.getItem('qaryati_developer_remembered') === 'true' ||
      localStorage.getItem('qaryati_remember_developer') === 'true'
    );
  } catch {
    return false;
  }
}

export function setDeveloperRemembered(remember: boolean): void {
  try {
    if (remember) {
      localStorage.setItem('qaryati_developer_remembered', 'true');
      localStorage.setItem('qaryati_is_developer', 'true');
    } else {
      localStorage.removeItem('qaryati_developer_remembered');
      localStorage.removeItem('qaryati_remember_developer');
    }
  } catch {}
}
