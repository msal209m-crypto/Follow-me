import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showInstallPromptModal: boolean;
  setShowInstallPromptModal: (show: boolean) => void;
  promptInstall: () => Promise<boolean>;
  updateAvailable: boolean;
  newVersionInfo: { version: string; description?: string } | null;
  applyUpdate: () => void;
  checkForUpdates: (manual?: boolean) => Promise<boolean>;
  checkingForUpdate: boolean;
  checkingForUpdates: boolean;
  currentAppVersion: string;
  isOnline: boolean;
  cachedResourcesCount: number;
  cacheStrategy: string;
  refreshOfflineCache: () => Promise<number>;
}

const CURRENT_VERSION = '2.1.0';
const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallPromptModal, setShowInstallPromptModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState<{ version: string; description?: string } | null>(null);
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [cachedResourcesCount, setCachedResourcesCount] = useState<number>(0);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Monitor online / offline connectivity status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute cached resources count across SWR caches
  const updateCacheStats = useCallback(async () => {
    if (typeof caches !== 'undefined') {
      try {
        const keys = await caches.keys();
        let total = 0;
        for (const key of keys) {
          if (key.startsWith('flowapp-')) {
            const cache = await caches.open(key);
            const items = await cache.keys();
            total += items.length;
          }
        }
        setCachedResourcesCount(total);
      } catch (err) {
        console.warn('Error reading cache stats:', err);
      }
    }
  }, []);

  // Update cache stats on mount and on visibility change
  useEffect(() => {
    updateCacheStats();
    const interval = setInterval(updateCacheStats, 30000);
    return () => clearInterval(interval);
  }, [updateCacheStats]);

  // Check standalone mode and platform
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Check standalone state
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallPromptModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Service Worker and Version check for updates
  const checkForUpdates = useCallback(async (manual = false): Promise<boolean> => {
    setCheckingForUpdate(true);
    let foundUpdate = false;

    try {
      // 1. Check Service Worker registration update
      if ('serviceWorker' in navigator) {
        try {
          const isEmbeddedInIframe = (() => {
            try {
              return window.self !== window.top;
            } catch {
              return true;
            }
          })();

          if (!isEmbeddedInIframe) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
              registrationRef.current = registration;
              await registration.update().catch(() => {});
              if (registration.waiting) {
                foundUpdate = true;
                setUpdateAvailable(true);
                setNewVersionInfo({
                  version: 'أحدث إصدار',
                  description: 'تحديث جديد جاهز للتطبيق الفوري ومزامنة الكاشير السحابية',
                });
              }
            }
          }
        } catch (swErr) {
          // Gracefully ignore service worker update error in restricted or offline contexts
        }
      }

      // 2. Heartbeat check to /version.json with cache busting
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.version && data.version !== CURRENT_VERSION) {
          foundUpdate = true;
          setUpdateAvailable(true);
          setNewVersionInfo({
            version: data.version,
            description: data.description || 'تحديث برمجي جديد متاح لجميع المستخدمين',
          });
        }
      }
    } catch (e) {
      console.warn('Check for updates check note:', e);
    } finally {
      setCheckingForUpdate(false);
    }

    return foundUpdate;
  }, []);

  // Initial and periodic update polling every 45 seconds + on window focus
  useEffect(() => {
    checkForUpdates();

    const interval = setInterval(() => {
      checkForUpdates();
    }, 45000);

    const onFocus = () => {
      checkForUpdates();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    });

    // Listen to service worker controller change or new worker waiting
    if ('serviceWorker' in navigator) {
      try {
        const isEmbeddedInIframe = (() => {
          try {
            return window.self !== window.top;
          } catch {
            return true;
          }
        })();

        if (!isEmbeddedInIframe) {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Controller changed, new worker is active
          });

          navigator.serviceWorker.ready
            .then((reg) => {
              registrationRef.current = reg;
              reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      setUpdateAvailable(true);
                      setNewVersionInfo({
                        version: 'أحدث إصدار',
                        description: 'تحديث جديد جاهز للتطبيق الفوري',
                      });
                    }
                  });
                }
              });
            })
            .catch(() => {});
        }
      } catch (err) {
        // Safe fallback
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkForUpdates]);

  const promptInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setShowInstallPromptModal(false);
          return true;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    return false;
  };

  const applyUpdate = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (e) {
        console.warn('SW skip waiting error:', e);
      }
    }

    // Clear caches and reload cleanly
    if (typeof caches !== 'undefined') {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (err) {
        console.warn('Error clearing cache:', err);
      }
    }

    window.location.reload();
  };

  const refreshOfflineCache = useCallback(async (): Promise<number> => {
    if (typeof caches === 'undefined') return 0;
    try {
      const shellUrls = ['/', '/index.html', '/manifest.json', '/version.json'];
      const staticCache = await caches.open('flowapp-static-v2.1.0');
      await staticCache.addAll(shellUrls);
      await updateCacheStats();
      return cachedResourcesCount;
    } catch (e) {
      console.warn('Cache warming notice:', e);
      return cachedResourcesCount;
    }
  }, [cachedResourcesCount, updateCacheStats]);

  return (
    <PWAContext.Provider
      value={{
        isInstallable: !!deferredPrompt || isIOS,
        isInstalled,
        isIOS,
        showInstallPromptModal,
        setShowInstallPromptModal,
        promptInstall,
        updateAvailable,
        newVersionInfo,
        applyUpdate,
        checkForUpdates,
        checkingForUpdate,
        checkingForUpdates: checkingForUpdate,
        currentAppVersion: CURRENT_VERSION,
        isOnline,
        cachedResourcesCount,
        cacheStrategy: 'Stale-While-Revalidate',
        refreshOfflineCache,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
