import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeRealTimeDbSync } from './services/dbSyncService';

// Factory Reset: Clear all local data if this is the first load of the new secure version
const APP_VERSION = '2.0.0-secure';
if (localStorage.getItem('qaryati_app_version') !== APP_VERSION) {
  console.log('🧹 Performing Factory Reset: Cleaning up legacy mock data and local storage...');
  
  // Clear only project-specific keys to avoid breaking essential UI state
  const keysToClear = [
    'flowapp_rbac_merchants_v1',
    'flowapp_rbac_drivers_v1',
    'flowapp_rbac_customers_v1',
    'qaryati_stores_directory',
    'village_merchants_accounts',
    'village_drivers_accounts',
    'village_stores_directory',
    'flowapp_v4_local_users',
    'qaryati_global_preferences_v1',
    'flowapp_v4_active_local_user',
    'qaryati_dev_session_v1'
  ];
  
  keysToClear.forEach(key => localStorage.removeItem(key));
  
  // Set the new version
  localStorage.setItem('qaryati_app_version', APP_VERSION);
  console.log('✅ Factory Reset Complete.');
}

// Initialize global real-time Firestore sync
initializeRealTimeDbSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
