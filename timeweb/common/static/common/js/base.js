window.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
window.assert = function(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}
window.addEventListener("beforeunload", function() {
    if (window.ajaxUtils) window.ajaxUtils.silence_errors = true;
    // setTimeout to ensure .scrollTop to record the scroll position is run before this
    setTimeout(function() {
        if (window.disable_loading) return; // window.disable_loading is set to true by other beforeunload handlers
        document.querySelectorAll("main > *").forEach(e => {
            e.style.display = "none";
        });
        document.getElementsByTagName("main")[0].style.display = "flex";
        document.getElementsByTagName("main")[0].style.justifyContent = "center";
        document.getElementsByTagName("main")[0].style.alignItems = "center";
        if (document.getElementById("background-image")) document.getElementById("background-image").style.display = "block";
        if (document.getElementById("circles-background"))
            document.getElementById("circles-background").style.display = "block";
        else 
            document.getElementById("loading-container").style.display = "contents";
    }, 0);
});