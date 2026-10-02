import { AdRecord, StoreDirectoryRecord } from '../types';
import { getStoresDirectory } from './deliveryService';
import { getActiveCustomer, getActiveSessionRole } from './rbacAuthService';
import { auth } from '../lib/firebase';

export interface PendingAdRedirect {
  storeId: string;
  storeName: string;
  village: string;
  adTitle: string;
  adId?: string;
  timestamp: number;
}

export const PENDING_AD_REDIRECT_KEY = 'qaryati_pending_ad_redirect';
export const TARGET_STORE_ID_KEY = 'qaryati_target_store_id';
export const TARGET_VILLAGE_KEY = 'qaryati_target_village';

/**
 * Normalizes text for lenient fuzzy matching (e.g. removing prefixes and extra spaces)
 */
const cleanName = (str?: string) => {
  if (!str) return '';
  return str
    .replace(/^(متجر|بقالة|تموينات|محل|سوبرماركت|مخبز|أفران|فرن|صيدلية|مغسلة)\s+/gi, '')
    .replace(/^(قرية|حي|منطقة)\s+/gi, '')
    .trim()
    .toLowerCase();
};

/**
 * Finds the best matching store from the local/cloud directory for a given Ad record
 */
export function findMatchingStoreForAd(ad: AdRecord): StoreDirectoryRecord | null {
  const stores = getStoresDirectory();
  if (stores.length === 0) return null;

  // 1. Direct match by storeId or merchantId
  if (ad.storeId) {
    const byStoreId = stores.find(
      (s) => s.id === ad.storeId || (s as any).merchantId === ad.storeId
    );
    if (byStoreId) return byStoreId;
  }

  if (ad.merchantId) {
    const byMerchantId = stores.find(
      (s) => s.id === ad.merchantId || (s as any).merchantId === ad.merchantId
    );
    if (byMerchantId) return byMerchantId;
  }

  // 2. Exact or normalized match by storeName
  if (ad.storeName) {
    const exactName = stores.find(
      (s) => s.name?.trim().toLowerCase() === ad.storeName?.trim().toLowerCase()
    );
    if (exactName) return exactName;

    const normAdName = cleanName(ad.storeName);
    if (normAdName) {
      const fuzzyName = stores.find((s) => {
        const normSName = cleanName(s.name);
        return normSName && (normSName.includes(normAdName) || normAdName.includes(normSName));
      });
      if (fuzzyName) return fuzzyName;
    }
  }

  // 3. Fallback match by village if ad specifies village and there's an active store in it
  if (ad.village) {
    const normVillage = cleanName(ad.village);
    const byVillage = stores.find((s) => {
      const sv = cleanName(s.cityOrVillage);
      return sv && (sv.includes(normVillage) || normVillage.includes(sv));
    });
    if (byVillage) return byVillage;
  }

  return null;
}

/**
 * Check if the user is currently authenticated (Customer, Merchant, Driver, Developer or Firebase User)
 */
export function isUserAuthenticated(): boolean {
  try {
    const activeCustomer = getActiveCustomer();
    if (activeCustomer && activeCustomer.phone) return true;

    const activeRole = getActiveSessionRole();
    if (activeRole) return true;

    if (auth?.currentUser) return true;

    // Check customer local cache session
    const custRaw = localStorage.getItem('flowapp_active_customer_session_v2');
    if (custRaw) {
      const parsed = JSON.parse(custRaw);
      if (parsed && parsed.phone) return true;
    }
  } catch (e) {
    console.warn('Error checking authentication status:', e);
  }
  return false;
}

/**
 * Handles clicking on an Ad's "Visit Store & Shop" button.
 * - If user is authenticated: Immediately navigates to that store.
 * - If user is not authenticated: Saves the target store intent and opens Login / Register flow.
 */
