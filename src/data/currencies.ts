export interface CurrencyOption {
  code: string;
  name: string;
  nameEn: string;
  symbol: string;
  flag: string;
  shortLabel: string;
  countries?: string;
  usdRate: number; // 1 USD = usdRate in this currency
  decimalDigits: number;
}

export const POPULAR_CURRENCIES: CurrencyOption[] = [
  {
    code: 'SAR',
    name: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    symbol: 'ر.س',
    flag: '🇸🇦',
    shortLabel: 'ريال سعودي (ر.س)',
    countries: 'المملكة العربية السعودية',
    usdRate: 3.75,
    decimalDigits: 2,
  },
  {
    code: 'USD',
    name: 'دولار أمريكي',
    nameEn: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    shortLabel: 'دولار أمريكي ($ / USD)',
    countries: 'الولايات المتحدة والمعاملات الدولية',
    usdRate: 1.0,
    decimalDigits: 2,
  },
  {
    code: 'EUR',
    name: 'يورو أوروبي',
    nameEn: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    shortLabel: 'يورو (€ / EUR)',
    countries: 'الاتحاد الأوروبي',
    usdRate: 0.92,
    decimalDigits: 2,
  },
  {
    code: 'AED',
    name: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
    shortLabel: 'درهم إماراتي (د.إ)',
    countries: 'الإمارات العربية المتحدة',
    usdRate: 3.6725,
    decimalDigits: 2,
  },
  {
    code: 'KWD',
    name: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    symbol: 'د.ك',
    flag: '🇰🇼',
    shortLabel: 'دينار كويتي (د.ك)',
    countries: 'دولة الكويت',
    usdRate: 0.307,
    decimalDigits: 3,
  },
  {
    code: 'BHD',
    name: 'دينار بحريني',
    nameEn: 'Bahraini Dinar',
    symbol: 'د.ب',
    flag: '🇧🇭',
    shortLabel: 'دينار بحريني (د.ب)',
    countries: 'مملكة البحرين',
    usdRate: 0.376,
    decimalDigits: 3,
  },
  {
    code: 'OMR',
    name: 'ريال عماني',
    nameEn: 'Omani Rial',
    symbol: 'ر.ع',
    flag: '🇴🇲',
    shortLabel: 'ريال عماني (ر.ع)',
    countries: 'سلطنة عمان',
    usdRate: 0.384,
    decimalDigits: 3,
  },
  {
    code: 'QAR',
    name: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    symbol: 'ر.ق',
    flag: '🇶🇦',
    shortLabel: 'ريال قطري (ر.ق)',
    countries: 'دولة قطر',
    usdRate: 3.64,
    decimalDigits: 2,
  },
  {
    code: 'JOD',
    name: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    symbol: 'د.أ',
    flag: '🇯🇴',
    shortLabel: 'دينار أردني (د.أ)',
    countries: 'المملكة الأردنية الهاشمية',
    usdRate: 0.709,
    decimalDigits: 2,
  },
  {
    code: 'EGP',
    name: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    symbol: 'ج.م',
    flag: '🇪🇬',
    shortLabel: 'جنيه مصري (ج.م)',
    countries: 'جمهورية مصر العربية',
    usdRate: 48.5,
    decimalDigits: 2,
  },
  {
    code: 'YER',
    name: 'ريال يمني',
    nameEn: 'Yemeni Rial',
    symbol: 'ر.ي',
    flag: '🇾🇪',
    shortLabel: 'ريال يمني (ر.ي / YER)',
    countries: 'الجمهورية اليمنية',
    usdRate: 530.0,
    decimalDigits: 0,
  },
  {
    code: 'IQD',
    name: 'دينار عراقي',
    nameEn: 'Iraqi Dinar',
    symbol: 'د.ع',
    flag: '🇮🇶',
    shortLabel: 'دينار عراقي (د.ع)',
    countries: 'جمهورية العراق',
    usdRate: 1310.0,
    decimalDigits: 0,
  },
  {
    code: 'TRY',
    name: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    symbol: '₺',
    flag: '🇹🇷',
    shortLabel: 'ليرة تركية (₺ / TRY)',
    countries: 'الجمهورية التركية',
    usdRate: 34.2,
    decimalDigits: 2,
  },
  {
    code: 'MAD',
    name: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    symbol: 'د.م.',
    flag: '🇲🇦',
    shortLabel: 'درهم مغربي (د.م.)',
    countries: 'المملكة المغربية',
    usdRate: 9.85,
    decimalDigits: 2,
  },
  {
    code: 'DZD',
    name: 'دينار جزائري',
    nameEn: 'Algerian Dinar',
    symbol: 'د.ج',
    flag: '🇩🇿',
    shortLabel: 'دينار جزائري (د.ج)',
    countries: 'الجمهورية الجزائرية',
    usdRate: 134.0,
    decimalDigits: 2,
  },
  {
    code: 'TND',
    name: 'دينار تونسي',
    nameEn: 'Tunisian Dinar',
    symbol: 'د.ت',
    flag: '🇹🇳',
    shortLabel: 'دينار تونسي (د.ت)',
    countries: 'الجمهورية التونسية',
    usdRate: 3.08,
    decimalDigits: 3,
  },
  {
    code: 'GBP',
    name: 'جنيه إسترليني',
    nameEn: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    shortLabel: 'جنيه إسترليني (£ / GBP)',
    countries: 'المملكة المتحدة',
    usdRate: 0.77,
    decimalDigits: 2,
  },
  {
    code: 'CAD',
    name: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    symbol: 'C$',
    flag: '🇨🇦',
    shortLabel: 'دولار كندي (C$ / CAD)',
    countries: 'كندا',
    usdRate: 1.36,
    decimalDigits: 2,
  },
  {
    code: 'CNY',
    name: 'يوان صيني',
    nameEn: 'Chinese Yuan',
    symbol: '¥',
    flag: '🇨🇳',
    shortLabel: 'يوان صيني (¥ / CNY)',
    countries: 'الصين',
    usdRate: 7.12,
    decimalDigits: 2,
  },
  {
    code: 'SYP',
    name: 'ليرة سورية',
    nameEn: 'Syrian Pound',
    symbol: 'ل.س',
    flag: '🇸🇾',
    shortLabel: 'ليرة سورية (SYP)',
    countries: 'الجمهورية العربية السورية',
    usdRate: 14000.0,
    decimalDigits: 0,
  },
  {
    code: 'LBP',
    name: 'ليرة لبنانية',
    nameEn: 'Lebanese Pound',
    symbol: 'ل.ل',
    flag: '🇱🇧',
    shortLabel: 'ليرة لبنانية (LBP)',
    countries: 'الجمهورية اللبنانية',
    usdRate: 89500.0,
    decimalDigits: 0,
  },
];

