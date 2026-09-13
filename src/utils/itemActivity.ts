import { Item, Transaction } from '../types';

export interface ItemMovementSummary {
  itemId: string;
  lastSale: {
    date: string;
    timestamp: number;
    quantity: number;
    unitPrice: number;
    total: number;
    invoiceNumber: string;
    customerName: string;
    daysAgo: number;
  } | null;
  lastPurchase: {
    date: string;
    timestamp: number;
    quantity: number;
    costPrice: number;
    total: number;
    invoiceNumber: string;
    supplierName: string;
    isInitialStock?: boolean;
    daysAgo: number;
  } | null;
  totalSoldQuantity: number;
  totalPurchasedQuantity: number;
  pendingOrderQuantity: number;
  turnoverStatus:
    | 'OUT_OF_STOCK'
    | 'AWAITING_SUPPLY'
    | 'RECENT_SALE'
    | 'ACTIVE'
    | 'STAGNANT'
    | 'NEW_ITEM';
  daysSinceLastSale: number | null;
  daysSinceLastPurchase: number | null;
  stagnantDays?: number;
}

export interface ItemTimelineEntry {
  id: string;
  invoiceNumber: string;
  type: 'SALE' | 'CREDIT_SALE' | 'PURCHASE' | 'ORDER_GOODS_CASH' | 'ORDER_GOODS_CREDIT' | 'INITIAL_STOCK';
  date: string;
  timestamp: number;
  partyName: string;
  cashierName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  isPendingReceipt?: boolean;
  notes?: string;
}

/**
 * Computes last sale, last purchase, turnover status and metrics for all items
 */
export function computeAllItemMovements(
  items: Item[],
  transactions: Transaction[],
  getPendingOrderQtyForItem?: (id: string) => number
): Map<string, ItemMovementSummary> {
  const summaryMap = new Map<string, ItemMovementSummary>();
  const now = Date.now();

  // Pre-index items
  items.forEach((item) => {
    summaryMap.set(item.id, {
      itemId: item.id,
      lastSale: null,
      lastPurchase: null,
      totalSoldQuantity: 0,
      totalPurchasedQuantity: 0,
      pendingOrderQuantity: getPendingOrderQtyForItem ? getPendingOrderQtyForItem(item.id) : 0,
      turnoverStatus: item.quantity <= 0 ? 'OUT_OF_STOCK' : 'NEW_ITEM',
      daysSinceLastSale: null,
      daysSinceLastPurchase: null,
    });
  });

  // Sort transactions descending by date
  const sortedTransactions = [...transactions]
    .filter((tx) => tx && tx.status !== 'CANCELLED')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  sortedTransactions.forEach((tx) => {
    const txTime = new Date(tx.timestamp).getTime();
    const daysAgo = Math.max(0, Math.floor((now - txTime) / (1000 * 60 * 60 * 24)));
    const isSale = tx.type === 'SALE' || tx.type === 'CREDIT_SALE';
    const isPurchase =
      tx.type === 'PURCHASE' ||
      tx.type === 'ORDER_GOODS_CASH' ||
      tx.type === 'ORDER_GOODS_CREDIT';

    // Check if purchase is actually fulfilled/received or direct
    const isFulfilledPurchase =
      isPurchase &&
      (tx.status === 'COMPLETED' ||
        tx.isDirectReceipt ||
        Boolean(tx.receivedAt) ||
        tx.status === 'PARTIALLY_RECEIVED');

    tx.items?.forEach((cartItem) => {
      // Find matching item by ID or barcode
      let targetItem = summaryMap.get(cartItem.itemId);
      if (!targetItem) {
        // Fallback match by barcode
        const matchedItem = items.find(
          (it) => it.barcode && cartItem.barcode && it.barcode === cartItem.barcode
        );
        if (matchedItem) {
          targetItem = summaryMap.get(matchedItem.id);
        }
      }

      if (!targetItem) return;

      const qty = Number(cartItem.quantity) || 0;
      const unitPrice = Number(cartItem.unitPrice) || 0;
      const costPrice = Number(cartItem.costPrice) || 0;
      const total = Number(cartItem.total) || qty * unitPrice;

      if (isSale) {
        targetItem.totalSoldQuantity += qty;
        if (!targetItem.lastSale) {
          targetItem.lastSale = {
            date: tx.timestamp,
            timestamp: txTime,
            quantity: qty,
            unitPrice,
            total,
            invoiceNumber: tx.invoiceNumber || tx.id,
            customerName: tx.partyName || 'عميل نقدي',
            daysAgo,
          };
          targetItem.daysSinceLastSale = daysAgo;
        }
      } else if (isFulfilledPurchase) {
        targetItem.totalPurchasedQuantity += qty;
        if (!targetItem.lastPurchase) {
          targetItem.lastPurchase = {
            date: tx.receivedAt || tx.timestamp,
            timestamp: tx.receivedAt ? new Date(tx.receivedAt).getTime() : txTime,
            quantity: cartItem.receivedQuantity !== undefined ? cartItem.receivedQuantity : qty,
            costPrice,
            total: qty * costPrice,
            invoiceNumber: tx.invoiceNumber || tx.id,
            supplierName: tx.partyName || 'مورد بضاعة',
            daysAgo,
          };
          targetItem.daysSinceLastPurchase = daysAgo;
        }
      }
    });
  });

  // Finalize fallback for items with no purchases recorded (use item creation date)
  items.forEach((item) => {
    const summary = summaryMap.get(item.id);
    if (!summary) return;

    if (!summary.lastPurchase && item.createdAt) {
      const createdTime = new Date(item.createdAt).getTime();
      const createdDaysAgo = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
      summary.lastPurchase = {
        date: item.createdAt,
        timestamp: createdTime,
        quantity: item.quantity,
        costPrice: item.costPrice,
        total: item.quantity * item.costPrice,
        invoiceNumber: 'INITIAL-STOCK',
        supplierName: 'رصيد افتتاحي / تسجيل أولي',
        isInitialStock: true,
        daysAgo: createdDaysAgo,
      };
      summary.daysSinceLastPurchase = createdDaysAgo;
    }

    // Determine Turnover Status
    if (item.quantity <= 0) {
      summary.turnoverStatus = 'OUT_OF_STOCK';
    } else if (summary.pendingOrderQuantity > 0) {
      summary.turnoverStatus = 'AWAITING_SUPPLY';
    } else if (summary.lastSale) {
      if (summary.lastSale.daysAgo <= 7) {
        summary.turnoverStatus = 'RECENT_SALE';
      } else if (summary.lastSale.daysAgo <= 30) {
        summary.turnoverStatus = 'ACTIVE';
      } else {
        summary.turnoverStatus = 'STAGNANT';
      }
    } else {
      // No sales at all
      const createdTime = item.createdAt ? new Date(item.createdAt).getTime() : now;
      const daysSinceCreated = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated <= 7) {
        summary.turnoverStatus = 'NEW_ITEM';
      } else {
        summary.turnoverStatus = 'STAGNANT';
      }
    }

    summary.stagnantDays =
      summary.daysSinceLastSale !== null
        ? summary.daysSinceLastSale
        : summary.lastPurchase?.daysAgo || 0;
  });

  return summaryMap;
}

