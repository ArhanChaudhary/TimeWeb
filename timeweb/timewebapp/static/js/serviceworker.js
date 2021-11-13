// Base Service Worker implementation.  To use your own Service Worker, set the PWA_SERVICE_WORKER_PATH variable in settings.py

var staticCacheName = "django-pwa-v" + new Date().getTime();

// Clear cache on activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => (cacheName.startsWith("django-pwa-")))
                    .filter(cacheName => (cacheName !== staticCacheName))
                    .map(cacheName => caches.delete(cacheName))
            );
        })
    );
});

// Serve from Cache
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Template cache will fail because it wasn't cached
                return response || fetch(event.request);
            })
            .catch(() => {
                
            })
    )
});

// Uncomment once server worker notification API support is added
// // https://css-tricks.com/creating-scheduled-push-notifications/
// self.addEventListener('notificationclick', event => {
//     if (event.action === 'close') { 
//         event.notification.close();
//     } else {
//         event.waitUntil(self.clients.matchAll().then(clients => {
//             if (clients.length){ // check if at least one tab is already open
//                 clients[0].focus();
//             } else {
//                 self.clients.openWindow('/');
//             }
//         }));
//     }
// });