// Find a currency option by code or symbol
export function findCurrency(query?: string): CurrencyOption {
  if (!query) return POPULAR_CURRENCIES[0]; // SAR default
  const clean = query.trim().toUpperCase();
  const match = POPULAR_CURRENCIES.find(
    (c) =>
      c.code === clean ||
      c.symbol.toUpperCase() === clean ||
      c.name.includes(query) ||
      c.shortLabel.includes(query)
  );
  return match || {
    code: query,
    name: query,
    nameEn: query,
    symbol: query,
    flag: '🌐',
    shortLabel: query,
    usdRate: 1.0,
    decimalDigits: 2,
  };
}

// Generate default relative exchange rates for a base currency
export function getDefaultRatesForBase(baseCode: string): Record<string, number> {
  const baseCurr = findCurrency(baseCode);
  const baseUsdRate = baseCurr.usdRate || 3.75;
  const rates: Record<string, number> = {};

  POPULAR_CURRENCIES.forEach((curr) => {
    // 1 unit of base currency = (curr.usdRate / baseUsdRate) units of target currency
    const relativeRate = curr.usdRate / baseUsdRate;
    // Format to reasonable precision
    rates[curr.code] = Number(relativeRate > 10 ? relativeRate.toFixed(2) : relativeRate.toFixed(4));
  });

  rates[baseCode] = 1.0;
  return rates;
}

// Convert an amount from one currency to another using store exchange rates
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number>,
  baseCode: string
): number {
  if (!amount || fromCode === toCode) return amount;

  const rateFrom = fromCode === baseCode ? 1.0 : (rates[fromCode] || 1.0);
  const rateTo = toCode === baseCode ? 1.0 : (rates[toCode] || 1.0);

  // Amount in base currency = amount / rateFrom
  const inBase = amount / rateFrom;
  // Amount in target currency = inBase * rateTo
  return inBase * rateTo;
}

// Fetch live exchange rates from open public API
export async function fetchLiveExchangeRates(baseCode: string): Promise<{
  rates: Record<string, number>;
  lastUpdated: string;
  source: 'live' | 'fallback';
}> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(baseCode.toUpperCase())}`, {
      cache: 'no-cache',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      const mergedRates: Record<string, number> = {};
      POPULAR_CURRENCIES.forEach((c) => {
        if (data.rates[c.code] !== undefined) {
          mergedRates[c.code] = Number(data.rates[c.code]);
        } else {
          // Fallback relative estimate for currencies not in standard list
          const fallback = getDefaultRatesForBase(baseCode);
          mergedRates[c.code] = fallback[c.code] || 1.0;
        }
      });
      mergedRates[baseCode] = 1.0;
      return {
        rates: mergedRates,
        lastUpdated: new Date().toISOString(),
        source: 'live',
      };
    }
  } catch (err) {
    console.warn('Could not fetch live rates from open API, using high-precision fallback rates:', err);
  }

  return {
    rates: getDefaultRatesForBase(baseCode),
    lastUpdated: new Date().toISOString(),
    source: 'fallback',
  };
}
