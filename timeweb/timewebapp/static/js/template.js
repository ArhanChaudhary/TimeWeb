/* 
This file includes the code for:

Setting up Google Analytics
Initializing the service worker
Header responsiveness
Installing the app on home screen
Starting animation on index.html
Other minor utilities

This runs on every template
*/
if (!window.gtag) {
    function gtag() {};
}
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
// Use "document.addEventListener("DOMContentLoaded", function() {" instead of "$(function() {" because "$(function() {" runs after first paint, messing up the initial transition
document.addEventListener("DOMContentLoaded", function() {
    // Fix bug where the nav can be visible despite overflow: hidden
    window.scrollTo(0, 0);
    // Position content such that the scrollbar doesn't clip into the header
    if ("animation-ran" in sessionStorage || !$("#image-new-container").length) {
        $("main").css({
            overflowY: "overlay",
            height: "calc(100vh - 70px)",
            padding: "10px 20px",
            marginTop: 70,
        });
        $("#background-image").attr("src", $("#background-image").attr("ignored-window-onload-src")).removeAttr("ignored-window-onload-src");
    // Do starting animation
    } else {
        // If the animation has not already been run, add the class "animate" to the elements that will be animated
        // The animation will happen instantly, because the transitions are only applied to :not(.animate)
        // Then, when the window loads, remove ".animate". This will cause the actual transition
        // Note: Using keyframes still required this same process
        $("main, header, #assignments-container").addClass("animate");
        sessionStorage.setItem("animation-ran", true);
        $(window).one('load', function() {
            // Only start loading background image after window.one("load")
            $("#background-image").attr("src", $("#background-image").attr("ignored-window-onload-src")).removeAttr("ignored-window-onload-src");
            $("main, header, #assignments-container").removeClass("animate");
            // Run when the header animation completely ends since the header animation takes the longest
            $("header").one("transitionend", function() {
                // Position content such that the scrollbar doesn't clip into the header
                $("main").css({
                    overflowY: "overlay",
                    height: "calc(100vh - 70px)",
                    padding: "10px 20px",
                    marginTop: 70,
                });
            });
        });
    }
});
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
                    // If it does, checks if 
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
                    if (username.offset().left-20 < 211+5) {
                        // If it does, shorten the logo
                        logo.css("width", username.offset().left-20-5);
                    } else {
                        logo.css("width", 211);
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
    // https://stackoverflow.com/questions/58019463/how-to-detect-device-name-in-safari-on-ios-13-while-it-doesnt-show-the-correct
    isMobile = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // https://web.dev/customize-install/
    let prompt;
    window.addEventListener('beforeinstallprompt', function(e) {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        prompt = e;
    });
    // https://stackoverflow.com/questions/41742390/javascript-to-check-if-pwa-or-mobile-web
    function isPwa() {
        var displayModes = ["fullscreen", "standalone", "minimal-ui"];
        return displayModes.some((displayMode) => window.matchMedia('(display-mode: ' + displayMode + ')').matches); 
    }
    if (isPwa()) {
        $("#nav-items span").hide();
    } else {
        $("#nav-items span").click(function() {
            if (prompt) {
                // Show the install prompt
                prompt.prompt();
                // Wait for the user to respond to the prompt
                prompt.userChoice.then(choiceResult => {
                    if (choiceResult.outcome === 'accepted') {
                        $.alert({title: "Thanks for installing TimeWeb on your home screen"});
                    }
                });
            } else {
                if (isMobile) {
                    $.alert({title: "Click the share icon on your screen (up arrow in a square) and scroll to \"Add to Home Screen\"\n\nPlease use the Safari browser if this isn\'t an option"});
                } else {
                    $.alert({title: "Progressive web apps are not supported on your web browser, please use Google Chrome or Microsoft Edge\n\nIgnore this if you already have this installed"});
                }
            }
        });
    }
    $("#nav-about").click(() => $.alert({title: "This has not yet been written"})).css("text-decoration", "line-through");
    $("#account-settings").click(() => $.alert({title: "Please <a target='_blank' href='mailto:arhan.ch@gmail.com'>contact me</a> regarding your account settings"}));
});
jconfirm.defaults = {
    escapeKey: true,
    backgroundDismiss: true,

    boxWidth: '50%',
    useBootstrap: false,

    animation: 'zoom',
    closeAnimation: 'scale',
    animateFromElement: false,
};
// Info tooltip
$.fn.info = function(facing,text,position) {
    const info_button = $($("#info-button-template").html());
    info_button.find(".info-button-text").addClass(`info-${facing}`).text(text);
    switch (position) {
        case "prepend":
            return info_button.prependTo(this);
        case "after":
            return info_button.insertAfter(this);
        default:
            return info_button.appendTo(this);
    }
}
mathUtils = {
    // https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
    precisionRound: function(number, precision) {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    },
    daysBetweenTwoDates: function(larger_date, smaller_date) {
        return Math.round((larger_date - smaller_date) / 86400000); // Round for DST
    },
    clamp: function(low, value, high) {
        return Math.min(Math.max(value, low), high)
    }
}