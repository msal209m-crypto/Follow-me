import { getGlobalPreferences, formatGlobalCurrency } from './globalizationService';

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'PAYMENT' | 'REFUND' | 'COMMISSION';
  amount: number;
  currency: string;
  title: string;
  description: string;
  methodName?: string;
  timestamp: string;
  refNumber?: string;
}

export interface VillageWalletState {
  balance: number; // in active currency or SAR base
  currency: string;
  transactions: WalletTransaction[];
}

const WALLET_KEY = 'qaryati_village_wallet_v1';

const DEFAULT_WALLET: VillageWalletState = {
  balance: 350.0, // Default welcome test balance
  currency: 'SAR',
  transactions: [
    {
      id: 'tx_welcome',
      type: 'DEPOSIT',
      amount: 350.0,
      currency: 'SAR',
      title: 'هدية الترحيب بمحفظة القرية 🎁',
      description: 'رصيد محفظة رقمي تجريبي للبدء في التسوق المباشر',
      methodName: 'مكافأة النظام',
      timestamp: new Date().toLocaleDateString('ar-SA'),
      refNumber: 'TX-INIT-001',
    },
  ],
};

export function getVillageWallet(): VillageWalletState {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_WALLET, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading village wallet:', e);
  }
  return DEFAULT_WALLET;
}

export function saveVillageWallet(wallet: VillageWalletState): void {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    window.dispatchEvent(new CustomEvent('qaryati:wallet-updated', { detail: wallet }));
  } catch (e) {
    console.warn('Error saving village wallet:', e);
  }
}

export function depositToWallet(
  amount: number,
  methodName: string,
  refNumber?: string
): VillageWalletState {
  const current = getVillageWallet();
  const prefs = getGlobalPreferences();

  const newTx: WalletTransaction = {
    id: 'tx_' + Date.now(),
    type: 'DEPOSIT',
    amount,
    currency: prefs.currencyCode || 'SAR',
    title: `شحن محفظة عبر (${methodName}) 🟢`,
    description: `تم إيداع مبلغ ${amount} بنجاح إلى رصيد محفظة القرية`,
    methodName,
    timestamp: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    refNumber: refNumber || 'DEP-' + Math.floor(100000 + Math.random() * 900000),
  };

  const updated: VillageWalletState = {
    balance: Number((current.balance + amount).toFixed(2)),
    currency: prefs.currencyCode || 'SAR',
    transactions: [newTx, ...current.transactions],
  };

  saveVillageWallet(updated);
  return updated;
}

export function payWithWallet(
  amount: number,
  merchantName: string,
  orderId?: string
): { success: boolean; newBalance: number; error?: string } {
  const current = getVillageWallet();
  const prefs = getGlobalPreferences();

  if (current.balance < amount) {
    return {
      success: false,
      newBalance: current.balance,
      error: `رصيد المحفظة غير كافٍ. المتاح: ${formatGlobalCurrency(current.balance)} والـمطلوب: ${formatGlobalCurrency(amount)}`,
    };
  }

  const newTx: WalletTransaction = {
    id: 'tx_' + Date.now(),
    type: 'PAYMENT',
    amount,
    currency: prefs.currencyCode || 'SAR',
    title: `شراء من متجر (${merchantName}) 🛍️`,
    description: orderId ? `خصم قيمة الطلب رقم #${orderId}` : `دفع فوري من رصيد محفظة القرية`,
    timestamp: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    refNumber: 'PAY-' + Math.floor(100000 + Math.random() * 900000),
  };

  const updated: VillageWalletState = {
    balance: Number((current.balance - amount).toFixed(2)),
    currency: prefs.currencyCode || 'SAR',
    transactions: [newTx, ...current.transactions],
  };

  saveVillageWallet(updated);
  return { success: true, newBalance: updated.balance };
}
