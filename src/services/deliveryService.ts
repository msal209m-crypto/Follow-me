import { DeliveryOrder, DeliveryOrderStatus, DriverProfile, StoreDirectoryRecord, Item } from '../types';
import { db } from '../lib/firebase';
import { isCustomerBlockedByMerchant } from './rbacAuthService';
import {
  syncSaveStore,
  syncDeleteStore,
  syncSaveOrder,
  syncSaveStoreProduct,
  syncSaveDriver
} from './crossDeviceSyncService';

const ORDERS_STORAGE_KEY = 'qaryati_delivery_orders';
const DRIVER_PROFILE_KEY = 'qaryati_driver_profile';
const STORES_DIRECTORY_KEY = 'qaryati_stores_directory';
const DB_RESET_FLAG_KEY = 'qaryati_db_reset_clean_slate_v6';

// Clean initial stores - empty by default for multi-vendor registration
const INITIAL_STORES: StoreDirectoryRecord[] = [];

// Clean initial delivery orders - empty by default
const INITIAL_ORDERS: DeliveryOrder[] = [];

/**
 * Execute automatic purge of legacy mock demo stores to start clean slate
 */
export function purgeDemoDatabaseIfNeeded() {
  try {
    const isPurged = localStorage.getItem(DB_RESET_FLAG_KEY);
    if (!isPurged) {
      // Clean legacy mock stores from storage
      const rawStores = localStorage.getItem(STORES_DIRECTORY_KEY);
      if (rawStores) {
        try {
          const stores: StoreDirectoryRecord[] = JSON.parse(rawStores);
          const filteredStores = stores.filter(
            (s) =>
              !s.name.includes('عنوان القهوة') &&
              !s.name.includes('تموينات الأمل') &&
              !s.name.includes('متجر تجريبي') &&
              s.id !== 'store-1' &&
              s.id !== 'store-2' &&
              s.id !== 'store-3' &&
              s.id !== 'store-4' &&
              s.id !== 'store-5' &&
              s.id !== 'merchant-default-1'
          );
          localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify(filteredStores));
        } catch {
          localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify([]));
        }
      }

      // Clean legacy mock merchants
      const rawMerchants = localStorage.getItem('flowapp_rbac_merchants_v1');
      if (rawMerchants) {
        try {
          const merchants = JSON.parse(rawMerchants);
          const filtered = Array.isArray(merchants)
            ? merchants.filter(
                (m: any) =>
                  m.id !== 'merchant-default-1' &&
                  !m.storeName?.includes('تموينات الأمل') &&
                  !m.storeName?.includes('عنوان القهوة') &&
                  !m.storeName?.includes('متجر تجريبي')
              )
            : [];
          localStorage.setItem('flowapp_rbac_merchants_v1', JSON.stringify(filtered));
        } catch {
          localStorage.setItem('flowapp_rbac_merchants_v1', JSON.stringify([]));
        }
      }

      localStorage.setItem(DB_RESET_FLAG_KEY, 'true');
    }
  } catch (e) {
    console.warn('Error purging demo database:', e);
  }
}

// Run purge once on import
purgeDemoDatabaseIfNeeded();

export function getDeliveryOrders(): DeliveryOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse delivery orders:', e);
    return INITIAL_ORDERS;
  }
}

export function playNotificationChime(type: 'new_order' | 'ready_pickup' | 'accepted' | 'delivered' = 'new_order') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'new_order') {
      // Distinct two-tone chime for incoming store order: D5 (587Hz) -> A5 (880Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'ready_pickup') {
      // 3 upbeat ascending notes for driver alert: C5 -> E5 -> G5
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    } else if (type === 'accepted') {
      // Pleasant confirmation tone for order preparation
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Success tone for delivered order
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

export function saveDeliveryOrders(orders: DeliveryOrder[]) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('qaryati:orders-updated', { detail: orders }));
    // Sync all to Firestore
    orders.forEach((o) => {
      syncSaveOrder(o).catch((e) => console.warn('Firestore order sync error:', e));
    });
  } catch (e) {
    console.error('Failed to save delivery orders:', e);
  }
}

