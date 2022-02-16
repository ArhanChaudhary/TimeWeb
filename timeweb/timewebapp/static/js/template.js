if (!window.gtag) {
    function gtag() {};
}
// https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
isMobile = (function() {
    if (navigator.userAgent) {
        let check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    }
    if (navigator.userAgentData) {
        return navigator.userAgentData.mobile;
    }
    return false;
})();
isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
$(function() {
    // Using arrow or space keys to scroll on main doesn't work if the user clicks on the background and focuses on body; main needs to be focused
    $(document.body).on("focus", function() {
        $("main").focus();
    })
    $("a").filter(function() {
        var url = this.href;

        // https://stackoverflow.com/questions/6238351/fastest-way-to-detect-external-urls
        var match = url.match(/^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/);
        if (typeof match[1] === "string" && match[1].length > 0 && match[1].toLowerCase() !== location.protocol) return true;
        if (typeof match[2] === "string" && match[2].length > 0 && match[2].replace(new RegExp(":("+{"http:":80,"https:":443}[location.protocol]+")?$"), "") !== location.host) return true;
        return false;
    }).attr("rel", "noreferrer");
    // Click element when enter is pressed
    $(document).keypress(function(e) {
        const activeElement = $(document.activeElement);
        if (e.key === "Enter" && activeElement.prop("tagName") !== 'BUTTON' /* Prevent double dipping */) {
            activeElement.click();
            if (activeElement.hasClass("first-advanced-buttons"))
                activeElement.nextAll(":not(br)").first().focus();
            else if (activeElement.hasClass("second-advanced-buttons"))
                activeElement.siblings(".first-advanced-buttons").prevAll(":not(br)").first().focus();
        }
    });
    // Header responiveness
    const username = $("#user-greeting #username"),
        logo = $("#logo-container"),
        welcome = $("#welcome"),
        newassignmenttext = $("#new-assignment-text");
    // Checks if user is authenticated and on home page
    if ($("#image-new-container").length) {
        $(window).resize(function() {
            welcome.toggle(!collision(welcome, logo, { margin: 10 }));

            logo.css({
                left: '',
                transform: '',
            });
            logo.find("img").css("width", "");
            if (collision(username, logo, { margin: 10 })) {
                logo.css({
                    left: 65,
                    transform: "none",
                });
                welcome.toggle(!collision(welcome, logo, { margin: 10 }));
                newassignmenttext.css("max-width", 0);
                if (collision(username, logo, { margin: 10 })) {
                    // compress the logo
                    logo.find("img").css("width", Math.max(0, username.offset().left-60-20-5));
                }
            } else {
                newassignmenttext.css("max-width",window.innerWidth/2-115-69);
            }
        });
    // Checks if user is authenticated and not on home page
    } else if ($("#user-greeting").length) {
        $(window).resize(function() {
            welcome.toggle(!collision(welcome, logo, { margin: 10 }));

            logo.css({
                left: '',
                transform: '',
            });
            logo.find("img").css("width", "");
            if (collision(username, logo, { margin: 10 })) {
                logo.css({
                    left: 5,
                    transform: "none",
                });
                welcome.toggle(!collision(welcome, logo, { margin: 10 }));
                if (collision(username, logo, { margin: 10 })) {
                    // compress the logo
                    logo.find("img").css("width", Math.max(0, username.offset().left-20-5));
                }
            }
        });
    }
    $(window).one("load", function() {
        $(window).trigger("resize");
        setTimeout(function(){
            // This hides the address bar (not anymore)
            window.scrollTo(0, 1);
        }, 0);
    });
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
    $("#nav-socials").click(() => $.alert({
        title: $("#socials-template").html(),
    }));
});
window.onbeforeunload = function() {
    if (window.ajaxUtils) window.ajaxUtils.silence_errors = true;
    if (window.disable_loading) return;
    // setTimeout to ensure .scrollTop to record the scroll position is run before this
    setTimeout(function() {
        $("main > *").hide();
        $("main").css({
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        });
        $("#background-image").show();
        $("#loading-container").css("display", "contents");
    }, 0);
};

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
    var bottom2 = top2 + $div2.outerHeight(true);;
    var right2 = left2 + $div2.outerWidth(true);;

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

    boxWidth: '50%',
    useBootstrap: false,

    animation: 'zoom',
    closeAnimation: 'scale',
    animateFromElement: false,
};
$.fn.reverse = Array.prototype.reverse;
// Info tooltip
$.fn.info = function(facing,text,position) {
    const info_button = $($("#info-button-template").html());
    info_button.find(".info-button-text").addClass(`info-${facing}`).text(text);
    info_button.click(() => false);
    switch (position) {
        case "prepend":
            return info_button.prependTo(this);
        case "after":
            return info_button.insertAfter(this);
        default:
            return info_button.appendTo(this);
    }
}
$.fn.hasOverflown = function() {
    const e = this[0];
    if (!e) return false;
    return e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth;
}
$.fn.isFullyScrolled = function(params={}) {
    const e = this[0];
    return e.scrollTop + e.clientHeight + params.leeway >= e.scrollHeight;
}
$.fn.expandableTextareaHeight = function() {
    $(this).on("input", function() {
        $(this).css("height", "auto"); // Needed for expanding with text
        $(this).css("height", $(this).prop("scrollHeight") + parseFloat($(this).css("padding-top")));
    });
    return $(this);
}
// Only change text
$.fn.onlyText = function(text) {
    $(this).contents().filter(function() {
        return this.nodeType === Node.TEXT_NODE;
    }).first()[0].nodeValue = text;
    return $(this);
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