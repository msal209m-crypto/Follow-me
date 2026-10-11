/**
 * Qaryati (قريتي) - IndexedDB Offline Storage & Synchronization Engine
 * This service provides asynchronous, robust browser-native IndexedDB storage.
 * It bypasses the 5MB limits of localStorage (allowing rich photos and infinite transactions)
 * and manages an offline sync queue to automatically upload offline sales to Firestore once online.
 */

const DB_NAME = 'qaryati_offline_db';
const DB_VERSION = 2;

export interface OfflineAction {
  id: string; // unique action ID
  timestamp: string;
  collection: 'transactions' | 'items' | 'debts' | 'delivery_orders' | 'stores';
  operation: 'SET' | 'DELETE';
  payload: any;
}

/**
 * Initializes the IndexedDB database and sets up stores
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Store 1: Transactions
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }

      // Store 2: Items / Products
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }

      // Store 3: Debts / Credit
      if (!db.objectStoreNames.contains('debts')) {
        db.createObjectStore('debts', { keyPath: 'id' });
      }

      // Store 4: Offline Synchronization Queue
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Saves a record (transaction, item, debt) to IndexedDB
 */
export async function saveToIndexedDB(
  storeName: 'transactions' | 'items' | 'debts' | 'offline_queue',
  data: any
): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error saving to IndexedDB [${storeName}]:`, err);
  }
}

/**
 * Saves multiple records in a single high-performance IndexedDB transaction.
 * Completely eliminates UI lag and event loop freezing when persisting hundreds of items/transactions.
 */
export async function saveBulkToIndexedDB(
  storeName: 'transactions' | 'items' | 'debts' | 'offline_queue',
  records: any[]
): Promise<void> {
  if (!records || records.length === 0) return;
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      for (const record of records) {
        store.put(record);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error(`Transaction aborted on ${storeName}`));
    });
  } catch (err) {
    console.error(`Error bulk saving to IndexedDB [${storeName}]:`, err);
  }
}

/**
 * Retrieves a single record by ID
 */
export async function getFromIndexedDB(
  storeName: 'transactions' | 'items' | 'debts' | 'offline_queue',
  id: string
): Promise<any | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error loading from IndexedDB [${storeName}]:`, err);
    return null;
  }
}

/**
 * Retrieves all records from an IndexedDB store
 */
export async function getAllFromIndexedDB(
  storeName: 'transactions' | 'items' | 'debts' | 'offline_queue'
): Promise<any[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error loading all from IndexedDB [${storeName}]:`, err);
    return [];
  }
}

/**
 * Deletes a record from IndexedDB by ID
 */
export async function deleteFromIndexedDB(
  storeName: 'transactions' | 'items' | 'debts' | 'offline_queue',
  id: string
): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error deleting from IndexedDB [${storeName}]:`, err);
  }
}

/**
 * Clears all records from an IndexedDB store
 */
export async function clearIndexedDBStore(
  storeName: 'transactions' | 'items' | 'debts' | 'offline_queue'
): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Error clearing IndexedDB [${storeName}]:`, err);
  }
}

/**
 * Enqueues a write or delete operation to be synced when the internet is active
 */
export async function queueOfflineSync(
  collection: 'transactions' | 'items' | 'debts' | 'delivery_orders' | 'stores',
  operation: 'SET' | 'DELETE',
  payload: any
): Promise<void> {
  const action: OfflineAction = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    collection,
    operation,
    payload,
  };
  console.log(`📡 Offline: Queuing offline ${operation} operation for ${collection}:`, payload.id);
  await saveToIndexedDB('offline_queue', action);
}

/**
 * Triggers background sync to upload queued operations to Firestore
 * This is called automatically when the browser comes online.
 */
export async function processOfflineSyncQueue(
  currentUserUid: string,
  safeSetDocFn: (docRef: any, data: any, options?: any) => Promise<any>,
  deleteDocFn: (docRef: any) => Promise<any>,
  dbRef: any
): Promise<{ successCount: number; failedCount: number }> {
  const queue: OfflineAction[] = await getAllFromIndexedDB('offline_queue');
  if (queue.length === 0) return { successCount: 0, failedCount: 0 };

  console.log(`🌐 Internet Connected! Processing offline synchronization queue (${queue.length} items)...`);
  
  let successCount = 0;
  let failedCount = 0;

  // Sort queue chronologically to ensure updates are executed in correct order
  queue.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const action of queue) {
    try {
      const { doc } = await import('firebase/firestore');
      let docRef: any;
      let docPath: string;

      if (action.collection === 'delivery_orders') {
        docRef = doc(dbRef, 'delivery_orders', action.payload.id);
        docPath = `delivery_orders/${action.payload.id}`;
      } else if (action.collection === 'stores') {
        docRef = doc(dbRef, 'stores', action.payload.id);
        docPath = `stores/${action.payload.id}`;
      } else {
        const uid = currentUserUid || 'default';
        docRef = doc(dbRef, 'users', uid, action.collection, action.payload.id);
        docPath = `users/${uid}/${action.collection}/${action.payload.id}`;
      }

      if (action.operation === 'SET') {
        await safeSetDocFn(docRef, action.payload, { merge: true });
        console.log(`✅ Synced SET operation to cloud: ${docPath}`);
      } else if (action.operation === 'DELETE') {
        await deleteDocFn(docRef);
        console.log(`✅ Synced DELETE operation to cloud: ${docPath}`);
      }

      // Successfully synced! Delete from IndexedDB queue
      await deleteFromIndexedDB('offline_queue', action.id);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to sync action ${action.id} to cloud:`, err);
      failedCount++;
    }
  }

  if (successCount > 0) {
    // Dispatch global sync completed event
    window.dispatchEvent(
      new CustomEvent('qaryati:offline-sync-completed', {
        detail: {
          successCount,
          failedCount,
          timestamp: Date.now()
        }
      })
    );
  }

  return { successCount, failedCount };
}