export function createDeliveryOrder(orderData: Omit<DeliveryOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): DeliveryOrder {
  if (orderData.storeId && orderData.customerPhone) {
    if (isCustomerBlockedByMerchant(orderData.storeId, orderData.customerPhone)) {
      throw new Error('عذراً، هذا الحساب محظور من قبل إدارة هذا المتجر ولا يمكنك إرسال طلبات جديدة إليه.');
    }
  }
  const orders = getDeliveryOrders();
  const randDigits = Math.floor(1000 + Math.random() * 9000);
  const secureHandoverPin = Math.floor(1000 + Math.random() * 9000).toString(); // رمز سري لتأكيد الاستلام بين السائق والعميل
  const newOrder: DeliveryOrder = {
    ...orderData,
    id: `ord-${Date.now()}`,
    orderNumber: `ORD-${randDigits}`,
    deliveryPin: orderData.deliveryPin || secureHandoverPin,
    customerReceived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [newOrder, ...orders];
  saveDeliveryOrders(updated);
  
  // Dispatch specific new order event & sound for merchant notification
  window.dispatchEvent(new CustomEvent('qaryati:new-order-received', { detail: newOrder }));
  playNotificationChime('new_order');
  
  // Guarantee instant cloud save
  syncSaveOrder(newOrder).catch((e) => console.warn('Instant cloud order save error:', e));

  return newOrder;
}

/**
 * دالة التحقق العالمية لإتمام وتأكيد تسليم الطلب وحفظ حقوق السائق والعميل والتاجر:
 * 1. التحقق من كود التسليم السري (Handover OTP) الممنوح للعميل حصراً.
 * 2. أو تأكيد الاستلام المباشر بنقرة زر من تطبيق العميل نفسه.
 * 3. أو تسليم يدوي استثنائي موثق مع تدوين السبب واسم المستلم.
 */
export function verifyAndCompleteDeliveryOrder(params: {
  orderId: string;
  providedPin?: string;
  recipientName?: string;
  isDirectCustomerConfirmation?: boolean;
  manualBypassReason?: string;
}): { success: boolean; message: string; order?: DeliveryOrder } {
  const orders = getDeliveryOrders();
  const idx = orders.findIndex((o) => o.id === params.orderId);
  if (idx === -1) {
    return { success: false, message: 'عذراً، لم يتم العثور على الطلب المحدد.' };
  }

  const current = orders[idx];

  // إذا تم التسليم مسبقاً
  if (current.status === 'DELIVERED') {
    return { success: true, message: 'الطلب تم تسليمه وتأكيده مسبقاً.', order: current };
  }

  // السيناريو 1: تأكيد مباشر من العميل في واجهة تطبيقه
  if (params.isDirectCustomerConfirmation) {
    const updatedOrder: DeliveryOrder = {
      ...current,
      status: 'DELIVERED',
      customerReceived: true,
      recipientConfirmedBy: 'CUSTOMER_BUTTON',
      customerConfirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryVerificationNotes: params.manualBypassReason
        ? `تأكيد مباشر من العميل: ${params.manualBypassReason}`
        : 'تم تأكيد الاستلام بنجاح من قبل العميل مباشرة عبر تطبيقه',
    };

    orders[idx] = updatedOrder;
    saveDeliveryOrders(orders);
    syncSaveOrder(updatedOrder).catch((e) => console.warn('Cloud sync error on customer confirm:', e));

    // تحديث إحصائيات السائق
    updateDriverDeliveredCount(current.driverId);

    window.dispatchEvent(new CustomEvent('qaryati:order-delivered', { detail: updatedOrder }));
    window.dispatchEvent(new CustomEvent('qaryati:order-customer-confirmed', { detail: updatedOrder }));
    playNotificationChime('delivered');

    return {
      success: true,
      message: 'تم تأكيد استلام الشحنة رسمياً وتحديث الحساب بنجاح ✅',
      order: updatedOrder,
    };
  }

  // السيناريو 2: السائق يقوم بإدخال كود التسليم (Handover PIN)
  if (params.providedPin) {
    const cleanInput = params.providedPin.trim();
    const expectedPin = (current.deliveryPin || '').trim();

    if (!expectedPin || cleanInput === expectedPin) {
      const updatedOrder: DeliveryOrder = {
        ...current,
        status: 'DELIVERED',
        customerReceived: true,
        recipientConfirmedBy: 'CUSTOMER_OTP',
        customerConfirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: params.recipientName
          ? `${current.notes || ''} (مستلم الطلب: ${params.recipientName})`.trim()
          : current.notes,
        deliveryVerificationNotes: `تم التحقق بنجاح عبر كود التسليم السري (OTP: ${cleanInput})`,
      };

      orders[idx] = updatedOrder;
      saveDeliveryOrders(orders);
      syncSaveOrder(updatedOrder).catch((e) => console.warn('Cloud sync error on OTP confirm:', e));

      updateDriverDeliveredCount(current.driverId);

      window.dispatchEvent(new CustomEvent('qaryati:order-delivered', { detail: updatedOrder }));
      playNotificationChime('delivered');

      return {
        success: true,
        message: 'تم التحقق من كود التسليم بنجاح وإتمام التوصيل وتوثيق استلام العميل ✅',
        order: updatedOrder,
      };
    } else {
      return {
        success: false,
        message: `رمز التسليم (${cleanInput}) غير صحيح! يرجى طلب الرمز السري المكون من 4 أرقام من العميل لحفظ حقوق الجميع.`,
      };
    }
  }

  // السيناريو 3: تسليم يدوي استثنائي مع السبب الموثق (في حال تعذر الاتصال أو نفاد بطارية هاتف العميل)
  if (params.manualBypassReason) {
    const updatedOrder: DeliveryOrder = {
      ...current,
      status: 'DELIVERED',
      customerReceived: true,
      recipientConfirmedBy: 'DRIVER_VERIFIED',
      customerConfirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: params.recipientName
        ? `${current.notes || ''} (مستلم الطلب: ${params.recipientName})`.trim()
        : current.notes,
      deliveryVerificationNotes: `تسليم يدوي استثنائي موثق: ${params.manualBypassReason} (المستلم: ${params.recipientName || 'المستلم الفعلي'})`,
    };

    orders[idx] = updatedOrder;
    saveDeliveryOrders(orders);
    syncSaveOrder(updatedOrder).catch((e) => console.warn('Cloud sync error on manual confirm:', e));

    updateDriverDeliveredCount(current.driverId);

    window.dispatchEvent(new CustomEvent('qaryati:order-delivered', { detail: updatedOrder }));
    playNotificationChime('delivered');

    return {
      success: true,
      message: 'تم توثيق التسليم الاستثنائي بنجاح وتدوين السبب بالأرشيف ✅',
      order: updatedOrder,
    };
  }

  return {
    success: false,
    message: 'يرجى إدخال رمز التحقق السري (OTP) من العميل لتأكيد الاستلام نظامياً.',
  };
}

function updateDriverDeliveredCount(driverId?: string) {
  if (!driverId) return;
  try {
    const profile = getDriverProfile();
    if (profile && profile.id === driverId) {
      const updatedProfile: DriverProfile = {
        ...profile,
        totalDelivered: (profile.totalDelivered || 0) + 1,
      };
      saveDriverProfile(updatedProfile);
    }
  } catch (e) {
    console.warn('Could not update driver stats:', e);
  }
}

export function updateOrderStatus(
  orderId: string,
  newStatus: DeliveryOrderStatus,
  driverInfo?: { driverId?: string; driverName?: string; driverPhone?: string }
): DeliveryOrder | null {
  const orders = getDeliveryOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const current = orders[index];
  const updatedOrder: DeliveryOrder = {
    ...current,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(driverInfo?.driverId ? { driverId: driverInfo.driverId } : {}),
    ...(driverInfo?.driverName ? { driverName: driverInfo.driverName } : {}),
    ...(driverInfo?.driverPhone ? { driverPhone: driverInfo.driverPhone } : {}),
  };

  orders[index] = updatedOrder;
  saveDeliveryOrders(orders);
  syncSaveOrder(updatedOrder).catch((e) => console.warn('Cloud order update error:', e));

  // Trigger specialized sound & events according to lifecycle stage
  if (newStatus === 'ACCEPTED') {
    window.dispatchEvent(new CustomEvent('qaryati:order-accepted', { detail: updatedOrder }));
    playNotificationChime('accepted');
  } else if (newStatus === 'READY_FOR_PICKUP') {
    window.dispatchEvent(new CustomEvent('qaryati:order-ready-for-pickup', { detail: updatedOrder }));
    playNotificationChime('ready_pickup');
  } else if (newStatus === 'DELIVERED') {
    window.dispatchEvent(new CustomEvent('qaryati:order-delivered', { detail: updatedOrder }));
    playNotificationChime('delivered');
  }

  return updatedOrder;
}

export function getDriverProfile(): DriverProfile | null {
  try {
    const raw = localStorage.getItem(DRIVER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDriverProfile(profile: DriverProfile) {
  try {
    localStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('qaryati:driver-updated', { detail: profile }));
    syncSaveDriver({
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      nationalId: (profile as any).nationalId || profile.id,
      vehicleType: profile.vehicleType,
      vehiclePlate: profile.vehiclePlate,
      zone: profile.zone,
      photo: profile.photo,
      isApproved: true,
      isOnline: profile.isOnline,
      createdAt: profile.registeredAt || new Date().toISOString()
    }).catch(console.warn);
  } catch (e) {
    console.error('Failed to save driver profile:', e);
  }
}

export function clearDriverProfile() {
  try {
    localStorage.removeItem(DRIVER_PROFILE_KEY);
    window.dispatchEvent(new CustomEvent('qaryati:driver-updated', { detail: null }));
  } catch {}
}

export function getStoresDirectory(): StoreDirectoryRecord[] {
  try {
    const raw = localStorage.getItem(STORES_DIRECTORY_KEY);
    if (!raw) {
      return INITIAL_STORES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stores directory:', e);
    return INITIAL_STORES;
  }
}

export function saveStoresDirectory(stores: StoreDirectoryRecord[]) {
  try {
    localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify(stores));
    localStorage.setItem('village_stores_directory', JSON.stringify(stores));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: stores }));
    // Sync to Firestore
    stores.forEach((s) => {
      syncSaveStore(s).catch((e) => console.warn('Firestore store sync error:', e));
    });
  } catch {}
}

