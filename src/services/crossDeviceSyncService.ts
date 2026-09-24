import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { StoreDirectoryRecord } from '../types';

export interface SyncedMerchant {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  storeName: string;
  village: string;
  photo?: string;
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
  isApproved: boolean;
  isOnline?: boolean;
  createdAt: string;
}

export interface SyncedCustomer {
  id: string;
  name: string;
  phone: string;
  village: string;
  nationalId?: string;
  housePhoto?: string;
  createdAt: string;
}

export interface SyncedOrder {
  id: string;
  storeId?: string;
  storeName?: string;
  villageName?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryCoords?: { lat: number; lng: number };
  items?: Array<{ id: string; name: string; price: number; quantity: number }>;
  totalAmount?: number;
  deliveryFee?: number;
  status: string; // 'PENDING' | 'ACCEPTED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED'
  driverName?: string;
  driverPhone?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 1. STORES CRUD & REALTIME
// ---------------------------------------------------------------------------

export async function syncSaveStore(store: StoreDirectoryRecord): Promise<void> {
  // 1. Local Cache
  try {
    const raw = localStorage.getItem('village_stores_directory');
    const list: StoreDirectoryRecord[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((s) => s.id === store.id);
    if (index >= 0) {
      list[index] = store;
    } else {
      list.unshift(store);
    }
    localStorage.setItem('village_stores_directory', JSON.stringify(list));
  } catch (e) {
    console.warn('Local store save note:', e);
  }

  // 2. Firestore Cloud Sync (Instant cross-device real-time broadcast)
  try {
    const storeRef = doc(db, 'stores', store.id);
    await setDoc(storeRef, {
      ...store,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore store sync note:', err);
  }

  // 3. Supabase SQL Sync
  if (true) {
    try {
      await (supabase as any).from('stores').upsert({
        id: store.id,
        name: store.name,
        owner_name: store.ownerName,
        phone: store.phone,
        village: store.cityOrVillage,
        status: store.status || 'ACTIVE',
        is_approved: (store as any).isApproved !== false,
        created_at: store.joinedAt || new Date().toISOString(),
      });
    } catch (err) {
      // Non-fatal if SQL table is not yet created
    }
  }
}

export async function syncDeleteStore(storeId: string): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_stores_directory');
    if (raw) {
      const list = JSON.parse(raw).filter((s: any) => s.id !== storeId);
      localStorage.setItem('village_stores_directory', JSON.stringify(list));
    }
  } catch {}

  // Firestore
  try {
    await deleteDoc(doc(db, 'stores', storeId));
  } catch (err) {
    console.warn('Firestore delete store note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('stores').delete().eq('id', storeId);
    } catch {}
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
          // Check if matches village or if general
          if (
            !targetVillage ||
            data.cityOrVillage === targetVillage ||
            data.cityOrVillage?.includes(targetVillage) ||
            targetVillage.includes(data.cityOrVillage || '')
          ) {
            loaded.push({
              ...data,
              id: docSnap.id
            });
          }
        }
      });

      if (loaded.length > 0) {
        onUpdate(loaded);
      }
    }, (error) => {
      console.warn('Stores subscription note:', error);
    });

    return unsub;
  } catch (err) {
    console.warn('Stores realtime subscription setup error:', err);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// 2. MERCHANTS CRUD & REALTIME
// ---------------------------------------------------------------------------

export async function syncSaveMerchant(merchant: SyncedMerchant): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_merchants_accounts');
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((m: any) => m.id === merchant.id);
    if (index >= 0) list[index] = merchant;
    else list.unshift(merchant);
    localStorage.setItem('village_merchants_accounts', JSON.stringify(list));
  } catch {}

  // Firestore
  try {
    await setDoc(doc(db, 'merchants', merchant.id), {
      ...merchant,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore merchant save note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('merchants').upsert({
        id: merchant.id,
        name: merchant.name,
        phone: merchant.phone,
        national_id: merchant.nationalId,
        store_name: merchant.storeName,
        village_name: merchant.village,
        is_approved: merchant.isApproved !== false,
        created_at: merchant.createdAt,
      });
    } catch {}
  }
}

