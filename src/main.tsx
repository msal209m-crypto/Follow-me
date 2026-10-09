import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeRealTimeDbSync } from './services/dbSyncService';

// Factory Reset: Clear all local demo data to provide a completely clean platform
const APP_VERSION = '4.0.0-clean-format-location-based';
if (localStorage.getItem('qaryati_app_version') !== APP_VERSION) {
  console.log('🧹 Performing Complete Platform Factory Reset: Cleaning all mock data...');
  
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
    'qaryati_dev_session_v1',
    'qaryati_delivery_orders',
    'qaryati_db_reset_clean_slate_v6',
    'flowapp_items',
    'flowapp_debts',
    'flowapp_transactions',
    'qaryati_approved_villages_v1'
  ];
  
  keysToClear.forEach(key => localStorage.removeItem(key));
  
  // Set clean empty collections
  localStorage.setItem('qaryati_stores_directory', '[]');
  localStorage.setItem('village_stores_directory', '[]');
  localStorage.setItem('flowapp_rbac_merchants_v1', '[]');
  localStorage.setItem('flowapp_rbac_drivers_v1', '[]');
  localStorage.setItem('flowapp_rbac_customers_v1', '[]');
  localStorage.setItem('qaryati_delivery_orders', '[]');
  
  // Set the new version
  localStorage.setItem('qaryati_app_version', APP_VERSION);
  console.log('✅ Factory Reset Complete: Platform is pristine and fresh.');
}

// Initialize global real-time Firestore sync
initializeRealTimeDbSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
