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

// Clean initial stores matching the village ecosystem
const INITIAL_STORES: StoreDirectoryRecord[] = [
  {
    id: 'store-alrezq',
    name: 'بقالة الرزق',
    merchantId: 'merchant-alrezq',
    phone: '+966500001001',
    cityOrVillage: 'قرية الفلاح',
    address: 'الشارع العام - بجوار المسجد الكبير',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'بقالة وتموينات',
    rating: 4.8,
    ratingCount: 42,
    itemsCount: 8,
    joinedAt: '2026-01-10',
    coverPhoto: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&auto=format&fit=crop&q=80',
    promoTag: 'توصيل مجاني 🛵',
    freeDelivery: true,
    workingHours: {
      isOpen24Hours: false,
      openTime: '06:00',
      closeTime: '23:30',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-alfalah-restaurant',
    name: 'مطعم الفلّاح',
    merchantId: 'merchant-alfalah',
    phone: '+966500001002',
    cityOrVillage: 'قرية الفلاح',
    address: 'طريق المزارع - تقاطع السوق',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'مطاعم ومأكولات',
    rating: 4.9,
    ratingCount: 88,
    itemsCount: 6,
    joinedAt: '2026-01-12',
    coverPhoto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
    promoTag: 'خصم 15%',
    workingHours: {
      isOpen24Hours: false,
      openTime: '11:00',
      closeTime: '01:00',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-maqha-albon',
    name: 'مقهى البن',
    merchantId: 'merchant-maqha',
    phone: '+966500001003',
    cityOrVillage: 'قرية الروضة',
    address: 'شارع النخيل - ساحة الاحتفالات',
    status: 'ACTIVE',
    isApproved: true,
    isPro: false,
    planName: 'الباقة المجانية',
    category: 'مقاهي ومشروبات',
    rating: 4.7,
    ratingCount: 35,
    itemsCount: 6,
    joinedAt: '2026-02-01',
    coverPhoto: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80',
    promoTag: 'توصيل سريع',
    workingHours: {
      isOpen24Hours: false,
      openTime: '06:30',
      closeTime: '00:00',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-aswaq-alqarya',
    name: 'أسواق القرية',
    merchantId: 'merchant-aswaq',
    phone: '+966500001004',
    cityOrVillage: 'قرية السلام',
    address: 'المدخل الشرقي - مقابل المركز الصحي',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'سوبرماركت وخضار',
    rating: 4.8,
    ratingCount: 64,
    itemsCount: 8,
    joinedAt: '2026-01-20',
    coverPhoto: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=200&auto=format&fit=crop&q=80',
    promoTag: 'عروض يومية',
    workingHours: {
      isOpen24Hours: true,
      openTime: '00:00',
      closeTime: '23:59',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-shifa-pharmacy',
    name: 'صيدلية الشفاء',
    merchantId: 'merchant-shifa',
    phone: '+966500001005',
    cityOrVillage: 'قرية الفلاح',
    address: 'ميدان البلدية - بجانب المستوصف',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'صيدليات وأدوية',
    rating: 5.0,
    ratingCount: 29,
    itemsCount: 5,
    joinedAt: '2026-02-10',
    coverPhoto: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=200&auto=format&fit=crop&q=80',
    promoTag: 'خدمة 24/7',
    workingHours: {
      isOpen24Hours: true,
      openTime: '00:00',
      closeTime: '23:59',
      autoCloseForPrayer: false,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-baraka-bakery',
    name: 'مخبز البركة',
    merchantId: 'merchant-baraka',
    phone: '+966500001006',
    cityOrVillage: 'قرية النور',
    address: 'شارع السوق القديم',
    status: 'ACTIVE',
    isApproved: true,
    isPro: false,
    planName: 'الباقة المجانية',
    category: 'مخابز وحلويات',
    rating: 4.9,
    ratingCount: 52,
    itemsCount: 6,
    joinedAt: '2026-02-15',
    coverPhoto: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&auto=format&fit=crop&q=80',
    promoTag: 'طازج يومياً',
    workingHours: {
      isOpen24Hours: false,
      openTime: '05:30',
      closeTime: '23:00',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-haqali-grocery',
    name: 'تموينات الحقالي',
    merchantId: 'merchant-haqali',
    phone: '+966500001007',
    cityOrVillage: 'قرية الحقالي',
    address: 'الشارع العام - مفرق الوادي',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'بقالة وتموينات',
    rating: 4.8,
    ratingCount: 38,
    itemsCount: 7,
    joinedAt: '2026-02-18',
    coverPhoto: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=200&auto=format&fit=crop&q=80',
    promoTag: 'توصيل سريع',
    workingHours: {
      isOpen24Hours: false,
      openTime: '06:00',
      closeTime: '23:30',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-masilah-kitchen',
    name: 'مطعم ومطبخ السد',
    merchantId: 'merchant-masilah',
    phone: '+966500001008',
    cityOrVillage: 'قرية المسيلة',
    address: 'طريق السد المائي',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'مطاعم ومأكولات',
    rating: 4.9,
    ratingCount: 46,
    itemsCount: 5,
    joinedAt: '2026-02-20',
    coverPhoto: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&auto=format&fit=crop&q=80',
    promoTag: 'وجبات طازجة',
    workingHours: {
      isOpen24Hours: false,
      openTime: '11:30',
      closeTime: '00:00',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-rawdah-pharma',
    name: 'صيدلية الروضة المركزية',
    merchantId: 'merchant-rawdah-pharma',
    phone: '+966500001009',
    cityOrVillage: 'قرية الروضة',
    address: 'الشارع العام - بجوار المركز الصحي',
    status: 'ACTIVE',
    isApproved: true,
    isPro: true,
    planName: 'باقة المتاجر المعتمدة',
    category: 'صيدليات وأدوية',
    rating: 5.0,
    ratingCount: 31,
    itemsCount: 5,
    joinedAt: '2026-02-22',
    coverPhoto: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=200&auto=format&fit=crop&q=80',
    promoTag: 'خدمة 24/7 • توصيل مجاني',
    freeDelivery: true,
    workingHours: {
      isOpen24Hours: true,
      openTime: '00:00',
      closeTime: '23:59',
      autoCloseForPrayer: false,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  {
    id: 'store-barka-supermarket',
    name: 'سوبرماركت الباركة',
    merchantId: 'merchant-barka-super',
    phone: '+966500001010',
    cityOrVillage: 'قرية الباركة',
    address: 'تقاطع مزارع الباركة',
    status: 'ACTIVE',
    isApproved: true,
    isPro: false,
    planName: 'الباقة المجانية',
    category: 'بقالة وتموينات',
    rating: 4.7,
    ratingCount: 28,
    itemsCount: 6,
    joinedAt: '2026-02-25',
    coverPhoto: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    logo: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&auto=format&fit=crop&q=80',
    promoTag: 'عروض أسبوعية',
    workingHours: {
      isOpen24Hours: false,
      openTime: '06:00',
      closeTime: '23:00',
      autoCloseForPrayer: true,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    },
  },
];

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
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_STORES;
    }
    return parsed;
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

    // 3. Fallback to initial demo catalog if storeId is one of initial stores
    const nowIso = new Date().toISOString();
    const initialStoreCatalogs: Record<string, Item[]> = {
      'store-alrezq': [
        {
          id: 'rezq-1',
          name: 'أرز بسمتي هندي فاخر (5 كجم)',
          price: 38,
          salePrice: 38,
          costPrice: 30,
          quantity: 25,
          minStockAlert: 5,
          unit: 'كيس',
          category: 'مواد غذائية',
          merchantId: 'store-alrezq',
          imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
          barcode: '6281001001',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'rezq-2',
          name: 'زيت طهي نباتي نقي (1.5 لتر)',
          price: 14,
          salePrice: 14,
          costPrice: 10,
          quantity: 40,
          minStockAlert: 5,
          unit: 'حبة',
          category: 'زيوت وسمن',
          merchantId: 'store-alrezq',
          imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
          barcode: '6281001002',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'rezq-3',
          name: 'سكر أبيض ناعم (2 كجم)',
          price: 9.5,
          salePrice: 9.5,
          costPrice: 7,
          quantity: 35,
          minStockAlert: 5,
          unit: 'كيس',
          category: 'مواد غذائية',
          merchantId: 'store-alrezq',
          imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500&auto=format&fit=crop&q=80',
          barcode: '6281001003',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'rezq-4',
          name: 'شاي كبوس فرط يمني (225 جم)',
          price: 8,
          salePrice: 8,
          costPrice: 6,
          quantity: 50,
          minStockAlert: 5,
          unit: 'علبة',
          category: 'شاي وقهوة',
          merchantId: 'store-alrezq',
          imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
          barcode: '6281001004',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'rezq-5',
          name: 'طبق بيض طازج مزارع (30 بيضة)',
          price: 16,
          salePrice: 16,
          costPrice: 13,
          quantity: 20,
          minStockAlert: 5,
          unit: 'طبق',
          category: 'ألبان وبيض',
          merchantId: 'store-alrezq',
          imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=500&auto=format&fit=crop&q=80',
          barcode: '6281001005',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      'store-alfalah-restaurant': [
        {
          id: 'falah-1',
          name: 'مظبي دجاج على الفحم مع الأرز',
          price: 24,
          salePrice: 24,
          costPrice: 16,
          quantity: 30,
          minStockAlert: 5,
          unit: 'وجبة',
          category: 'أطباق رئيسية',
          merchantId: 'store-alfalah-restaurant',
          imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
          barcode: '6282001001',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'falah-2',
          name: 'نفر مندي لحم بلدي طازج',
          price: 45,
          salePrice: 45,
          costPrice: 32,
          quantity: 20,
          minStockAlert: 5,
          unit: 'وجبة',
          category: 'لحوم ومندي',
          merchantId: 'store-alfalah-restaurant',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
          barcode: '6282001002',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'falah-3',
          name: 'شواية دجاج الفلّاح مع الإيدام',
          price: 22,
          salePrice: 22,
          costPrice: 14,
          quantity: 25,
          minStockAlert: 5,
          unit: 'وجبة',
          category: 'أطباق رئيسية',
          merchantId: 'store-alfalah-restaurant',
          imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=80',
          barcode: '6282001003',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'falah-4',
          name: 'سلطة خضراء طازجة مع الشطة الحارة',
          price: 5,
          salePrice: 5,
          costPrice: 2,
          quantity: 50,
          minStockAlert: 5,
          unit: 'صحن',
          category: 'مقبلات وسلطات',
          merchantId: 'store-alfalah-restaurant',
          imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
          barcode: '6282001004',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      'store-maqha-albon': [
        {
          id: 'bon-1',
          name: 'دلة قهوة عربية ملكية بالهيل والزعفران',
          price: 18,
          salePrice: 18,
          costPrice: 8,
          quantity: 30,
          minStockAlert: 5,
          unit: 'دلة',
          category: 'قهوة عربية',
          merchantId: 'store-maqha-albon',
          imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
          barcode: '6283001001',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'bon-2',
          name: 'فلات وايت اسبريسو مختصة',
          price: 12,
          salePrice: 12,
          costPrice: 5,
          quantity: 40,
          minStockAlert: 5,
          unit: 'كوب',
          category: 'مشروبات ساخنة',
          merchantId: 'store-maqha-albon',
          imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=80',
          barcode: '6283001002',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'bon-3',
          name: 'شاي عدني كرك بالهيل وحليب ممتاز',
          price: 6,
          salePrice: 6,
          costPrice: 2,
          quantity: 60,
          minStockAlert: 5,
          unit: 'كوب',
          category: 'شاي ومشروبات',
          merchantId: 'store-maqha-albon',
          imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
          barcode: '6283001003',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'bon-4',
          name: 'كيكة العسل والكراميل الفاخرة',
          price: 14,
          salePrice: 14,
          costPrice: 7,
          quantity: 20,
          minStockAlert: 5,
          unit: 'قطعة',
          category: 'حلويات وكيك',
          merchantId: 'store-maqha-albon',
          imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80',
          barcode: '6283001004',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
      'store-aswaq-alqarya': [
        {
          id: 'aswaq-1',
          name: 'صندوق طماطم مزارع بلدي (3 كجم)',
          price: 12,
          salePrice: 12,
          costPrice: 8,
          quantity: 25,
          minStockAlert: 5,
          unit: 'صندوق',
          category: 'خضار وفواكه',
          merchantId: 'store-aswaq-alqarya',
          imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
          barcode: '6284001001',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'aswaq-2',
          name: 'كيس بطاطس بلدي محلي (5 كجم)',
          price: 14,
          salePrice: 14,
          costPrice: 9,
          quantity: 30,
          minStockAlert: 5,
          unit: 'كيس',
          category: 'خضار وفواكه',
          merchantId: 'store-aswaq-alqarya',
          imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
          barcode: '6284001002',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        {
          id: 'aswaq-3',
          name: 'موز سكري طازج (1 كجم)',
          price: 6.5,
          salePrice: 6.5,
          costPrice: 4.5,
          quantity: 40,
          minStockAlert: 5,
          unit: 'كجم',
          category: 'فواكه طازجة',
          merchantId: 'store-aswaq-alqarya',
          imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80',
          barcode: '6284001003',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ],
    };

    if (storeId && initialStoreCatalogs[storeId]) {
      return initialStoreCatalogs[storeId];
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
