// Code to be run on every page
$(function() {
    // Accessibility keybind when pressing enter
    $(document).keypress(function(e) {
        if (e.key === "Enter" && $(document.activeElement).prop("tagName") !== 'BUTTON' /* Prevent double dipping */) {
            $(document.activeElement).click();
        }
    });
    // Header responiveness
    if ($("#user-greeting").length) { // Run if user is authenticated
        const username = $("#user-greeting a"),
                container = $("#user-greeting"),
                logo = $("#logo-container"),
                newassignmenttext = $("#new-assignment-text");
        let currentlyHidingLogo = container.width() <= username.width()+33;
        function resize() {
            // Checks whether to hide the logo 
            if (container.width() <= username.width()+33) {
                if (!currentlyHidingLogo) { // if statement not needed, just to make things more efficient
                    container.addClass("logo-hidden");
                    logo.hide();
                    newassignmenttext.css("max-width",`calc(100vw - ${username[0].scrollWidth+180}px)`); // Use scrollwidth insted of $.width() because it takes into account the overflown text
                    currentlyHidingLogo = true;
                }
            } else if (currentlyHidingLogo) {
                container.removeClass("logo-hidden");
                logo.show();
                newassignmenttext.css("max-width","");
                currentlyHidingLogo = false;
            }
        }
        resize();
        $(window).load(function() {
            // Run the if statement part of resize()
            if (currentlyHidingLogo) {
                container.addClass("logo-hidden");
                logo.hide();
                newassignmenttext.css("max-width",`calc(100vw - ${username[0].scrollWidth+180}px)`); // Use scrollwidth insted of $.width() because it takes into account the overflown text
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