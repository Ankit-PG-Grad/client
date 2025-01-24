importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

workbox.setConfig({
  debug: false
});

workbox.precaching.precacheAndRoute([
  { url: '/', revision: '1' },
  { url: '/index.html', revision: '1' },
  { url: '/favicon-196.png', revision: '1' },
  { url: '/logo192.png', revision: '1' },
  { url: '/logo512.png', revision: '1' },
  { url: '/manifest.json', revision: '1' }
]);

// Network First strategy for all navigation requests
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
      }),
    ],
  })
);

// Network First strategy for all script and style assets
workbox.routing.registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new workbox.strategies.NetworkFirst({
    cacheName: 'assets-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Network First strategy for images
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.NetworkFirst({
    cacheName: 'images-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Skip waiting and claim clients
self.skipWaiting();
workbox.core.clientsClaim(); 