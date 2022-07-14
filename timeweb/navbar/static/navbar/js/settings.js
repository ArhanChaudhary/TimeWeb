document.addEventListener("DOMContentLoaded", function() {
    $("#id_def_skew_ratio").val(mathUtils.precisionRound($("#id_def_skew_ratio").val()-1, 10)).prop("required", false);
    $("#id_def_min_work_time").val(+$("#id_def_min_work_time").val()||'');
    $("#reset-settings-button").click(function() {
        $.confirm({
            title: "Are you sure you want to reset your settings?",
            content: 'If you accidentally reset your settings, don\'t click save and instead refresh the page',
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

    let alreadyHasSubmitted = false;
    $("form").submit(function() {
        if (alreadyHasSubmitted) return;
        $("#id_def_skew_ratio").val(mathUtils.precisionRound(+$("#id_def_skew_ratio").val()+1, 10));
        textareaToJSON($("#id_default_dropdown_tags"));
        $("#submit-settings-button").val("Submitting...");
        alreadyHasSubmitted = true;
    });

    // https://github.com/wilsonzlin/minify-html/issues/71
    $("option:not([value])").attr("value", "");


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
                        ajaxUtils.ajaxChangeSetting({setting: "oauth_token", value: true});
                    },
                },
            },
        });
    }
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