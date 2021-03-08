$(function() {
    // Deals with selecting the parent element when tabbing into the menu
    $("#nav-items a").focusout(() => $("nav").removeClass("open"));
    $("#nav-items a").focus(() => $("nav").addClass("open"));

    // Starting animation
    if ("animation-ran" in sessionStorage) {
        $("#content")[0].style.transition = 'none';
    } else {
        $("#content, #header, #assignments-container").addClass("animate");
        sessionStorage.setItem("animation-ran", true);
        $(window).load(function() {
            // Use $(window).load(function() { instead because $(function() { sometimes fires too early and lags the animation a bit
            $("#content, #header, #assignments-container").removeClass("animate");
            $("#content").on("transitionend",function(e) {
                if (e.originalEvent.propertyName === "height") {
                    $(this).off("transitionend")[0].style.transition = 'none';
                }
            });    
        });
    }

    // Keybinds
    $(document).keypress(function(e) {
        if (e.shiftKey && e.key === 'N') {
            $("#image-new-container").click();
        } else if (e.key === "Enter" && $(document.activeElement).prop("tagName") !== 'BUTTON') {
            $(document.activeElement).click();
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

(function($) {
    $.fn.info = function(facing,text) {
        return this.append('<div class="info-button">i<span class="info-button-text info-' + facing + '">' + text + '</span></div>');
    };
}(jQuery));