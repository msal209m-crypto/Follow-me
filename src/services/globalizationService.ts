import { POPULAR_CURRENCIES, CurrencyOption } from '../data/currencies';

export interface CountryPaymentGateway {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  type: 'WALLETS' | 'CARDS' | 'BANK_APP' | 'CASH';
  badgeAr?: string;
  badgeEn?: string;
  instructionsAr?: string;
}

export interface CountryLocalService {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string;
  descriptionAr: string;
  descriptionEn: string;
}

export interface CountryInfo {
  code: string; // ISO 2-letter, e.g. "SA", "AE", "EG", "US"
  nameAr: string;
  nameEn: string;
  flag: string;
  phoneCode: string; // e.g. "+966"
  defaultCurrency: string; // e.g. "SAR"
  defaultLanguage: 'ar' | 'en' | 'fr' | 'ur' | 'tr';
  defaultCalculationMethod: string;
  paymentGateways?: CountryPaymentGateway[];
  localServices?: CountryLocalService[];
  regions: {
    id: string;
    nameAr: string;
    nameEn: string;
    lat: number;
    lng: number;
    villages?: string[];
  }[];
}

export const SUPPORTED_COUNTRIES: CountryInfo[] = [
  {
    code: 'SA',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    flag: '🇸🇦',
    phoneCode: '+966',
    defaultCurrency: 'SAR',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'UmmAlQura',
    regions: [
      { id: 'faifa', nameAr: 'قرى جبال فيفاء (جازان)', nameEn: 'Faifa Mountains', lat: 17.257, lng: 43.125, villages: ['قرية آل ظلمة', 'قرية بقعة', 'قرية النفيعة', 'قرية الكرس'] },
      { id: 'makkah', nameAr: 'مكة المكرمة والحرم', nameEn: 'Makkah Al-Mukarramah', lat: 21.389, lng: 39.857 },
      { id: 'madinah', nameAr: 'المدينة المنورة والحرم', nameEn: 'Madinah Al-Munawwarah', lat: 24.524, lng: 39.569 },
      { id: 'riyadh', nameAr: 'منطقة الرياض والدرعية', nameEn: 'Riyadh & Diriyah', lat: 24.713, lng: 46.675 },
      { id: 'jeddah', nameAr: 'جدة والمنطقة الغربية', nameEn: 'Jeddah', lat: 21.543, lng: 39.172 },
      { id: 'asir', nameAr: 'عسير وأبها والقرى الجبلية', nameEn: 'Asir & Abha', lat: 18.216, lng: 42.505 },
      { id: 'baha', nameAr: 'الباحة وقرى غامد وزهران', nameEn: 'Al-Baha Villages', lat: 20.012, lng: 41.467 },
      { id: 'jizan', nameAr: 'جازان والفرسان والسهول', nameEn: 'Jazan Region', lat: 16.889, lng: 42.551 },
      { id: 'eastern', nameAr: 'المنطقة الشرقية والأحساء', nameEn: 'Eastern Province', lat: 26.420, lng: 50.088 },
      { id: 'qassim', nameAr: 'القصيم وبريدة وعنيزة', nameEn: 'Al-Qassim', lat: 26.326, lng: 43.975 },
      { id: 'tabuk', nameAr: 'تبوك والقرى الشمالية', nameEn: 'Tabuk Region', lat: 28.383, lng: 36.566 },
      { id: 'hail', nameAr: 'حائل وقرى جبال أجا وسلمى', nameEn: 'Hail Region', lat: 27.521, lng: 41.696 },
      { id: 'najran', nameAr: 'نجران ووادي نجران', nameEn: 'Najran', lat: 17.492, lng: 44.127 },
      { id: 'jouf', nameAr: 'الجوف ودومة الجندل', nameEn: 'Al-Jouf', lat: 29.953, lng: 40.197 },
      { id: 'northern', nameAr: 'الحدود الشمالية وعرعر', nameEn: 'Northern Borders', lat: 30.975, lng: 41.038 }
    ],
  },
  {
    code: 'AE',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    flag: '🇦🇪',
    phoneCode: '+971',
    defaultCurrency: 'AED',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'Dubai',
    regions: [
      { id: 'ae_dxb', nameAr: 'دبي وحتا', nameEn: 'Dubai & Hatta', lat: 25.2048, lng: 55.2708 },
      { id: 'ae_auh', nameAr: 'أبوظبي والعين', nameEn: 'Abu Dhabi & Al Ain', lat: 24.4539, lng: 54.3773 },
      { id: 'ae_shj', nameAr: 'الشارقة والذيد وخورفكان', nameEn: 'Sharjah & Khorfakkan', lat: 25.3463, lng: 55.4209 },
      { id: 'ae_rak', nameAr: 'رأس الخيمة والقرى الجبلية', nameEn: 'Ras Al Khaimah', lat: 25.7895, lng: 55.9432 },
      { id: 'ae_fuj', nameAr: 'الفجيرة ودبا', nameEn: 'Fujairah', lat: 25.1288, lng: 56.3265 }
    ],
  },
  {
    code: 'QA',
    nameAr: 'دولة قطر',
    nameEn: 'Qatar',
    flag: '🇶🇦',
    phoneCode: '+974',
    defaultCurrency: 'QAR',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'Qatar',
    regions: [
      { id: 'qa_doh', nameAr: 'الدوحة والوكرة', nameEn: 'Doha & Al Wakrah', lat: 25.2854, lng: 51.5310 },
      { id: 'qa_khor', nameAr: 'الخور والذخيرة والشمال', nameEn: 'Al Khor & North', lat: 25.6839, lng: 51.5058 }
    ],
  },
  {
    code: 'KW',
    nameAr: 'دولة الكويت',
    nameEn: 'Kuwait',
    flag: '🇰🇼',
    phoneCode: '+965',
    defaultCurrency: 'KWD',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'Kuwait',
    regions: [
      { id: 'kw_kwt', nameAr: 'مدينة الكويت والأحمدي', nameEn: 'Kuwait City & Ahmadi', lat: 29.3759, lng: 47.9774 },
      { id: 'kw_jah', nameAr: 'الجهراء والوفرة والعبدلي', nameEn: 'Jahra & Wafra', lat: 29.3375, lng: 47.6581 }
    ],
  },
  {
    code: 'BH',
    nameAr: 'مملكة البحرين',
    nameEn: 'Bahrain',
    flag: '🇧🇭',
    phoneCode: '+973',
    defaultCurrency: 'BHD',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'UmmAlQura',
    regions: [
      { id: 'bh_man', nameAr: 'المنامة والمحرق والقرى', nameEn: 'Manama & Muharraq', lat: 26.2285, lng: 50.5860 }
    ],
  },
  {
    code: 'OM',
    nameAr: 'سلطنة عمان',
    nameEn: 'Oman',
    flag: '🇴🇲',
    phoneCode: '+968',
    defaultCurrency: 'OMR',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'UmmAlQura',
    regions: [
      { id: 'om_mct', nameAr: 'مسقط وقرى الباطنة', nameEn: 'Muscat & Batinah', lat: 23.5859, lng: 58.4059 },
      { id: 'om_sll', nameAr: 'صلالة ومحافظة ظفار', nameEn: 'Salalah & Dhofar', lat: 17.0151, lng: 54.0924 },
      { id: 'om_nzw', nameAr: 'نزوى والجبل الأخضر', nameEn: 'Nizwa & Green Mountain', lat: 22.9333, lng: 57.5333 }
    ],
  },
  {
    code: 'YE',
    nameAr: 'الجمهورية اليمنية',
    nameEn: 'Yemen',
    flag: '🇾🇪',
    phoneCode: '+967',
    defaultCurrency: 'YER',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'UmmAlQura',
    regions: [
      { id: 'ye_san', nameAr: 'صنعاء وأمانة العاصمة والقرى', nameEn: 'Sanaa & Capital', lat: 15.3694, lng: 44.1910, villages: ['قرية بيت بوس', 'قرية دار الحجر', 'قرية وادي ظهر'] },
      { id: 'ye_adn', nameAr: 'عدن والساحل والخور', nameEn: 'Aden & Coast', lat: 12.7855, lng: 45.0187, villages: ['كريتر', 'المعلا', 'التواهي', 'الشيخ عثمان'] },
      { id: 'ye_taz', nameAr: 'تعز وجبل صبر والحجرية', nameEn: 'Taiz & Mount Sabir', lat: 13.5776, lng: 44.0205, villages: ['قرى جبل صبر', 'قرى الحجرية', 'التربة', 'المواسط'] },
      { id: 'ye_had', nameAr: 'حضرموت والمكلا ووادي حضرموت', nameEn: 'Hadhramaut & Mukalla', lat: 14.5425, lng: 49.1242, villages: ['سيئون', 'تريم الغناء', 'شبام العالية', 'الشحر'] },
      { id: 'ye_ibb', nameAr: 'إب واللواء الأخضر وقرى بعدان', nameEn: 'Ibb (Green Province)', lat: 13.9667, lng: 44.1667, villages: ['جبلة التاريخية', 'قرى بعدان', 'مشورة', 'السحول'] },
      { id: 'ye_hod', nameAr: 'الحديدة وقرى سهل تهامة', nameEn: 'Hodeidah & Tihamah', lat: 14.7978, lng: 42.9545, villages: ['زبيد التاريخية', 'بيت الفقيه', 'الدريهمي', 'باجل'] },
      { id: 'ye_saa', nameAr: 'صعدة وقرى جبال صعدة', nameEn: 'Saada & Mountains', lat: 16.9402, lng: 43.7639, villages: ['حيدان', 'سحار', 'الطلح', 'رازح'] },
      { id: 'ye_mar', nameAr: 'مأرب والجوف وسد مأرب', nameEn: 'Marib & Al-Jawf', lat: 15.4594, lng: 45.3253, villages: ['صرواح', 'الوادي', 'حريب'] },
      { id: 'ye_shb', nameAr: 'شبوة وأبين ولحج', nameEn: 'Shabwah, Abyan & Lahj', lat: 14.5367, lng: 46.8318, villages: ['عتق', 'زنجبار', 'جعار', 'الحوطة'] },
      { id: 'ye_mah', nameAr: 'المهرة وأرخبيل سقطرى 🏝️', nameEn: 'Al-Mahrah & Socotra', lat: 16.2084, lng: 52.1764, villages: ['الغيضة', 'حديبو', 'قلنسية'] }
    ],
  },
  {
    code: 'EG',
    nameAr: 'جمهورية مصر العربية',
    nameEn: 'Egypt',
    flag: '🇪🇬',
    phoneCode: '+20',
    defaultCurrency: 'EGP',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'Egyptian',
    regions: [
      { id: 'eg_cai', nameAr: 'القاهرة والجيزة', nameEn: 'Cairo & Giza', lat: 30.0444, lng: 31.2357 },
      { id: 'eg_alx', nameAr: 'الإسكندرية والساحل', nameEn: 'Alexandria', lat: 31.2001, lng: 29.9187 },
      { id: 'eg_delta', nameAr: 'قرى الدلتا والمنوفية والشرقية', nameEn: 'Delta Villages', lat: 30.5965, lng: 31.0004 },
      { id: 'eg_up', nameAr: 'صعيد مصر (الأقصر وأسوان وقنا)', nameEn: 'Upper Egypt', lat: 25.6872, lng: 32.6396 }
    ],
  },
  {
    code: 'JO',
    nameAr: 'المملكة الأردنية الهاشمية',
    nameEn: 'Jordan',
    flag: '🇯🇴',
    phoneCode: '+962',
    defaultCurrency: 'JOD',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'MuslimWorldLeague',
    regions: [
      { id: 'jo_amm', nameAr: 'عمان والزرقاء', nameEn: 'Amman & Zarqa', lat: 31.9454, lng: 35.9284 },
      { id: 'jo_irb', nameAr: 'إربد وقرى الشمال وعجلون', nameEn: 'Irbid & North Villages', lat: 32.5568, lng: 35.8469 },
      { id: 'jo_aqb', nameAr: 'العقبة والبتراء ووادي رم', nameEn: 'Aqaba & Petra', lat: 29.5321, lng: 35.0063 }
    ],
  },
  {
    code: 'MA',
    nameAr: 'المملكة المغربية',
    nameEn: 'Morocco',
    flag: '🇲🇦',
    phoneCode: '+212',
    defaultCurrency: 'MAD',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'MuslimWorldLeague',
    regions: [
      { id: 'ma_cas', nameAr: 'الدار البيضاء والرباط', nameEn: 'Casablanca & Rabat', lat: 33.5731, lng: -7.5898 },
      { id: 'ma_mrk', nameAr: 'مراكش وقرى جبال الأطلس', nameEn: 'Marrakech & Atlas Villages', lat: 31.6295, lng: -7.9811 },
      { id: 'ma_fes', nameAr: 'فاس ومكناس والريف', nameEn: 'Fes & Meknes', lat: 34.0181, lng: -5.0078 },
      { id: 'ma_tng', nameAr: 'طنجة وتطوان والشمال', nameEn: 'Tangier & Tetouan', lat: 35.7595, lng: -5.8340 }
    ],
  },
  {
    code: 'TR',
    nameAr: 'الجمهورية التركية',
    nameEn: 'Turkey',
    flag: '🇹🇷',
    phoneCode: '+90',
    defaultCurrency: 'TRY',
    defaultLanguage: 'tr',
    defaultCalculationMethod: 'Turkey',
    regions: [
      { id: 'tr_ist', nameAr: 'إسطنبول', nameEn: 'Istanbul', lat: 41.0082, lng: 28.9784 },
      { id: 'tr_ank', nameAr: 'أنقرة والوسط', nameEn: 'Ankara', lat: 39.9334, lng: 32.8597 },
      { id: 'tr_bur', nameAr: 'بورصة ويلوا والقرى', nameEn: 'Bursa & Villages', lat: 40.1885, lng: 29.0610 },
      { id: 'tr_tra', nameAr: 'طرابزون وقرى البحر الأسود', nameEn: 'Trabzon & Black Sea Villages', lat: 41.0027, lng: 39.7168 }
    ],
  },
  {
    code: 'GB',
    nameAr: 'المملكة المتحدة (بريطانيا)',
    nameEn: 'United Kingdom',
    flag: '🇬🇧',
    phoneCode: '+44',
    defaultCurrency: 'GBP',
    defaultLanguage: 'en',
    defaultCalculationMethod: 'MuslimWorldLeague',
    regions: [
      { id: 'gb_lon', nameAr: 'لندن وضواحيها', nameEn: 'London & Greater London', lat: 51.5074, lng: -0.1278 },
      { id: 'gb_bir', nameAr: 'برمنغهام والوسط', nameEn: 'Birmingham & Midlands', lat: 52.4862, lng: -1.8904 },
      { id: 'gb_man', nameAr: 'مانشستر والشمال', nameEn: 'Manchester & North', lat: 53.4808, lng: -2.2426 }
    ],
  },
  {
    code: 'US',
    nameAr: 'الولايات المتحدة الأمريكية',
    nameEn: 'United States',
    flag: '🇺🇸',
    phoneCode: '+1',
    defaultCurrency: 'USD',
    defaultLanguage: 'en',
    defaultCalculationMethod: 'NorthAmerica',
    regions: [
      { id: 'us_nyc', nameAr: 'نيويورك ونيوجيرسي', nameEn: 'New York & New Jersey', lat: 40.7128, lng: -74.0060 },
      { id: 'us_cal', nameAr: 'كاليفورنيا ولوس أنجلوس', nameEn: 'California & LA', lat: 34.0522, lng: -118.2437 },
      { id: 'us_tx', nameAr: 'تكساس وهيوستن ودالاس', nameEn: 'Texas & Houston', lat: 29.7604, lng: -95.3698 },
      { id: 'us_chi', nameAr: 'شيكاغو وإلينوي', nameEn: 'Chicago & Illinois', lat: 41.8781, lng: -87.6298 }
    ],
  },
  {
    code: 'GLOBAL',
    nameAr: 'كافة دول العالم الأخرى (تحديد تلقائي)',
    nameEn: 'Global / Other Countries',
    flag: '🌐',
    phoneCode: '+',
    defaultCurrency: 'USD',
    defaultLanguage: 'ar',
    defaultCalculationMethod: 'MuslimWorldLeague',
    regions: [
      { id: 'global_gps', nameAr: 'موقعي المباشر عبر الـ GPS 📍', nameEn: 'Live GPS Location', lat: 0, lng: 0 }
    ],
  },
];

