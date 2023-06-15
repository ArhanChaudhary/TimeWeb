window.TAB_CREATION_TIME = new Date().valueOf();
window.DEVICE_UUID = Math.random().toString(16).slice(2, 10);
document.addEventListener("DOMContentLoaded", function() {
    $.ajaxSetup({
        headers: {
            'X-CSRFToken': $("input[name=\"csrfmiddlewaretoken\"]").first().val()
        },
    });
    $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
        assert(!("success" in options) || "fakeSuccessArguments" in options);
        if (ajaxUtils?.disable_ajax) {
            options.success?.(...options.fakeSuccessArguments);
            options.complete?.();
            jqXHR.abort();
            return;
        }
        if (!options.url.startsWith("/api")) return;
        // do NOT use originalOptions, IMPORTANT
        // re-trying the ajax does not preserve originalOptions,
        // so we must instread derive it from options

        // do not use decodeURIComponent, it will break the url with ampersands in it
        // we cannot use Object.fromEntries(new UrlSearchParams(options.data)) because
        // break_days may be a duplicate key which isnt allowed in an object
        options.data = (options.data ? `${options.data}&` : '') + $.param({
            device_uuid: window.DEVICE_UUID,
            tab_creation_time: window.TAB_CREATION_TIME,
            utc_offset: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        options.url += options.url.endsWith("/") ? "" : "/";
    });
});
$(function() {
    // likely not needed (?)
    // $(window).on("focus", () => $(window).trigger("resize"));
    $(document).keydown(function(e) {
        switch (e.key) {
            case "Enter": {
                const activeElement = $(document.activeElement);
                if (
                    // Prevent double dipping
                    // I *could* use e.preventDefault instead for forward compatibility, but is risky and prevents some functioanlities
                    // (such as pressing enter to submit a form)
                    !activeElement.is('button, summary, input[type="file"], a')
                    // Prevent focused field widgets from toggling on enter form submission
                    && activeElement.attr("tabindex") !== "-1"
                    // keydown fires constantly while enter is being held down, limit it to the first fire
                    && !e.originalEvent.repeat) {
                        activeElement.click();
                }
                break;
            }
        }
    });
    $(document).on('input', 'input[step]', function() {
        var input = $(this);
        let step = input.attr('step');
        var newVal = input.val();
        if (newVal.includes(".") && newVal.split(".")[1].length > step.split(".")[1].length) {
            // remove extra decimals
            input.val(newVal.substring(0, newVal.indexOf(".") + step.split(".")[1].length + 1));
        }
    });
    // prevent shift keybinds from selecting text too
    // is not an issue with mobile because shiftKey doesn't exist
    $(document).on("mousedown", function(e) {
        if (e.shiftKey && $(e.target).hasClass("block-selection") || $(e.target).parents(".block-selection").length)
            document.getSelection().removeAllRanges();
    });
    if (window.daterangepicker) {
        const org = daterangepicker.prototype.renderTimePicker;
        daterangepicker.prototype.renderTimePicker = function() {
            // daterangepicker rerenders itself every change
            const ret = org.apply(this, arguments);
            if (arguments[0] === "left") return ret;
            $('<a id="daterangepicker-midnight" href="#">midnight</a>').appendTo(this.container.find(".calendar-time")).click(e => {
                const [hourselect, minuteselect, ampmselect] = this.container.find(".calendar-time > select:visible").toArray();
                $(hourselect).val(11);
                $(minuteselect).val(59);
                $(ampmselect).val("PM");
                $("select.hourselect").trigger("change.daterangepicker");
            });
            return ret;
        }
    }
    // On desktop without an assignment name or on mobile, you can click enter in the form and it will go to the next input without hiding an open daterangepicker
    $("input").on('blur', function(e) {
        // Can't use relatedTarget because it needs to be on an element with a tabindex, which the daterangepicker doesn't have
        if (!$(":hover").filter(".daterangepicker").length)
            $(this).data("daterangepicker")?.hide();
    });
    if ($("#username").length) {
        // close dropdown if clicked while open
        let wasOpen = false;
        $("#username").mousedown(function(e) {
            wasOpen = $(this).is(document.activeElement) || $(document.activeElement).parents("#username").length;
        }).click(function(e) {
            if (wasOpen)
                $("#username").blur();
        });
        $("#account-dropdown").css("display", "block");
        $("#account-dropdown").prop("style").setProperty("--margin-right", `${Math.max(0, ($("#account-dropdown").offset().left + $("#account-dropdown").outerWidth()) - (window.innerWidth - 9))}px`);
        $("#account-dropdown").css("display", "");
    }

    function resetHeaderLayout() {
        const username = $("#user-greeting #username");
        const logo = $("#logo-container");
        const welcome = $("#welcome");
        const left_icon_width = $("#image-new-container img, #hamborger-menu").length ? $("#image-new-container img, #hamborger-menu").outerWidth(true) : 0;
        const left_icon_text = $("#new-assignment-text");
    
        logo.css({
            left: '',
            transform: '',
        });
        logo.find("img").css("width", "");
        welcome.toggle(!collision(welcome, logo, { margin: 60 })); // Do this toggle after the logo's css is reset or it might clip into the logo
        if (left_icon_text.length)
            left_icon_text.toggle(!collision(left_icon_text, logo, { margin: 45 }));
    
        if (!collision(username, logo, { margin: 30 })) return;
        logo.css({
            left: 10 + left_icon_width,
            transform: "none",
        });
        welcome.toggle(!collision(welcome, logo, { margin: 60 }));
    
        if (!collision(username, logo, { margin: 10 })) return;
        // compress the logo
        logo.find("img").css("width", Math.max(0, username.offset().left-left_icon_width-20-5));
    }
    if ($("#user-greeting").length) {
        $(window).resize(resetHeaderLayout);
        resetHeaderLayout();
    }
    $("header > *").css("visibility", "visible");
    $("#hamborger-menu").click(function() {
        $("#table-of-contents-container").toggleClass("active");
    });
});
// It's important to remember to NOT use .done() or any other callback method on a jquery ajax
// This is to allow ajaxUtils.error to redo the ajax with the appropriate callbacks
// The only way to properly configure such an ajax is to define their callbacks inline
// I'm not really sure how to ensure I do this for forward compatibility so I just hope I'll stumble upon this text again or
// Somehow remember this in the future /shrug

