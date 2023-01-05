window.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
window.assert = function(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}
window.addEventListener("pageshow", function(e) {
    if (e.persisted || window.performance?.getEntriesByType("navigation")[0].type === "back_forward") {
        // We have to reload at account login in case a user goes back from the account page to the login page
        // This will mess up the csrf token, so we reload the page to get a new one
        let exclude_login_route = RELOAD_VIEWS.slice(0, -1);
        let login_route = RELOAD_VIEWS[RELOAD_VIEWS.length - 1];
        if (exclude_login_route.includes(window.location.pathname) || login_route === window.location.pathname && sessionStorage.getItem("login_email")) {
            window.location.reload();
        } else {
            if (window.ajaxUtils) window.ajaxUtils.silence_errors = false;
            document.querySelector("main").classList.remove("loading");
        }
    }
    sessionStorage.removeItem("login_email");
});
window.addEventListener("beforeunload", function() {
    if (window.ajaxUtils) window.ajaxUtils.silence_errors = true;
    // setTimeout to ensure .scrollTop to record the scroll position is run before this
    setTimeout(function() {
        if (window.disable_loading) return; // window.disable_loading is set to true by other beforeunload handlers
        document.querySelector("main").classList.add("loading");
    }, 0);
});
function setVh() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVh();
window.addEventListener('resize', () => requestAnimationFrame(setVh));