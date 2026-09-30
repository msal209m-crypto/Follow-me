import { initGlobalCloudSync } from './crossDeviceSyncService';
import { initInstantNotificationListeners } from './notificationService';

export function initializeRealTimeDbSync() {
  initGlobalCloudSync();
  initInstantNotificationListeners();
}
