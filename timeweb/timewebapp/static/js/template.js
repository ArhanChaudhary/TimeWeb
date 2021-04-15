// Code to be run on every page

// Initialize the service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/serviceworker.js', {
        scope: '/'
    }).then(function (registration) {
        // Registration was successful
        
    }, function (err) {
        // registration failed :(

    });
}
$(function() {
    // Click element when enter is pressed
    $(document).keypress(function(e) {
        if (e.key === "Enter" && $(document.activeElement).prop("tagName") !== 'BUTTON' /* Prevent double dipping */) {
            $(document.activeElement).click();
        }
    });
    // Header responiveness
    // Terribly written but unimportant for now
    if ($("#image-new-container").length) { // Run if user is authenticated and on home screen
        const username = $("#user-greeting a"),
                container = $("#user-greeting"),
                logo = $("#logo-container"),
                newassignmenttext = $("#new-assignment-text");
        let currentlyHidingLogo = container.width() <= username.width()+78;
        function resize() {
            // Checks whether to hide the logo 
            if (container.width() <= username.width()+78) {
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
        $(window).on('load', function() {
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
    } else if ($("#user-greeting").length) { // Run if user is authenticated and not on home screen
        const username = $("#user-greeting a"),
                container = $("#user-greeting"),
                logo = $("#logo-container");
        function resize() {
            // Checks whether to hide the logo 
            if (container.width() <= username.width()+78) {
                container.addClass("logo-hidden");
                $("#logo-container").css({
                    left: 5,
                    transform: "none",
                });
            } else {
                container.removeClass("logo-hidden");
                $("#logo-container").css({
                    left: '',
                    transform: '',
                });
            }
            if (logo.width()+25 > username.offset().left) {
                $("#logo-container").css("opacity", "0");
            } else {
                $("#logo-container").css("opacity", '');
            }
        }
        username.css("max-width", "calc(100vw - 132px)");
        resize();
        $(window).resize(resize);
    }
    $("#nav-usage, #nav-about, #nav-how").click(() => alert("This has not yet been written")).css("text-decoration", "line-through");
    $("#nav-keybinds").click(() => alert("This feature has not yet been implemented")).css("text-decoration", "line-through");
    // Deals with selecting the parent element when tabbing into the nav
    $("#nav-items a, #nav-menu").focusout(() => $("nav").removeClass("open"));
    $("#nav-items a, #nav-menu").focus(() => $("nav").addClass("open"));
    // Position content so that the scrollbar doesn't clip into the header
    if ("animation-ran" in sessionStorage || !$("#user-greeting").length) {
        // Position content so that the scrollbar doesn't clip into the header
        $("main").css({
            overflowY: "auto",
            height: "calc(100vh - 70px)",
            padding: "10px 30px",
            marginTop: 70,
        });
    // Do starting animation
    } else {
        // If the animation has not already been run, add the class "animate" to the elements that will be animated
        // The animation will happen instantly, because the transitions are only applied to :not(.animate)
        // Then, when the window loads, remove ".animate". This will cause the actual transition
        $("main, header, #assignments-container").addClass("animate");
        // Animation has ran
        sessionStorage.setItem("animation-ran", true);
        // Use "$(window).on('load', function() {"" of "$(function) { "instead because "$(function() {" fires too early
        $(window).on('load', function() {
            $("main, header, #assignments-container").removeClass("animate");
            // Run when the header animation completely ends since the header animation takes the longest
            $("header").one("transitionend", function() {
                // Position content so that the scrollbar doesn't clip into the header
                $("main").css({
                    overflowY: "auto",
                    height: "calc(100vh - 70px)",
                    padding: "10px 30px",
                    marginTop: 70,
                });
            });
        });
    }
});
// Info tooltip
(function($) {
    $.fn.info = function(facing,text) {
        return this.append('<div class="info-button">i<span class="info-button-text info-' + facing + '">' + text + '</span></div>');
    };
}(jQuery));