export function addStoreToDirectory(store: Omit<StoreDirectoryRecord, 'id' | 'joinedAt'>): StoreDirectoryRecord {
  const stores = getStoresDirectory();
  const newStore: StoreDirectoryRecord = {
    ...store,
    id: `store-${Date.now()}`,
    status: store.status || 'ACTIVE',
    isApproved: (store as any).isApproved !== false,
    joinedAt: new Date().toISOString().split('T')[0],
  };
  const updated = [newStore, ...stores];
  saveStoresDirectory(updated);
  syncSaveStore(newStore).catch(console.warn);
  return newStore;
}

export async function deleteStoreDirectoryRecord(storeId: string): Promise<void> {
  try {
    const stores = getStoresDirectory().filter((s) => s.id !== storeId);
    localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify(stores));
    localStorage.setItem('village_stores_directory', JSON.stringify(stores));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: stores }));
  } catch {}

  try {
    await syncDeleteStore(storeId);
  } catch (e) {
    console.warn('Failed to delete store in cloud:', e);
  }
}

export function toggleStoreProStatus(storeId: string): StoreDirectoryRecord | null {
  const stores = getStoresDirectory();
  const idx = stores.findIndex((s) => s.id === storeId);
  if (idx === -1) return null;

  const target = stores[idx];
  const updated: StoreDirectoryRecord = {
    ...target,
    isPro: !target.isPro,
    planName: !target.isPro ? 'باقة PRO (مفعلة من مالك المنصة)' : 'الباقة المجانية',
  };
  stores[idx] = updated;
  saveStoresDirectory(stores);
  syncSaveStore(updated).catch(console.warn);
  return updated;
}

