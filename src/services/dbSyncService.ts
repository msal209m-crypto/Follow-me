import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MerchantAccountRecord } from './rbacAuthService';
import { StoreDirectoryRecord, DeliveryOrder, AdRecord } from '../types';

const MERCHANTS_STORE_KEY = 'flowapp_rbac_merchants_v1';
const DRIVERS_STORE_KEY = 'flowapp_rbac_drivers_v1';
const STORES_DIRECTORY_KEY = 'qaryati_stores_directory';
const ORDERS_STORAGE_KEY = 'qaryati_delivery_orders';

export function initializeRealTimeDbSync() {
  console.log('Initializing Real-time Database Sync Layer with Firestore...');

  // 1. Sync Merchants from Firestore
  try {
    onSnapshot(collection(db, 'merchants'), (snapshot) => {
      const merchants: MerchantAccountRecord[] = [];
      snapshot.forEach((doc) => {
        merchants.push({ id: doc.id, ...doc.data() } as MerchantAccountRecord);
      });
      localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify(merchants));
      window.dispatchEvent(new CustomEvent('qaryati:merchants-updated', { detail: merchants }));
    }, (error) => {
      console.warn('Error syncing merchants in real-time:', error);
    });
  } catch (e) {
    console.error('Failed to init merchants sync:', e);
  }

  // 2. Sync Drivers from Firestore
  try {
    onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const drivers: any[] = [];
      snapshot.forEach((doc) => {
        drivers.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem(DRIVERS_STORE_KEY, JSON.stringify(drivers));
      window.dispatchEvent(new CustomEvent('qaryati:drivers-updated', { detail: drivers }));
    }, (error) => {
      console.warn('Error syncing drivers in real-time:', error);
    });
  } catch (e) {
    console.error('Failed to init drivers sync:', e);
  }

  // 3. Sync Stores Directory from Firestore
  try {
    onSnapshot(collection(db, 'stores'), (snapshot) => {
      const stores: StoreDirectoryRecord[] = [];
      snapshot.forEach((doc) => {
        stores.push({ id: doc.id, ...doc.data() } as StoreDirectoryRecord);
      });
      localStorage.setItem(STORES_DIRECTORY_KEY, JSON.stringify(stores));
      window.dispatchEvent(new CustomEvent('qaryati:stores-updated', { detail: stores }));
    }, (error) => {
      console.warn('Error syncing stores in real-time:', error);
    });
  } catch (e) {
    console.error('Failed to init stores sync:', e);
  }

  // 4. Sync Delivery Orders from Firestore
  try {
    onSnapshot(collection(db, 'delivery_orders'), (snapshot) => {
      const orders: DeliveryOrder[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as DeliveryOrder);
      });
      // Sort orders descending by createdAt
      orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
      window.dispatchEvent(new CustomEvent('qaryati:orders-updated', { detail: orders }));
    }, (error) => {
      console.warn('Error syncing delivery orders in real-time:', error);
    });
  } catch (e) {
    console.error('Failed to init delivery orders sync:', e);
  }

  // 5. Sync Ads from Firestore
  try {
    onSnapshot(collection(db, 'ads'), (snapshot) => {
      const ads: AdRecord[] = [];
      snapshot.forEach((doc) => {
        ads.push({ id: doc.id, ...doc.data() } as AdRecord);
      });
      localStorage.setItem('qaryati_ads_directory', JSON.stringify(ads));
      window.dispatchEvent(new CustomEvent('qaryati:ads-updated', { detail: ads }));
    }, (error) => {
      console.warn('Error syncing ads in real-time:', error);
    });
  } catch (e) {
    console.error('Failed to init ads sync:', e);
  }
}
