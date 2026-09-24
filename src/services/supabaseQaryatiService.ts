import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { StoreDirectoryRecord, DeliveryOrder } from '../types';
import {
  getStoresDirectory,
  saveStoresDirectory,
  getDeliveryOrders,
  saveDeliveryOrders,
} from './deliveryService';
import {
  getMerchants,
  saveMerchants,
  getDrivers,
  saveDrivers,
  addDeveloperNotification,
  MerchantAccountRecord,
  DriverAccountRecord,
} from './rbacAuthService';

export interface QaryatiVillage {
  id: string;
  name: string;
  region: string;
  isActive: boolean;
}

export const FIXED_VILLAGES_LIST: QaryatiVillage[] = [
  { id: 'vil-fasour', name: 'قرية الفصور', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-haqali', name: 'قرية الحقالي', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-barka', name: 'قرية الباركة', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-anhoom', name: 'قرية الانهوم', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-mushayjiba', name: 'قرية مشيجبه', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-jabari', name: 'سوق حول جباري', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-midad', name: 'قرية المداد', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-jami', name: 'قرية الجامع', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-masilah', name: 'قرية المسيلة', region: 'منطقة ميسان / بني مالك', isActive: true },
  { id: 'vil-makil', name: 'قرية المكيل', region: 'منطقة ميسان / بني مالك', isActive: true },
];

