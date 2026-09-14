// ==========================================
// Advanced Service Worker for FlowApp PWA
// Cache Version v2 (Forced Refresh & Update)
// ==========================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `flowapp-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `flowapp-runtime-${CACHE_VERSION}`;
const FONTS_CACHE = `flowapp-fonts-${CACHE_VERSION}`;
const IMAGES_CACHE = `flowapp-images-${CACHE_VERSION}`;

// Critical App Shell assets precached on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json'
];

// URLs that must bypass the Service Worker (e.g., Firebase real-time and auth APIs)
const BYPASS_URL_PATTERNS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'securetoken.googleapis.com',
  'google.firestore',
  'sw.js',
  '/sw.js',
  '/api/'
];

// Helper: Determine appropriate cache bucket based on request URL
function getCacheNameForRequest(url) {
  if (
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.match(/\.(woff2?|ttf|eot)$/i)
  ) {
    return FONTS_CACHE;
  }
  if (url.match(/\.(png|jpe?g|svg|gif|webp|ico)$/i)) {
    return IMAGES_CACHE;
  }
  if (url.match(/\.(js|mjs|css)$/i)) {
    return RUNTIME_CACHE;
  }
  return STATIC_CACHE;
}

// Helper: Check if request should bypass the SW
function shouldBypass(request) {
  if (request.method !== 'GET') return true;
  const url = request.url;
  if (url.includes('sw.js')) return true;
  return BYPASS_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

// 1. Install Event: Precache App Shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW-SWR] Pre-cache non-fatal note:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, FONTS_CACHE, IMAGES_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('flowapp-') && !currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Stale-While-Revalidate Engine
async function staleWhileRevalidate(event, targetCacheName) {
  const request = event.request;
  const cache = await caches.open(targetCacheName);
  const cachedResponse = await cache.match(request);

  // Background revalidation promise
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (
        networkResponse &&
        (networkResponse.status === 200 || networkResponse.type === 'opaque')
      ) {
        cache.put(request, networkResponse.clone()).catch((err) => {
          console.warn('[SW-SWR] Cache update note:', err);
        });
      }
      return networkResponse;
    })
    .catch(() => {
      return null;
    });

  event.waitUntil(fetchPromise);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  if (request.mode === 'navigate') {
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
  }

  return new Response('محتوى مخزن غير متوفر حالياً بدون إنترنت', {
    status: 503,
    statusText: 'Offline Cache Miss',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// 4. Fetch Event Dispatcher
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (shouldBypass(request)) {
    return;
  }

  const targetCacheName = getCacheNameForRequest(request.url);
  event.respondWith(staleWhileRevalidate(event, targetCacheName));
});

// 5. Message Event Handler
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (event.data.type === 'GET_CACHE_INFO') {
      caches.keys().then(async (keys) => {
        let totalCount = 0;
        const details = {};
        for (const key of keys) {
          if (key.startsWith('flowapp-')) {
            const c = await caches.open(key);
            const reqs = await c.keys();
            details[key] = reqs.length;
            totalCount += reqs.length;
          }
        }
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'CACHE_INFO_RESPONSE',
            totalCount,
            details,
            version: CACHE_VERSION,
          });
        }
      });
    }
  }
});