export interface GlobalUserPreferences {
  countryCode: string;
  currencyCode: string;
  language: string;
  regionId: string;
  customVillageName?: string;
  customCoords: { lat: number; lng: number } | null;
  prayerCalculationMethod: string;
  isRTL: boolean;
}

const GLOBAL_PREFS_KEY = 'qaryati_global_preferences_v1';

export const DEFAULT_GLOBAL_PREFS: GlobalUserPreferences = {
  countryCode: 'SA',
  currencyCode: 'SAR',
  language: 'ar',
  regionId: 'faifa',
  customCoords: null,
  prayerCalculationMethod: 'UmmAlQura',
  isRTL: true,
};

export function getGlobalPreferences(): GlobalUserPreferences {
  try {
    const raw = localStorage.getItem(GLOBAL_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_GLOBAL_PREFS, ...parsed };
    }
  } catch {}
  return DEFAULT_GLOBAL_PREFS;
}

export function saveGlobalPreferences(partial: Partial<GlobalUserPreferences>): GlobalUserPreferences {
  const current = getGlobalPreferences();
  const updated: GlobalUserPreferences = {
    ...current,
    ...partial,
    isRTL: (partial.language || current.language) === 'ar' || (partial.language || current.language) === 'ur',
  };

  try {
    localStorage.setItem(GLOBAL_PREFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('qaryati:global-prefs-updated', { detail: updated }));
  } catch (e) {
    console.warn('Error saving global preferences:', e);
  }
  return updated;
}