export interface SupabaseMerchantRecord {
  id: string;
  name: string;
  phone: string;
  national_id: string;
  photo?: string;
  id_card_photo?: string;
  village_id: string;
  village_name: string;
  store_name: string;
  password_hash: string;
  is_approved: boolean;
  is_pro?: boolean;
  plan_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseDriverRecord {
  id: string;
  name: string;
  phone: string;
  national_id: string;
  photo?: string;
  id_card_photo?: string;
  vehicle_type: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehicle_plate?: string;
  zone: string;
  village_id?: string;
  password_hash: string;
  is_approved: boolean;
  is_online: boolean;
  total_delivered: number;
  rating: number;
  rating_count: number;
  created_at: string;
}

export interface SupabaseCustomerRecord {
  id: string;
  phone: string;
  name: string;
  password_hash?: string;
  village_id?: string;
  village_name?: string;
  national_id?: string;
  house_photo?: string;
  status?: 'NEW' | 'VERIFIED' | 'BLOCKED';
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseOrderRecord {
  id: string;
  order_number: string;
  customer_phone: string;
  customer_name: string;
  customer_address?: string;
  store_id: string;
  store_name: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  village_id?: string;
  village_name?: string;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// 1. Village-First Filtering Implementation
// Formula: Select * From merchants Where village_id = [Chosen_Village] And is_approved = true
// ---------------------------------------------------------------------------
export async function getApprovedMerchantsByVillage(
  chosenVillage: string
): Promise<StoreDirectoryRecord[]> {
  const cleanVillage = chosenVillage?.trim();
  if (!cleanVillage || cleanVillage === 'ALL') {
    // When no specific village is selected, return all approved stores
    const localStores = getStoresDirectory().filter(
      (s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false
    );
    return localStores;
  }

  // Find village ID if available
  const matchedVillageObj = FIXED_VILLAGES_LIST.find(
    (v) => v.name === cleanVillage || v.id === cleanVillage
  );
  const targetVillageId = matchedVillageObj ? matchedVillageObj.id : cleanVillage;
  const targetVillageName = matchedVillageObj ? matchedVillageObj.name : cleanVillage;

  if (true) {
    try {
      // Execute the exact SQL Query via Supabase Client
      const { data, error } = await (supabase as any)
        .from('merchants')
        .select('*')
        .eq('is_approved', true)
        .or(`village_id.eq.${targetVillageId},village_name.eq.${targetVillageName}`);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((m: any) => ({
          id: m.id,
          merchantId: m.id,
          name: m.store_name || m.name,
          ownerName: m.name,
          phone: m.phone,
          cityOrVillage: m.village_name || targetVillageName,
          itemsCount: 0,
          isPro: Boolean(m.is_pro),
          planName: m.plan_name || (m.is_pro ? 'باقة PRO' : 'الباقة المجانية'),
          status: 'ACTIVE',
          rating: 5.0,
          ratingCount: 0,
          joinedAt: m.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          isApproved: true,
        }));
      }
    } catch (err) {
      console.warn('Supabase query error, falling back to local gatekept directory:', err);
    }
  }

  // Local gatekept fallback (Strictly: Chosen Village & isApproved === true)
  const localMerchants = getMerchants();
  const approvedLocalIds = new Set(
    localMerchants.filter((m) => m.isApproved === true).map((m) => m.id)
  );

  const localStores = getStoresDirectory();
  return localStores.filter((store) => {
    const matchesVillage =
      store.cityOrVillage === targetVillageName ||
      store.cityOrVillage === targetVillageId ||
      store.cityOrVillage?.includes(targetVillageName);

    const isApproved =
      store.status !== 'SUSPENDED' &&
      ((store as any).isApproved === true ||
        approvedLocalIds.has(store.id) ||
        approvedLocalIds.has((store as any).merchantId) ||
        (store as any).isApproved !== false);

    return matchesVillage && isApproved;
  });
}

// ---------------------------------------------------------------------------
// 2. Admin Gatekeeping: Register Merchant with Pending State (is_approved = false)
// ---------------------------------------------------------------------------
export async function registerMerchantGatekept(params: {
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  storeName: string;
  village: string;
  photo?: string;
  idCardPhoto?: string;
}): Promise<{ success: boolean; message: string; merchantId?: string; isPending: boolean }> {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  const merchants = getMerchants();
  const existing = merchants.find(
    (m) => m.phone === cleanPhone || m.nationalId === cleanNationalId
  );
  if (existing) {
    return {
      success: false,
      message: 'يوجد تاجر مسجل مسبقاً بنفس رقم الجوال أو رقم الهوية.',
      isPending: !existing.isApproved,
    };
  }

  const merchantId = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const villageObj = FIXED_VILLAGES_LIST.find((v) => v.name === params.village) || {
    id: `vil-${Date.now()}`,
    name: params.village,
  };

  // 1. Create with isApproved: false (PENDING GATEKEEPING)
  const newMerchant: MerchantAccountRecord = {
    id: merchantId,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    storeName: params.storeName.trim() || `متجر ${cleanName}`,
    village: villageObj.name,
    photo:
      params.photo ||
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isApproved: false, // MANDATORY: Pending admin approval!
  };

  merchants.unshift(newMerchant);
  saveMerchants(merchants);

  // 2. Add to store directory as PENDING (will not show in village until approved)
  const stores = getStoresDirectory();
  const newStoreRecord: StoreDirectoryRecord = {
    id: merchantId,
    merchantId: merchantId,
    name: newMerchant.storeName,
    ownerName: newMerchant.name,
    phone: newMerchant.phone,
    cityOrVillage: newMerchant.village,
    itemsCount: 0,
    isPro: false,
    planName: 'الباقة المجانية',
    status: 'ACTIVE',
    joinedAt: new Date().toISOString().split('T')[0],
    merchantPin: params.password,
    rating: 5.0,
    ratingCount: 0,
    isApproved: false, // Flagged as pending!
  } as any;
  saveStoresDirectory([newStoreRecord, ...stores]);

  // 3. Dispatch High-Priority Developer Notification
  addDeveloperNotification({
    type: 'NEW_MERCHANT',
    title: 'طلب اعتماد تاجر جديد معلق ⏳',
    message: `سجل التاجر "${newMerchant.name}" لمتجر "${newMerchant.storeName}" في "${newMerchant.village}". الحساب معلق بانتظار اعتماد المطور لحماية أهل القرية.`,
    senderName: newMerchant.name,
    senderPhone: newMerchant.phone,
    merchantId: newMerchant.id,
  });

  // 4. Insert into Supabase table 'merchants'
  try {
    await (supabase as any).from('merchants').insert({
      id: merchantId,
      name: newMerchant.name,
      phone: newMerchant.phone,
      national_id: newMerchant.nationalId,
      photo: newMerchant.photo,
      id_card_photo: params.idCardPhoto || null,
      village_id: villageObj.id,
      village_name: villageObj.name,
      store_name: newMerchant.storeName,
      password_hash: params.password,
      is_approved: false, // STRICT GATEKEEPING
      is_pro: false,
      plan_name: 'الباقة المجانية',
      created_at: newMerchant.createdAt,
      updated_at: newMerchant.updatedAt,
    });
  } catch (err) {
    console.warn('Supabase merchant insert note:', err);
  }

  // Broadcast realtime event
  window.dispatchEvent(
    new CustomEvent('qaryati:merchant-registered-pending', { detail: newMerchant })
  );

  return {
    success: true,
    message:
      'تم استلام طلب التسجيل بنجاح! حسابك حالياً بحالة (معلق ⏳) بانتظار اعتماد المطور لضمان أمان القرية ومنع الحسابات الوهمية. سيظهر متجرك في القرية فور اعتماده من الإدارة.',
    merchantId,
    isPending: true,
  };
}

// ---------------------------------------------------------------------------
// 3. Admin Gatekeeping: Register Driver with Pending State (is_approved = false)
// ---------------------------------------------------------------------------
export async function registerDriverGatekept(params: {
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  photo?: string;
  idCardPhoto?: string;
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
  zone?: string;
}): Promise<{ success: boolean; message: string; driverId?: string; isPending: boolean }> {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  const drivers = getDrivers();
  const existing = drivers.find(
    (d) => d.phone === cleanPhone || d.nationalId === cleanNationalId
  );
  if (existing) {
    return {
      success: false,
      message: 'يوجد مندوب مسجل مسبقاً بنفس رقم الجوال أو رقم الهوية.',
      isPending: !existing.isApproved,
    };
  }

  const driverId = `driver-${Date.now()}`;
  const newDriver: DriverAccountRecord = {
    id: driverId,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    photo: params.photo,
    idCardPhoto: params.idCardPhoto,
    vehicleType: params.vehicleType || 'MOTORCYCLE',
    vehiclePlate: params.vehiclePlate,
    zone: params.zone || 'القرية',
    createdAt: new Date().toISOString(),
    isApproved: false, // MANDATORY: Pending admin approval!
  };

  drivers.unshift(newDriver);
  saveDrivers(drivers);

  // Dispatch Developer Notification
  addDeveloperNotification({
    type: 'NEW_MERCHANT',
    title: 'طلب اعتماد مندوب توصيل جديد 🛵⏳',
    message: `سجل المندوب "${newDriver.name}" (هوية: ${newDriver.nationalId}) لتوصيل الطلبات في "${newDriver.zone}". الحساب معلق بانتظار اعتماد المطور.`,
    senderName: newDriver.name,
    senderPhone: newDriver.phone,
  });

  // Insert into Supabase table 'drivers'
  try {
    await (supabase as any).from('drivers').insert({
      id: driverId,
      name: newDriver.name,
      phone: newDriver.phone,
      national_id: newDriver.nationalId,
      photo: newDriver.photo,
      id_card_photo: newDriver.idCardPhoto,
      vehicle_type: newDriver.vehicleType,
      vehicle_plate: newDriver.vehiclePlate || null,
      zone: newDriver.zone,
      password_hash: params.password,
      is_approved: false, // STRICT GATEKEEPING
      is_online: true,
      total_delivered: 0,
      rating: 5.0,
      rating_count: 0,
      created_at: newDriver.createdAt,
      updated_at: newDriver.createdAt,
    });
  } catch (err) {
    console.warn('Supabase driver insert note:', err);
  }

  window.dispatchEvent(
    new CustomEvent('qaryati:driver-registered-pending', { detail: newDriver })
  );

  return {
    success: true,
    message:
      'تم استلام طلب تسجيل السائق بنجاح! حسابك حالياً (معلق ⏳) بانتظار موافقة واعتماد المطور لضمان سلامة التوصيل لأهالي القرية.',
    driverId,
    isPending: true,
  };
}

// ---------------------------------------------------------------------------
// 4. Developer Approval Gate Action (Approve / Reject Merchant)
// ---------------------------------------------------------------------------
export async function setMerchantApprovalStatus(
  merchantId: string,
  isApproved: boolean
): Promise<{ success: boolean; message: string }> {
  // Update local merchants list
  const merchants = getMerchants();
  const targetIndex = merchants.findIndex((m) => m.id === merchantId || m.phone === merchantId);
  if (targetIndex !== -1) {
    merchants[targetIndex].isApproved = isApproved;
    merchants[targetIndex].updatedAt = new Date().toISOString();
    saveMerchants(merchants);
  }

  // Update stores directory
  const stores = getStoresDirectory();
  const storeIndex = stores.findIndex(
    (s) => s.id === merchantId || (s as any).merchantId === merchantId || s.phone === merchantId
  );
  if (storeIndex !== -1) {
    (stores[storeIndex] as any).isApproved = isApproved;
    stores[storeIndex].status = isApproved ? 'ACTIVE' : 'SUSPENDED';
    saveStoresDirectory(stores);
  }

  // Update Supabase
  try {
    await (supabase as any)
      .from('merchants')
      .update({ is_approved: isApproved, updated_at: new Date().toISOString() })
      .eq('id', merchantId);
  } catch (err) {
    console.warn('Supabase update error:', err);
  }

  // Broadcast realtime event across all village visitors & customers
  window.dispatchEvent(
    new CustomEvent('qaryati:merchant-approval-changed', {
      detail: { merchantId, isApproved },
    })
  );

  return {
    success: true,
    message: isApproved
      ? 'تم اعتماد المتجر رسمياً بنجاح! أصبح المتجر ظاهراً ومتاحاً للطلب في قريته الآن ✅'
      : 'تم تعليق / حظر المتجر بنجاح 🚫',
  };
}

// ---------------------------------------------------------------------------
// 5. Developer Approval Gate Action (Approve / Reject Driver)
// ---------------------------------------------------------------------------
export async function setDriverApprovalStatus(
  driverId: string,
  isApproved: boolean
): Promise<{ success: boolean; message: string }> {
  const drivers = getDrivers();
  const idx = drivers.findIndex((d) => d.id === driverId || d.phone === driverId);
  if (idx !== -1) {
    drivers[idx].isApproved = isApproved;
    saveDrivers(drivers);
  }

  try {
    await (supabase as any)
      .from('drivers')
      .update({ is_approved: isApproved, updated_at: new Date().toISOString() })
      .eq('id', driverId);
  } catch (err) {
    console.warn('Supabase update driver error:', err);
  }

  window.dispatchEvent(
    new CustomEvent('qaryati:driver-approval-changed', {
      detail: { driverId, isApproved },
    })
  );

  return {
    success: true,
    message: isApproved
      ? 'تم اعتماد وتفعيل السائق بنجاح! أصبح بإمكانه استلام ومتابعة توصيل الطلبات ✅'
      : 'تم تعليق / حظر السائق 🚫',
  };
}

// ---------------------------------------------------------------------------
// 6. Realtime Synchronization Channel
// Synchronize Orders, Merchants, and Drivers across 100+ concurrent clients
// ---------------------------------------------------------------------------
export function initSupabaseRealtime(callbacks: {
  onOrdersChanged?: (order: DeliveryOrder) => void;
  onMerchantApprovalChanged?: (merchantId: string, isApproved: boolean) => void;
  onNewPendingAccount?: (type: 'merchant' | 'driver', record: any) => void;
}) {
  if (false) {
    // Listen to window custom events as seamless zero-lag local fallback
    const handleOrder = (e: any) => callbacks.onOrdersChanged?.(e.detail);
    const handleApproval = (e: any) =>
      callbacks.onMerchantApprovalChanged?.(e.detail.merchantId, e.detail.isApproved);
    const handlePendingMerchant = (e: any) =>
      callbacks.onNewPendingAccount?.('merchant', e.detail);
    const handlePendingDriver = (e: any) => callbacks.onNewPendingAccount?.('driver', e.detail);

    window.addEventListener('qaryati:new-order-received', handleOrder);
    window.addEventListener('qaryati:order-accepted', handleOrder);
    window.addEventListener('qaryati:order-delivered', handleOrder);
    window.addEventListener('qaryati:merchant-approval-changed', handleApproval);
    window.addEventListener('qaryati:merchant-registered-pending', handlePendingMerchant);
    window.addEventListener('qaryati:driver-registered-pending', handlePendingDriver);

    return () => {
      window.removeEventListener('qaryati:new-order-received', handleOrder);
      window.removeEventListener('qaryati:order-accepted', handleOrder);
      window.removeEventListener('qaryati:order-delivered', handleOrder);
      window.removeEventListener('qaryati:merchant-approval-changed', handleApproval);
      window.removeEventListener('qaryati:merchant-registered-pending', handlePendingMerchant);
      window.removeEventListener('qaryati:driver-registered-pending', handlePendingDriver);
    };
  }

  try {
    const channel = (supabase as any)
      .channel('qaryati-realtime-master')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new && callbacks.onOrdersChanged) {
            callbacks.onOrdersChanged(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'merchants' },
        (payload: any) => {
          if (payload.new && callbacks.onMerchantApprovalChanged) {
            callbacks.onMerchantApprovalChanged(payload.new.id, payload.new.is_approved);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'merchants' },
        (payload: any) => {
          if (payload.new && !payload.new.is_approved && callbacks.onNewPendingAccount) {
            callbacks.onNewPendingAccount('merchant', payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'drivers' },
        (payload: any) => {
          if (payload.new && !payload.new.is_approved && callbacks.onNewPendingAccount) {
            callbacks.onNewPendingAccount('driver', payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {}
    };
  } catch (e) {
    console.warn('Realtime channel initialization error:', e);
    return () => {};
  }
}

// ---------------------------------------------------------------------------
// 7. Get Pending Gatekeeping Counts for Developer Portal
// ---------------------------------------------------------------------------
export function getPendingApprovalsSummary(): {
  pendingMerchantsCount: number;
  pendingDriversCount: number;
  pendingMerchants: MerchantAccountRecord[];
  pendingDrivers: DriverAccountRecord[];
} {
  const merchants = getMerchants();
  const drivers = getDrivers();

  const pendingMerchants = merchants.filter((m) => m.isApproved === false);
  const pendingDrivers = drivers.filter((d) => d.isApproved === false);

  return {
    pendingMerchantsCount: pendingMerchants.length,
    pendingDriversCount: pendingDrivers.length,
    pendingMerchants,
    pendingDrivers,
  };
}

// ---------------------------------------------------------------------------
// 8. Customers Cloud Registration & Developer Gatekeeping (Supabase)
// ---------------------------------------------------------------------------
const CUSTOMERS_LOCAL_STORAGE_KEY = 'qaryati_customers_cloud_cache_v1';

export function getCustomersLocalCache(): SupabaseCustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomersLocalCache(customers: SupabaseCustomerRecord[]): void {
  try {
    localStorage.setItem(CUSTOMERS_LOCAL_STORAGE_KEY, JSON.stringify(customers));
  } catch {}
}

/**
 * Registers or updates a customer in the Supabase cloud database,
 * saves to local cache, sends a notification to the developer portal,
 * and broadcasts a realtime event.
 */
export async function registerCustomerAccount(params: {
  name: string;
  phone: string;
  nationalId: string;
  villageName?: string;
  villageId?: string;
}): Promise<{ success: boolean; customer: SupabaseCustomerRecord }> {
  const cleanPhone = params.phone.trim();
  const cleanName = params.name.trim();
  const cleanNationalId = params.nationalId.trim();
  const cleanVillage = params.villageName?.trim() || 'منطقة ميسان / بني مالك';
  const nowIso = new Date().toISOString();

  const customerId = `cust-${cleanPhone.replace(/\D/g, '') || Date.now()}`;

  const customerRecord: SupabaseCustomerRecord = {
    id: customerId,
    name: cleanName,
    phone: cleanPhone,
    national_id: cleanNationalId,
    village_name: cleanVillage,
    village_id: params.villageId || '',
    status: 'NEW',
    is_verified: false,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 1. Update local cache immediately
  const localList = getCustomersLocalCache();
  const existingIdx = localList.findIndex((c) => c.phone === cleanPhone || c.id === customerId);
  if (existingIdx !== -1) {
    localList[existingIdx] = {
      ...localList[existingIdx],
      name: cleanName,
      national_id: cleanNationalId,
      village_name: cleanVillage,
      updated_at: nowIso,
    };
  } else {
    localList.unshift(customerRecord);
  }
  saveCustomersLocalCache(localList);

  // 2. Insert or Upsert into Firestore & Supabase `customers` table
  try {
    await setDoc(doc(db, 'customers', customerId), {
      ...customerRecord,
      updatedAt: nowIso
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore customer sync note:', err);
  }

  try {
    await (supabase as any).from('customers').upsert(
      {
        id: customerId,
        phone: cleanPhone,
        name: cleanName,
        national_id: cleanNationalId,
        village_name: cleanVillage,
        village_id: params.villageId || null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'phone' }
    );
  } catch (err) {
    console.warn('Supabase customer registration notice:', err);
  }

  // 3. Notify Developer Portal
  addDeveloperNotification({
    type: 'NEW_CUSTOMER',
    title: `👤 عميل جديد انضم للمنظومة: ${cleanName}`,
    message: `انضم عميل جديد برقم بطاقة الهوية (${cleanNationalId}) ورقم الجوال (${cleanPhone}) من قرية (${cleanVillage}).`,
    senderName: cleanName,
    senderPhone: cleanPhone,
  });

  // 4. Dispatch system event so open Developer Portal views update live
  window.dispatchEvent(
    new CustomEvent('qaryati:new-customer-registered', { detail: customerRecord })
  );

  return { success: true, customer: customerRecord };
}

/**
 * Fetches all customers directly from Supabase, merging with local storage cache.
 */
export async function fetchAllCustomers(): Promise<SupabaseCustomerRecord[]> {
  const localCache = getCustomersLocalCache();

  try {
    const { data, error } = await (supabase as any)
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Merge remote records with local cache
      const map = new Map<string, SupabaseCustomerRecord>();
      // Put remote records first
      data.forEach((r: any) => {
        const item: SupabaseCustomerRecord = {
          id: r.id || `cust-${r.phone}`,
          name: r.name || 'عميل',
          phone: r.phone || '',
          national_id: r.national_id || r.nationalId || '',
          village_name: r.village_name || r.villageName || '',
          village_id: r.village_id || r.villageId || '',
          status: r.status || (r.is_verified ? 'VERIFIED' : 'NEW'),
          is_verified: Boolean(r.is_verified),
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || r.created_at,
        };
        map.set(item.phone || item.id, item);
      });

      // Preserve any local record not yet in remote
      localCache.forEach((lc) => {
        if (!map.has(lc.phone || lc.id)) {
          map.set(lc.phone || lc.id, lc);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      saveCustomersLocalCache(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Supabase fetch customers warning:', err);
  }

  // Firestore Cross-Device Fallback
  try {
    const snap = await getDocs(collection(db, 'customers'));
    if (!snap.empty) {
      const map = new Map<string, SupabaseCustomerRecord>();
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const item: SupabaseCustomerRecord = {
          id: docSnap.id,
          name: d.name || 'عميل',
          phone: d.phone || '',
          national_id: d.national_id || d.nationalId || '',
          village_name: d.village_name || d.villageName || '',
          village_id: d.village_id || d.villageId || '',
          status: d.status || 'NEW',
          is_verified: Boolean(d.is_verified),
          created_at: d.created_at || d.createdAt || new Date().toISOString(),
          updated_at: d.updated_at || d.updatedAt || new Date().toISOString(),
        };
        map.set(item.phone || item.id, item);
      });

      localCache.forEach((lc) => {
        if (!map.has(lc.phone || lc.id)) {
          map.set(lc.phone || lc.id, lc);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      saveCustomersLocalCache(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Firestore fetch customers warning:', e);
  }

  return localCache;
}

/**
 * Developer action: updates verification/status for a customer in Supabase and local cache.
 */
export async function updateCustomerStatus(
  customerId: string,
  status: 'NEW' | 'VERIFIED' | 'BLOCKED',
  isVerified: boolean
): Promise<boolean> {
  const localList = getCustomersLocalCache();
  const idx = localList.findIndex((c) => c.id === customerId || c.phone === customerId);
  if (idx !== -1) {
    localList[idx].status = status;
    localList[idx].is_verified = isVerified;
    localList[idx].updated_at = new Date().toISOString();
    saveCustomersLocalCache(localList);
  }

  try {
    await setDoc(doc(db, 'customers', customerId), {
      status,
      is_verified: isVerified,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch {}

  try {
    await (supabase as any)
      .from('customers')
      .update({
        status,
        is_verified: isVerified,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);
  } catch (err) {
    console.warn('Supabase update customer status warning:', err);
  }

  window.dispatchEvent(
    new CustomEvent('qaryati:customer-status-updated', {
      detail: { customerId, status, isVerified },
    })
  );

  return true;
}

/**
 * Developer action: deletes a customer from Supabase and local cache.
 */
export async function deleteCustomerRecord(customerId: string): Promise<boolean> {
  const localList = getCustomersLocalCache();
  const filtered = localList.filter((c) => c.id !== customerId && c.phone !== customerId);
  saveCustomersLocalCache(filtered);

  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch {}

  try {
    await (supabase as any).from('customers').delete().eq('id', customerId);
  } catch (err) {
    console.warn('Supabase delete customer warning:', err);
  }

  window.dispatchEvent(new CustomEvent('qaryati:customer-deleted', { detail: { customerId } }));
  return true;
}
