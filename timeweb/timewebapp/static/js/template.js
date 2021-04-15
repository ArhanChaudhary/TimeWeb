/* 
This file includes the code for:

Initializing the service worker
Loading in load data
Advanced options
Keybinds
Ajax error function
Installing the app on home screen
Other minor utilities

This runs on every template
*/

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
    // Could be written better but unimportant for now
    
    // Checks if user is authenticated and on home page
    if ($("#image-new-container").length) {
        const username = $("#user-greeting #username"),
                logo = $("#logo-container"),
                welcome = $("#welcome"),
                newassignmenttext = $("#new-assignment-text");
        function resize() {
            // Checks if "Welcome, " protrudes into the logo
            if (username.offset().left-10 - 100 < window.innerWidth/2+115) {
                // If it does, hide welcome
                welcome.hide();
                // If it does, checks if the username protrudes into the logo
                if (username.offset().left-10 < window.innerWidth/2+115) {
                    logo.hide();
                    // If it does, makes sure the "New Assignment" behaves as if it were positioned relatively by a text ellipsis if the username protrudes into it
                    newassignmenttext.css("max-width",Math.max(0, username.offset().left-69-10));
                } else {
                    logo.show();
                    // If it does, makes sure the "New Assignment" behaves as if it were positioned relatively by a text ellipsis if the logo protrudes into it
                    newassignmenttext.css("max-width",window.innerWidth/2-115-69);
                }
            } else {
                newassignmenttext.css("max-width","");
                welcome.show();
            }
        }
        $(window).resize(resize).one("load", resize);
    } else if ($("#user-greeting").length) { // Run if user is authenticated and not on home screen
        const username = $("#username"),
                welcome = $("#welcome"),
                logo = $("#logo-container");
        function resize() {
            // Checks if "Welcome, " protrudes into the logo
            if (username.offset().left-10 - 100 < window.innerWidth/2+115) {
                // If it does, hide welcome
                welcome.hide();
                // If it does, checks if the username protrudes into the logo
                if (username.offset().left-10 < window.innerWidth/2+115) {
                    // If it does, float the logo left
                    $("#logo-container").css({
                        left: 5,
                        transform: "none",
                    });
                    // If it does, checks if the username protrudes into the logo (after floated left)
                    if (username.offset().left-20 < 211+5) {
                        // If it does, hide the logo
                        logo.hide();
                    } else {
                        logo.show();
                    }
                } else {
                    // If it does not, reset css
                    $("#logo-container").css({
                        left: '',
                        transform: '',
                    });
                }
            } else {
                welcome.show();
            }
        }
        $(window).resize(resize).one("load", resize);
    }
    $("#nav-usage, #nav-about, #nav-how").click(() => alert("This has not yet been written")).css("text-decoration", "line-through");
    $("#nav-keybinds").click(() => alert("This feature has not yet been implemented")).css("text-decoration", "line-through");
    $("#account-settings").click(() => alert("Please contact me to change your account settings"));
    // Deals with selecting the parent element when tabbing into the nav
    $("#nav-items a, #nav-menu").focusout(() => $("nav").removeClass("open"));
    $("#nav-items a, #nav-menu").focus(() => $("nav").addClass("open"));
    // Position content so that the scrollbar doesn't clip into the header
    if ("animation-ran" in sessionStorage || !$("#user-greeting").length) {
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
        $(window).one('load', function() {
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