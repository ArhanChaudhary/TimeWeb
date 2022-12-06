window.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
window.assert = function(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}
window.addEventListener("pageshow", function(e) {
    if (e.persisted || window.performance?.getEntriesByType("navigation")[0].type === "back_forward") {
        document.querySelector("main").classList.remove("loading");
    }
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