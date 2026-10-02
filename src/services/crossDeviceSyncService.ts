import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  getDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeSetDoc, sanitizeForFirestore, handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { StoreDirectoryRecord, Item, DeliveryOrder } from '../types';

export interface SyncedMerchant {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  storeName: string;
  village: string;
  photo?: string;
  idVerificationPhoto?: string;
  isApproved: boolean;
  isPro?: boolean;
  planName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SyncedDriver {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  vehicleType: string;
  vehiclePlate?: string;
  zone?: string;
  photo?: string;
  idCardPhoto?: string;
  isApproved: boolean;
  isOnline?: boolean;
  createdAt: string;
}

export interface SyncedCustomer {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  village?: string;
  housePhoto?: string;
  idVerificationPhoto?: string;
  passwordHash?: string;
  isApproved?: boolean;
  createdAt: string;
}

// Global active sync flag
let isSyncInitialized = false;

/**
 * Validates connection to Firestore at application boot (as required by Firebase skill)
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firestore Cloud Database connected successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firestore is offline. Check network connection.');
    } else {
      console.log('Firestore connection verified.');
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. GLOBAL REALTIME CLOUD SYNCHRONIZATION INITIALIZER
// ---------------------------------------------------------------------------

export function initGlobalCloudSync(): void {
  if (isSyncInitialized) return;
  isSyncInitialized = true;

  console.log('🚀 Initializing Central Real-Time Cloud Synchronization (قريتي Cloud Sync)...');

  // Verify connection
  testFirestoreConnection().catch(console.warn);

  // 1. Sync Stores Directory from Cloud
  let initialStoresSync = true;
  try {
    onSnapshot(collection(db, 'stores'), (snapshot) => {
      const stores: StoreDirectoryRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StoreDirectoryRecord;
        stores.push({
          ...data,
          id: docSnap.id,
          isApproved: (data as any).isApproved !== false,
          status: data.status || 'ACTIVE'
        });
      });
      localStorage.setItem('qaryati_stores_directory', JSON.stringify(stores));
      localStorage.setItem('village_stores_directory', JSON.stringify(stores));
      window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: stores }));

      if (!initialStoresSync) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_DATA_CACHE' });
        }
      }
      initialStoresSync = false;
    }, (error) => {
      console.warn('Stores cloud sync listener notice:', error);
    });
  } catch (e) {
    console.warn('Stores sync init error:', e);
  }

  // 2. Sync Merchants Registry from Cloud
  try {
    onSnapshot(collection(db, 'merchants'), (snapshot) => {
      const merchants: SyncedMerchant[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SyncedMerchant;
        merchants.push({
          ...data,
          id: docSnap.id,
          isApproved: data.isApproved !== false
        });
      });
      localStorage.setItem('flowapp_rbac_merchants_v1', JSON.stringify(merchants));
      localStorage.setItem('village_merchants_accounts', JSON.stringify(merchants));
      window.dispatchEvent(new CustomEvent('qaryati:merchants-updated', { detail: merchants }));
    }, (error) => {
      console.warn('Merchants cloud sync listener notice:', error);
    });
  } catch (e) {
    console.warn('Merchants sync init error:', e);
  }

  // 3. Sync Drivers Registry from Cloud
  try {
    onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const drivers: SyncedDriver[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SyncedDriver;
        drivers.push({
          ...data,
          id: docSnap.id,
          isApproved: data.isApproved !== false
        });
      });
      localStorage.setItem('flowapp_rbac_drivers_v1', JSON.stringify(drivers));
      localStorage.setItem('village_drivers_accounts', JSON.stringify(drivers));
      window.dispatchEvent(new CustomEvent('qaryati:drivers-updated', { detail: drivers }));
    }, (error) => {
      console.warn('Drivers cloud sync listener notice:', error);
    });
  } catch (e) {
    console.warn('Drivers sync init error:', e);
  }

  // 4. Sync Customers Registry from Cloud
  try {
    onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customers: SyncedCustomer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SyncedCustomer;
        customers.push({
          ...data,
          id: docSnap.id,
          isApproved: data.isApproved !== false
        });
      });
      localStorage.setItem('flowapp_rbac_customers_v1', JSON.stringify(customers));
      window.dispatchEvent(new CustomEvent('qaryati:customers-updated', { detail: customers }));
    }, (error) => {
      console.warn('Customers cloud sync listener notice:', error);
    });
  } catch (e) {
    console.warn('Customers sync init error:', e);
  }

  // 5. Sync Delivery Orders from Cloud
  try {
    let initialLoad = true;
    onSnapshot(collection(db, 'delivery_orders'), (snapshot) => {
      const orders: DeliveryOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() } as DeliveryOrder);
      });
      // Sort newest first
      orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localStorage.setItem('qaryati_delivery_orders', JSON.stringify(orders));
      localStorage.setItem('village_orders', JSON.stringify(orders));
      window.dispatchEvent(new CustomEvent('qaryati:orders-updated', { detail: orders }));

      // If not initial load and there are newly added pending orders, trigger alert event
      if (!initialLoad && snapshot.docChanges) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const addedOrder = change.doc.data() as DeliveryOrder;
            window.dispatchEvent(new CustomEvent('qaryati:new-order-received', { detail: addedOrder }));
          } else if (change.type === 'modified') {
            const modOrder = change.doc.data() as DeliveryOrder;
            if (modOrder.status === 'READY_FOR_PICKUP') {
              window.dispatchEvent(new CustomEvent('qaryati:order-ready-for-pickup', { detail: modOrder }));
            }
          }
        });
      }
      initialLoad = false;
    }, (error) => {
      console.warn('Orders cloud sync listener notice:', error);
    });
  } catch (e) {
    console.warn('Orders sync init error:', e);
  }

  // 6. Sync Ads (Village Bulletin & Sponsored Ads) from Cloud in Real-Time
  let initialAdsSync = true;
  try {
    onSnapshot(collection(db, 'ads'), (snapshot) => {
      const ads: any[] = [];
      snapshot.forEach((docSnap) => {
        ads.push({ id: docSnap.id, ...docSnap.data() });
      });
      ads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localStorage.setItem('qaryati_ads_directory', JSON.stringify(ads));
      window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: ads }));

      if (!initialAdsSync) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_DATA_CACHE' });
        }
      }
      initialAdsSync = false;
    }, (error) => {
      console.warn('Ads cloud sync listener notice:', error);
    });
  } catch (e) {
    console.warn('Ads sync init error:', e);
  }
}

// ---------------------------------------------------------------------------
// 2. STORES & PRODUCTS CRUD
// ---------------------------------------------------------------------------

export async function syncSaveStore(store: StoreDirectoryRecord): Promise<void> {
  // 1. Update local cache
  try {
    const raw = localStorage.getItem('qaryati_stores_directory');
    const list: StoreDirectoryRecord[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((s) => s.id === store.id);
    if (index >= 0) list[index] = store;
    else list.unshift(store);
    localStorage.setItem('qaryati_stores_directory', JSON.stringify(list));
    localStorage.setItem('village_stores_directory', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: list }));
  } catch {}

  // 2. Cloud Firestore Write
  try {
    const storeRef = doc(db, 'stores', store.id);
    await safeSetDoc(storeRef, {
      ...store,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncSaveStore error:', err);
  }
}

export async function syncDeleteStore(storeId: string): Promise<void> {
  try {
    const raw = localStorage.getItem('qaryati_stores_directory');
    if (raw) {
      const list = JSON.parse(raw).filter((s: any) => s.id !== storeId);
      localStorage.setItem('qaryati_stores_directory', JSON.stringify(list));
      localStorage.setItem('village_stores_directory', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: list }));
    }
  } catch {}

  try {
    await deleteDoc(doc(db, 'stores', storeId));
    // Also delete any subcollection items of this store
    const itemsSnap = await getDocs(collection(db, 'stores', storeId, 'items'));
    if (!itemsSnap.empty) {
      const batch = writeBatch(db);
      itemsSnap.forEach((itDoc) => batch.delete(itDoc.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Firestore syncDeleteStore error:', err);
  }
}

// ---------------------------------------------------------------------------
// 2.1 ADVERTISEMENTS CLOUD CRUD (Instant Real-time Cross-device Sync)
// ---------------------------------------------------------------------------

export async function syncSaveAd(ad: any): Promise<void> {
  // 1. Update local cache
  try {
    const raw = localStorage.getItem('qaryati_ads_directory');
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((a) => a.id === ad.id);
    if (index >= 0) list[index] = ad;
    else list.unshift(ad);
    localStorage.setItem('qaryati_ads_directory', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: list }));
  } catch {}

  // 2. Cloud Firestore Write
  try {
    const adRef = doc(db, 'ads', ad.id);
    await safeSetDoc(adRef, {
      ...ad,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncSaveAd error:', err);
  }
}

export async function syncDeleteAd(adId: string): Promise<void> {
  // 1. Local Cache
  try {
    const raw = localStorage.getItem('qaryati_ads_directory');
    if (raw) {
      const list = JSON.parse(raw).filter((a: any) => a.id !== adId);
      localStorage.setItem('qaryati_ads_directory', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: list }));
    }
  } catch {}

  // 2. Cloud Firestore Delete
  try {
    await deleteDoc(doc(db, 'ads', adId));
  } catch (err) {
    console.warn('Firestore syncDeleteAd error:', err);
  }
}

export async function syncClearAllAds(): Promise<void> {
  // 1. Local Cache
  try {
    localStorage.setItem('qaryati_ads_directory', JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: [] }));
  } catch {}

  // 2. Cloud Firestore Delete All Docs
  try {
    const snap = await getDocs(collection(db, 'ads'));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Firestore syncClearAllAds error:', err);
  }
}

export async function syncUpdateAllAdsStatus(newStatus: 'APPROVED' | 'REJECTED'): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'ads'));
    const updatedLocal: any[] = [];
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.update(d.ref, { status: newStatus, updatedAt: new Date().toISOString() });
        updatedLocal.push({ id: d.id, ...d.data(), status: newStatus });
      });
      await batch.commit();
    }
    localStorage.setItem('qaryati_ads_directory', JSON.stringify(updatedLocal));
    window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: updatedLocal }));
  } catch (err) {
    console.warn('Firestore syncUpdateAllAdsStatus error:', err);
  }
}

export async function fetchAllStores(): Promise<StoreDirectoryRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'stores'));
    const loaded: StoreDirectoryRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as StoreDirectoryRecord;
      if (data && data.status !== 'SUSPENDED') {
        loaded.push({
          ...data,
          id: docSnap.id,
          isApproved: (data as any).isApproved !== false,
          status: data.status || 'ACTIVE',
        });
      }
    });
    if (loaded.length > 0) {
      localStorage.setItem('qaryati_stores_directory', JSON.stringify(loaded));
      localStorage.setItem('village_stores_directory', JSON.stringify(loaded));
      window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: loaded }));
    }
    return loaded;
  } catch (err) {
    console.warn('fetchAllStores error:', err);
    try {
      const raw = localStorage.getItem('qaryati_stores_directory');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export async function syncSaveStoreProduct(storeId: string, item: Item): Promise<void> {
  // 1. Local Cache
  try {
    const key = `merchant_${storeId}_items`;
    const raw = localStorage.getItem(key);
    const list: Item[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:store-products-updated', { detail: { storeId, count: list.length } }));
  } catch {}

  // 2. Cloud Firestore
  try {
    const itemRef = doc(db, 'stores', storeId, 'items', item.id);
    await safeSetDoc(itemRef, item, { merge: true });
    // Also update store document itemsCount in Firestore
    const storeRef = doc(db, 'stores', storeId);
    const rawList = localStorage.getItem(`merchant_${storeId}_items`);
    const count = rawList ? JSON.parse(rawList).length : 1;
    await safeSetDoc(storeRef, { itemsCount: count, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncSaveStoreProduct error:', err);
  }
}

export async function syncDeleteStoreProduct(storeId: string, itemId: string): Promise<void> {
  // Local
  try {
    const key = `merchant_${storeId}_items`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw).filter((i: any) => i.id !== itemId);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:store-products-updated', { detail: { storeId, count: list.length } }));
    }
  } catch {}

  // Cloud
  try {
    await deleteDoc(doc(db, 'stores', storeId, 'items', itemId));
    // Update store itemsCount
    const rawList = localStorage.getItem(`merchant_${storeId}_items`);
    const count = rawList ? JSON.parse(rawList).length : 0;
    await safeSetDoc(doc(db, 'stores', storeId), { itemsCount: count, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Firestore syncDeleteStoreProduct error:', err);
  }
}

export function subscribeToStoreProducts(
  storeId: string,
  onUpdate: (items: Item[]) => void
): () => void {
  try {
    const itemsCol = collection(db, 'stores', storeId, 'items');
    const unsub = onSnapshot(itemsCol, (snapshot) => {
      const loaded: Item[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as Item);
      });
      // Cache locally
      try {
        localStorage.setItem(`merchant_${storeId}_items`, JSON.stringify(loaded));
      } catch {}
      onUpdate(loaded);
    }, (error) => {
      console.warn('Store products subscription notice:', error);
    });
    return unsub;
  } catch (err) {
    console.warn('Store products subscription error:', err);
    return () => {};
  }
}

export async function fetchStoreProducts(storeId: string): Promise<Item[]> {
  try {
    const snap = await getDocs(collection(db, 'stores', storeId, 'items'));
    const loaded: Item[] = [];
    snap.forEach((docSnap) => {
      loaded.push({ id: docSnap.id, ...docSnap.data() } as Item);
    });
    if (loaded.length > 0) {
      try {
        localStorage.setItem(`merchant_${storeId}_items`, JSON.stringify(loaded));
      } catch {}
    }
    return loaded;
  } catch (e) {
    console.warn('fetchStoreProducts error:', e);
    // fallback to local cache
    try {
      const raw = localStorage.getItem(`merchant_${storeId}_items`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// 3. MERCHANTS CRUD
// ---------------------------------------------------------------------------

export async function syncSaveMerchant(merchant: SyncedMerchant): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('flowapp_rbac_merchants_v1');
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((m: any) => m.id === merchant.id);
    if (index >= 0) list[index] = merchant;
    else list.unshift(merchant);
    localStorage.setItem('flowapp_rbac_merchants_v1', JSON.stringify(list));
    localStorage.setItem('village_merchants_accounts', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:merchants-updated', { detail: list }));
  } catch {}

  // Cloud Firestore
  try {
    await safeSetDoc(doc(db, 'merchants', merchant.id), {
      ...merchant,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore merchant save error:', err);
  }
}

export async function syncDeleteMerchant(merchantId: string): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('flowapp_rbac_merchants_v1');
    if (raw) {
      const list = JSON.parse(raw).filter((m: any) => m.id !== merchantId);
      localStorage.setItem('flowapp_rbac_merchants_v1', JSON.stringify(list));
      localStorage.setItem('village_merchants_accounts', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:merchants-updated', { detail: list }));
    }
  } catch {}

  // Cloud
  try {
    await deleteDoc(doc(db, 'merchants', merchantId));
    await deleteDoc(doc(db, 'stores', merchantId));
  } catch (err) {
    console.warn('Firestore merchant delete error:', err);
  }
}

export async function fetchMerchantByPhoneOrId(identifier: string): Promise<SyncedMerchant | null> {
  const clean = identifier.trim().replace(/\s+/g, '');
  try {
    const docSnap = await getDoc(doc(db, 'merchants', clean));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SyncedMerchant;
    }
    // Query by phone or nationalId
    const q1 = query(collection(db, 'merchants'), where('phone', '==', clean));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docFirst = snap1.docs[0];
      return { id: docFirst.id, ...docFirst.data() } as SyncedMerchant;
    }
    const q2 = query(collection(db, 'merchants'), where('nationalId', '==', clean));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const docFirst = snap2.docs[0];
      return { id: docFirst.id, ...docFirst.data() } as SyncedMerchant;
    }
  } catch (e) {
    console.warn('fetchMerchantByPhoneOrId error:', e);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. DRIVERS CRUD
// ---------------------------------------------------------------------------

export async function syncSaveDriver(driver: SyncedDriver): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('flowapp_rbac_drivers_v1');
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((d: any) => d.id === driver.id);
    if (index >= 0) list[index] = driver;
    else list.unshift(driver);
    localStorage.setItem('flowapp_rbac_drivers_v1', JSON.stringify(list));
    localStorage.setItem('village_drivers_accounts', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:drivers-updated', { detail: list }));
  } catch {}

  // Cloud Firestore
  try {
    await safeSetDoc(doc(db, 'drivers', driver.id), {
      ...driver,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore driver save error:', err);
  }
}

export async function syncDeleteDriver(driverId: string): Promise<void> {
  try {
    const raw = localStorage.getItem('flowapp_rbac_drivers_v1');
    if (raw) {
      const list = JSON.parse(raw).filter((d: any) => d.id !== driverId);
      localStorage.setItem('flowapp_rbac_drivers_v1', JSON.stringify(list));
      localStorage.setItem('village_drivers_accounts', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:drivers-updated', { detail: list }));
    }
  } catch {}

  try {
    await deleteDoc(doc(db, 'drivers', driverId));
  } catch (err) {
    console.warn('Firestore driver delete error:', err);
  }
}

export async function fetchDriverByPhone(phone: string): Promise<SyncedDriver | null> {
  const clean = phone.trim().replace(/\s+/g, '');
  try {
    const docSnap = await getDoc(doc(db, 'drivers', clean));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SyncedDriver;
    }
    const q1 = query(collection(db, 'drivers'), where('phone', '==', clean));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docFirst = snap1.docs[0];
      return { id: docFirst.id, ...docFirst.data() } as SyncedDriver;
    }
  } catch (e) {
    console.warn('fetchDriverByPhone error:', e);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. CUSTOMERS CRUD
// ---------------------------------------------------------------------------

export async function syncSaveCustomer(customer: SyncedCustomer): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('flowapp_rbac_customers_v1');
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((c: any) => c.id === customer.id);
    if (index >= 0) list[index] = customer;
    else list.unshift(customer);
    localStorage.setItem('flowapp_rbac_customers_v1', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:customers-updated', { detail: list }));
  } catch {}

  // Cloud Firestore
  try {
    await safeSetDoc(doc(db, 'customers', customer.id), {
      ...customer,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore customer save error:', err);
  }
}

export async function fetchCustomerByPhoneOrId(identifier: string): Promise<SyncedCustomer | null> {
  const clean = identifier.trim().replace(/\s+/g, '');
  try {
    const docSnap = await getDoc(doc(db, 'customers', clean));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SyncedCustomer;
    }
    const q1 = query(collection(db, 'customers'), where('phone', '==', clean));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docFirst = snap1.docs[0];
      return { id: docFirst.id, ...docFirst.data() } as SyncedCustomer;
    }
    const q2 = query(collection(db, 'customers'), where('nationalId', '==', clean));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const docFirst = snap2.docs[0];
      return { id: docFirst.id, ...docFirst.data() } as SyncedCustomer;
    }
  } catch (e) {
    console.warn('fetchCustomerByPhoneOrId error:', e);
  }
  return null;
}

// ---------------------------------------------------------------------------
// 6. DELIVERY ORDERS CRUD
// ---------------------------------------------------------------------------

export async function syncSaveOrder(order: DeliveryOrder): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('qaryati_delivery_orders');
    const list: DeliveryOrder[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((o) => o.id === order.id);
    if (index >= 0) list[index] = order;
    else list.unshift(order);
    localStorage.setItem('qaryati_delivery_orders', JSON.stringify(list));
    localStorage.setItem('village_orders', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:orders-updated', { detail: list }));
  } catch {}

  // Cloud Firestore
  try {
    await safeSetDoc(doc(db, 'delivery_orders', order.id), {
      ...order,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore order save error:', err);
  }
}

export async function syncDeleteOrder(orderId: string): Promise<void> {
  try {
    const raw = localStorage.getItem('qaryati_delivery_orders');
    if (raw) {
      const list = JSON.parse(raw).filter((o: any) => o.id !== orderId);
      localStorage.setItem('qaryati_delivery_orders', JSON.stringify(list));
      localStorage.setItem('village_orders', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:orders-updated', { detail: list }));
    }
  } catch {}

  try {
    await deleteDoc(doc(db, 'delivery_orders', orderId));
  } catch (err) {
    console.warn('Firestore order delete error:', err);
  }
}

export async function syncClearAllOrders(): Promise<void> {
  try {
    localStorage.setItem('qaryati_delivery_orders', JSON.stringify([]));
    localStorage.setItem('village_delivery_orders', JSON.stringify([]));
    localStorage.setItem('village_orders', JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('qaryati:orders-updated', { detail: [] }));
  } catch {}

  try {
    const snap = await getDocs(collection(db, 'delivery_orders'));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Firestore syncClearAllOrders error:', err);
  }
}

export function subscribeToVillageStores(
  targetVillage: string,
  onUpdate: (stores: StoreDirectoryRecord[]) => void
): () => void {
  try {
    const storesCol = collection(db, 'stores');
    const unsub = onSnapshot(storesCol, (snapshot) => {
      const loaded: StoreDirectoryRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StoreDirectoryRecord;
        if (data && data.status !== 'SUSPENDED') {
          // If no targetVillage or 'ALL', return all stores
          if (
            !targetVillage ||
            targetVillage === 'ALL' ||
            data.cityOrVillage === targetVillage ||
            data.cityOrVillage?.includes(targetVillage) ||
            targetVillage.includes(data.cityOrVillage || '')
          ) {
            loaded.push({
              ...data,
              id: docSnap.id,
              isApproved: (data as any).isApproved !== false,
              status: data.status || 'ACTIVE'
            });
          }
        }
      });
      onUpdate(loaded);
    }, (error) => {
      console.warn('Stores subscription notice:', error);
    });

    return unsub;
  } catch (err) {
    console.warn('Stores realtime subscription setup error:', err);
    return () => {};
  }
}

export type SyncedOrder = DeliveryOrder;

export function subscribeToAllMerchants(
  onUpdate: (merchants: SyncedMerchant[]) => void
): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'merchants'), (snapshot) => {
      const loaded: SyncedMerchant[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SyncedMerchant;
        loaded.push({
          ...data,
          id: docSnap.id,
          isApproved: data.isApproved !== false,
        });
      });
      onUpdate(loaded);
    }, (err) => {
      console.warn('subscribeToAllMerchants error:', err);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

export function subscribeToAllDrivers(
  onUpdate: (drivers: SyncedDriver[]) => void
): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const loaded: SyncedDriver[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SyncedDriver;
        loaded.push({
          ...data,
          id: docSnap.id,
          isApproved: data.isApproved !== false,
        });
      });
      onUpdate(loaded);
    }, (err) => {
      console.warn('subscribeToAllDrivers error:', err);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

export function subscribeToAllOrders(
  onUpdate: (orders: DeliveryOrder[]) => void
): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'delivery_orders'), (snapshot) => {
      const loaded: DeliveryOrder[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as DeliveryOrder);
      });
      loaded.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(loaded);
    }, (err) => {
      console.warn('subscribeToAllOrders error:', err);
    });
    return unsub;
  } catch {
    return () => {};
  }
}
