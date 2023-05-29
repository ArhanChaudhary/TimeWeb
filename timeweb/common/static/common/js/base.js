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
        let exclude_login_email_routes = RELOAD_VIEWS.slice(0, -2);
        let login_email_routes = RELOAD_VIEWS.slice(-2);
        if (exclude_login_email_routes.includes(window.location.pathname) || login_email_routes.includes(window.location.pathname) && sessionStorage.getItem("login_email")) {
            sessionStorage.removeItem("login_email");
            window.ignore_reload_alert = true;
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
if (!CSS.supports("height", "1dvh")) {
    const setVh = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setVh();
    window.addEventListener('resize', () => requestAnimationFrame(setVh));
}
window.addEventListener("load", function() {
    setTimeout(function() {
        document.querySelectorAll("textarea").forEach(function(textarea) {
            textarea.addEventListener("input", function() {
                textarea.style.height = getComputedStyle(textarea).getPropertyValue("--nothing-height");
                textarea.style.height = `${textarea.scrollHeight}px`;
            });
            textarea.style.overflowY = "hidden";        
            textarea.dispatchEvent(new Event("input"));
        });
    }, 0);
});
if (ACCOUNT_EMAIL === '') {
    // Reset storages from saveAndLoadStates from utils.js
    sessionStorage.removeItem("open_assignments");
    sessionStorage.removeItem("scroll");
    localStorage.removeItem("last_visit");
}
