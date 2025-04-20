// sw.js - Service Worker for Caching App Shell

const CACHE_NAME = 'galleon-cashing-up-cache-v2'; // Change version to force update cache

// --- IMPORTANT: Add 'offline.html' to this list! ---
const urlsToCache = [
  '.', // Alias for index.html
  'index.html',
  'style.css',
  'script.js',
  'icon-192x192.png', // Cache icons too
  'icon-512x512.png',
  'offline.html'
  'dexie.js',// <<< ADD THIS LINE to cache your fallback page
  // Note: We are NOT caching the Dexie CDN URL here for simplicity.
  // The browser cache will hopefully handle it after first load.
  // For guaranteed offline Dexie, download it and include it locally in urlsToCache.
];

// Install event: Cache the app shell
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache); // This will now cache offline.html too
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(error => {
        console.error('[SW] Failed to cache app shell:', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim(); // Take control of open pages immediately
    })
  );
});

// Fetch event: Serve cached content first (Cache-First Strategy)
self.addEventListener('fetch', event => {
  // console.log('[SW] Fetch event for:', event.request.url);
  event.respondWith(
    caches.match(event.request) // 1. Check cache first
      .then(response => {
        if (response) {
          // console.log('[SW] Found in cache:', event.request.url);
          return response; // 1a. Serve from cache if found
        }

        // 2. If not in cache, attempt to fetch from network
        // console.log('[SW] Not in cache, fetching:', event.request.url);
        return fetch(event.request).then(
            networkResponse => {
              // 2a. Return the network response if successful
              // Note: This simple cache-first doesn't automatically cache new network responses here.
              // You could add logic to cache certain responses if desired (like the commented-out example).
              return networkResponse;
            }
        ).catch(error => {
            // --- MODIFICATION START ---
            // 3. If network fetch fails (e.g., offline)
            console.error('[SW] Fetch failed:', error);
            console.log('[SW] Attempting to serve offline fallback page.');
            // Return the predefined offline page from the cache.
            // This REQUIRES 'offline.html' to be in urlsToCache and successfully cached.
            return caches.match('offline.html')
              .then(offlineResponse => {
                 if (offlineResponse) {
                    return offlineResponse;
                 }
                 // Optional: Fallback if even offline.html isn't found (shouldn't happen if setup correctly)
                 console.error('[SW] Offline fallback page not found in cache!');
                 return new Response('Network error occurred and offline page is unavailable.', {
                   status: 503, // Service Unavailable
                   statusText: 'Service Unavailable',
                   headers: { 'Content-Type': 'text/plain' }
                 });
              });
            // --- MODIFICATION END ---
        });
      })
  );
});