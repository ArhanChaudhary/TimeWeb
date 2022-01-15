importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.2/workbox-sw.js');

workbox.routing.registerRoute(
    ({ request }) => request.destination !== "document",
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'twcache',
        plugins: [
            new workbox.cacheableResponse.CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days
            }),
        ],
    }),
);