import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel, enableIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress verbose network timeout warnings and internal logs in console
try {
  setLogLevel('silent');
} catch {}

// Initialize Firebase SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Set persistent authentication state
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom databaseId, experimentalForceLongPolling and experimentalAutoDetectLongPolling
// to prevent WebSocket/proxy connection drops and "Could not reach Cloud Firestore backend" timeout errors.
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  // If already initialized, retrieve existing instance
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;

// Enable IndexedDb offline persistence for instant offline reads without network delay errors
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch {}

// Safe FCM Messaging initialization
let messagingInstance: any = null;
isSupported().then((supported) => {
  if (supported) {
    messagingInstance = getMessaging(app);
  }
}).catch((err) => {
  console.warn('FCM Messaging is not supported or failed to initialize:', err);
});

export const messaging = messagingInstance;

export default app;