export function getCountryByCode(code: string): CountryInfo {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code) || SUPPORTED_COUNTRIES[0];
}

/**
 * Format any numerical price in the currently active global currency
 */
export function formatGlobalCurrency(
  amount: number,
  currencyCode?: string
): string {
  const prefs = getGlobalPreferences();
  const code = currencyCode || prefs.currencyCode || 'SAR';
  const cur = POPULAR_CURRENCIES.find((c) => c.code === code) || POPULAR_CURRENCIES[0];

  const formattedNumber = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: cur.decimalDigits !== undefined ? cur.decimalDigits : 2,
    maximumFractionDigits: cur.decimalDigits !== undefined ? cur.decimalDigits : 2,
  });

  return `${formattedNumber} ${cur.symbol}`;
}

/**
 * Converts price from SAR (base) to target currency
 */
export function convertFromSAR(amountInSAR: number, targetCurrencyCode: string): number {
  if (targetCurrencyCode === 'SAR') return amountInSAR;
  const sarCurr = POPULAR_CURRENCIES.find((c) => c.code === 'SAR') || { usdRate: 3.75 };
  const targetCurr = POPULAR_CURRENCIES.find((c) => c.code === targetCurrencyCode);

  if (!targetCurr || !sarCurr.usdRate) return amountInSAR;

  // Convert SAR -> USD -> Target Currency
  const inUSD = amountInSAR / sarCurr.usdRate;
  const inTarget = inUSD * targetCurr.usdRate;
  return Number(inTarget.toFixed(2));
}

