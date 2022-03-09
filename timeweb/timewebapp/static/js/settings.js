document.addEventListener("DOMContentLoaded", function() {
    gtag("event","settings_view");
    BACKGROUND_IMAGE_TEMPLATE = $("#background-image-template").html();
    $("#id_def_skew_ratio").val(mathUtils.precisionRound($("#id_def_skew_ratio").val()-1, 10)).prop("required", false);
    $("#id_def_min_work_time").val(+$("#id_def_min_work_time").val()||'');
    $("#id_def_due_time").daterangepicker({
        buttonClasses: "generic-button",
        parentEl: "main",
        showDropdowns: true,
        timePicker: true,
        singleDatePicker: true,
        locale: {
            format: 'h:mm A'
        }
    }).on('show.daterangepicker', function (e, picker) {
        picker.container.find(".calendar-table").hide();
    });
    $("#reset-settings-button").click(function() {
        $.confirm({
            title: "Are you sure you want to reset your settings?",
            content: 'If you accidentally reset your settings, do not click save and instead refresh the page',
            buttons: {
                confirm: {
                    keys: ['Enter'],
                    action: function() {
                        $("#id_def_min_work_time").val("");
                        $("#id_def_skew_ratio").val(0);
                        $("#break-days-wrapper input").prop("checked", false);
                        $("#id_def_funct_round_minute").prop("checked", false);
                        $("#id_ignore_ends").prop("checked", false);
                        $("#id_def_due_time").data("daterangepicker").setStartDate(moment(new Date().setHours(0, 0, 0, 0)));
                        $("#id_show_priority").prop("checked", true);
                        $("#id_one_graph_at_a_time").prop("checked", false);
                        $("#id_close_graph_after_work_input").prop("checked", false);
                        $("#id_highest_priority_color")[0].jscolor.fromString("#E25B50");
                        $("#id_lowest_priority_color")[0].jscolor.fromString("#84C841");
                        $("#id_background_image").val("");
                        $("#id_horizontal_tag_position").val("Middle");
                        $("#id_assignment_spacing").val("Comfy");
                        $("#id_animation_speed").val("1");
                        $("#id_vertical_tag_position").val("Top");
                        $("#id_timezone").val("");
                        $("#id_default_dropdown_tags").val("").trigger("input");
                    }
                },
                cancel: function() {
                    
                }
            }
        });
    });
    // verbose name doesnt work on tag position for literally no reason
    $("label[for=\"id_horizontal_tag_position\"]").html("Horizontal Assignment Tag Position");
    $("label[for=\"id_vertical_tag_position\"]").html("Vertical Assignment Tag Position");
    $("table input:visible:not([name^=\"background_image\"]):not([name=\"def_break_days\"]):not(.jscolor):not([type=\"time\"])").each(function() {
        $("<label class=\"hitbox-label\"></label>").insertAfter($(this)).attr("for", $(this).attr("id"));
    });

    const background_image_link = $("#id_background_image").siblings("a");
    background_image_link.replaceWith(BACKGROUND_IMAGE_TEMPLATE);

    JSONToTextarea($("#id_default_dropdown_tags"));
    $("#id_default_dropdown_tags").expandableTextareaHeight();
    setTimeout(function() {
        $(".error-note").length && $(".error-note").first()[0].scrollIntoView();
        $("#id_default_dropdown_tags").trigger("input");
    }, 0);

    $("form legend").click(function() {
        $(this).parents("fieldset").toggleClass("closed");
    });

    let alreadyHasSubmitted = false;
    $("form").submit(function() {
        if (alreadyHasSubmitted) return;
        $("#id_def_skew_ratio").val(mathUtils.precisionRound(+$("#id_def_skew_ratio").val()+1, 10));
        textareaToJSON($("#id_default_dropdown_tags"));
        $("#submit-settings-button").val("Submitting...");
        alreadyHasSubmitted = true;
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