export function handleAdStoreVisit(
  ad: AdRecord,
  options?: {
    onNavigateToStore?: (storeId: string, village: string, storeName: string) => void;
    onRequireAuth?: (pending: PendingAdRedirect) => void;
  }
): { status: 'NAVIGATED' | 'AUTH_REQUIRED'; target: PendingAdRedirect } {
  const matchedStore = findMatchingStoreForAd(ad);

  const targetStoreId = matchedStore?.id || ad.storeId || ad.merchantId || 'default';
  const targetVillage = matchedStore?.cityOrVillage || ad.village || 'قرية الانهوم';
  const targetStoreName = matchedStore?.name || ad.storeName || ad.title || 'متجر القرية';

  const pendingData: PendingAdRedirect = {
    storeId: targetStoreId,
    storeName: targetStoreName,
    village: targetVillage,
    adTitle: ad.title,
    adId: ad.id,
    timestamp: Date.now(),
  };

  const authenticated = isUserAuthenticated();

  if (authenticated) {
    // 1. Direct Instant Navigation for Logged-In User
    saveTargetStoreSelection(targetStoreId, targetVillage);

    // Dispatch global event for listeners
    window.dispatchEvent(
      new CustomEvent('qaryati:navigate-to-store', {
        detail: {
          storeId: targetStoreId,
          village: targetVillage,
          storeName: targetStoreName,
        },
      })
    );

    if (options?.onNavigateToStore) {
      options.onNavigateToStore(targetStoreId, targetVillage, targetStoreName);
    }

    return { status: 'NAVIGATED', target: pendingData };
  } else {
    // 2. Save Pending Intent for Guest User & Prompt Auth
    savePendingAdRedirect(pendingData);

    // Dispatch prompt auth event
    window.dispatchEvent(
      new CustomEvent('qaryati:prompt-ad-auth', {
        detail: pendingData,
      })
    );

    if (options?.onRequireAuth) {
      options.onRequireAuth(pendingData);
    }

    return { status: 'AUTH_REQUIRED', target: pendingData };
  }
}

/**
 * Saves target store & village to session and local storage
 */
export function saveTargetStoreSelection(storeId: string, village: string): void {
  try {
    sessionStorage.setItem(TARGET_STORE_ID_KEY, storeId);
    sessionStorage.setItem(TARGET_VILLAGE_KEY, village);
    localStorage.setItem(TARGET_STORE_ID_KEY, storeId);
    localStorage.setItem(TARGET_VILLAGE_KEY, village);
  } catch {}
}

/**
 * Saves a pending ad redirect to storage
 */
export function savePendingAdRedirect(data: PendingAdRedirect): void {
  try {
    sessionStorage.setItem(PENDING_AD_REDIRECT_KEY, JSON.stringify(data));
    localStorage.setItem(PENDING_AD_REDIRECT_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Gets the current pending ad redirect if any (without deleting it)
 */
export function getPendingAdRedirect(): PendingAdRedirect | null {
  try {
    const raw =
      sessionStorage.getItem(PENDING_AD_REDIRECT_KEY) ||
      localStorage.getItem(PENDING_AD_REDIRECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ignore intents older than 2 hours
    if (Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000) {
      clearPendingAdRedirect();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears any pending ad redirect from storage
 */
export function clearPendingAdRedirect(): void {
  try {
    sessionStorage.removeItem(PENDING_AD_REDIRECT_KEY);
    localStorage.removeItem(PENDING_AD_REDIRECT_KEY);
  } catch {}
}

/**
 * Checks for and consumes a pending ad redirect immediately upon user login or registration.
 * Returns the target if consumed, or null if no redirect was pending.
 */
export function consumePendingAdRedirect(): PendingAdRedirect | null {
  const pending = getPendingAdRedirect();
  if (!pending) return null;

  // Clear pending
  clearPendingAdRedirect();

  // Save active target
  saveTargetStoreSelection(pending.storeId, pending.village);

  // Dispatch navigation event
  window.dispatchEvent(
    new CustomEvent('qaryati:navigate-to-store', {
      detail: {
        storeId: pending.storeId,
        village: pending.village,
        storeName: pending.storeName,
      },
    })
  );

  return pending;
}
