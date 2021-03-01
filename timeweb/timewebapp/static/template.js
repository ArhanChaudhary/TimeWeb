$(function() {
    // Deals with selecting the parent element when tabbing into the menu
    $("#nav-items a").focusout(() => $("nav").removeClass("open"));
    $("#nav-items a").focus(() => $("nav").addClass("open"));

    // Starting animation
    if ("animation-ran" in sessionStorage) {
        disable_transition = true;
    } else {
        disable_transition = false;
        sessionStorage.setItem("animation-ran", true);
    }
    if (disable_transition) {
        $(window).load(function() {
            $("#content, #header, #assignments-container").addClass("disable-transition");
            $(".animate").removeClass("animate");
        });
    } else {
        $(window).load(function() {
            // Use $(window).load(function() { instead because $(function() { sometimes fires too early and lags the animation a bit
            $("#content").on("transitionend",function(e) {
                if (e.originalEvent.propertyName === "height") {
                    this.style.transition = 'none';
                    $(this).off("transitionend");
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

    if (user_authenticated) {
        const username = $("#user-greeting a"),
                container = $("#user-greeting"),
                welcome = $("#user-greeting span"),
                logo = $("#logo-container"),
                newassignmenttext = $("#new-assignment-text");
        let currentlyHidingWelcome = container.width() <= username[0].getBoundingClientRect().width+33;
        function resize() {
            if (container.width() <= username[0].getBoundingClientRect().width+33) {
                if (!currentlyHidingWelcome) { /* if statement not needed, just to make things more efficient */
                    container.addClass("logo-hidden");
                    //username.after(welcome);
                    logo.hide();
                    newassignmenttext.css("max-width","calc(100vw - " + (username[0].scrollWidth+180) + "px)");
                    currentlyHidingWelcome = true;
                }
            } else if (currentlyHidingWelcome) {
                container.removeClass("logo-hidden");
                //username.before(welcome);
                logo.show();
                newassignmenttext.css("max-width","");
                currentlyHidingWelcome = false;
            }
        }
        resize();
        logo.hide();
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
});

(function ($) {
    $.fn.info = function(facing,text) {
        return this.append('<div class="info-button">i<span class="info-button-text info-' + facing + '">' + text + '</span></div>');
    };
}(jQuery));