window.isExampleAccount = ACCOUNT_EMAIL === EXAMPLE_ACCOUNT_EMAIL || EDITING_EXAMPLE_ACCOUNT;
window.ajaxUtils = {
disable_ajax: isExampleAccount && !EDITING_EXAMPLE_ACCOUNT, // Even though there is a server side validation for disabling ajax on the example account, initally disable it locally to ensure things don't also get changed locally
error: function(response, textStatus) {
    if (ajaxUtils.silence_errors) return;
    assert(this.xhr); // Ensure "this" refers to a jquery ajax
    if (response.status === 409) {
        ajaxUtils.alertInvalidState();
        return;
    }
    let title;
    let content;
    switch (response.status) {
        case 0:
            title = "Failed to connect.";
            content = "We can't establish a connection with the server. Check your connection and try again.";
            break;
        case 404:
            title = "Not found.";
            content = "Refresh or try again.";
            break;
        case 429:
            title = "You are being ratelimited.";
            content = "Try again in a few seconds or minutes.";
            break;
        case 500:
            title = "Internal server error.";
            content = "Please <a href=\"/contact\">contact us</a> if you see this, and try to provide context on how the issue happened.";
            break;
        default:
            title = `Whoops, we've encountered an error${textStatus === "error" ? "" : ` of type "${textStatus}"`} while trying to connect with the server:<br><br>${response.responseText||response.statusText}`;
    }
    $.alert({
        title: title,
        content: content,
        backgroundDismiss: false,
        buttons: {
            ok: {

            },
            "reload this page": {
                action: () => reloadWhenAppropriate(),
            },
            "try again": {
                action: () => {
                    $.ajax(this);
                },
            },
        },
    });
},
changeSetting: function(kwargs={}) {
    $.ajax({
        type: "PATCH",
        url: "/api/change-setting",
        data: {
            setting: kwargs.setting,
            value: JSON.stringify(kwargs.value),
        },
        success: function(response) {
            if (response?.should_redirect) {
                const reauthorization_url = response.redirect_url
                reloadWhenAppropriate({ href: reauthorization_url });
            }
        },
        fakeSuccessArguments: [],
        error: ajaxUtils.error,
    });
},
createIntegrationAssignments: function() {
    const ajaxs = [
        {type: "GET", url: '/api/create-integration-assignments'},
        {type: "GET", url: '/api/update-integration-courses'},
    ];
    let ajaxCallback = function(response) {
        if (response.invalid_credentials) {
            $.alert({
                title: "Invalid credentials.",
                // gc or canvas
                content: "Your Google Classroom integration credentials are invalid. Please reauthenticate or disable the integration.",
                buttons: {
                    ok: {

                    },
                    "disable integration": {
                        action: function() {
                            ajaxUtils.changeSetting({setting: "gc_token", value: false});
                        }
                    },
                    reauthenticate: {
                        action: function() {
                            reloadWhenAppropriate({href: response.reauthorization_url});
                        }
                    },
                }
            });
        }

        // indicates: this ajax means google classroom assignments were
        // created
        if (response.assignments) {
            for (let sa of response.assignments) {
                utils.initSA(sa);
                sa.just_created = true;
                dat.push(sa);
            }
            new Priority().sort();
        }

        // indicates: this ajax means we have to terminate everything and
        // restart the later queue from the beginning

        // raised if:
        // concurrent requests are made
        // update_integration_courses doesn't add any new courses (saves last ajax)
        // credentials are invalid
        if (response.next === "stop") return;
        // indicates: this ajax didn't create any assignments, go to the next
        // ajax in ajaxs
        else if (response.next === "continue") {
            let ajax = ajaxs.shift();
            if (!ajax) return;

            $.ajax({
                type: ajax.type,
                url: ajax.url,
                success: ajaxCallback,
                fakeSuccessArguments: [{next: "stop"}],
                // no error, fail silently
            });
        }
    }
    ajaxCallback({next: "continue"});
},
batchRequest: function(batchCallbackName, batchCallback, kwargs={}) {
    switch (batchCallbackName) {
        case "changeSetting": {
            if (!ajaxUtils.batchRequest[batchCallbackName]) {
                ajaxUtils.batchRequest[batchCallbackName] = {};
            }
            let requestData = ajaxUtils.batchRequest[batchCallbackName];
            for (let key in kwargs) {
                requestData[key] = kwargs[key];
            }
            break;
        }
        default: {
            if (!ajaxUtils.batchRequest[batchCallbackName]) {
                ajaxUtils.batchRequest[batchCallbackName] = [];
            }
            assert("id" in kwargs);
            let requestData = ajaxUtils.batchRequest[batchCallbackName].find(requestData => requestData.id === kwargs.id);
            if (!requestData) {
                requestData = {id: kwargs.id};
                ajaxUtils.batchRequest[batchCallbackName].push(requestData);
            }

            for (let key in kwargs) {
                if (key === "id") continue;
                requestData[key] = kwargs[key];
            }
        }
    }
    clearTimeout(ajaxUtils.batchRequest[batchCallbackName + "_timeout"]);
    ajaxUtils.batchRequest[batchCallbackName + "_callback"] = batchCallback;
    ajaxUtils.batchRequest[batchCallbackName + "_timeout"] = setTimeout(() => ajaxUtils.sendBatchRequest(batchCallbackName, batchCallback), 200);
},
sendBatchRequest: function(batchCallbackName, batchCallback) {
    let do_request = false;
    switch (batchCallbackName) {
        case "changeSetting":
            do_request = ajaxUtils.batchRequest[batchCallbackName] !== undefined && Object.keys(ajaxUtils.batchRequest[batchCallbackName]).length;
            break;
        default:
            do_request = ajaxUtils.batchRequest[batchCallbackName]?.length;
    }
    if (do_request)
        batchCallback(ajaxUtils.batchRequest[batchCallbackName]);
    delete ajaxUtils.batchRequest[batchCallbackName];
    delete ajaxUtils.batchRequest[batchCallbackName + "_timeout"];
    delete ajaxUtils.batchRequest[batchCallbackName + "_callback"];
},
saveAssignment: function(batchRequestData, postError) {

    // Send data along with the assignment's primary key

    // It is possible for users to send data that won't make any difference, for example they can quickly click fixed_mode twice, yet the ajax will still send
    // Coding in a check to only send an ajax when the data has changed is tedious, as I have to store the past values of every button to check with the current value
    // Plus, a pointless ajax of this sort won't happen frequently and will have a minimal impact on the server's performance
    $.ajax({
        type: "PATCH",
        url: '/api/save-assignment',
        data: {batchRequestData: JSON.stringify(batchRequestData)},
        error: function(response) {
            switch (response.status) {
                case 413: {
                    $.alert({
                        title: "Too much data to save.",
                        content: `If 1) You're saving an assignment with many work inputs, change its assignment date to today to truncate its work inputs and continue using it. If 2) You're autoinputting work done, you will have to manually perform this action for every assignment.<br><br>
                        
                        We understand if this may be frustrating, so feel free to <a href=\"/contact\">contact us</a> for personal assistance.`,
                        backgroundDismiss: false,
                    });
                    return;
                }
            }
            postError?.();
            ajaxUtils.error.bind(this)(...arguments);
        },
    });
},
alertInvalidState: function() {
    if (ajaxUtils.evaluateCurrentState.showing_alert) return;
    ajaxUtils.evaluateCurrentState.showing_alert = true;
    $.alert({
        title: "Your assignments are outdated.",
        content: "You have modified your assignments on a different tab or device. Please reload the page to refresh your assignments.",
        backgroundDismiss: false,
        buttons: {
            ignore: {

            },
            reload: {
                action: () => reloadWhenAppropriate(),
            },
        },
        onDestroy: function() {
            delete ajaxUtils.evaluateCurrentState.showing_alert;
        },
    });
},
evaluateCurrentState: function() {
    $.ajax({
        type: "POST",
        url: "/api/evaluate-current-state",
        error: function(response, textStatus) {
            // lets make other errors to this api call silent
            if (response.status !== 409) return;
            ajaxUtils.alertInvalidState();
        }
    });
},
}

window.mathUtils = {
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
    },
    countDecimals: function(n) {
        if (Math.floor(n) === n) return 0;
        return n.toString().split(".")[1].length || 0; 
    },
    sigFigSubtract: function(a, b) {
        const a_decimals = mathUtils.countDecimals(a);
        const b_decimals = mathUtils.countDecimals(b);
        const max_decimals = Math.max(a_decimals, b_decimals);
        return mathUtils.precisionRound(a - b, max_decimals);
    }
}
// https://stackoverflow.com/questions/5419134/how-to-detect-if-two-divs-touch-with-jquery
window.collision = function($div1, $div2, params={ margin: 0}) {
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
window.reloadResolver = null;
window.reloadWhenAppropriate = function(params={href: null}) {
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