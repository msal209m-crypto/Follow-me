export type NavigationTab =
  | 'dashboard'
  | 'items'
  | 'stickers'
  | 'transactions'
  | 'order_goods'
  | 'accounts'
  | 'debts'
  | 'daily_reports';

export interface Item {
  id: string;
  barcode: string;
  name: string;
  category: string;
  quantity: number;
  costPrice: number; // سعر التكلفة
  salePrice: number; // سعر البيع
  price?: number;    // اختياري متوافق مع كود المتجر
  image?: string;    // رابط صورة الصنف أو base64
  imageUrl?: string; // رابط موازي للصورة
  available?: boolean; // حالة التوفر في متجر العملاء
  minStockAlert: number;
  unit: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'SALE'              // بيع نقد
  | 'PURCHASE'          // شراء نقد
  | 'CREDIT_SALE'       // بيع آجل
  | 'ORDER_GOODS_CASH'  // طلب بضاعة نقد
  | 'ORDER_GOODS_CREDIT'; // طلب بضاعة آجل

export type PaymentMethod =
  | 'CASH'      // كاش
  | 'TRANSFER'  // تحويل
  | 'CARD';     // دفع بالبطاقة / شبكة

export interface TransactionCartItem {
  itemId: string;
  barcode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
  receivedQuantity?: number; // الكمية المستلمة فعلياً في المستودع
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  partyName: string; // اسم العميل / المورد / الشخص
  partyPhone?: string;
  cashierName: string; // اسم الشخص / البائع / المحاسب
  items: TransactionCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  notes?: string;
  timestamp: string; // ISO date string
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'PENDING_RECEIPT' | 'PARTIALLY_RECEIVED';
  receivedAt?: string; // توقيت استلام البضاعة وتوريدها للمخزن
  receivedBy?: string; // اسم من قام بفحص واستلام البضاعة
  expectedDeliveryDate?: string;
  isDirectReceipt?: boolean; // هل تم الشراء والاستلام الفوري المباشر
}

export interface DebtPaymentHistoryItem {
  id: string;
  debtId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  receiptNumber: string;
  recordedBy: string;
}

export interface DebtAdvanceLoanItem {
  id: string;
  debtId: string;
  date: string;
  amount: number;
  paymentSource: PaymentMethod;
  notes?: string;
  receiptNumber: string;
  recordedBy: string;
}

export interface DebtRecord {
  id: string;
  personName: string;
  phone: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'PERSONAL_LOAN'; // عميل آجل أو مورد آجل أو سلفة شخصية
  category?: 'SALE_CREDIT' | 'CASH_LOAN' | 'SUPPLIER_CREDIT';
  totalDebt: number;       // إجمالي الدين أو السلفة المتراكمة
  paidDebt: number;        // إجمالي ما سدده حتى الآن
  remainingDebt: number;   // المتبقي عليه
  lastTransactionDate: string;
  notes?: string;
  payments: DebtPaymentHistoryItem[];
  loans?: DebtAdvanceLoanItem[];
}

export type Language = 'ar' | 'en';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'ADMIN' | 'admin';

export type SubscriptionTier = 'FREE' | 'PRO';

export interface LicenseKeyRecord {
  id: string; // The code itself e.g. FLOW-A1B2-C3D4-E5F6
  key: string;
  is_used: boolean;
  plan: '1M' | '3M' | '6M' | '1Y' | 'LIFE';
  duration_days: number;
  created_at: string;
  created_by?: string;
  used_at?: string | null;
  used_by?: string | null; // customer user_id
  user_email?: string | null;
  notes?: string;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  isPro: boolean;
  expiresAt: string | null; // ISO string or null for lifetime/free
  licenseKey?: string | null;
  activatedAt?: string | null;
  planCode?: '1M' | '3M' | '6M' | '1Y' | 'LIFE';
  planName?: string;
  paymentType?: 'OFFLINE_KEY' | 'ONLINE_CARD' | 'AGENT_CASH' | 'TRIAL';
  daysRemaining: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  storeName?: string;
  role: UserRole;
  subscriptionTier?: SubscriptionTier;
  subscriptionExpiresAt?: string | null;
  licenseKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CloudSyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export interface CloudBackupRecord {
  id: string;
  createdAt: string;
  itemsCount: number;
  transactionsCount: number;
  debtsCount: number;
  totalInventoryCost: number;
  totalInventorySale: number;
  storeName: string;
  type: 'AUTO' | 'MANUAL';
  deviceInfo?: string;
  data: {
    items: Item[];
    transactions: Transaction[];
    debts: DebtRecord[];
    settings: StoreSettings;
    cashiers: Cashier[];
  };
}

export interface CurrencyExchangeRate {
  code: string;
  name: string;
  nameEn: string;
  symbol: string;
  flag: string;
  rateToBase: number; // 1 Base Currency = rateToBase of this Currency (e.g., if base is SAR: 1 SAR = 0.2667 USD)
  isBase: boolean;
  isEnabled: boolean;
  isCustomRate?: boolean;
}

export interface MultiCurrencyConfig {
  enabled: boolean;
  baseCurrencyCode: string; // e.g. 'SAR', 'USD', 'AED', 'EGP', 'YER', 'KWD'
  secondaryCurrencyCode?: string; // e.g. 'USD', 'EUR', 'EGP'
  showDualCurrency: boolean; // Show secondary converted price on POS and receipts
  rates: Record<string, number>; // currency code -> rate (1 BaseCurrency = rate units of target)
  lastUpdated?: string;
  autoFetchRates?: boolean;
}

export interface StoreSettings {
  language?: Language;
  storeName: string;
  phone: string;
  taxNumber: string;
  address: string;
  currency: string;
  footerNote: string;
  autoBackupEnabled?: boolean;
  autoBackupIntervalMinutes?: number; // e.g. 15, 30, 60 minutes
  lastAutoBackupTimestamp?: string;
  multiCurrency?: MultiCurrencyConfig;
  stickerSettings: {
    showStoreName: boolean;
    showPrice: boolean;
    showBarcodeText: boolean;
    showItemName: boolean;
    labelWidthMm: number;
    labelHeightMm: number;
    fontSize: 'sm' | 'md' | 'lg';
  };
}

export interface Cashier {
  id: string;
  name: string;
  role: string;
  phone?: string;
  active: boolean;
  password?: string;
  pin?: string;
}

export type ActivityCategory = 'INVENTORY' | 'ACCOUNTS' | 'SALES' | 'SETTINGS';

export type ActivityActionType =
  | 'ITEM_ADD'
  | 'ITEM_UPDATE'
  | 'ITEM_DELETE'
  | 'SALE_TRANSACTION'
  | 'PURCHASE_TRANSACTION'
  | 'ORDER_GOODS_RECEIVE'
  | 'DEBT_PAYMENT'
  | 'DEBT_LOAN'
  | 'DEBT_CREATE'
  | 'DEBT_DELETE'
  | 'TRANSACTION_DELETE'
  | 'SETTINGS_UPDATE';

export interface ActivityChangeDiff {
  label: string;
  oldVal: string | number;
  newVal: string | number;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO date string
  category: ActivityCategory;
  actionType: ActivityActionType;
  title: string;
  details: string;
  performedBy: string; // Cashier / User name
  userRole?: string;
  targetId?: string;
  targetName?: string;
  diffs?: ActivityChangeDiff[];
}
