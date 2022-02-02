importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.2/workbox-sw.js');

workbox.routing.registerRoute(
    ({ request }) => request.destination !== "document" && !request.url.startsWith("https://cdn"),
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'twcache',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days
            }),
        ],
    }),
);

workbox.routing.registerRoute(
    ({ request }) => request.url.startsWith("https://cdn"),
    new workbox.strategies.CacheFirst({
        cacheName: 'twcdncache',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days
            }),
        ],
    }),
);

self.addEventListener('install', event => {
    self.skipWaiting();
});