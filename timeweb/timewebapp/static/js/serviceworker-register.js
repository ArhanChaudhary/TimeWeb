// Initialize the service worker
if ('serviceWorker' in navigator) {
    $(window).one('load', function() {
        navigator.serviceWorker.register('/serviceworker.js', {
            scope: '/'
        }).then(function (registration) {
            // Registration was successful
            console.log(registration);
        }, function (err) {
            // registration failed :(
            console.log(err);
        });
    });
}