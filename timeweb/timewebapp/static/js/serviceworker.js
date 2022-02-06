importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.2/workbox-sw.js');

function shouldCacheFirst(request) {
    return (
        request.destination === "font" || 
        request.url.startsWith("https://cdn") || 
        request.url.startsWith("https://www.googletagmanager.com/gtag/js") ||
        ["https://www.google.com/recaptcha/api.js"].includes(request.url)
    );
}

workbox.routing.registerRoute(
    ({ request }) => request.destination !== "document" && !shouldCacheFirst(request),
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
    ({ request }) => request.destination !== "document" && shouldCacheFirst(request),
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