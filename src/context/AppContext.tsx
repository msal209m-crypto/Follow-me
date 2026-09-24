import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeSetDoc, safeBatchSet, sanitizeForFirestore } from '../lib/firestoreUtils';
import { useAuth } from './AuthContext';
import {
  Item,
  Transaction,
  DebtRecord,
  DebtPaymentHistoryItem,
  DebtAdvanceLoanItem,
  StoreSettings,
  Cashier,
  NavigationTab,
  TransactionType,
  PaymentMethod,
  TransactionCartItem,
  Language,
  CloudSyncStatus,
  CloudBackupRecord,
  ActivityLog,
  ActivityChangeDiff,
} from '../types';
import {
  INITIAL_ITEMS,
  INITIAL_TRANSACTIONS,
  INITIAL_DEBTS,
  INITIAL_SETTINGS,
  INITIAL_CASHIERS,
} from '../data/initialData';
import { translations, Translations } from '../i18n/translations';
import { sanitizeProductImage, DEFAULT_PRODUCT_IMAGE } from '../utils/imageUtils';
import { saveStoreProducts } from '../services/deliveryService';

// Sets of dummy demo IDs used only to purge and prevent unwanted mock data pre-fill
const DEMO_ITEM_IDS = new Set(INITIAL_ITEMS.map((i) => i.id));
const DEMO_TX_IDS = new Set(INITIAL_TRANSACTIONS.map((t) => t.id));
const DEMO_DEBT_IDS = new Set(INITIAL_DEBTS.map((d) => d.id));

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  items: Item[];
  transactions: Transaction[];
  debts: DebtRecord[];
  cashiers: Cashier[];
  currentCashier: Cashier;
  setCurrentCashier: (cashier: Cashier) => void;
  isCashierMode: boolean;
  resetCashierPassword: (
    cashierIdOrName?: string,
    newPassword?: string
  ) => { success: boolean; message: string; cashierName?: string; newPassword?: string };
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;

  // Cloud Sync
  cloudSyncStatus: CloudSyncStatus;
  syncToCloudNow: () => Promise<void>;

  // Item operations
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Item;
  saveProduct: (productName: string, salePrice: number | string, productImage?: string) => Item;
  updateItem: (id: string, item: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  findItemByBarcode: (barcode: string) => Item | undefined;

  // Transaction operations
  createTransaction: (data: {
    type: TransactionType;
    paymentMethod: PaymentMethod;
    partyName: string;
    partyPhone?: string;
    items: TransactionCartItem[];
    discount?: number;
    notes?: string;
    paidAmount?: number;
    isDirectReceipt?: boolean;
    status?: Transaction['status'];
    expectedDeliveryDate?: string;
  }) => Transaction;

  // Supply Order Receipt Operations (خاصية استلام وتوريد الشحنات الناقصة)
  pendingSupplyOrders: Transaction[];
  getPendingOrderQtyForItem: (itemId: string) => number;
  receiveSupplyOrder: (
    orderId: string,
    receiptData: {
      receivedItems: {
        itemId: string;
        receivedQuantity: number;
        costPrice?: number;
      }[];
      paidAmount?: number;
      paymentMethod?: PaymentMethod;
      receiverName?: string;
      notes?: string;
    }
  ) => Transaction | null;
  cancelSupplyOrder: (orderId: string, reason?: string) => void;
  deleteTransaction: (id: string, restoreStock?: boolean) => void;

  // Debt & Loan operations
  addDebtRecord: (record: Omit<DebtRecord, 'id' | 'payments' | 'loans'>) => DebtRecord;
  addCashLoanRecord: (data: {
    personName: string;
    phone: string;
    amount: number;
    paymentSource: PaymentMethod;
    notes?: string;
  }) => { debt: DebtRecord; loan: DebtAdvanceLoanItem };
  addLoanAdvanceToDebt: (
    debtId: string,
    amount: number,
    paymentSource: PaymentMethod,
    notes?: string
  ) => DebtAdvanceLoanItem;
  recordDebtPayment: (
    debtId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => DebtPaymentHistoryItem;
  deleteDebtRecord: (debtId: string) => void;

  // Selected item for quick sticker print or barcode modal
  selectedStickerItemId: string | null;
  setSelectedStickerItemId: (id: string | null) => void;

  // Stats & Summaries
  inventoryStats: {
    totalItemsCount: number;
    totalStockUnits: number;
    totalCostValue: number;
    totalSaleValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockItems: Item[];
  };

  // Cash register balance estimation
  financialSummary: {
    cashBalance: number;
    bankTransferBalance: number;
    cardBalance: number;
    totalCreditSalesDue: number;
    totalSupplierDebtsDue: number;
    totalSales: number;
    totalPurchases: number;
    netProfit: number;
  };

  // Cloud Backups & Instant Disaster Recovery
  cloudBackups: CloudBackupRecord[];
  isBackingUp: boolean;
  isRestoring: boolean;
  createCloudBackup: (type?: 'MANUAL' | 'AUTO') => Promise<CloudBackupRecord>;
  restoreCloudBackup: (backup: CloudBackupRecord) => Promise<void>;
  deleteCloudBackup: (backupId: string) => Promise<void>;

  // Reset & Backup
  resetToSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  exportDataJSON: () => void;
  importDataJSON: (
    jsonStr: string,
    options?: { mode?: 'replace' | 'merge' }
  ) => Promise<{ success: boolean; error?: string; summary?: { itemsCount: number; transactionsCount: number; debtsCount: number } }>;

  // Iframe-safe Notification Toast System
  notification: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  dismissNotification: () => void;

  // Activity / Audit Logs
  activityLogs: ActivityLog[];
  logActivity: (entry: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearActivityLogs: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  VERSION: 'flowapp_clean_v4_cloud',
  ITEMS: 'flowapp_v4_items',
  TRANSACTIONS: 'flowapp_v4_transactions',
  DEBTS: 'flowapp_v4_debts',
  CASHIERS: 'flowapp_v4_cashiers',
  SETTINGS: 'flowapp_v4_settings',
  LANGUAGE: 'flowapp_v4_language',
  BACKUPS: 'flowapp_v4_backups',
  LOGS: 'flowapp_v4_activity_logs',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isCloudConnected } = useAuth();
  const canWriteToCloud = Boolean(isCloudConnected && currentUser?.uid && !currentUser.uid.startsWith('usr_'));
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedStickerItemId, setSelectedStickerItemId] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('offline');

  // Multi-Vendor Security Filter: User and Merchant isolated storage keys
  const activeMerchantId = currentUser?.uid || userProfile?.id || 'guest';
  const userPrefix =
    activeMerchantId !== 'guest'
      ? activeMerchantId.startsWith('merchant_')
        ? `${activeMerchantId}_`
        : `user_${activeMerchantId}_`
      : 'guest_';

  // Language state: 'ar' or 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language | null;
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {
      // fallback
    }
    return 'ar';
  });

  const isRTL = language === 'ar';
  const t = useMemo(() => translations[language] || translations.ar, [language]);

  // Synchronize document direction and lang attribute
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    } catch (e) {
      console.error(e);
    }
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // State initialization from local storage - starts completely empty by default, no auto-filling
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.ITEMS);
      let list: Item[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          list = parsed
            .filter((i: Item) => !DEMO_ITEM_IDS.has(i.id))
            .map((i: any) => ({
              ...i,
              barcode: String(i.barcode ?? '').trim(),
              name: String(i.name ?? '').trim(),
            }));
        }
      }
      return list;
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t: Transaction) => !DEMO_TX_IDS.has(t.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.DEBTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((d: DebtRecord) => !DEMO_DEBT_IDS.has(d.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [cashiers, setCashiers] = useState<Cashier[]>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.CASHIERS);
      const parsed: Cashier[] = saved ? JSON.parse(saved) : INITIAL_CASHIERS;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasCashierRole = parsed.some(
          (c) =>
            c.role === 'CASHIER' ||
            (c.role?.includes('كاشير') && !c.role?.includes('مدير') && !c.role?.includes('مشرف'))
        );
        if (!hasCashierRole) {
          return [
            ...parsed,
            { id: 'c-2', name: 'كاشير المبيعات', role: 'CASHIER', phone: '', active: true, password: '123' },
          ];
        }
        return parsed;
      }
      return INITIAL_CASHIERS;
    } catch {
      return INITIAL_CASHIERS;
    }
  });

  const [currentCashier, setCurrentCashier] = useState<Cashier>(cashiers[0] || INITIAL_CASHIERS[0]);

  // صلاحيات الكاشير: هل الحساب النشط حالياً هو حساب كاشير
  const isCashierMode = useMemo(() => {
    if (userProfile?.role === 'CASHIER') return true;
    if (!currentCashier) return false;
    const r = (currentCashier.role || '').toUpperCase();
    return (
      r === 'CASHIER' ||
      (r.includes('كاشير') &&
        !r.includes('مدير') &&
        !r.includes('مشرف') &&
        !r.includes('OWNER') &&
        !r.includes('ADMIN'))
    );
  }, [userProfile?.role, currentCashier]);

  // Cloud Backups state
  const [cloudBackups, setCloudBackups] = useState<CloudBackupRecord[]>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.BACKUPS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Iframe-safe Notification Toast state
  const [notification, setNotification] = useState<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Activity / Audit Logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const logActivity = useCallback(
    (entry: Omit<ActivityLog, 'id' | 'timestamp'>) => {
      const newLog: ActivityLog = {
        ...entry,
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
      };
      setActivityLogs((prev) => {
        const updated = [newLog, ...prev.slice(0, 499)];
        try {
          localStorage.setItem(userPrefix + STORAGE_KEYS.LOGS, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    },
    [userPrefix]
  );

  const clearActivityLogs = useCallback(() => {
    setActivityLogs([]);
    try {
      localStorage.removeItem(userPrefix + STORAGE_KEYS.LOGS);
    } catch (e) {
      console.error(e);
    }
  }, [userPrefix]);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      setNotification({ id, message, type });
    },
    []
  );

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(userPrefix + STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
      if (userProfile?.storeName) {
        return { ...INITIAL_SETTINGS, storeName: userProfile.storeName };
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Ensure baseline audit logs are populated from existing transactions if activityLogs is empty
  useEffect(() => {
    if (activityLogs.length === 0 && transactions.length > 0) {
      const generated: ActivityLog[] = transactions.slice(0, 50).map((tx) => ({
        id: `log_init_${tx.id}`,
        timestamp: tx.timestamp,
        category: 'SALES',
        actionType: 'SALE_TRANSACTION',
        title: tx.type === 'CREDIT_SALE' ? 'فاتورة بيع آجل' : 'فاتورة بيع نقدي',
        details: `فاتورة رقم ${tx.invoiceNumber} بمبلغ ${tx.totalAmount} ${settings.currency} - العميل: ${tx.partyName || 'نقدي'} (${tx.items.length} أصناف)`,
        performedBy: tx.cashierName || currentCashier.name,
        targetId: tx.id,
        targetName: tx.invoiceNumber,
      }));
      setActivityLogs(generated);
      try {
        localStorage.setItem(userPrefix + STORAGE_KEYS.LOGS, JSON.stringify(generated));
      } catch (e) {
        console.error(e);
      }
    }
  }, [activityLogs.length, transactions, settings.currency, userPrefix, currentCashier.name]);

  // Whenever active merchant/user changes, load their isolated storage cache immediately
  useEffect(() => {
    const loadMerchantData = (targetId: string, storeTitle?: string, storeVillage?: string) => {
      const pfx =
        targetId !== 'guest'
          ? targetId.startsWith('merchant_')
            ? `${targetId}_`
            : `user_${targetId}_`
          : 'guest_';

      try {
        const savedItems = localStorage.getItem(pfx + STORAGE_KEYS.ITEMS);
        const savedTrans = localStorage.getItem(pfx + STORAGE_KEYS.TRANSACTIONS);
        const savedDebts = localStorage.getItem(pfx + STORAGE_KEYS.DEBTS);
        const savedSettings = localStorage.getItem(pfx + STORAGE_KEYS.SETTINGS);

        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          const cleaned = Array.isArray(parsed) ? parsed.filter((i: Item) => !DEMO_ITEM_IDS.has(i.id)) : [];
          setItems(cleaned);
        } else {
          setItems([]);
        }

        if (savedTrans) {
          const parsed = JSON.parse(savedTrans);
          const cleaned = Array.isArray(parsed) ? parsed.filter((t: Transaction) => !DEMO_TX_IDS.has(t.id)) : [];
          setTransactions(cleaned);
        } else {
          setTransactions([]);
        }

        if (savedDebts) {
          const parsed = JSON.parse(savedDebts);
          const cleaned = Array.isArray(parsed) ? parsed.filter((d: DebtRecord) => !DEMO_DEBT_IDS.has(d.id)) : [];
          setDebts(cleaned);
        } else {
          setDebts([]);
        }

        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        } else {
          const sName = storeTitle || userProfile?.storeName || 'متجري الذكي';
          const sAddr = storeVillage || userProfile?.village || '';
          setSettings((prev) => ({ ...prev, storeName: sName, address: sAddr }));
        }
      } catch (e) {
        console.warn('Error reading merchant storage cache:', e);
      }
    };

    loadMerchantData(activeMerchantId, userProfile?.storeName, userProfile?.village);

    const onUserChanged = (ev: any) => {
      const uid = ev?.detail?.uid;
      const profile = ev?.detail?.profile;
      if (uid) {
        loadMerchantData(uid, profile?.storeName, profile?.village);
      }
    };

    window.addEventListener('flowapp:user-changed', onUserChanged);
    return () => {
      window.removeEventListener('flowapp:user-changed', onUserChanged);
    };
  }, [activeMerchantId, userProfile?.storeName, userProfile?.village]);

  // Sync state to local storage cache for instant offline responsiveness
  useEffect(() => {
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.ITEMS, JSON.stringify(items));
      // Sync store products in multi-vendor directory
      if (activeMerchantId && activeMerchantId !== 'guest') {
        saveStoreProducts(activeMerchantId, items);
      }
      // Keep qaryati_products synchronized with all items using lightweight sanitized images
      const qaryatiFormat = items.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.salePrice || item.price || 0),
        image: sanitizeProductImage(item.image || item.imageUrl, DEFAULT_PRODUCT_IMAGE),
        available: item.quantity > 0 && item.available !== false,
      }));
      localStorage.setItem('qaryati_products', JSON.stringify(qaryatiFormat));
    } catch (e) {
      console.error('Failed to sync items to localStorage (quota or serialization issue):', e);
      try {
        const lightweightItems = items.map((item) => ({
          ...item,
          image: item.image && item.image.startsWith('data:') ? DEFAULT_PRODUCT_IMAGE : item.image,
          imageUrl: item.imageUrl && item.imageUrl.startsWith('data:') ? DEFAULT_PRODUCT_IMAGE : item.imageUrl,
        }));
        localStorage.setItem(userPrefix + STORAGE_KEYS.ITEMS, JSON.stringify(lightweightItems));
      } catch (innerE) {
        console.error('Critical localStorage quota exceeded:', innerE);
      }
    }
  }, [items, userPrefix, activeMerchantId]);

  useEffect(() => {
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions, userPrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.DEBTS, JSON.stringify(debts));
    } catch (e) {
      console.error(e);
    }
  }, [debts, userPrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings, userPrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.CASHIERS, JSON.stringify(cashiers));
    } catch (e) {
      console.error('Failed to sync cashiers to localStorage:', e);
    }
  }, [cashiers, userPrefix]);

  // صلاحيات الكاشير: عند تفعيل حساب الكاشير، إخفاء الحسابات والأرباح والمخزون، والاكتفاء بشاشة نقاط البيع فقط
  useEffect(() => {
    if (isCashierMode) {
      const restrictedTabs: NavigationTab[] = [
        'accounts',
        'daily_reports',
        'items',
        'order_goods',
        'stickers',
        'dashboard',
      ];
      if (restrictedTabs.includes(activeTab)) {
        setActiveTab('transactions');
      }
    }
  }, [isCashierMode, activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.BACKUPS, JSON.stringify(cloudBackups));
    } catch (e) {
      console.error(e);
    }
  }, [cloudBackups, userPrefix]);

  // One-time startup sweep: purge any legacy auto-seeded demo mock data from localStorage
  useEffect(() => {
    try {
      const prefixes = [userPrefix, 'guest_', currentUser ? `user_${currentUser.uid}_` : ''];
      for (const pfx of prefixes) {
        if (!pfx) continue;
        const rawItems = localStorage.getItem(pfx + STORAGE_KEYS.ITEMS);
        if (rawItems) {
          const parsed = JSON.parse(rawItems);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((i: Item) => !DEMO_ITEM_IDS.has(i.id));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(pfx + STORAGE_KEYS.ITEMS, JSON.stringify(cleaned));
            }
          }
        }
        const rawTrans = localStorage.getItem(pfx + STORAGE_KEYS.TRANSACTIONS);
        if (rawTrans) {
          const parsed = JSON.parse(rawTrans);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((t: Transaction) => !DEMO_TX_IDS.has(t.id));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(pfx + STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cleaned));
            }
          }
        }
        const rawDebts = localStorage.getItem(pfx + STORAGE_KEYS.DEBTS);
        if (rawDebts) {
          const parsed = JSON.parse(rawDebts);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((d: DebtRecord) => !DEMO_DEBT_IDS.has(d.id));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(pfx + STORAGE_KEYS.DEBTS, JSON.stringify(cleaned));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Startup storage cleanup error:', e);
    }
  }, [userPrefix, currentUser]);

  // Real-time Cloud Firestore synchronization listeners (per-user multi-tenant isolation)
  useEffect(() => {
    if (!canWriteToCloud || !currentUser) {
      setCloudSyncStatus('offline');
      return;
    }

    setCloudSyncStatus('syncing');

    // Subscribe to user's isolated items
    const itemsCol = collection(db, 'users', currentUser.uid, 'items');
    const unsubItems = onSnapshot(
      itemsCol,
      (snapshot) => {
        const loaded: Item[] = [];
        const demoDocsToDelete: string[] = [];

        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          if (DEMO_ITEM_IDS.has(raw.id)) {
            demoDocsToDelete.push(raw.id);
          } else {
            loaded.push({
              ...raw,
              barcode: String(raw.barcode ?? '').trim(),
              name: String(raw.name ?? '').trim(),
            });
          }
        });

        // Silently purge any legacy demo items that were auto-seeded into cloud
        if (demoDocsToDelete.length > 0) {
          try {
            const batch = writeBatch(db);
            for (const demoId of demoDocsToDelete) {
              batch.delete(doc(db, 'users', currentUser.uid, 'items', demoId));
            }
            batch.commit().catch(console.warn);
          } catch (e) {
            console.warn(e);
          }
        }

        setItems(loaded);
        setCloudSyncStatus('synced');
      },
      (err) => {
        if ((err as { code?: string })?.code === 'unavailable') {
          setCloudSyncStatus('offline');
        } else {
          console.warn('Items listener error:', err);
          setCloudSyncStatus('error');
        }
      }
    );

    // Subscribe to user's isolated transactions
    const transCol = collection(db, 'users', currentUser.uid, 'transactions');
    const unsubTrans = onSnapshot(
      transCol,
      (snapshot) => {
        const loaded: Transaction[] = [];
        const demoDocsToDelete: string[] = [];

        snapshot.forEach((docSnap) => {
          const tr = docSnap.data() as Transaction;
          if (DEMO_TX_IDS.has(tr.id)) {
            demoDocsToDelete.push(tr.id);
          } else {
            loaded.push(tr);
          }
        });

        if (demoDocsToDelete.length > 0) {
          try {
            const batch = writeBatch(db);
            for (const demoId of demoDocsToDelete) {
              batch.delete(doc(db, 'users', currentUser.uid, 'transactions', demoId));
            }
            batch.commit().catch(console.warn);
          } catch (e) {
            console.warn(e);
          }
        }

        // Sort newest first
        loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTransactions(loaded);
      },
      (err) => {
        if ((err as { code?: string })?.code !== 'unavailable') {
          console.warn('Transactions listener error:', err);
        }
      }
    );

    // Subscribe to user's isolated debts
    const debtsCol = collection(db, 'users', currentUser.uid, 'debts');
    const unsubDebts = onSnapshot(
      debtsCol,
      (snapshot) => {
        const loaded: DebtRecord[] = [];
        const demoDocsToDelete: string[] = [];

        snapshot.forEach((docSnap) => {
          const dbRec = docSnap.data() as DebtRecord;
          if (DEMO_DEBT_IDS.has(dbRec.id)) {
            demoDocsToDelete.push(dbRec.id);
          } else {
            loaded.push(dbRec);
          }
        });

        if (demoDocsToDelete.length > 0) {
          try {
            const batch = writeBatch(db);
            for (const demoId of demoDocsToDelete) {
              batch.delete(doc(db, 'users', currentUser.uid, 'debts', demoId));
            }
            batch.commit().catch(console.warn);
          } catch (e) {
            console.warn(e);
          }
        }

        setDebts(loaded);
      },
      (err) => {
        if ((err as { code?: string })?.code !== 'unavailable') {
          console.warn('Debts listener error:', err);
        }
      }
    );

    // Subscribe to user's isolated backups
    const backupsCol = collection(db, 'users', currentUser.uid, 'backups');
    const unsubBackups = onSnapshot(
      backupsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: CloudBackupRecord[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as CloudBackupRecord);
          });
          loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setCloudBackups(loaded);
        }
      },
      (err) => {
        if ((err as { code?: string })?.code !== 'unavailable') {
          console.warn('Backups listener error:', err);
        }
      }
    );

    return () => {
      unsubItems();
      unsubTrans();
      unsubDebts();
      unsubBackups();
    };
  }, [currentUser, canWriteToCloud]);

  // Manual sync function to batch save all state to Firestore
  const syncToCloudNow = useCallback(async () => {
    if (!canWriteToCloud || !currentUser) return;
    setCloudSyncStatus('syncing');
    try {
      const batch = writeBatch(db);

      // Save settings
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'store_config');
      safeBatchSet(batch, settingsRef, settings);

      // Save items
      for (const item of items) {
        const itemRef = doc(db, 'users', currentUser.uid, 'items', item.id);
        safeBatchSet(batch, itemRef, item);
      }

      // Save debts
      for (const debt of debts) {
        const debtRef = doc(db, 'users', currentUser.uid, 'debts', debt.id);
        safeBatchSet(batch, debtRef, debt);
      }

      await batch.commit();
      setCloudSyncStatus('synced');
    } catch (e) {
      console.error('Batch sync error:', e);
      setCloudSyncStatus('error');
    }
  }, [currentUser, items, debts, settings]);

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    logActivity({
      category: 'SETTINGS',
      actionType: 'SETTINGS_UPDATE',
      title: 'تحديث إعدادات المتجر',
      details: `تم تحديث بيانات وإعدادات المتجر بواسطة ${currentCashier.name}`,
      performedBy: currentCashier.name,
    });
    setSettings((prev) => {
      const protectedNames = ['قريتي'];
      const finalSettings = { ...newSettings };

      if (protectedNames.includes(prev.storeName || '')) {
        delete finalSettings.storeName;
      }

      const updated = { ...prev, ...finalSettings };
      if (canWriteToCloud && currentUser) {
        safeSetDoc(doc(db, 'users', currentUser.uid, 'settings', 'store_config'), updated, { merge: true }).catch(console.warn);
      }
      return updated;
    });
  };

  // ITEM OPERATIONS
  const addItem = (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Item => {
    const safeBarcode = String(itemData.barcode ?? '').trim();
    const safeName = String(itemData.name ?? '').trim();
    const newItem: Item = {
      ...itemData,
      merchantId: activeMerchantId,
      storeId: activeMerchantId,
      barcode: safeBarcode,
      name: safeName,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);

    logActivity({
      category: 'INVENTORY',
      actionType: 'ITEM_ADD',
      title: `إضافة صنف جديد: ${newItem.name}`,
      details: `الكمية: ${newItem.quantity} ${newItem.unit} - سعر البيع: ${newItem.salePrice} ${settings.currency} - الباركود: ${newItem.barcode || 'تلقائي'}`,
      performedBy: currentCashier.name,
      targetId: newItem.id,
      targetName: newItem.name,
    });

    // Save to Cloud in background
    if (canWriteToCloud && currentUser) {
      safeSetDoc(doc(db, 'users', currentUser.uid, 'items', newItem.id), newItem).catch(console.warn);
      safeSetDoc(doc(db, 'stores', currentUser.uid, 'items', newItem.id), newItem).catch(console.warn);
    }

    return newItem;
  };

  const updateItem = (id: string, updatedFields: Partial<Item>) => {
    const sanitizedFields = { ...updatedFields };
    if (sanitizedFields.barcode !== undefined) {
      sanitizedFields.barcode = String(sanitizedFields.barcode ?? '').trim();
    }
    if (sanitizedFields.name !== undefined) {
      sanitizedFields.name = String(sanitizedFields.name ?? '').trim();
    }

    const existing = items.find((i) => i.id === id);
    if (existing) {
      const diffs: ActivityChangeDiff[] = [];
      if (sanitizedFields.name !== undefined && sanitizedFields.name !== existing.name) {
        diffs.push({ label: 'اسم الصنف', oldVal: existing.name, newVal: sanitizedFields.name });
      }
      if (sanitizedFields.quantity !== undefined && sanitizedFields.quantity !== existing.quantity) {
        diffs.push({ label: 'الكمية', oldVal: existing.quantity, newVal: sanitizedFields.quantity });
      }
      if (sanitizedFields.salePrice !== undefined && sanitizedFields.salePrice !== existing.salePrice) {
        diffs.push({ label: 'سعر البيع', oldVal: `${existing.salePrice} ${settings.currency}`, newVal: `${sanitizedFields.salePrice} ${settings.currency}` });
      }
      if (sanitizedFields.costPrice !== undefined && sanitizedFields.costPrice !== existing.costPrice) {
        diffs.push({ label: 'سعر التكلفة', oldVal: `${existing.costPrice} ${settings.currency}`, newVal: `${sanitizedFields.costPrice} ${settings.currency}` });
      }
      if (sanitizedFields.barcode !== undefined && sanitizedFields.barcode !== existing.barcode) {
        diffs.push({ label: 'الباركود', oldVal: existing.barcode, newVal: sanitizedFields.barcode });
      }

      logActivity({
        category: 'INVENTORY',
        actionType: 'ITEM_UPDATE',
        title: `تعديل بيانات الصنف: ${existing.name}`,
        details: diffs.length > 0
          ? `تم تعديل ${diffs.map((d) => `${d.label} من [${d.oldVal}] إلى [${d.newVal}]`).join('، ')}`
          : `تم تحديث بيانات الصنف ${existing.name}`,
        performedBy: currentCashier.name,
        targetId: id,
        targetName: existing.name,
        diffs: diffs.length > 0 ? diffs : undefined,
      });
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            ...sanitizedFields,
            updatedAt: new Date().toISOString(),
          };
          if (canWriteToCloud && currentUser) {
            safeSetDoc(doc(db, 'users', currentUser.uid, 'items', id), updated, { merge: true }).catch(console.warn);
            safeSetDoc(doc(db, 'stores', currentUser.uid, 'items', id), updated, { merge: true }).catch(console.warn);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const deleteItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (target) {
      logActivity({
        category: 'INVENTORY',
        actionType: 'ITEM_DELETE',
        title: `حذف صنف: ${target.name}`,
        details: `تم حذف الصنف (باركود: ${target.barcode}) برصيد ${target.quantity} ${target.unit}`,
        performedBy: currentCashier.name,
        targetId: id,
        targetName: target.name,
      });
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (canWriteToCloud && currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'items', id)).catch(console.warn);
      deleteDoc(doc(db, 'stores', currentUser.uid, 'items', id)).catch(console.warn);
    }
  };

  const findItemByBarcode = (barcode: string): Item | undefined => {
    if (barcode === undefined || barcode === null) return undefined;
    const clean = String(barcode).trim().toLowerCase();
    if (!clean) return undefined;
    return items.find((i) => {
      const bCode = String(i?.barcode ?? '').trim().toLowerCase();
      const skuCode = String(i?.sku ?? '').trim().toLowerCase();
      return bCode === clean || (skuCode !== '' && skuCode === clean);
    });
  };

  const saveProduct = useCallback(
    (productName: string, salePrice: number | string, productImage?: string): Item => {
      try {
        console.log('saveProduct initiated:', { productName, salePrice, hasImage: !!productImage });
        const price = typeof salePrice === 'string' ? parseFloat(salePrice) || 0 : salePrice;
        const safeImg = sanitizeProductImage(productImage, DEFAULT_PRODUCT_IMAGE);
        
        const newItem = addItem({
          barcode: `628${Math.floor(100000000 + Math.random() * 900000000)}`,
          name: String(productName || '').trim(),
          category: 'مواد غذائية',
          quantity: 50,
          costPrice: Math.round(price * 0.75 * 100) / 100,
          salePrice: price,
          price: price,
          image: safeImg,
          imageUrl: safeImg,
          available: true,
          unit: 'حبة',
          minStockAlert: 5,
        });

        try {
          const existing = JSON.parse(localStorage.getItem('qaryati_products') || '[]');
          const entry = {
            id: newItem.id,
            name: newItem.name,
            price: newItem.salePrice,
            image: newItem.image,
            available: true,
          };
          const updated = [entry, ...existing.filter((p: any) => String(p.id) !== String(newItem.id))];
          localStorage.setItem('qaryati_products', JSON.stringify(updated));
          console.log('qaryati_products successfully updated in localStorage');
        } catch (err) {
          console.error('Error updating qaryati_products in localStorage:', err);
        }

        showNotification('تم إضافة الصنف بنجاح وسيعرض في المتجر فوراً!', 'success');
        return newItem;
      } catch (fatalErr) {
        console.error('Fatal error in saveProduct:', fatalErr);
        showNotification('تعذر حفظ الصنف، يرجى مراجعة الكونسول لمعرفة السبب', 'error');
        throw fatalErr;
      }
    },
    [addItem, showNotification]
  );

  /**
   * دالة بسيطة ومحلية تتيح للتاجر (المشرف) إعادة تعيين كلمة مرور الكاشير عند نسيانها
   * دون المساس بقية ملفات المشروع أو تعديل التصميم القائم.
   */
  const resetCashierPassword = useCallback(
    (
      cashierIdOrName?: string,
      newPassword?: string
    ): { success: boolean; message: string; cashierName?: string; newPassword?: string } => {
      try {
        const passToSet = newPassword && newPassword.trim() ? newPassword.trim() : '1234';

        // البحث عن الكاشير المطابق بالمعرف أو الاسم
        let target = cashiers.find(
          (c) =>
            c.id === cashierIdOrName ||
            c.name.trim().toLowerCase() === (cashierIdOrName || '').trim().toLowerCase()
        );

        // إذا لم يحدد أو لم يوجد، ابحث عن كاشير المبيعات أو أول حساب بصلاحية كاشير
        if (!target) {
          target =
            cashiers.find(
              (c) =>
                c.role === 'CASHIER' ||
                (c.role?.includes('كاشير') && !c.role?.includes('مدير') && !c.role?.includes('مشرف'))
            ) ||
            (cashiers.length > 1 ? cashiers[1] : cashiers[0]);
        }

        if (!target) {
          const errMsg = language === 'ar' ? 'لم يتم العثور على حساب الكاشير.' : 'Cashier account not found.';
          showNotification(errMsg, 'error');
          return { success: false, message: errMsg };
        }

        const updated = cashiers.map((c) => {
          if (c.id === target!.id) {
            return {
              ...c,
              password: passToSet,
              pin: passToSet,
            };
          }
          return c;
        });

        setCashiers(updated);
        try {
          localStorage.setItem(userPrefix + STORAGE_KEYS.CASHIERS, JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to save cashiers to localStorage:', e);
        }

        // مزامنة مع المستخدمين المحليين إذا كان مسجلاً لدخول محلي
        try {
          const LOCAL_USERS_KEY = 'flowapp_v4_local_users';
          const savedUsers = localStorage.getItem(LOCAL_USERS_KEY);
          if (savedUsers) {
            const parsed = JSON.parse(savedUsers);
            let anyUpdated = false;
            for (const key of Object.keys(parsed)) {
              if (
                parsed[key]?.profile?.role === 'CASHIER' ||
                key.toLowerCase().includes('cashier') ||
                parsed[key]?.profile?.displayName === target.name
              ) {
                parsed[key].passwordHash = passToSet;
                anyUpdated = true;
              }
            }
            if (anyUpdated) {
              localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(parsed));
            }
          }
        } catch (err) {
          console.warn('Local users sync note:', err);
        }

        logActivity({
          category: 'SETTINGS',
          actionType: 'SETTINGS_UPDATE',
          summary: `إعادة تعيين كلمة مرور الكاشير (${target.name}) بواسطة التاجر المشرف`,
          details: { cashierId: target.id, cashierName: target.name },
          performedBy: 'التاجر (المشرف)',
        });

        const successMsg =
          language === 'ar'
            ? `تمت استعادة وإعادة تعيين كلمة مرور الكاشير (${target.name}) بنجاح! كلمة المرور الجديدة: ${passToSet}`
            : `Cashier (${target.name}) password has been successfully reset! New password: ${passToSet}`;

        showNotification(successMsg, 'success');

        return {
          success: true,
          message: successMsg,
          cashierName: target.name,
          newPassword: passToSet,
        };
      } catch (err: any) {
        console.error('resetCashierPassword error:', err);
        const errMsg = language === 'ar' ? 'تعذر إعادة تعيين كلمة المرور.' : 'Failed to reset password.';
        showNotification(errMsg, 'error');
        return { success: false, message: errMsg };
      }
    },
    [cashiers, language, logActivity, showNotification, userPrefix]
  );

  // Global window attachment for interoperability with user's exact scripts
  useEffect(() => {
    (window as any).resetCashierPassword = (cashierIdOrName?: string, newPassword?: string) => {
      return resetCashierPassword(cashierIdOrName, newPassword);
    };

    (window as any).saveProduct = (productName: string, salePrice: number | string, productImage?: string) => {
      try {
        return saveProduct(productName, salePrice, productImage);
      } catch (err) {
        console.error('window.saveProduct error:', err);
        return null;
      }
    };

    (window as any).loadStoreProducts = () => {
      const productContainer = document.getElementById('products-container');
      const products = JSON.parse(localStorage.getItem('qaryati_products') || '[]');
      if (!productContainer) return;
      if (products.length === 0) {
        productContainer.innerHTML = `
          <div class="col-span-full text-center p-6 text-slate-400">
            <p>لا توجد منتجات مضافة حالياً في المتجر.</p>
          </div>
        `;
        return;
      }
      productContainer.innerHTML = '';
      products.forEach((product: any) => {
        const productCard = `
          <div class="bg-gray-800 rounded-xl p-4 shadow-md flex flex-col justify-between border border-gray-700">
            <img src="${product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60'}" alt="${product.name}" class="w-full h-32 object-cover rounded-lg mb-3">
            <div>
              <h3 class="text-white font-bold text-lg mb-1">${product.name}</h3>
              <p class="text-emerald-400 font-semibold mb-3">${product.price} ريال</p>
            </div>
            <button onclick="window.dispatchEvent(new CustomEvent('qaryati:add-to-cart', { detail: { id: '${product.id}' } }))" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition cursor-pointer">
              إضافة إلى السلة
            </button>
          </div>
        `;
        productContainer.innerHTML += productCard;
      });
    };
  }, [saveProduct]);

  // DEBT MANAGEMENT
  const addDebtRecord = (
    record: Omit<DebtRecord, 'id' | 'payments' | 'loans'>
  ): DebtRecord => {
    const newDebt: DebtRecord = {
      ...record,
      id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      payments: [],
      loans: [],
    };

    setDebts((prev) => [newDebt, ...prev]);

    if (canWriteToCloud && currentUser) {
      safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', newDebt.id), newDebt).catch(console.warn);
    }

    return newDebt;
  };

  const addCashLoanRecord = (data: {
    personName: string;
    phone: string;
    amount: number;
    paymentSource: PaymentMethod;
    notes?: string;
  }): { debt: DebtRecord; loan: DebtAdvanceLoanItem } => {
    const person = String(data.personName || '').trim();
    const loanId = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = new Date().toISOString();
    const receiptNum = `LOAN-${Date.now().toString().slice(-6)}`;

    let existingDebt = debts.find(
      (d) =>
        d.personName.trim().toLowerCase() === person.toLowerCase() &&
        d.type === 'PERSONAL_LOAN'
    );

    const newLoanItem: DebtAdvanceLoanItem = {
      id: loanId,
      debtId: existingDebt ? existingDebt.id : '',
      date: nowIso,
      amount: data.amount,
      paymentSource: data.paymentSource,
      ...(data.notes ? { notes: data.notes } : {}),
      receiptNumber: receiptNum,
      recordedBy: currentCashier.name,
    };

    if (existingDebt) {
      const updatedDebt: DebtRecord = {
        ...existingDebt,
        phone: data.phone || existingDebt.phone,
        totalDebt: Number((existingDebt.totalDebt + data.amount).toFixed(2)),
        remainingDebt: Number((existingDebt.remainingDebt + data.amount).toFixed(2)),
        lastTransactionDate: nowIso,
        loans: [newLoanItem, ...(existingDebt.loans || [])],
      };

      setDebts((prev) =>
        prev.map((d) => (d.id === existingDebt!.id ? updatedDebt : d))
      );

      if (canWriteToCloud && currentUser) {
        safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', updatedDebt.id), updatedDebt).catch(console.warn);
      }

      return { debt: updatedDebt, loan: newLoanItem };
    } else {
      const debtId = `debt_loan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      newLoanItem.debtId = debtId;

      const createdDebt: DebtRecord = {
        id: debtId,
        merchantId: activeMerchantId,
        personName: person,
        phone: data.phone,
        type: 'PERSONAL_LOAN',
        category: 'CASH_LOAN',
        totalDebt: data.amount,
        paidDebt: 0,
        remainingDebt: data.amount,
        lastTransactionDate: nowIso,
        notes: data.notes || 'سلفة نقدية',
        payments: [],
        loans: [newLoanItem],
      };

      setDebts((prev) => [createdDebt, ...prev]);

      if (canWriteToCloud && currentUser) {
        safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', createdDebt.id), createdDebt).catch(console.warn);
      }

      return { debt: createdDebt, loan: newLoanItem };
    }
  };

  const addLoanAdvanceToDebt = (
    debtId: string,
    amount: number,
    paymentSource: PaymentMethod,
    notes?: string
  ): DebtAdvanceLoanItem => {
    const loanItem: DebtAdvanceLoanItem = {
      id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      debtId,
      date: new Date().toISOString(),
      amount,
      paymentSource,
      ...(notes ? { notes } : {}),
      receiptNumber: `ADV-${Date.now().toString().slice(-6)}`,
      recordedBy: currentCashier.name,
    };

    setDebts((prev) =>
      prev.map((debt) => {
        if (debt.id === debtId) {
          const updated: DebtRecord = {
            ...debt,
            totalDebt: Number((debt.totalDebt + amount).toFixed(2)),
            remainingDebt: Number((debt.remainingDebt + amount).toFixed(2)),
            lastTransactionDate: new Date().toISOString(),
            loans: [loanItem, ...(debt.loans || [])],
          };
          if (canWriteToCloud && currentUser) {
            safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', debtId), updated).catch(console.warn);
          }
          return updated;
        }
        return debt;
      })
    );

    const targetDebt = debts.find((d) => d.id === debtId);
    logActivity({
      category: 'ACCOUNTS',
      actionType: 'DEBT_LOAN',
      title: `سلفة نقدية / إضافة دين: ${amount} ${settings.currency}`,
      details: `تمت إضافة سلفة/دين على (${targetDebt?.personName || 'شخص'}) بقيمة ${amount} ${settings.currency} - سند: ${loanItem.receiptNumber}`,
      performedBy: currentCashier.name,
      targetId: debtId,
      targetName: targetDebt?.personName,
    });

    return loanItem;
  };

  const recordDebtPayment = (
    debtId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ): DebtPaymentHistoryItem => {
    const paymentItem: DebtPaymentHistoryItem = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      debtId,
      date: new Date().toISOString(),
      amount,
      paymentMethod,
      ...(notes ? { notes } : {}),
      receiptNumber: `PAY-${Date.now().toString().slice(-6)}`,
      recordedBy: currentCashier.name,
    };

    const targetDebt = debts.find((d) => d.id === debtId);
    logActivity({
      category: 'ACCOUNTS',
      actionType: 'DEBT_PAYMENT',
      title: `سداد دين: ${amount} ${settings.currency}`,
      details: `تم تسجيل سداد من (${targetDebt?.personName || 'شخص'}) بقيمة ${amount} ${settings.currency} (${paymentMethod}) - سند: ${paymentItem.receiptNumber}`,
      performedBy: currentCashier.name,
      targetId: debtId,
      targetName: targetDebt?.personName,
    });

    setDebts((prev) =>
      prev.map((debt) => {
        if (debt.id === debtId) {
          const newPaid = Number((debt.paidDebt + amount).toFixed(2));
          const newRemaining = Number(Math.max(0, debt.totalDebt - newPaid).toFixed(2));
          const updated: DebtRecord = {
            ...debt,
            paidDebt: newPaid,
            remainingDebt: newRemaining,
            lastTransactionDate: new Date().toISOString(),
            payments: [paymentItem, ...debt.payments],
          };
          if (canWriteToCloud && currentUser) {
            safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', debtId), updated).catch(console.warn);
          }
          return updated;
        }
        return debt;
      })
    );

    return paymentItem;
  };

  const deleteDebtRecord = (debtId: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    if (canWriteToCloud && currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'debts', debtId)).catch(console.warn);
    }
  };

  // TRANSACTION & SALE ENGINE
  const createTransaction = (data: {
    type: TransactionType;
    paymentMethod: PaymentMethod;
    partyName: string;
    partyPhone?: string;
    items: TransactionCartItem[];
    discount?: number;
    notes?: string;
    paidAmount?: number;
    isDirectReceipt?: boolean;
    status?: Transaction['status'];
    expectedDeliveryDate?: string;
  }): Transaction => {
    // Strict stock check for sales: Prevent overselling and reject transactions exceeding available shelf quantity
    if (data.type === 'SALE' || data.type === 'CREDIT_SALE') {
      for (const cartItem of data.items) {
        const invItem = items.find((i) => i.id === cartItem.itemId);
        const available = invItem ? invItem.quantity : 0;
        const unit = invItem?.unit || 'حبة';
        if (available <= 0) {
          showNotification(
            `لا يمكن إتمام البيع! الصنف (${cartItem.name}) نفد من المخزون تماماً (المتبقي: 0 ${unit}).`,
            'error'
          );
          throw new Error(
            `الصنف (${cartItem.name}) نفد من المخزون تماماً ولا يمكن إتمام البيع.`
          );
        }
        if (cartItem.quantity > available) {
          showNotification(
            `لا يمكن إتمام البيع! الصنف (${cartItem.name}) الكمية المطلوبة (${cartItem.quantity} ${unit}) تتجاوز رصيد الرف المتبقي (${available} ${unit}).`,
            'error'
          );
          throw new Error(
            `الكمية المطلوبة (${cartItem.quantity}) للصنف (${cartItem.name}) تتجاوز رصيد الرف المتبقي (${available} ${unit}).`
          );
        }
      }
    }

    const subtotal = data.items.reduce((acc, item) => acc + item.total, 0);
    const discount = data.discount || 0;
    const totalAmount = Math.max(0, subtotal - discount);

    const isSupplyOrder =
      data.type === 'ORDER_GOODS_CASH' || data.type === 'ORDER_GOODS_CREDIT';
    const isDirect = data.isDirectReceipt === true;

    // Supply orders are PENDING_RECEIPT by default until physically received in warehouse!
    const initialStatus: Transaction['status'] =
      data.status || (isSupplyOrder && !isDirect ? 'PENDING_RECEIPT' : 'COMPLETED');

    let paidAmount = totalAmount;
    let remainingDebt = 0;

    if (
      data.type === 'CREDIT_SALE' ||
      data.type === 'ORDER_GOODS_CREDIT'
    ) {
      paidAmount = data.paidAmount !== undefined ? data.paidAmount : 0;
      remainingDebt = Math.max(0, totalAmount - paidAmount);
    }

    const formattedCartItems: TransactionCartItem[] = data.items.map((it) => ({
      ...it,
      receivedQuantity: initialStatus === 'COMPLETED' ? it.quantity : 0,
    }));

    const invoicePrefix = isSupplyOrder && !isDirect ? 'PO-' : 'INV-';
    const newTransaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      merchantId: activeMerchantId,
      invoiceNumber: `${invoicePrefix}${Date.now().toString().slice(-7)}`,
      type: data.type,
      paymentMethod: data.paymentMethod,
      partyName: data.partyName,
      ...(data.partyPhone ? { partyPhone: data.partyPhone } : {}),
      cashierName: currentCashier.name,
      items: formattedCartItems,
      subtotal,
      discount,
      tax: 0,
      totalAmount,
      paidAmount,
      remainingDebt,
      ...(data.notes ? { notes: data.notes } : {}),
      timestamp: new Date().toISOString(),
      status: initialStatus,
      isDirectReceipt: isDirect,
      ...(initialStatus === 'COMPLETED' ? {
        receivedAt: new Date().toISOString(),
        receivedBy: currentCashier.name,
      } : {}),
      ...(data.expectedDeliveryDate ? { expectedDeliveryDate: data.expectedDeliveryDate } : {}),
    };

    // 1. Update items inventory stock ONLY if transaction is COMPLETED (e.g. Sales or Direct Receipt)
    // Pending supply orders MUST NOT inflate stock or remove low stock alerts until physically received!
    if (initialStatus === 'COMPLETED') {
      setItems((prevItems) =>
        prevItems.map((invItem) => {
          const matchedCart = data.items.find((c) => c.itemId === invItem.id);
          if (!matchedCart) return invItem;

          let newQty = invItem.quantity;
          if (data.type === 'SALE' || data.type === 'CREDIT_SALE') {
            newQty = Math.max(0, invItem.quantity - matchedCart.quantity);
          } else if (
            data.type === 'PURCHASE' ||
            data.type === 'ORDER_GOODS_CASH' ||
            data.type === 'ORDER_GOODS_CREDIT'
          ) {
            newQty = invItem.quantity + matchedCart.quantity;
          }

          const updated = {
            ...invItem,
            quantity: newQty,
            updatedAt: new Date().toISOString(),
          };

          if (canWriteToCloud && currentUser) {
            safeSetDoc(doc(db, 'users', currentUser.uid, 'items', invItem.id), updated, { merge: true }).catch(console.warn);
          }

          return updated;
        })
      );
    }

    // 2. Automatically record debt if there is remaining credit AND transaction is completed (or credit sale)
    if (remainingDebt > 0 && initialStatus === 'COMPLETED') {
      const debtType =
        data.type === 'ORDER_GOODS_CREDIT' ? 'SUPPLIER' : 'CUSTOMER';
      const debtCategory =
        data.type === 'ORDER_GOODS_CREDIT' ? 'SUPPLIER_CREDIT' : 'SALE_CREDIT';
      const person = String(data.partyName || '').trim();

      const existingDebt = debts.find(
        (d) =>
          d.personName.trim().toLowerCase() === person.toLowerCase() &&
          d.type === debtType
      );

      if (existingDebt) {
        const updatedDebt: DebtRecord = {
          ...existingDebt,
          phone: data.partyPhone || existingDebt.phone,
          totalDebt: Number((existingDebt.totalDebt + remainingDebt).toFixed(2)),
          remainingDebt: Number((existingDebt.remainingDebt + remainingDebt).toFixed(2)),
          lastTransactionDate: new Date().toISOString(),
        };

        setDebts((prev) =>
          prev.map((d) => (d.id === existingDebt.id ? updatedDebt : d))
        );

        if (canWriteToCloud && currentUser) {
          safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', updatedDebt.id), updatedDebt).catch(console.warn);
        }
      } else {
        const newDebtRecord: DebtRecord = {
          id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          personName: person,
          phone: data.partyPhone || '',
          type: debtType,
          category: debtCategory,
          totalDebt: remainingDebt,
          paidDebt: 0,
          remainingDebt: remainingDebt,
          lastTransactionDate: new Date().toISOString(),
          notes: data.notes || `فاتورة آجل ${newTransaction.invoiceNumber}`,
          payments: [],
          loans: [],
        };

        setDebts((prev) => [newDebtRecord, ...prev]);

        if (canWriteToCloud && currentUser) {
          safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', newDebtRecord.id), newDebtRecord).catch(console.warn);
        }
      }
    }

    // 3. Add to Transactions
    setTransactions((prev) => [newTransaction, ...prev]);

    const isSaleTx = newTransaction.type === 'SALE' || newTransaction.type === 'CREDIT_SALE';
    const actionLabel =
      newTransaction.type === 'CREDIT_SALE'
        ? 'عملية بيع آجل'
        : newTransaction.type === 'SALE'
        ? 'عملية بيع نقدي'
        : newTransaction.type === 'ORDER_GOODS_CREDIT'
        ? 'طلب بضاعة آجل'
        : 'طلب بضاعة نقدي';

    logActivity({
      category: isSaleTx ? 'SALES' : 'INVENTORY',
      actionType: isSaleTx ? 'SALE_TRANSACTION' : 'PURCHASE_TRANSACTION',
      title: `${actionLabel} - ${newTransaction.invoiceNumber}`,
      details: `المبلغ: ${newTransaction.totalAmount} ${settings.currency} (${newTransaction.items.length} أصناف) - العميل/المورد: ${newTransaction.partyName || 'عميل نقدي'} - الدفع: ${newTransaction.paymentMethod}`,
      performedBy: currentCashier.name,
      targetId: newTransaction.id,
      targetName: newTransaction.invoiceNumber,
    });

    if (canWriteToCloud && currentUser) {
      safeSetDoc(doc(db, 'users', currentUser.uid, 'transactions', newTransaction.id), newTransaction).catch(console.warn);
    }

    return newTransaction;
  };

  // PENDING SUPPLY ORDERS TRACKING (طلبيات التوريد بانتظار الاستلام الفعلي)
  const pendingSupplyOrders = useMemo(() => {
    return transactions.filter(
      (tx) =>
        (tx.type === 'ORDER_GOODS_CASH' || tx.type === 'ORDER_GOODS_CREDIT') &&
        (tx.status === 'PENDING_RECEIPT' || tx.status === 'PARTIALLY_RECEIVED')
    );
  }, [transactions]);

  const getPendingOrderQtyForItem = (itemId: string): number => {
    let pendingCount = 0;
    pendingSupplyOrders.forEach((order) => {
      order.items.forEach((ci) => {
        if (ci.itemId === itemId) {
          const rec = ci.receivedQuantity || 0;
          pendingCount += Math.max(0, ci.quantity - rec);
        }
      });
    });
    return pendingCount;
  };

  // خاصية استلام وتوريد الشحنات الناقصة وإضافتها رسمياً للمخزن
  const receiveSupplyOrder = (
    orderId: string,
    receiptData: {
      receivedItems: {
        itemId: string;
        receivedQuantity: number;
        costPrice?: number;
      }[];
      paidAmount?: number;
      paymentMethod?: PaymentMethod;
      receiverName?: string;
      notes?: string;
    }
  ): Transaction | null => {
    const order = transactions.find((t) => t.id === orderId);
    if (!order) return null;

    const receiver = receiptData.receiverName || currentCashier.name;
    const nowIso = new Date().toISOString();

    const receivedMap = new Map<string, { qty: number; cost?: number }>();
    receiptData.receivedItems.forEach((r) => {
      receivedMap.set(r.itemId, { qty: r.receivedQuantity, cost: r.costPrice });
    });

    // 1. Increment items in store inventory now that they are physically received!
    setItems((prevItems) =>
      prevItems.map((invItem) => {
        const rec = receivedMap.get(invItem.id);
        if (!rec || rec.qty <= 0) return invItem;

        const updated: Item = {
          ...invItem,
          quantity: invItem.quantity + rec.qty,
          costPrice: rec.cost && rec.cost > 0 ? rec.cost : invItem.costPrice,
          updatedAt: nowIso,
        };

        if (currentUser) {
          safeSetDoc(doc(db, 'users', currentUser.uid, 'items', invItem.id), updated, { merge: true }).catch(console.warn);
        }
        return updated;
      })
    );

    // 2. Update order items with newly received quantities
    let allFulfilled = true;
    let anyFulfilled = false;
    let totalReceivedCostValue = 0;

    const updatedCartItems: TransactionCartItem[] = order.items.map((cartItem) => {
      const rec = receivedMap.get(cartItem.itemId);
      const newlyReceived = rec ? rec.qty : 0;
      const prevReceived = cartItem.receivedQuantity || 0;
      const totalReceived = prevReceived + newlyReceived;

      if (totalReceived < cartItem.quantity) {
        allFulfilled = false;
      }
      if (totalReceived > 0) {
        anyFulfilled = true;
      }

      const itemCost = rec?.cost && rec.cost > 0 ? rec.cost : cartItem.costPrice;
      totalReceivedCostValue += totalReceived * itemCost;

      return {
        ...cartItem,
        receivedQuantity: totalReceived,
        costPrice: itemCost,
        total: totalReceived * itemCost,
      };
    });

    const newStatus: Transaction['status'] = allFulfilled
      ? 'COMPLETED'
      : anyFulfilled
      ? 'PARTIALLY_RECEIVED'
      : 'PENDING_RECEIPT';

    const actualPaid =
      receiptData.paidAmount !== undefined ? receiptData.paidAmount : order.paidAmount;
    const actualRemainingDebt =
      order.type === 'ORDER_GOODS_CREDIT'
        ? Math.max(0, totalReceivedCostValue - actualPaid)
        : 0;

    const updatedTransaction: Transaction = {
      ...order,
      items: updatedCartItems,
      status: newStatus,
      receivedAt: nowIso,
      receivedBy: receiver,
      paidAmount: actualPaid,
      remainingDebt: actualRemainingDebt,
      totalAmount: totalReceivedCostValue > 0 ? totalReceivedCostValue : order.totalAmount,
      notes: receiptData.notes
        ? `${order.notes ? order.notes + ' | ' : ''}استلام بواسطة ${receiver}: ${receiptData.notes}`
        : order.notes,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === orderId ? updatedTransaction : t))
    );

    if (canWriteToCloud && currentUser) {
      safeSetDoc(
        doc(db, 'users', currentUser.uid, 'transactions', orderId),
        updatedTransaction,
        { merge: true }
      ).catch(console.warn);
    }

    // 3. If credit order, now that goods are physically received and inspected, record supplier debt
    if (actualRemainingDebt > 0 && order.type === 'ORDER_GOODS_CREDIT') {
      const person = String(order.partyName || '').trim();
      const existingDebt = debts.find(
        (d) =>
          d.personName.trim().toLowerCase() === person.toLowerCase() &&
          d.type === 'SUPPLIER'
      );

      if (existingDebt) {
        const updatedDebt: DebtRecord = {
          ...existingDebt,
          phone: order.partyPhone || existingDebt.phone,
          totalDebt: Number((existingDebt.totalDebt + actualRemainingDebt).toFixed(2)),
          remainingDebt: Number((existingDebt.remainingDebt + actualRemainingDebt).toFixed(2)),
          lastTransactionDate: nowIso,
        };
        setDebts((prev) =>
          prev.map((d) => (d.id === existingDebt.id ? updatedDebt : d))
        );
        if (canWriteToCloud && currentUser) {
          safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', updatedDebt.id), updatedDebt).catch(console.warn);
        }
      } else {
        const newDebtRecord: DebtRecord = {
          id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          personName: person,
          phone: order.partyPhone || '',
          type: 'SUPPLIER',
          category: 'SUPPLIER_CREDIT',
          totalDebt: actualRemainingDebt,
          paidDebt: 0,
          remainingDebt: actualRemainingDebt,
          lastTransactionDate: nowIso,
          notes: `فاتورة استلام وتوريد بضاعة ${order.invoiceNumber}`,
          payments: [],
          loans: [],
        };
        setDebts((prev) => [newDebtRecord, ...prev]);
        if (canWriteToCloud && currentUser) {
          safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', newDebtRecord.id), newDebtRecord).catch(console.warn);
        }
      }
    }

    return updatedTransaction;
  };

  const cancelSupplyOrder = (orderId: string, reason?: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === orderId) {
          const updated: Transaction = {
            ...t,
            status: 'CANCELLED',
            notes: reason ? `${t.notes || ''} [ملغي: ${reason}]` : `${t.notes || ''} [تم إلغاء الطلبية]`,
          };
          if (canWriteToCloud && currentUser) {
            safeSetDoc(doc(db, 'users', currentUser.uid, 'transactions', orderId), updated, { merge: true }).catch(console.warn);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const deleteTransaction = (id: string, restoreStock: boolean = true) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    // 1. If restoreStock is enabled and transaction was completed, reverse inventory changes
    if (restoreStock && targetTx.status === 'COMPLETED' && targetTx.items && targetTx.items.length > 0) {
      setItems((prevItems) =>
        prevItems.map((invItem) => {
          const matched = targetTx.items.find((c) => c.itemId === invItem.id);
          if (!matched) return invItem;

          let newQty = invItem.quantity;
          if (targetTx.type === 'SALE' || targetTx.type === 'CREDIT_SALE') {
            // Restore sold quantity back to inventory
            newQty = invItem.quantity + (matched.quantity || 0);
          } else if (
            targetTx.type === 'PURCHASE' ||
            targetTx.type === 'ORDER_GOODS_CASH' ||
            targetTx.type === 'ORDER_GOODS_CREDIT'
          ) {
            // Deduct purchased quantity from inventory
            const qtyToDeduct = matched.receivedQuantity || matched.quantity || 0;
            newQty = Math.max(0, invItem.quantity - qtyToDeduct);
          }

          const updatedItem = {
            ...invItem,
            quantity: newQty,
            updatedAt: new Date().toISOString(),
          };

          if (canWriteToCloud && currentUser) {
            safeSetDoc(doc(db, 'users', currentUser.uid, 'items', invItem.id), updatedItem, { merge: true }).catch(console.warn);
          }

          return updatedItem;
        })
      );
    }

    // 2. If it was a credit transaction with remaining debt, reverse the remaining debt on the person if found
    if (targetTx.remainingDebt > 0 && targetTx.partyName) {
      const debtType = targetTx.type === 'ORDER_GOODS_CREDIT' ? 'SUPPLIER' : 'CUSTOMER';
      const person = targetTx.partyName.trim().toLowerCase();
      setDebts((prevDebts) =>
        prevDebts.map((d) => {
          if (d.personName.trim().toLowerCase() === person && d.type === debtType) {
            const newTotalDebt = Math.max(0, d.totalDebt - targetTx.remainingDebt);
            const newRemaining = Math.max(0, d.remainingDebt - targetTx.remainingDebt);
            const updatedDebt: DebtRecord = {
              ...d,
              totalDebt: Number(newTotalDebt.toFixed(2)),
              remainingDebt: Number(newRemaining.toFixed(2)),
              lastTransactionDate: new Date().toISOString(),
            };
            if (canWriteToCloud && currentUser) {
              safeSetDoc(doc(db, 'users', currentUser.uid, 'debts', d.id), updatedDebt, { merge: true }).catch(console.warn);
            }
            return updatedDebt;
          }
          return d;
        })
      );
    }

    // 3. Remove transaction from state and Firestore
    if (targetTx) {
      logActivity({
        category: 'SALES',
        actionType: 'TRANSACTION_DELETE',
        title: `حذف الفاتورة: ${targetTx.invoiceNumber}`,
        details: `تم إلغاء وحذف الفاتورة بقيمة ${targetTx.totalAmount} ${settings.currency} - الطرف: ${targetTx.partyName || 'نقدي'} بواسطة ${currentCashier.name}`,
        performedBy: currentCashier.name,
        targetId: id,
        targetName: targetTx.invoiceNumber,
      });
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (canWriteToCloud && currentUser) {
      deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', id)).catch(console.warn);
    }

    showNotification(
      language === 'ar' ? 'تم حذف الحركة المالية وتحديث الحسابات بنجاح' : 'Transaction deleted successfully',
      'info'
    );
  };

  // INVENTORY SUMMARY COMPUTATIONS
  const inventoryStats = useMemo(() => {
    let totalStockUnits = 0;
    let totalCostValue = 0;
    let totalSaleValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockList: Item[] = [];

    items.forEach((item) => {
      const qty = item.quantity || 0;
      const threshold = item.minStockAlert !== undefined && item.minStockAlert !== null ? item.minStockAlert : 5;
      totalStockUnits += qty;
      totalCostValue += (item.costPrice || 0) * qty;
      totalSaleValue += (item.salePrice || 0) * qty;

      if (qty <= 0) {
        outOfStockCount++;
      }

      if (qty <= threshold) {
        lowStockCount++;
        lowStockList.push(item);
      }
    });

    // Sort lowStockList with most critical first (out of stock first, then lowest ratio)
    lowStockList.sort((a, b) => {
      const thresholdA = a.minStockAlert || 5;
      const thresholdB = b.minStockAlert || 5;
      const ratioA = (a.quantity || 0) / (thresholdA || 1);
      const ratioB = (b.quantity || 0) / (thresholdB || 1);
      return ratioA - ratioB;
    });

    return {
      totalItemsCount: items.length,
      totalStockUnits,
      totalCostValue: Number(totalCostValue.toFixed(2)),
      totalSaleValue: Number(totalSaleValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      lowStockItems: lowStockList,
    };
  }, [items]);

  // FINANCIAL LIQUIDITY COMPUTATIONS
  const financialSummary = useMemo(() => {
    let cashBalance = 0;
    let bankTransferBalance = 0;
    let cardBalance = 0;
    let totalSales = 0;
    let totalPurchases = 0;
    let netProfit = 0;

    transactions.forEach((tx) => {
      const isIncome = tx.type === 'SALE' || tx.type === 'CREDIT_SALE';
      const isExpense =
        tx.type === 'PURCHASE' ||
        tx.type === 'ORDER_GOODS_CASH' ||
        tx.type === 'ORDER_GOODS_CREDIT';

      const amountToTrack = tx.paidAmount !== undefined ? tx.paidAmount : tx.totalAmount;

      if (isIncome) {
        totalSales += (tx.totalAmount || 0);
        if (tx.items && tx.items.length > 0) {
          let txProfit = 0;
          tx.items.forEach((it) => {
            const sale = (it.unitPrice || 0) * (it.quantity || 1);
            const cost = (it.costPrice || 0) * (it.quantity || 1);
            txProfit += sale - cost;
          });
          if (tx.discount) txProfit -= tx.discount;
          netProfit += txProfit;
        }
        if (tx.paymentMethod === 'CASH') cashBalance += amountToTrack;
        if (tx.paymentMethod === 'TRANSFER') bankTransferBalance += amountToTrack;
        if (tx.paymentMethod === 'CARD') cardBalance += amountToTrack;
      } else if (isExpense) {
        totalPurchases += (tx.totalAmount || 0);
        if (tx.paymentMethod === 'CASH') cashBalance -= amountToTrack;
        if (tx.paymentMethod === 'TRANSFER') bankTransferBalance -= amountToTrack;
        if (tx.paymentMethod === 'CARD') cardBalance -= amountToTrack;
      }
    });

    debts.forEach((d) => {
      d.loans?.forEach((l) => {
        if (l.paymentSource === 'CASH') cashBalance -= l.amount;
        if (l.paymentSource === 'TRANSFER') bankTransferBalance -= l.amount;
        if (l.paymentSource === 'CARD') cardBalance -= l.amount;
      });

      d.payments.forEach((p) => {
        if (d.type === 'CUSTOMER' || d.type === 'PERSONAL_LOAN') {
          if (p.paymentMethod === 'CASH') cashBalance += p.amount;
          if (p.paymentMethod === 'TRANSFER') bankTransferBalance += p.amount;
          if (p.paymentMethod === 'CARD') cardBalance += p.amount;
        } else if (d.type === 'SUPPLIER') {
          if (p.paymentMethod === 'CASH') cashBalance -= p.amount;
          if (p.paymentMethod === 'TRANSFER') bankTransferBalance -= p.amount;
          if (p.paymentMethod === 'CARD') cardBalance -= p.amount;
        }
      });
    });

    let totalCreditSalesDue = 0;
    let totalSupplierDebtsDue = 0;

    debts.forEach((d) => {
      if (d.type === 'CUSTOMER' || d.type === 'PERSONAL_LOAN') {
        totalCreditSalesDue += d.remainingDebt;
      }
      if (d.type === 'SUPPLIER') {
        totalSupplierDebtsDue += d.remainingDebt;
      }
    });

    return {
      cashBalance: Number(cashBalance.toFixed(2)),
      bankTransferBalance: Number(bankTransferBalance.toFixed(2)),
      cardBalance: Number(cardBalance.toFixed(2)),
      totalCreditSalesDue: Number(totalCreditSalesDue.toFixed(2)),
      totalSupplierDebtsDue: Number(totalSupplierDebtsDue.toFixed(2)),
      totalSales: Number(totalSales.toFixed(2)),
      totalPurchases: Number(totalPurchases.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    };
  }, [transactions, debts]);

  // Clear all data
  const clearAllData = async () => {
    setItems([]);
    setTransactions([]);
    setDebts([]);
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.ITEMS, JSON.stringify([]));
      localStorage.setItem(userPrefix + STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(userPrefix + STORAGE_KEYS.DEBTS, JSON.stringify([]));
      localStorage.setItem(userPrefix + 'flowapp_cleared_manually', 'true');
    } catch (e) {
      console.error(e);
    }

    if (canWriteToCloud && currentUser) {
      try {
        const batch = writeBatch(db);
        for (const it of items) {
          batch.delete(doc(db, 'users', currentUser.uid, 'items', it.id));
        }
        for (const tr of transactions) {
          batch.delete(doc(db, 'users', currentUser.uid, 'transactions', tr.id));
        }
        for (const dbRec of debts) {
          batch.delete(doc(db, 'users', currentUser.uid, 'debts', dbRec.id));
        }
        await batch.commit();
      } catch (e) {
        console.warn('Error clearing cloud collection:', e);
      }
    }
  };

  const resetToSampleData = async () => {
    try {
      localStorage.removeItem(userPrefix + 'flowapp_cleared_manually');
    } catch {}
    setItems(INITIAL_ITEMS);
    setTransactions(INITIAL_TRANSACTIONS);
    setDebts(INITIAL_DEBTS);
    try {
      localStorage.setItem(userPrefix + STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
      localStorage.setItem(userPrefix + STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      localStorage.setItem(userPrefix + STORAGE_KEYS.DEBTS, JSON.stringify(INITIAL_DEBTS));
    } catch (e) {
      console.error(e);
    }

    if (canWriteToCloud && currentUser) {
      setCloudSyncStatus('syncing');
      try {
        const batch = writeBatch(db);
        for (const it of INITIAL_ITEMS) {
          const itemRef = doc(db, 'users', currentUser.uid, 'items', it.id);
          safeBatchSet(batch, itemRef, it, { merge: true });
        }
        for (const tr of INITIAL_TRANSACTIONS) {
          const transRef = doc(db, 'users', currentUser.uid, 'transactions', tr.id);
          safeBatchSet(batch, transRef, tr, { merge: true });
        }
        for (const dbRec of INITIAL_DEBTS) {
          const debtRef = doc(db, 'users', currentUser.uid, 'debts', dbRec.id);
          safeBatchSet(batch, debtRef, dbRec, { merge: true });
        }
        await batch.commit();
        setCloudSyncStatus('synced');
      } catch (err) {
        console.warn('Error syncing sample data to cloud:', err);
      }
    }
  };

  // CLOUD BACKUP & DISASTER RECOVERY OPERATIONS
  const createCloudBackup = async (type: 'MANUAL' | 'AUTO' = 'MANUAL'): Promise<CloudBackupRecord> => {
    setIsBackingUp(true);
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const totalCost = items.reduce((acc, curr) => acc + (curr.costPrice || 0) * (curr.quantity || 0), 0);
    const totalSale = items.reduce((acc, curr) => acc + (curr.salePrice || 0) * (curr.quantity || 0), 0);

    const backupRecord: CloudBackupRecord = {
      id: backupId,
      createdAt: new Date().toISOString(),
      itemsCount: items.length,
      transactionsCount: transactions.length,
      debtsCount: debts.length,
      totalInventoryCost: Number(totalCost.toFixed(2)),
      totalInventorySale: Number(totalSale.toFixed(2)),
      storeName: settings.storeName || userProfile?.storeName || 'FlowApp Store',
      type: type,
      deviceInfo: typeof navigator !== 'undefined' ? `${navigator.platform || ''} (${navigator.userAgent?.slice(0, 40)}...)` : 'Web Device',
      data: {
        items: [...items],
        transactions: [...transactions],
        debts: [...debts],
        settings: { ...settings },
        cashiers: [...cashiers],
      },
    };

    // Update local backups immediately
    setCloudBackups((prev) => [backupRecord, ...prev.filter((b) => b.id !== backupId)]);

    // Update lastAutoBackupTimestamp in settings if auto
    if (type === 'AUTO') {
      updateSettings({ lastAutoBackupTimestamp: backupRecord.createdAt });
    }

    // Persist snapshot to Firestore if user logged in
    if (canWriteToCloud && currentUser) {
      try {
        const backupDocRef = doc(db, 'users', currentUser.uid, 'backups', backupId);
        await safeSetDoc(backupDocRef, backupRecord);
      } catch (e) {
        console.warn('Failed to upload backup to Firestore:', e);
      }
    }

    setIsBackingUp(false);
    return backupRecord;
  };

  const restoreCloudBackup = async (backup: CloudBackupRecord): Promise<void> => {
    if (!backup || !backup.data) return;
    setIsRestoring(true);

    try {
      const { items: bItems, transactions: bTransactions, debts: bDebts, settings: bSettings, cashiers: bCashiers } = backup.data;

      if (Array.isArray(bItems)) setItems(bItems);
      if (Array.isArray(bTransactions)) setTransactions(bTransactions);
      if (Array.isArray(bDebts)) setDebts(bDebts);
      if (bSettings) setSettings(bSettings);
      if (Array.isArray(bCashiers)) setCashiers(bCashiers);

      // Persist to user's local cache
      try {
        localStorage.setItem(userPrefix + STORAGE_KEYS.ITEMS, JSON.stringify(bItems || []));
        localStorage.setItem(userPrefix + STORAGE_KEYS.TRANSACTIONS, JSON.stringify(bTransactions || []));
        localStorage.setItem(userPrefix + STORAGE_KEYS.DEBTS, JSON.stringify(bDebts || []));
        if (bSettings) localStorage.setItem(userPrefix + STORAGE_KEYS.SETTINGS, JSON.stringify(bSettings));
        if (bCashiers) localStorage.setItem(userPrefix + STORAGE_KEYS.CASHIERS, JSON.stringify(bCashiers));
      } catch (e) {
        console.warn('Error persisting restored backup locally:', e);
      }

      // Sync restored state to Firestore active collections
      if (canWriteToCloud && currentUser) {
        const batch = writeBatch(db);

        // Update settings
        if (bSettings) {
          const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'store_config');
          safeBatchSet(batch, settingsRef, bSettings);
        }

        // Update items
        if (Array.isArray(bItems)) {
          for (const item of bItems) {
            const itemRef = doc(db, 'users', currentUser.uid, 'items', item.id);
            safeBatchSet(batch, itemRef, item);
          }
        }

        // Update debts
        if (Array.isArray(bDebts)) {
          for (const debt of bDebts) {
            const debtRef = doc(db, 'users', currentUser.uid, 'debts', debt.id);
            safeBatchSet(batch, debtRef, debt);
          }
        }

        await batch.commit();
        setCloudSyncStatus('synced');
      }
    } catch (e) {
      console.error('Error during backup restoration:', e);
    } finally {
      setIsRestoring(false);
    }
  };

  const deleteCloudBackup = async (backupId: string): Promise<void> => {
    setCloudBackups((prev) => prev.filter((b) => b.id !== backupId));

    if (canWriteToCloud && currentUser) {
      try {
        const backupDocRef = doc(db, 'users', currentUser.uid, 'backups', backupId);
        await deleteDoc(backupDocRef);
      } catch (e) {
        console.warn('Failed to delete backup from Firestore:', e);
      }
    }
  };

  // Automatic periodic backup timer
  useEffect(() => {
    // If auto backup is disabled explicitly, skip
    if (settings.autoBackupEnabled === false) return;
    // Don't auto-backup if there's no data at all
    if (items.length === 0 && transactions.length === 0 && debts.length === 0) return;

    const intervalMinutes = settings.autoBackupIntervalMinutes || 30;
    const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;

    const timer = setInterval(() => {
      console.log('Running automatic cloud backup snapshot...');
      createCloudBackup('AUTO').catch(console.warn);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.autoBackupEnabled, settings.autoBackupIntervalMinutes, items, transactions, debts, settings, cashiers, currentUser]);

  // Comprehensive manual database export to JSON
  const exportDataJSON = () => {
    const totalCost = items.reduce((acc, curr) => acc + (curr.costPrice || 0) * (curr.quantity || 0), 0);
    const totalSale = items.reduce((acc, curr) => acc + (curr.salePrice || 0) * (curr.quantity || 0), 0);
    const storeTitle = settings.storeName || userProfile?.storeName || 'FlowApp Store';

    const payload = {
      version: '2.0',
      databaseType: 'FlowApp_Store_Database_Snapshot',
      exportedAt: new Date().toISOString(),
      storeName: storeTitle,
      user: currentUser?.email || 'guest',
      summary: {
        totalItems: items.length,
        totalTransactions: transactions.length,
        totalDebts: debts.length,
        totalCashiers: cashiers.length,
        totalActivityLogs: activityLogs.length,
        totalInventoryCost: Number(totalCost.toFixed(2)),
        totalInventorySale: Number(totalSale.toFixed(2)),
      },
      data: {
        items: [...items],
        transactions: [...transactions],
        debts: [...debts],
        settings: { ...settings },
        cashiers: [...cashiers],
        activityLogs: [...activityLogs],
      },
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const safeStore = (storeTitle || 'store').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowapp_db_backup_${safeStore}_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);

    // Audit log entry
    logActivity({
      actionType: 'EXPORT',
      description: `تم تصدير وتنزيل نسخة احتياطية يدوية كاملة لقاعدة البيانات بصيغة JSON (${items.length} منتج، ${transactions.length} فاتورة، ${debts.length} دين)`,
      module: 'SETTINGS',
      actorEmail: currentUser?.email,
      actorName: userProfile?.displayName,
    });
  };

  // Restore import with validation, automatic rollback snapshot, and merge/replace mode
  const importDataJSON = async (
    jsonStr: string,
    options: { mode?: 'replace' | 'merge' } = { mode: 'replace' }
  ): Promise<{ success: boolean; error?: string; summary?: { itemsCount: number; transactionsCount: number; debtsCount: number } }> => {
    try {
      const parsed = JSON.parse(jsonStr);
      // Support version 2.0 (parsed.data) or version 1.0 (parsed directly)
      const dataPayload = (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object')
        ? parsed.data
        : parsed;

      const bItems = Array.isArray(dataPayload.items) ? dataPayload.items : [];
      const bTransactions = Array.isArray(dataPayload.transactions) ? dataPayload.transactions : [];
      const bDebts = Array.isArray(dataPayload.debts) ? dataPayload.debts : [];
      const bSettings = dataPayload.settings && typeof dataPayload.settings === 'object' ? dataPayload.settings : null;
      const bCashiers = Array.isArray(dataPayload.cashiers) ? dataPayload.cashiers : [];
      const bLogs = Array.isArray(dataPayload.activityLogs) ? dataPayload.activityLogs : [];

      if (!bItems.length && !bTransactions.length && !bDebts.length && !bSettings) {
        return { success: false, error: 'الملف لا يحتوي على بيانات متجر صالحة أو البنية غير متوافقة' };
      }

      // Automatically create a safety rollback backup before restoring!
      try {
        await createCloudBackup('AUTO');
      } catch (backupErr) {
        console.warn('Safety auto backup before JSON restore skipped:', backupErr);
      }

      let finalItems = [...bItems];
      let finalTransactions = [...bTransactions];
      let finalDebts = [...bDebts];
      let finalCashiers = [...bCashiers];
      let finalSettings = bSettings ? { ...settings, ...bSettings } : settings;
      let finalLogs = [...bLogs];

      if (options.mode === 'merge') {
        // Merge items by ID: update if existing, insert if new
        const itemMap = new Map(items.map((it) => [it.id, it]));
        bItems.forEach((it: any) => itemMap.set(it.id, it));
        finalItems = Array.from(itemMap.values());

        // Merge transactions by ID
        const txMap = new Map(transactions.map((tx) => [tx.id, tx]));
        bTransactions.forEach((tx: any) => txMap.set(tx.id, tx));
        finalTransactions = Array.from(txMap.values());

        // Merge debts by ID
        const debtMap = new Map(debts.map((d) => [d.id, d]));
        bDebts.forEach((d: any) => debtMap.set(d.id, d));
        finalDebts = Array.from(debtMap.values());

        // Merge cashiers by ID
        const cashierMap = new Map(cashiers.map((c) => [c.id, c]));
        bCashiers.forEach((c: any) => cashierMap.set(c.id, c));
        finalCashiers = Array.from(cashierMap.values());

        // Merge activity logs
        const logIdSet = new Set(activityLogs.map((l) => l.id));
        const nonDuplicateNewLogs = bLogs.filter((l: any) => !logIdSet.has(l.id));
        finalLogs = [...nonDuplicateNewLogs, ...activityLogs];
      }

      // Apply to React State
      setItems(finalItems);
      setTransactions(finalTransactions);
      setDebts(finalDebts);
      setCashiers(finalCashiers);
      if (finalSettings) setSettings(finalSettings);
      if (finalLogs.length) setActivityLogs(finalLogs);

      // Persist to local storage
      try {
        localStorage.setItem(userPrefix + STORAGE_KEYS.ITEMS, JSON.stringify(finalItems));
        localStorage.setItem(userPrefix + STORAGE_KEYS.TRANSACTIONS, JSON.stringify(finalTransactions));
        localStorage.setItem(userPrefix + STORAGE_KEYS.DEBTS, JSON.stringify(finalDebts));
        localStorage.setItem(userPrefix + STORAGE_KEYS.CASHIERS, JSON.stringify(finalCashiers));
        if (finalSettings) localStorage.setItem(userPrefix + STORAGE_KEYS.SETTINGS, JSON.stringify(finalSettings));
        localStorage.setItem(userPrefix + STORAGE_KEYS.LOGS, JSON.stringify(finalLogs));
      } catch (e) {
        console.warn('Failed to update localStorage during JSON import:', e);
      }

      // Sync to Firestore if user is authenticated
      if (canWriteToCloud && currentUser) {
        try {
          const batch = writeBatch(db);
          if (finalSettings) {
            const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'store_config');
            safeBatchSet(batch, settingsRef, finalSettings);
          }
          finalItems.slice(0, 400).forEach((item) => {
            const itemRef = doc(db, 'users', currentUser.uid, 'items', item.id);
            safeBatchSet(batch, itemRef, item);
          });
          finalDebts.slice(0, 100).forEach((debt) => {
            const debtRef = doc(db, 'users', currentUser.uid, 'debts', debt.id);
            safeBatchSet(batch, debtRef, debt);
          });
          await batch.commit();
          setCloudSyncStatus('synced');
        } catch (syncErr) {
          console.warn('Failed to sync imported JSON to Firestore:', syncErr);
        }
      }

      // Audit log entry
      logActivity({
        actionType: 'RESTORE',
        description: `تم استعادة وتأمين قاعدة البيانات من ملف JSON يدوي (${options.mode === 'merge' ? 'دمج ذكي' : 'استبدال كامل'}) - ${finalItems.length} منتج، ${finalTransactions.length} فاتورة`,
        module: 'SETTINGS',
        actorEmail: currentUser?.email,
        actorName: userProfile?.displayName,
      });

      return {
        success: true,
        summary: {
          itemsCount: finalItems.length,
          transactionsCount: finalTransactions.length,
          debtsCount: finalDebts.length,
        },
      };
    } catch (e: any) {
      console.error('Error importing JSON data:', e);
      return { success: false, error: e?.message || 'فشل قراءة ملف النسخة الاحتياطية' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL,
        activeTab,
        setActiveTab,
        items,
        transactions,
        debts,
        cashiers,
        currentCashier,
        setCurrentCashier,
        isCashierMode,
        resetCashierPassword,
        settings,
        updateSettings,
        cloudSyncStatus,
        syncToCloudNow,
        addItem,
        saveProduct,
        updateItem,
        deleteItem,
        findItemByBarcode,
        createTransaction,
        pendingSupplyOrders,
        getPendingOrderQtyForItem,
        receiveSupplyOrder,
        cancelSupplyOrder,
        deleteTransaction,
        addDebtRecord,
        addCashLoanRecord,
        addLoanAdvanceToDebt,
        recordDebtPayment,
        deleteDebtRecord,
        selectedStickerItemId,
        setSelectedStickerItemId,
        inventoryStats,
        financialSummary,
        cloudBackups,
        isBackingUp,
        isRestoring,
        createCloudBackup,
        restoreCloudBackup,
        deleteCloudBackup,
        resetToSampleData,
        clearAllData,
        exportDataJSON,
        importDataJSON,
        notification,
        showNotification,
        dismissNotification,
        activityLogs,
        logActivity,
        clearActivityLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
