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

    if (GC_API_INIT_FAILED) {
        $.alert({
            title: "Could not enable the Google Classroom integration.",
            content: "Authentication failed. Please try again.",
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

    let hasSubmitted = false;
    $("#logo-container").click(function(e) {
        e.preventDefault();
        if (hasSubmitted) return;
        $("#id_def_skew_ratio").val(mathUtils.precisionRound(+$("#id_def_skew_ratio").val()+1, 10));
        textareaToJSON($("#id_default_dropdown_tags"));
        hasSubmitted = true;
        $("main form")[0].submit();
    });
    // or else logging out will display the "you form changes my not been saved" alert
    $("header form").submit(function() {
        hasSubmitted = true;
    });
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event#examples
    window.onbeforeunload = function(e) {
        if (hasSubmitted) return;

        e.preventDefault();
        $("#logo-container").removeAttr("tabindex").focus();
        return e.returnValue = "Your settings may be lost.";
    };
    let single_action_label_timeout;
    $(".single-action-label").click(function() {
        clearTimeout(single_action_label_timeout);
        single_action_label_timeout = setTimeout(() => {
            // the timeout and the if statement allow for double or quadruple clicking to cancel the action
            if ($(this).parents(".right-side-of-field").find("input").is(":checked"))
                $("#logo-container").click();
        }, 700);
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