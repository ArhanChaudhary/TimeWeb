// Code to be run on every page
$(function() {
    // Accessibility keybind when pressing enter
    $(document).keypress(function(e) {
        if (e.key === "Enter" && $(document.activeElement).prop("tagName") !== 'BUTTON' /* Prevent double dipping */) {
            $(document.activeElement).click();
        }
    });
    // Header responiveness, really messy spaghetti code but whatever
    if ($("#user-greeting").length) { // Run if user is authenticated
        const username = $("#user-greeting a"),
                container = $("#user-greeting"),
                welcome = $("#user-greeting span"),
                logo = $("#logo-container"),
                newassignmenttext = $("#new-assignment-text");
        let currentlyHidingWelcome = container.width() <= username[0].getBoundingClientRect().width+33;
        function resize() {
            if (container.width() <= username[0].getBoundingClientRect().width+33) {
                if (!currentlyHidingWelcome) { // if statement not needed, just to make things more efficient
                    container.addClass("logo-hidden");
                    logo.hide();
                    newassignmenttext.css("max-width","calc(100vw - " + (username[0].scrollWidth+180) + "px)");
                    currentlyHidingWelcome = true;
                }
            } else if (currentlyHidingWelcome) {
                container.removeClass("logo-hidden");
                logo.show();
                newassignmenttext.css("max-width","");
                currentlyHidingWelcome = false;
            }
        }
        resize();
        document.fonts.ready.then(function() {
            if (currentlyHidingWelcome) {
                container.addClass("logo-hidden");
                username.after(welcome);
                logo.hide();
                newassignmenttext.css("max-width","calc(100vw - " + (username[0].scrollWidth+180) + "px)");
            } else {
                logo.show();
            }
            $(window).resize(resize);
        });
    }
    // Deals with selecting the parent element when tabbing into the nav
    $("#nav-items a").focusout(() => $("nav").removeClass("open"));
    $("#nav-items a").focus(() => $("nav").addClass("open"));
});
// Info tooltip
(function($) {
    $.fn.info = function(facing,text) {
        return this.append('<div class="info-button">i<span class="info-button-text info-' + facing + '">' + text + '</span></div>');
    };
}(jQuery));