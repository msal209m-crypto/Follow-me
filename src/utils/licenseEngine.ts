/**
 * Offline & Online Cryptographic License Key Engine for FlowApp
 * Formats: FLOW-PRO-{PLAN}-{PAYLOAD}-{CHECKSUM}
 * Examples:
 *   FLOW-PRO-1M-K9X2B7Q4-E5A8
 *   FLOW-PRO-1Y-M7P3W8R2-F1C9
 *   FLOW-PRO-LIFE-X9Z8Y7W6-B4D2
 */

export type LicensePlanCode = '1M' | '3M' | '6M' | '1Y' | 'LIFE';

export interface LicensePlanMeta {
  code: LicensePlanCode;
  nameAr: string;
  nameEn: string;
  durationDays: number;
  priceSAR: number;
  popular?: boolean;
}

export const LICENSE_PLANS: LicensePlanMeta[] = [
  {
    code: '1M',
    nameAr: 'اشتراك شهري (30 يوم)',
    nameEn: 'Monthly Plan (30 Days)',
    durationDays: 30,
    priceSAR: 49,
  },
  {
    code: '3M',
    nameAr: 'اشتراك ربع سنوي (3 أشهر)',
    nameEn: 'Quarterly Plan (90 Days)',
    durationDays: 90,
    priceSAR: 129,
  },
  {
    code: '6M',
    nameAr: 'اشتراك نصف سنوي (6 أشهر)',
    nameEn: 'Half-Year Plan (180 Days)',
    durationDays: 180,
    priceSAR: 229,
  },
  {
    code: '1Y',
    nameAr: 'اشتراك سنوي (سنة كاملة)',
    nameEn: 'Annual Plan (365 Days)',
    durationDays: 365,
    priceSAR: 399,
    popular: true,
  },
  {
    code: 'LIFE',
    nameAr: 'رخصة دائمة (مدى الحياة)',
    nameEn: 'Lifetime License',
    durationDays: 36500, // 100 years
    priceSAR: 890,
  },
];

const SECRET_SALT = 'FLOWAPP_OFFLINE_LICENSE_SALT_2026_REMOTE_AREAS';

// Fast deterministic hashing function
function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase();
  return hex.padStart(6, 'X').slice(-4);
}

// Generate a random payload string
function generateRandomPayload(length: number = 8): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No confusing 0/O, 1/I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a cryptographically verified license key (For Admin / Vendor)
 */
export function generateLicenseKey(plan: LicensePlanCode, customPayload?: string): string {
  const payload = (customPayload || generateRandomPayload(8)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const dataToHash = `FLOW-PRO-${plan}-${payload}-${SECRET_SALT}`;
  const checksum = hashString(dataToHash);
  return `FLOW-PRO-${plan}-${payload}-${checksum}`;
}

export interface LicenseValidationResult {
  valid: boolean;
  plan?: LicensePlanCode;
  planMeta?: LicensePlanMeta;
  durationDays?: number;
  cleanKey?: string;
  errorAr?: string;
  errorEn?: string;
}

/**
 * Validates any entered license key (100% Offline with zero internet required)
 */
export function verifyLicenseKey(inputKey: string): LicenseValidationResult {
  if (!inputKey || typeof inputKey !== 'string') {
    return { valid: false, errorAr: 'يرجى إدخال كود الترخيص', errorEn: 'Please enter a license key' };
  }

  const clean = inputKey.trim().toUpperCase().replace(/\s+/g, '');
  const parts = clean.split('-');

  // Format must be FLOW-PRO-{PLAN}-{PAYLOAD}-{CHECKSUM}
  if (parts.length !== 5 || parts[0] !== 'FLOW' || parts[1] !== 'PRO') {
    return {
      valid: false,
      errorAr: 'صيغة كود التفعيل غير صحيحة. الصيغة الصحيحة: FLOW-PRO-XX-XXXX-XXXX',
      errorEn: 'Invalid license format. Expected: FLOW-PRO-XX-XXXX-XXXX',
    };
  }

  const planCode = parts[2] as LicensePlanCode;
  const payload = parts[3];
  const checksum = parts[4];

  const planMeta = LICENSE_PLANS.find((p) => p.code === planCode);
  if (!planMeta) {
    return {
      valid: false,
      errorAr: 'نوع الباقة في كود التفعيل غير معتمد',
      errorEn: 'Unrecognized plan code in license key',
    };
  }

  const expectedChecksum = hashString(`FLOW-PRO-${planCode}-${payload}-${SECRET_SALT}`);

  if (checksum !== expectedChecksum) {
    return {
      valid: false,
      errorAr: 'كود التفعيل غير صالح أو غير معتمد من إدارة النظام',
      errorEn: 'License key is invalid or corrupted',
    };
  }

  return {
    valid: true,
    plan: planCode,
    planMeta,
    durationDays: planMeta.durationDays,
    cleanKey: clean,
  };
}

/**
 * Calculates days remaining from an ISO date string
 */
export function calculateDaysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const expiryDate = new Date(expiresAt).getTime();
  const now = new Date().getTime();
  const diff = expiryDate - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