/**
 * Generates an item's chronological timeline of sales & supply activities
 */
export function getItemTimeline(
  itemId: string,
  transactions: Transaction[],
  item?: Item
): ItemTimelineEntry[] {
  const timeline: ItemTimelineEntry[] = [];

  // Filter transactions involving this item
  transactions.forEach((tx) => {
    if (!tx || tx.status === 'CANCELLED') return;
    const cartItem = tx.items?.find((it) => it.itemId === itemId || (item && it.barcode === item.barcode));
    if (!cartItem) return;

    const qty = Number(cartItem.quantity) || 0;
    const isSale = tx.type === 'SALE' || tx.type === 'CREDIT_SALE';
    const unitPrice = isSale ? Number(cartItem.unitPrice) || 0 : Number(cartItem.costPrice) || 0;

    timeline.push({
      id: `${tx.id}-${itemId}`,
      invoiceNumber: tx.invoiceNumber || tx.id,
      type: tx.type,
      date: tx.receivedAt || tx.timestamp,
      timestamp: new Date(tx.receivedAt || tx.timestamp).getTime(),
      partyName: tx.partyName || (isSale ? 'عميل نقدي' : 'مورد بضاعة'),
      cashierName: tx.cashierName || 'المسؤول',
      quantity: cartItem.receivedQuantity !== undefined && cartItem.receivedQuantity > 0 ? cartItem.receivedQuantity : qty,
      unitPrice,
      total: Number((qty * unitPrice).toFixed(2)),
      status: tx.status,
      isPendingReceipt: tx.status === 'PENDING_RECEIPT',
      notes: tx.notes,
    });
  });

  // Sort newest first
  timeline.sort((a, b) => b.timestamp - a.timestamp);

  // Add initial catalog stock entry at the bottom if item was created earlier
  if (item && item.createdAt) {
    timeline.push({
      id: `initial-${item.id}`,
      invoiceNumber: 'INIT-RECORD',
      type: 'INITIAL_STOCK',
      date: item.createdAt,
      timestamp: new Date(item.createdAt).getTime(),
      partyName: 'إدارة المتجر',
      cashierName: 'النظام',
      quantity: item.quantity,
      unitPrice: item.costPrice,
      total: Number((item.quantity * item.costPrice).toFixed(2)),
      status: 'COMPLETED',
      notes: 'تسجيل الصنف وإثبات الرصيد الافتتاحي بالمخزن',
    });
  }

  return timeline;
}

/**
 * Formats relative date/time for quick scanning in Arabic and English
 */
export function formatRelativeDateTime(
  dateStr: string | undefined | null,
  language: 'ar' | 'en' = 'ar'
): { relative: string; full: string; timeStr: string } {
  if (!dateStr) {
    return {
      relative: language === 'ar' ? 'لا يوجد' : 'None',
      full: '',
      timeStr: '',
    };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { relative: dateStr, full: dateStr, timeStr: '' };
  }

  const now = new Date();
  const isArabic = language === 'ar';

  const full = d.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const timeStr = d.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate day difference
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

  let relative = '';
  if (diffDays === 0) {
    relative = isArabic ? `اليوم (${timeStr})` : `Today (${timeStr})`;
  } else if (diffDays === 1) {
    relative = isArabic ? `أمس (${timeStr})` : `Yesterday (${timeStr})`;
  } else if (diffDays === 2) {
    relative = isArabic ? `منذ يومين` : `2 days ago`;
  } else if (diffDays > 2 && diffDays <= 7) {
    relative = isArabic ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
  } else if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    relative = isArabic ? `منذ ${weeks} أسبوع` : `${weeks}w ago`;
  } else if (diffDays > 30 && diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    relative = isArabic ? `منذ ${months} شهر` : `${months}mo ago`;
  } else {
    relative = full;
  }

  return { relative, full, timeStr };
}
