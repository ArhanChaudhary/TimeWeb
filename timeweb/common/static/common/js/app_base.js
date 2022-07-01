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
    welcome.toggle(!collision(welcome, logo, { margin: 30 })); // Do this toggle after the logo's css is reset or it might clip into the logo
    newassignmenttext.length && newassignmenttext.toggle(!collision(newassignmenttext, logo, { margin: 30 }));

    if (!collision(username, logo, { margin: 30 })) return;
    logo.css({
        left: 5 + plus_button_width,
        transform: "none",
    });
    welcome.toggle(!collision(welcome, logo, { margin: 30 }));

    if (!collision(username, logo, { margin: 10 })) return;
    // compress the logo
    logo.find("img").css("width", Math.max(0, username.offset().left-plus_button_width-20-5));
}
$(function() {
    $(window).on("focus", () => $(window).trigger("resize"));
    $(document).keydown(function(e) {
        switch (e.key) {
            case "Enter": {
                const activeElement = $(document.activeElement);
                if (
                    // Prevent double dipping
                    // I *could* use e.preventDefault instead for forward compatibility, but is risky and prevents some functioanlities
                    // (such as pressing enter to submit a form)
                    !activeElement.is('button, summary, input[type="file"]')
                    // Prevent focused field widgets from toggling on enter form submission
                    && activeElement.attr("tabindex") !== "-1"
                    // keydown fires constantly while enter is being held down, limit it to the first fire
                    && !e.originalEvent.repeat) {
                        activeElement.click();
                }
                break;
            }
            case "Tab":
                // Prevent tabbing dispositioning screen from tabbing on nav
                setTimeout(() => $("#site")[0].scrollTo(0,0), 0);
                break;
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