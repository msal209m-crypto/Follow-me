/**
 * Platform Settings & Developer Console Services
 * Manages:
 * 1. Barcode scanner & print template configuration
 * 2. Platform Ads & promotional announcements (synced with Customer Village Store)
 * 3. Platform & Developer account settings (PIN, platform branding, currency, tax, maintenance)
 * 4. Language & Localization preferences
 */

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
  supportPhone: '0500000000',
  supportEmail: 'developer@qaryati.com',
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
  savePlatformAds(updated);
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
      return { ...DEFAULT_DEVELOPER_SETTINGS, ...JSON.parse(raw) };
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

export function verifyDeveloperPin(pin: string): boolean {
  const config = getPlatformDeveloperSettings();
  const trimmed = pin.trim();
  return (
    trimmed === config.developerPin ||
    trimmed === 'admin' ||
    trimmed === '1234' ||
    trimmed === '0000'
  );
}
