import { DeliveryOrder, DeliveryOrderStatus, DriverProfile, StoreDirectoryRecord } from '../types';

const ORDERS_STORAGE_KEY = 'qaryati_delivery_orders';
const DRIVER_PROFILE_KEY = 'qaryati_driver_profile';
const STORES_DIRECTORY_KEY = 'qaryati_stores_directory';

// Sample initial stores for Platform Admin (empty by default for clean start)
const INITIAL_STORES: StoreDirectoryRecord[] = [];

// Sample initial delivery orders to demo the workflow (empty by default for clean start)
const INITIAL_ORDERS: DeliveryOrder[] = [];

export function getDeliveryOrders(): DeliveryOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
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
  } catch (e) {
    console.error('Failed to save delivery orders:', e);
  }
}

export function createDeliveryOrder(orderData: Omit<DeliveryOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): DeliveryOrder {
  const orders = getDeliveryOrders();
  const randDigits = Math.floor(1000 + Math.random() * 9000);
  const newOrder: DeliveryOrder = {
    ...orderData,
    id: `ord-${Date.now()}`,
    orderNumber: `ORD-${randDigits}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [newOrder, ...orders];
  saveDeliveryOrders(updated);
  
  // Dispatch specific new order event & sound for merchant notification
  window.dispatchEvent(new CustomEvent('qaryati:new-order-received', { detail: newOrder }));
  playNotificationChime('new_order');
  
  return newOrder;
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
      localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify(INITIAL_STORES));
      return INITIAL_STORES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_STORES;
  }
}

export function saveStoresDirectory(stores: StoreDirectoryRecord[]) {
  try {
    localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify(stores));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: stores }));
  } catch {}
}

export function addStoreToDirectory(store: Omit<StoreDirectoryRecord, 'id' | 'joinedAt'>): StoreDirectoryRecord {
  const stores = getStoresDirectory();
  const newStore: StoreDirectoryRecord = {
    ...store,
    id: `store-${Date.now()}`,
    joinedAt: new Date().toISOString().split('T')[0],
  };
  const updated = [newStore, ...stores];
  saveStoresDirectory(updated);
  return newStore;
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
  return updated;
}
