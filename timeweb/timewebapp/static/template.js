// Starting animation
if ("animation-ran" in sessionStorage) {
    disable_transition = true;
} else {
    disable_transition = false;
    sessionStorage.setItem("animation-ran", true);
}
if (disable_transition) {
    $(function() {
        $("#content, #header, #assignments-container").addClass("disable-transition");
        $(".animate").removeClass("animate");
    });
} else {
    $(window).load(function() {
        // Use $(window).load(function() { instead because $(function() { sometimes fires too early and lags the animation a bit
        $("#content").on("transitionend",function(e) {
        if (e.originalEvent.propertyName === "height") {
            document.getElementById('content').style.transition = 'none';
            $("#content").off("transitionend");
        }
        });
        $(".animate").removeClass("animate");
    });
}

// Keybinds
$(document).keypress(function(event) {
    if (event.shiftKey && event.key == 'N') {
        $("#logo-container a").click();
    } else if (event.key === "Enter" && $(document.activeElement).prop("tagName") !== 'BUTTON') {
        document.activeElement.click();
    }
});

// Deals with selecting the parent element when tabbing into the menu
$(function() {
    $(".nav-item").focusout(() => $("nav").removeClass("open"));
    $(".nav-item").focus(() => $("nav").addClass("open"));
});

(function ($) {
 
    $.fn.info = function(facing,text) {
        return this.append('<div class="info-button">i<span class="info-button-text info-' + facing + '">' + text + '</span></div>');
    };
 
}(jQuery));