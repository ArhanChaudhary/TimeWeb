function resetHeaderLayout() {
    const username = $("#user-greeting #username"),
        logo = $("#logo-container"),
        welcome = $("#welcome"),
        plus_button = $("#image-new-container img"),
        plus_button_width = plus_button.width()||0,
        newassignmenttext = $("#new-assignment-text");

    logo.css({
        left: '',
        transform: '',
    });
    logo.find("img").css("width", "");
    welcome.toggle(!collision(welcome, logo, { margin: 10 })); // Do this toggle after the logo's css is reset or it might clip into the logo
    if (collision(username, logo, { margin: 10 })) {
        logo.css({
            left: 5 + plus_button_width,
            transform: "none",
        });
        welcome.toggle(!collision(welcome, logo, { margin: 10 }));
        newassignmenttext.css("max-width", 0);
        if (collision(username, logo, { margin: 10 })) {
            // compress the logo
            logo.find("img").css("width", Math.max(0, username.offset().left-plus_button_width-20-5));
        }
    } else {
        newassignmenttext.css("max-width",window.innerWidth/2-184);
    }
}
$(function() {
    $(window).on("focus", () => $(window).trigger("resize"));
    $(document).keypress(function(e) {
        const activeElement = $(document.activeElement);
        if (e.key === "Enter" && activeElement.prop("tagName") !== 'BUTTON' /* Prevent double dipping */
            // Prevent focused field widgets from toggling on enter form submission
            && activeElement.attr("tabindex") !== "-1") {
            activeElement.click();
        }
    });
    $("input").on("show.daterangepicker", function(e, picker) {
        // There's a random invisible datepicker, so only query the one that's visible
        const minuteselect = picker.container.find(".minuteselect:visible");
        minuteselect.children("[value=\"59\"]").insertAfter(minuteselect.children("[value=\"0\"]"));
    // On desktop without an assignment name or on mobile, you can click enter in the form and it will go to the next input without hiding an open daterangepicker
}).on('blur', function(e) {
        // Can't use relatedTarget because it needs to be on an element with a tabindex, which the daterangepicker doesn't have
        if (!$(":hover").filter(".daterangepicker").length)
            $(this).data("daterangepicker")?.hide();
    });

    if ($("#user-greeting").length) {
        $(window).resize(resetHeaderLayout);
        resetHeaderLayout();
    }
    $("header > *").css("visibility", "visible");
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
        $("#nav-a2hs").hide();
    } else {
        $("#nav-a2hs").click(function() {
            if (prompt) {
                // Show the install prompt
                prompt.prompt();
                // Wait for the user to respond to the prompt
                prompt.userChoice.then(choiceResult => {
                    if (choiceResult.outcome === 'accepted') {
                        $.alert({
                            title: "Thanks for installing TimeWeb on your home screen.",
                        });
                    }
                });
            } else if (isMobile)
                $.alert({
                    title: "Please use Safari to install TimeWeb on your home screen.",
                    content: "Once you're there, click the share icon on your screen (the up arrow in a square icon) and scroll to \"Add to Home Screen\". Ignore this if you already have TimeWeb installed.",
                });
            else
                $.alert({
                    title: "Progressive web apps are not supported on your web browser.",
                    content: "Please use Google Chrome or Microsoft Edge. Ignore this if you already have TimeWeb installed.",
                });
        });
    }
    $("#nav-credits").click(() => $.alert({
        title: $("#credits-template").html(),
    }));
});
// https://stackoverflow.com/questions/5419134/how-to-detect-if-two-divs-touch-with-jquery
function collision($div1, $div2, params={ margin: 0}) {
    if ($div1.css("display") == "none") {
        var hide_$div1 = true;
        $div1.show();
    }
    if ($div2.css("display") == "none") {
        var hide_$div2 = true;
        $div2.show();
    }
    var left1 = $div1.offset().left;
    var top1 = $div1.offset().top;
    var bottom1 = top1 + $div1.outerHeight(true);
    var right1 = left1 + $div1.outerWidth(true);

    var left2 = $div2.offset().left;
    var top2 = $div2.offset().top;
    var bottom2 = top2 + $div2.outerHeight(true);
    var right2 = left2 + $div2.outerWidth(true);

    hide_$div1 && $div1.hide();
    hide_$div2 && $div2.hide();

    if (bottom1 + params.margin < top2 || top1 - params.margin > bottom2 || right1 + params.margin < left2 || left1 - params.margin > right2) return false;
    return true;
}

reloadResolver = null;
function reloadWhenAppropriate(params={href: null}) {
    new Promise(function(resolve) {
        if ($(".jconfirm").length) {
            reloadResolver = resolve;
        } else {
            resolve();
        }
    }).then(function() {
        if (params.href) {
            window.location.href = params.href;
        } else {
            window.location.reload();
        }
    });
}
jconfirm.defaults = {
    escapeKey: true,
    backgroundDismiss: true,
    draggable: false,

    boxWidth: '50%',
    useBootstrap: false,

    animation: 'zoom',
    closeAnimation: 'scale',
    animateFromElement: false,
};
mathUtils = {
    // https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
    precisionRound: function(number, precision) {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    },
    daysBetweenTwoDates: function(larger_date, smaller_date, params={round: true}) {
        if (params.round) {
            const diff = (larger_date - smaller_date) / 86400000;
            return Math.round(diff); // Round for DST too
        } else {
            const no_dst_date = new Date(larger_date.valueOf());
            no_dst_date.setHours(no_dst_date.getHours() + (smaller_date.getTimezoneOffset() - larger_date.getTimezoneOffset()) / 60);
            const diff = (no_dst_date - smaller_date) / 86400000;
            return diff;
        }
    },
    clamp: function(low, value, high) {
        return Math.min(Math.max(value, low), high)
    }
}