/**
 * Get products/items for a specific store in the multi-vendor system
 */
export function getStoreProducts(storeId: string): Item[] {
  try {
    // 1. Check store-specific items
    const raw = localStorage.getItem(`merchant_${storeId}_items`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // 2. Check user-isolated items if storeId matches a userId
    const userRaw = localStorage.getItem(`user_${storeId}_items`);
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save products for a specific store and update store items count
 */
export function saveStoreProducts(storeId: string, products: Item[]) {
  try {
    localStorage.setItem(`merchant_${storeId}_items`, JSON.stringify(products));
    
    // Sync each product/item to Firestore under stores/{storeId}/items
    products.forEach((prod) => {
      syncSaveStoreProduct(storeId, prod).catch((e) => console.warn('Firestore store product sync error:', e));
    });

    // Update store items count in directory
    const stores = getStoresDirectory();
    const idx = stores.findIndex((s) => s.id === storeId || s.merchantId === storeId);
    if (idx !== -1) {
      stores[idx] = {
        ...stores[idx],
        itemsCount: products.length,
      };
      saveStoresDirectory(stores);
    }
    window.dispatchEvent(new CustomEvent('qaryati:store-products-updated', { detail: { storeId, count: products.length } }));
  } catch (e) {
    console.warn('Error saving store products:', e);
  }
}

/**
 * Rate a delivery order, the store, and the driver
 */
export function rateDeliveryOrder(params: {
  orderId: string;
  storeRating: number;
  driverRating: number;
  feedback?: string;
}): { success: boolean; message: string; order?: DeliveryOrder } {
  const orders = getDeliveryOrders();
  const idx = orders.findIndex((o) => o.id === params.orderId);
  if (idx === -1) {
    return { success: false, message: 'لم يتم العثور على الطلب' };
  }

  const order = orders[idx];
  const updatedOrder: DeliveryOrder = {
    ...order,
    storeRating: params.storeRating,
    driverRating: params.driverRating,
    ratingFeedback: params.feedback,
    isRated: true,
    updatedAt: new Date().toISOString(),
  };

  orders[idx] = updatedOrder;
  saveDeliveryOrders(orders);
  syncSaveOrder(updatedOrder).catch(console.warn);

  // Update store rating in directory
  const stores = getStoresDirectory();
  const storeIdx = stores.findIndex(
    (s) => (order.storeId && s.id === order.storeId) || s.name === order.storeName
  );

  if (storeIdx !== -1) {
    const s = stores[storeIdx];
    const prevRating = s.rating || 5;
    const prevCount = s.ratingCount || 0;
    const newCount = prevCount + 1;
    const newAvg = Number(((prevRating * prevCount + params.storeRating) / newCount).toFixed(1));

    stores[storeIdx] = {
      ...s,
      rating: newAvg,
      ratingCount: newCount,
    };
    saveStoresDirectory(stores);
  }

  // Update driver rating if driver assigned
  if (order.driverId) {
    const driver = getDriverProfile();
    if (driver && driver.id === order.driverId) {
      const prevRating = driver.rating || 5;
      const prevCount = driver.ratingCount || 0;
      const newCount = prevCount + 1;
      const newAvg = Number(((prevRating * prevCount + params.driverRating) / newCount).toFixed(1));

      saveDriverProfile({
        ...driver,
        rating: newAvg,
        ratingCount: newCount,
      });
    }
  }

  window.dispatchEvent(new CustomEvent('qaryati:order-rated', { detail: updatedOrder }));
  return { success: true, message: 'شكراً لك! تم تسجيل تقييمك بنجاح ⭐', order: updatedOrder };
}

/**
 * Reset platform local cache
 */
export function resetAllPlatformData() {
  try {
    localStorage.removeItem(STORES_DIRECTORY_KEY);
    localStorage.removeItem(ORDERS_STORAGE_KEY);
    localStorage.removeItem('flowapp_rbac_merchants_v1');
    localStorage.removeItem('flowapp_v4_active_local_user');
    localStorage.removeItem('qaryati_products');
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('merchant_') || k.startsWith('guest_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    
    localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify([]));
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(DB_RESET_FLAG_KEY, 'true');
    window.location.reload();
  } catch (e) {
    console.error('Failed to reset platform data:', e);
  }
}