/**
 * Get localized payment gateways tailored specifically to the country
 */
export function getCountryPaymentGateways(countryCode?: string): CountryPaymentGateway[] {
  const code = countryCode || getGlobalPreferences().countryCode;
  
  const commonWallet: CountryPaymentGateway = {
    id: 'village_wallet',
    nameAr: 'محفظة القرية الرقمية 💳 (خصم فوري من الرصيد)',
    nameEn: 'Village Digital Wallet (Instant)',
    icon: '💳',
    type: 'WALLETS',
    badgeAr: 'رصيد فوري',
    badgeEn: 'Instant',
  };

  const commonCash: CountryPaymentGateway = {
    id: 'cash_on_delivery',
    nameAr: 'الدفع نقداً عند الاستلام 💵',
    nameEn: 'Cash on Delivery (COD)',
    icon: '💵',
    type: 'CASH',
    badgeAr: 'كاش',
  };

  switch (code) {
    case 'SA':
      return [
        commonWallet,
        { id: 'mada', nameAr: 'بطاقة مدى (Mada) 💳', nameEn: 'Mada Debit Card', icon: '💳', type: 'CARDS', badgeAr: 'السعودية' },
        { id: 'apple_pay', nameAr: 'Apple Pay 🍏', nameEn: 'Apple Pay', icon: '🍏', type: 'CARDS', badgeAr: 'سريع' },
        { id: 'stc_pay', nameAr: 'STC Pay 📲', nameEn: 'STC Pay Wallet', icon: '📲', type: 'WALLETS', badgeAr: 'محفظة' },
        { id: 'urpay', nameAr: 'URPay (محفظة الراجحي) 📱', nameEn: 'URPay Wallet', icon: '📱', type: 'WALLETS' },
        commonCash,
      ];

    case 'YE':
      return [
        commonWallet,
        { id: 'kuraimi_haseb', nameAr: 'حاسب الكريمي (Kuraimi Express) 🏦', nameEn: 'Kuraimi Haseb', icon: '🏦', type: 'BANK_APP', badgeAr: 'اليمن الأكثر استخداماً', instructionsAr: 'ارسل إلى حساب الكريمي رقم: 301294857 باسم متجر قريتي' },
        { id: 'flousak', nameAr: 'محفظة فلوسك (Flousak) 💸', nameEn: 'Flousak Wallet', icon: '💸', type: 'WALLETS', badgeAr: 'محفظة رقمية' },
        { id: 'jawwal_money', nameAr: 'جوال ماني (Jawwal Money) 📱', nameEn: 'Jawwal Money', icon: '📱', type: 'WALLETS' },
        { id: 'onecash', nameAr: 'ون كاش (OneCash) 💳', nameEn: 'OneCash', icon: '💳', type: 'WALLETS' },
        { id: 'jeeb', nameAr: 'جيب (Jeeb Wallet) 📲', nameEn: 'Jeeb Wallet', icon: '📲', type: 'WALLETS' },
        { id: 'local_hawala', nameAr: 'حوالة صرافة سريعة (النجم/الممتاز) 📨', nameEn: 'Local Hawala Exchange', icon: '📨', type: 'CASH', badgeAr: 'حوالة' },
        commonCash,
      ];

    case 'AE':
      return [
        commonWallet,
        { id: 'apple_pay', nameAr: 'Apple Pay 🍏', nameEn: 'Apple Pay', icon: '🍏', type: 'CARDS', badgeAr: 'Popular' },
        { id: 'google_pay', nameAr: 'Google Pay 🤖', nameEn: 'Google Pay', icon: '🤖', type: 'CARDS' },
        { id: 'careem_pay', nameAr: 'Careem Pay 🟢', nameEn: 'Careem Pay', icon: '🟢', type: 'WALLETS' },
        { id: 'credit_card', nameAr: 'Visa / MasterCard 💳', nameEn: 'Credit Card', icon: '💳', type: 'CARDS' },
        commonCash,
      ];

    case 'EG':
      return [
        commonWallet,
        { id: 'vodafone_cash', nameAr: 'فودافون كاش (Vodafone Cash) 🔴', nameEn: 'Vodafone Cash', icon: '🔴', type: 'WALLETS', badgeAr: 'الأكثر شيوعاً' },
        { id: 'fawry', nameAr: 'خدمة فوري (Fawry Pay) 🟡', nameEn: 'Fawry Pay', icon: '🟡', type: 'BANK_APP', badgeAr: 'كود فوري' },
        { id: 'instapay', nameAr: 'إنستاباي (InstaPay Egypt) ⚡', nameEn: 'InstaPay', icon: '⚡', type: 'BANK_APP', badgeAr: 'تحويل فوري' },
        { id: 'etisalat_cash', nameAr: 'اتصالات كاش / أورنج كاش 📱', nameEn: 'Etisalat Cash', icon: '📱', type: 'WALLETS' },
        commonCash,
      ];

    case 'KW':
      return [
        commonWallet,
        { id: 'knet', nameAr: 'كي نت (KNET) 💳', nameEn: 'KNET Kuwait', icon: '💳', type: 'CARDS', badgeAr: 'الكويت' },
        { id: 'apple_pay', nameAr: 'Apple Pay 🍏', nameEn: 'Apple Pay', icon: '🍏', type: 'CARDS' },
        commonCash,
      ];

    case 'QA':
      return [
        commonWallet,
        { id: 'qpay', nameAr: 'QPay Qatar 💳', nameEn: 'QPay', icon: '💳', type: 'CARDS' },
        { id: 'apple_pay', nameAr: 'Apple Pay 🍏', nameEn: 'Apple Pay', icon: '🍏', type: 'CARDS' },
        commonCash,
      ];

    case 'BH':
      return [
        commonWallet,
        { id: 'benefit_pay', nameAr: 'بنفت باي (BenefitPay) 🇧🇭', nameEn: 'BenefitPay', icon: '🇧🇭', type: 'WALLETS', badgeAr: 'البحرين' },
        commonCash,
      ];

    case 'JO':
      return [
        commonWallet,
        { id: 'cliq', nameAr: 'كليك (CliQ Jordan) ⚡', nameEn: 'CliQ Jordan', icon: '⚡', type: 'BANK_APP', badgeAr: 'الأردن' },
        { id: 'zain_cash', nameAr: 'زين كاش (Zain Cash) 📲', nameEn: 'Zain Cash', icon: '📲', type: 'WALLETS' },
        commonCash,
      ];

    default:
      return [
        commonWallet,
        { id: 'stripe_card', nameAr: 'بطاقات الائتمان (Visa / Mastercard) 💳', nameEn: 'Credit Card', icon: '💳', type: 'CARDS' },
        { id: 'apple_pay', nameAr: 'Apple Pay / Google Pay 📱', nameEn: 'Apple/Google Pay', icon: '📱', type: 'CARDS' },
        commonCash,
      ];
  }
}

