// Initialize the service worker
if ('serviceWorker' in navigator) {
    $(window).one('load', function() {
        navigator.serviceWorker.register('/serviceworker.js', {
            scope: '/'
        }).then(function (registration) {
            if (!window.SETTINGS.seen_latest_changelog) {
                debugger;
                registration.unregister();
            }
        }, function (err) {
            
        });
    });
}