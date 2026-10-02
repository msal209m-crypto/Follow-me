import { doc } from 'firebase/firestore';
import { db, messaging } from '../lib/firebase';
import { safeSetDoc } from '../lib/firestoreUtils';

// Register service-worker or browser notification permission
export async function requestNotificationPermission(userId?: string): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('🔔 Notification permission granted.');
      
      // If we have FCM initialized, register/subscribe for tokens
      if (messaging) {
        try {
          const { getToken } = await import('firebase/messaging');
          const token = await getToken(messaging, {
            vapidKey: 'BDp34ZlZp6uR_D4xH2P5N9mU_Gypa2J-D7XNq8K9R0mU_Gypa2J' // Public demonstration VAPID key
          });
          if (token && userId) {
            console.log('🔑 Saved FCM Token:', token);
            await safeSetDoc(doc(db, 'users', userId, 'fcm', 'token'), {
              token,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        } catch (fcmErr) {
          console.warn('FCM Token generation notice (this is normal if no sw.js exists):', fcmErr);
        }
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

// Display a beautiful system-wide desktop/PWA notification
export function sendLocalSystemNotification(title: string, body: string, icon = '/icon.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const NotificationConstructor = (window as any).Notification;
    const notification = new NotificationConstructor(title, {
      body,
      icon,
      badge: '/icon.png',
      tag: 'qaryati-notification',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn('Failed to dispatch native system notification:', e);
  }
}

// Initialize active background listeners to simulate instant FCM-grade push alerts
let isListenersRegistered = false;
export function initInstantNotificationListeners(): void {
  if (isListenersRegistered) return;
  isListenersRegistered = true;

  console.log('🔔 Live FCM-Grade Notification Engine initialized.');

  // Listen to new orders
  window.addEventListener('qaryati:new-order-received', (event: any) => {
    const order = event.detail;
    if (order) {
      sendLocalSystemNotification(
        '📦 طلب توصيل جديد للقرية!',
        `تم استلام طلب جديد بقيمة ${order.totalPrice || 0} من العميل: ${order.customerName || 'نقدي'}`
      );
    }
  });

  // Listen to exchange rate changes
  window.addEventListener('qaryati:stores-updated', (event: any) => {
    try {
      const stores = event.detail || [];
      const cachedStoresRaw = localStorage.getItem('village_stores_directory_last_state');
      const lastStores = cachedStoresRaw ? JSON.parse(cachedStoresRaw) : [];
      
      stores.forEach((store: any) => {
        const matchingLastStore = lastStores.find((s: any) => s.id === store.id);
        if (matchingLastStore && store.exchangeRate !== matchingLastStore.exchangeRate) {
          sendLocalSystemNotification(
            '💱 تحديث فوري لسعر الصرف!',
            `قام المتجر "${store.name || 'قريتي'}" بتحديث سعر الصرف الحالي إلى: 1 ${store.currency || 'SAR'} = ${store.exchangeRate} ${store.multiCurrency?.secondaryCurrencyCode || 'USD'}`
          );
        }
      });
      localStorage.setItem('village_stores_directory_last_state', JSON.stringify(stores));
    } catch {}
  });
}
