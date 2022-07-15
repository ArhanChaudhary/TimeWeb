// message to future self stop panicking about the outdated service worker bug
// ive tested it like 20 times and the result has always been that it gets fixed
// after the next reload
self.addEventListener('fetch', function() {
    return;
});
self.skipWaiting();
// self.clients.claim() doesn't take over the last service worker fast enough rip
// it doesn't work if called before skipWaiting() either
// self.clients.claim();