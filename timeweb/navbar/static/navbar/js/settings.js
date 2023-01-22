document.addEventListener("DOMContentLoaded", function() {
    $("#id_def_skew_ratio").val(mathUtils.precisionRound($("#id_def_skew_ratio").val()-1, 10)).prop("required", false);
    $("#id_def_min_work_time").val(+$("#id_def_min_work_time").val()||'');
    $("#reset-settings-button").click(function() {
        $.confirm({
            title: "Are you sure you want to reset your settings?",
            content: 'If you accidentally reset your settings, refresh the page to restore them.',
            buttons: {
                confirm: {
                    keys: ['Enter'],
                    action: function() {
                        const default_settings = JSON.parse(document.getElementById("default-settings").textContent);
                        for (let [key, value] of Object.entries(default_settings)) {
                            // adjusts value
                            switch (key) {
                                case "def_skew_ratio":
                                    value--;
                                    break;
                                case "default_dropdown_tags":
                                    value = value.join("\n");
                                    break;
                            }
                            // parses and sets the value
                            const $input = $("#id_" + key);
                            switch (key) {
                                case "def_break_days":
                                    $("#break-days-wrapper input").prop("checked", false);
                                    continue;
                            }
                            if ($input.prop("jscolor")) {
                                $input.prop("jscolor").fromString(value);
                                continue;
                            }
                            if ($input.attr("type") === "checkbox") {
                                $input.prop("checked", value);
                                continue;
                            }
                            $input.val(value);
                            // expandable textbox
                            if ($input.is("textarea")) {
                                $input.trigger("input");
                            }
                        }
                    }
                },
                cancel: function() {
                    
                }
            }
        });
    });

    JSONToTextarea($("#id_default_dropdown_tags"));
    $("#id_default_dropdown_tags").expandableTextareaHeight();
    setTimeout(function() {
        $("#id_default_dropdown_tags").trigger("input");
    }, 0);
    // d256f25 should have fixed this but it's stupidly inconsistent
    $("option:not([value])").attr("value", "");

    let hasSubmitted = false;
    if (GC_API_INIT_FAILED) {
        $.alert({
            title: "Could not enable the Google Classroom integration.",
            content: "Authorization failed. Please try again.",
            backgroundDismiss: false,
            buttons: {
                ok: {

                },
                "try again": {
                    action: () => {
                        hasSubmitted = true;
                        ajaxUtils.changeSetting({setting: "oauth_token", value: true});
                    },
                },
            },
        });
    }

    $("#logo-container").click(function(e) {
        e.preventDefault();
        $("#submit-settings-button").click();
    });
    $("#submit-settings-button").click(function() {
		if (hasSubmitted) return false;
        $("#id_def_skew_ratio").val(mathUtils.precisionRound(+$("#id_def_skew_ratio").val()+1, 10));
        textareaToJSON($("#id_default_dropdown_tags"));
        hasSubmitted = true;
    });
    // or else logging out will display the "you form changes my not been saved" alert
    $("form:not(#settings-form)").submit(function() {
        hasSubmitted = true;
    });
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event#examples
    window.addEventListener("beforeunload", function(e) {
        if (hasSubmitted || window.ignore_reload_alert) return;

        e.preventDefault();
        $("#logo-container").removeAttr("tabindex").focus();

        window.disable_loading = true;
        setTimeout(function() {
            window.disable_loading = false;
        }, 0);
        return e.returnValue = "Your settings may be lost.";
    });
    let single_action_label_timeout;
    $(".immediate-action").click(function() {
        clearTimeout(single_action_label_timeout);
        single_action_label_timeout = setTimeout(() => {
            // the timeout and the if statement allow for double or quadruple clicking to cancel the action
            if ($(this).parents(".right-side-of-field").find("input").is(":checked"))
				$("#submit-settings-button").click();
        }, 700);
    });
    $(".not-yet-implemented").click(function() {
        if (!$(this).prop("checked")) return;
        setTimeout(() => {
            $(this).prop("checked", false);
            $.alert({
                title: "Not yet implemented",
                content: `This integration hasn't yet been implemented but is planned for a future release. If you want to want this feature sooner, 
                        you can peer pressure me by sending me a nudge.`,
                buttons: {
                    ok: {

                    },
                    nudge: {
                        action: () => {
                            switch ($(this).attr("id")) {
                                case "id_calendar_integration":
                                    var setting = "nudge_calendar";
                                    break;
                                case "id_notifications_integration":
                                    var setting = "nudge_notifications";
                                    break;
                                case "id_canvas_integration":
                                    var setting = "nudge_canvas";
                                    break;
                            }
                            ajaxUtils.changeSetting({setting: setting, value: true});
                        },
                    },
                }
            });
        }, 500);
    });
});
$(window).one("load", function() {
    $(".error-note").length && $(".error-note").first()[0].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
    });
});
function textareaToJSON($textarea) {
    let $textareaVal = $textarea.val();
    if ($textareaVal) {
        $textareaVal = $textareaVal.split(/\n|,/).map(e => e.trim());
        $textareaVal = [...new Set($textareaVal)];
        $textareaVal = $textareaVal.sort();
        $textareaVal = $textareaVal.filter(e => !!e.length).map(e => JSON.stringify(e)).join(",");
        $textarea.val(`[${$textareaVal}]`);
    } else {
        $textarea.val("[]");
    }
}
function JSONToTextarea($textarea) {
    let $textareaVal = $textarea.val();
    $textareaVal = $textareaVal.substring(1, $textareaVal.length - 1);
    if ($textareaVal)
        $textareaVal = $textareaVal.split(", ").map(e => JSON.parse(e)).join("\n")
    $textarea.val($textareaVal);
}