/**
 * Get country-specific localized services offered in the app
 */
export function getCountryLocalServices(countryCode?: string): CountryLocalService[] {
  const code = countryCode || getGlobalPreferences().countryCode;

  switch (code) {
    case 'SA':
      return [
        { id: 'express_delivery', titleAr: 'توصيل باب المنزل في القرى', titleEn: 'Home Village Delivery', icon: '🚗', descriptionAr: 'توصيل سريع حتى باب منزل العميل بقرى وهجر المملكة', descriptionEn: 'Fast door-to-door delivery' },
        { id: 'livestock_delivery', titleAr: 'توصيل الذبائح والمواشي والسلع الكبيرة', titleEn: 'Livestock & Farm Cargo', icon: '🐐', descriptionAr: 'شاحنات نقل مخصصة للمواشي والسلع الضخمة بقرى المزارع', descriptionEn: 'Special trucks for livestock' },
        { id: 'tanker_gas', titleAr: 'طلب صهاريج الماء والغاز للمنازل', titleEn: 'Water & Gas Supply', icon: '🚚', descriptionAr: 'توصيل صهاريج مياه الشرب وأسطوانات الغاز', descriptionEn: 'Gas and water delivery' }
      ];

    case 'YE':
      return [
        { id: 'qat_food_express', titleAr: 'توصيل الوجبات والقات الطازج', titleEn: 'Fresh Food & Qat Delivery', icon: '🍃', descriptionAr: 'خدمة توصيل سريعة وموثوقة بين قرى المحافظات', descriptionEn: 'Fast delivery service' },
        { id: 'province_cargo', titleAr: 'الشحن والطرود بين المحافظات والقرى', titleEn: 'Inter-Province Cargo', icon: '📦', descriptionAr: 'إرسال الطرود والسلع بين صنعاء، عدن، تعز، حضرموت وقراها', descriptionEn: 'Inter-city cargo shipping' },
        { id: 'solar_gas_supplies', titleAr: 'إمدادات المنظومات الشمسية والغاز', titleEn: 'Solar & Gas Supplies', icon: '☀️', descriptionAr: 'تأمين معدات ألواح الطاقة الشمسية وأسطوانات الغاز', descriptionEn: 'Solar panels & gas supply' }
      ];

    case 'EG':
      return [
        { id: 'market_pharmacy', titleAr: 'توصيل الماركت والصيدليات للنجوع', titleEn: 'Grocery & Pharmacy', icon: '🛒', descriptionAr: 'توصيل احتياجات الأسرة للقرى والأرياف المصرية', descriptionEn: 'Rural grocery delivery' },
        { id: 'rural_poultry', titleAr: 'توصيل الأعلاف والطيور والمواشي', titleEn: 'Farm Feed & Livestock', icon: '🐓', descriptionAr: 'تأمين احتياجات المزارعين بقرى الدلتا والصعيد', descriptionEn: 'Delta & Upper Egypt feed' }
      ];

    default:
      return [
        { id: 'local_marketplace', titleAr: 'التسوق والتوصيل المحلي السريع', titleEn: 'Local Marketplace', icon: '🛍️', descriptionAr: 'تصفح متاجر قريتك الشاملة والتوصيل المباشر', descriptionEn: 'Browse local village stores' }
      ];
  }
}
