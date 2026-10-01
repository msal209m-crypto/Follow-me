import { Item, Transaction, DebtRecord, StoreSettings, Cashier } from '../types';
import { getDefaultRatesForBase } from './currencies';

export const INITIAL_ITEMS: Item[] = [];

export const INITIAL_CASHIERS: Cashier[] = [
  {
    id: 'cashier-owner',
    name: 'مدير المتجر',
    role: 'OWNER',
    password: '1234',
    active: true
  }
];

export const INITIAL_DEBTS: DebtRecord[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'متجرك الجديد',
  phone: '',
  taxNumber: '',
  address: '',
  currency: 'ر.س',
  exchangeRate: 1.0,
  footerNote: 'شكراً لتعاملكم معنا',
  powerSavingMode: false,
  multiCurrency: {
    enabled: false,
    baseCurrencyCode: 'SAR',
    secondaryCurrencyCode: 'USD',
    showDualCurrency: false,
    rates: {},
    lastUpdated: new Date().toISOString(),
    autoFetchRates: false,
  },
  stickerSettings: {
    showStoreName: true,
    showPrice: true,
    showBarcodeText: true,
    showItemName: true,
    labelWidthMm: 38,
    labelHeightMm: 25,
    fontSize: 'md',
  }
};
