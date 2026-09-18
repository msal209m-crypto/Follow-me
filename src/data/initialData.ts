import { Item, Transaction, DebtRecord, StoreSettings, Cashier } from '../types';
import { getDefaultRatesForBase } from './currencies';

export const INITIAL_ITEMS: Item[] = [];

export const INITIAL_CASHIERS: Cashier[] = [
  { id: 'c-1', name: 'المدير العام (مشرف)', role: 'OWNER', phone: '', active: true },
  { id: 'c-2', name: 'كاشير المبيعات', role: 'CASHIER', phone: '', active: true, password: '123' },
];

export const INITIAL_DEBTS: DebtRecord[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'متجرك الجديد',
  phone: '',
  taxNumber: '',
  address: 'المملكة العربية السعودية',
  currency: 'ر.س',
  footerNote: 'شكراً لتعاملكم معنا - نسعد بخدمتكم دائماً',
  multiCurrency: {
    enabled: true,
    baseCurrencyCode: 'SAR',
    secondaryCurrencyCode: 'USD',
    showDualCurrency: true,
    rates: getDefaultRatesForBase('SAR'),
    lastUpdated: new Date().toISOString(),
    autoFetchRates: true,
  },
  stickerSettings: {
    showStoreName: true,
    showPrice: true,
    showBarcodeText: true,
    showItemName: true,
    labelWidthMm: 50,
    labelHeightMm: 30,
    fontSize: 'md',
  }
};
