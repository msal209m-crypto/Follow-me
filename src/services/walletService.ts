export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'TOPUP' | 'PAYMENT' | 'EARNING' | 'REFUND' | 'TRANSFER';
  title: string;
  description?: string;
  timestamp: string;
  method?: 'MADA' | 'APPLE_PAY' | 'STC_PAY' | 'KURAIMI' | 'CARD' | 'WALLET_BALANCE';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  orderId?: string;
}

export interface UserWallet {
  userId: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'DRIVER';
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
  lastUpdated: string;
}

const WALLET_STORAGE_KEY_PREFIX = 'qaryati_wallet_v1_';

export function getWalletStorageKey(userId: string, role: string): string {
  return `${WALLET_STORAGE_KEY_PREFIX}${role}_${userId || 'guest'}`;
}

export function getUserWallet(userId: string = 'default', role: 'CUSTOMER' | 'MERCHANT' | 'DRIVER' = 'CUSTOMER', currency: string = 'SAR'): UserWallet {
  try {
    const key = getWalletStorageKey(userId, role);
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial: UserWallet = {
        userId,
        role,
        balance: role === 'CUSTOMER' ? 150 : 0, // 150 starter village credits for welcoming customers
        currency,
        transactions: [
          ...(role === 'CUSTOMER' ? [{
            id: `tx_${Date.now()}_init`,
            amount: 150,
            type: 'TOPUP' as const,
            title: 'هدية ترحيبية برصيد المحفظة 🎁',
            description: 'رصيد ترحيبي تجريبي للتسوق في متاجر القرية',
            timestamp: new Date().toISOString(),
            method: 'WALLET_BALANCE' as const,
            status: 'COMPLETED' as const,
          }] : []),
        ],
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading wallet:', e);
    return {
      userId,
      role,
      balance: 0,
      currency,
      transactions: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

export function saveUserWallet(wallet: UserWallet) {
  try {
    const key = getWalletStorageKey(wallet.userId, wallet.role);
    wallet.lastUpdated = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(wallet));
    window.dispatchEvent(new CustomEvent('qaryati:wallet-updated', { detail: wallet }));
  } catch (e) {
    console.warn('Error saving wallet:', e);
  }
}

export function topUpWallet(
  userId: string,
  role: 'CUSTOMER' | 'MERCHANT' | 'DRIVER',
  amount: number,
  method: 'MADA' | 'APPLE_PAY' | 'STC_PAY' | 'KURAIMI' | 'CARD',
  currency: string = 'SAR'
): UserWallet {
  const wallet = getUserWallet(userId, role, currency);
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    amount,
    type: 'TOPUP',
    title: `شحن محفظة عبر ${getMethodNameArabic(method)}`,
    timestamp: new Date().toISOString(),
    method,
    status: 'COMPLETED',
  };
  wallet.balance += amount;
  wallet.transactions.unshift(tx);
  saveUserWallet(wallet);
  return wallet;
}

export function payWithWallet(
  userId: string,
  role: 'CUSTOMER' | 'MERCHANT' | 'DRIVER',
  amount: number,
  orderTitle: string,
  orderId?: string,
  currency: string = 'SAR'
): { success: boolean; wallet: UserWallet; message: string } {
  const wallet = getUserWallet(userId, role, currency);
  if (wallet.balance < amount) {
    return {
      success: false,
      wallet,
      message: `عفواً، رصيد المحفظة الحالي (${wallet.balance} ${wallet.currency}) غير كافٍ لدفع (${amount} ${currency})`,
    };
  }

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    amount: -amount,
    type: 'PAYMENT',
    title: `دفع قيمة طلب: ${orderTitle}`,
    timestamp: new Date().toISOString(),
    method: 'WALLET_BALANCE',
    status: 'COMPLETED',
    orderId,
  };

  wallet.balance -= amount;
  wallet.transactions.unshift(tx);
  saveUserWallet(wallet);
  return {
    success: true,
    wallet,
    message: 'تم الدفع بنجاح من رصيد المحفظة ✅',
  };
}

export function creditDriverDeliveryFee(driverId: string, feeAmount: number, orderId: string, currency: string = 'SAR') {
  const wallet = getUserWallet(driverId, 'DRIVER', currency);
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_drv`,
    amount: feeAmount,
    type: 'EARNING',
    title: `أجرة توصيل طلب رقم #${orderId.slice(-4)} 🚗`,
    timestamp: new Date().toISOString(),
    method: 'WALLET_BALANCE',
    status: 'COMPLETED',
    orderId,
  };
  wallet.balance += feeAmount;
  wallet.transactions.unshift(tx);
  saveUserWallet(wallet);
}

export function creditMerchantOrderSale(merchantId: string, saleAmount: number, orderId: string, currency: string = 'SAR') {
  const wallet = getUserWallet(merchantId, 'MERCHANT', currency);
  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_mch`,
    amount: saleAmount,
    type: 'EARNING',
    title: `إيداع مبيعات طلب رقم #${orderId.slice(-4)} 🏪`,
    timestamp: new Date().toISOString(),
    method: 'WALLET_BALANCE',
    status: 'COMPLETED',
    orderId,
  };
  wallet.balance += saleAmount;
  wallet.transactions.unshift(tx);
  saveUserWallet(wallet);
}

export function getMethodNameArabic(method: string): string {
  switch (method) {
    case 'MADA':
      return 'مدى (Mada)';
    case 'APPLE_PAY':
      return 'Apple Pay ';
    case 'STC_PAY':
      return 'STC Pay';
    case 'KURAIMI':
      return 'كريمي جوال / خدمة إم فلوس (Yemen)';
    case 'CARD':
      return 'بطاقة ائتمانية (Visa / Master)';
    default:
      return 'رصيد المحفظة';
  }
}