export async function syncDeleteMerchant(merchantId: string): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_merchants_accounts');
    if (raw) {
      const list = JSON.parse(raw).filter((m: any) => m.id !== merchantId);
      localStorage.setItem('village_merchants_accounts', JSON.stringify(list));
    }
  } catch {}

  // Firestore
  try {
    await deleteDoc(doc(db, 'merchants', merchantId));
    // Also delete their corresponding store entry
    await deleteDoc(doc(db, 'stores', merchantId));
  } catch (err) {
    console.warn('Firestore merchant delete note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('merchants').delete().eq('id', merchantId);
    } catch {}
  }
}

export function subscribeToAllMerchants(
  onUpdate: (merchants: SyncedMerchant[]) => void
): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'merchants'), (snapshot) => {
      const list: SyncedMerchant[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as SyncedMerchant);
      });
      onUpdate(list);
    }, (err) => {
      console.warn('Merchants subscription note:', err);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// 3. DRIVERS CRUD & REALTIME
// ---------------------------------------------------------------------------

export async function syncSaveDriver(driver: SyncedDriver): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_drivers_accounts');
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((d: any) => d.id === driver.id);
    if (index >= 0) list[index] = driver;
    else list.unshift(driver);
    localStorage.setItem('village_drivers_accounts', JSON.stringify(list));
  } catch {}

  // Firestore
  try {
    await setDoc(doc(db, 'drivers', driver.id), {
      ...driver,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore driver save note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('drivers').upsert({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        national_id: driver.nationalId,
        vehicle_type: driver.vehicleType,
        vehicle_plate: driver.vehiclePlate || null,
        zone: driver.zone,
        is_approved: driver.isApproved !== false,
        created_at: driver.createdAt,
      });
    } catch {}
  }
}

export async function syncDeleteDriver(driverId: string): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_drivers_accounts');
    if (raw) {
      const list = JSON.parse(raw).filter((d: any) => d.id !== driverId);
      localStorage.setItem('village_drivers_accounts', JSON.stringify(list));
    }
  } catch {}

  // Firestore
  try {
    await deleteDoc(doc(db, 'drivers', driverId));
  } catch (err) {
    console.warn('Firestore driver delete note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('drivers').delete().eq('id', driverId);
    } catch {}
  }
}

export function subscribeToAllDrivers(
  onUpdate: (drivers: SyncedDriver[]) => void
): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const list: SyncedDriver[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as SyncedDriver);
      });
      onUpdate(list);
    }, (err) => {
      console.warn('Drivers subscription note:', err);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// 4. ORDERS CRUD & REALTIME
// ---------------------------------------------------------------------------

export async function syncSaveOrder(order: SyncedOrder): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_orders');
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((o: any) => o.id === order.id);
    if (index >= 0) list[index] = order;
    else list.unshift(order);
    localStorage.setItem('village_orders', JSON.stringify(list));
  } catch {}

  // Firestore
  try {
    await setDoc(doc(db, 'delivery_orders', order.id), {
      ...order,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore order save note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('orders').upsert({
        id: order.id,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        store_id: order.storeId,
        store_name: order.storeName,
        village_name: order.villageName,
        total_amount: order.totalAmount || 0,
        status: order.status,
        created_at: order.createdAt,
      });
    } catch {}
  }
}

export async function syncDeleteOrder(orderId: string): Promise<void> {
  // Local
  try {
    const raw = localStorage.getItem('village_orders');
    if (raw) {
      const list = JSON.parse(raw).filter((o: any) => o.id !== orderId);
      localStorage.setItem('village_orders', JSON.stringify(list));
    }
  } catch {}

  // Firestore
  try {
    await deleteDoc(doc(db, 'delivery_orders', orderId));
  } catch (err) {
    console.warn('Firestore order delete note:', err);
  }

  // Supabase
  if (true) {
    try {
      await (supabase as any).from('orders').delete().eq('id', orderId);
    } catch {}
  }
}

export function subscribeToAllOrders(
  onUpdate: (orders: SyncedOrder[]) => void
): () => void {
  try {
    const unsub = onSnapshot(collection(db, 'delivery_orders'), (snapshot) => {
      const list: SyncedOrder[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as SyncedOrder);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    }, (err) => {
      console.warn('Orders subscription note:', err);
    });
    return unsub;
  } catch {
    return () => {};
  }
}
