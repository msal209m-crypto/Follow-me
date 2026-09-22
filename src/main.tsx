import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeRealTimeDbSync } from './services/dbSyncService';

// Initialize global real-time Firestore sync
initializeRealTimeDbSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
